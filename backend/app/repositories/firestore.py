"""Firestore implementation of DocumentStore (async client)."""
from __future__ import annotations

from firebase_admin import firestore_async
from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter

from app.core.firebase import get_app
from app.repositories.store import InsufficientStock


class FirestoreStore:
    def __init__(self):
        self.db = firestore_async.client(get_app())

    async def get(self, collection, doc_id):
        snap = await self.db.collection(collection).document(doc_id).get()
        return snap.to_dict() if snap.exists else None

    async def get_many(self, collection, ids):
        if not ids:
            return {}
        refs = [self.db.collection(collection).document(i) for i in dict.fromkeys(ids)]
        out = {}
        async for snap in self.db.get_all(refs):
            if snap.exists:
                out[snap.id] = snap.to_dict()
        return out

    async def list(self, collection, where=None, order_by=None, descending=False, limit=None):
        q = self.db.collection(collection)
        for field, op, value in where or []:
            q = q.where(filter=FieldFilter(field, op, value))
        if order_by:
            q = q.order_by(order_by, direction=firestore.Query.DESCENDING if descending else firestore.Query.ASCENDING)
        if limit:
            q = q.limit(limit)
        return [s.to_dict() async for s in q.stream()]

    async def set(self, collection, doc_id, data):
        await self.db.collection(collection).document(doc_id).set(data)
        return data

    async def update(self, collection, doc_id, patch):
        ref = self.db.collection(collection).document(doc_id)
        snap = await ref.get()
        if not snap.exists:
            return None
        # Top-level merge (matches MemoryStore semantics); nested maps are replaced wholesale.
        await ref.set(patch, merge=list(patch.keys()))
        return {**snap.to_dict(), **patch}

    async def delete(self, collection, doc_id):
        ref = self.db.collection(collection).document(doc_id)
        snap = await ref.get()
        if not snap.exists:
            return False
        await ref.delete()
        return True

    async def next_sequence(self, name, start=1000):
        ref = self.db.collection("counters").document(name)

        @firestore.async_transactional
        async def _txn(txn):
            snap = await ref.get(transaction=txn)
            value = (snap.to_dict() or {}).get("value", start) + 1
            txn.set(ref, {"value": value})
            return value

        return await _txn(self.db.transaction())

    async def adjust_stock(self, deltas):
        refs = {pid: self.db.collection("products").document(pid) for pid in deltas}

        @firestore.async_transactional
        async def _txn(txn):
            snaps = {pid: await ref.get(transaction=txn) for pid, ref in refs.items()}
            for pid, delta in deltas.items():
                snap = snaps[pid]
                available = (snap.to_dict() or {}).get("stock", 0) if snap.exists else 0
                if not snap.exists or available + delta < 0:
                    raise InsufficientStock(pid, available)
            for pid, delta in deltas.items():
                txn.update(refs[pid], {
                    "stock": firestore.Increment(delta),
                    "sales_count": firestore.Increment(-delta),
                })

        await _txn(self.db.transaction())

    async def increment(self, collection, doc_id, field, delta):
        await self.db.collection(collection).document(doc_id).set({field: firestore.Increment(delta)}, merge=True)
