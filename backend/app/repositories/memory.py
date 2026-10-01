"""In-process document store with optional JSON persistence. Used for tests
and for running the whole stack locally without Firebase credentials."""
from __future__ import annotations

import asyncio
import copy
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any

from app.repositories.store import InsufficientStock, Where


def _get_path(doc: dict, dotted: str) -> Any:
    cur: Any = doc
    for part in dotted.split("."):
        if not isinstance(cur, dict):
            return None
        cur = cur.get(part)
    return cur


def _match(doc: dict, where: list[Where]) -> bool:
    for field, op, value in where:
        v = _get_path(doc, field)
        try:
            ok = {
                "==": lambda: v == value,
                "!=": lambda: v != value,
                "<": lambda: v is not None and v < value,
                "<=": lambda: v is not None and v <= value,
                ">": lambda: v is not None and v > value,
                ">=": lambda: v is not None and v >= value,
                "in": lambda: v in value,
                "array_contains": lambda: isinstance(v, list) and value in v,
            }[op]()
        except TypeError:
            ok = False
        if not ok:
            return False
    return True


def _encode(o: Any):
    if isinstance(o, datetime):
        return {"$dt": o.isoformat()}
    raise TypeError(f"Cannot serialise {type(o)}")


def _decode(d: dict):
    if len(d) == 1 and "$dt" in d:
        return datetime.fromisoformat(d["$dt"])
    return d


class MemoryStore:
    def __init__(self, persist_path: str | None = None):
        self._data: dict[str, dict[str, dict]] = {}
        self._lock = asyncio.Lock()
        self._path = Path(persist_path) if persist_path else None
        if self._path and self._path.exists():
            self._data = json.loads(self._path.read_text(), object_hook=_decode)

    def is_empty(self) -> bool:
        return not any(self._data.values())

    def _flush(self) -> None:
        if not self._path:
            return
        self._path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self._path.with_suffix(".tmp")
        tmp.write_text(json.dumps(self._data, default=_encode))
        os.replace(tmp, self._path)

    def _col(self, name: str) -> dict[str, dict]:
        return self._data.setdefault(name, {})

    async def get(self, collection, doc_id):
        doc = self._col(collection).get(doc_id)
        return copy.deepcopy(doc) if doc else None

    async def get_many(self, collection, ids):
        col = self._col(collection)
        return {i: copy.deepcopy(col[i]) for i in ids if i in col}

    async def list(self, collection, where=None, order_by=None, descending=False, limit=None):
        docs = [d for d in self._col(collection).values() if _match(d, where or [])]
        if order_by:
            docs.sort(key=lambda d: (_get_path(d, order_by) is None, _get_path(d, order_by)), reverse=descending)
        if limit:
            docs = docs[:limit]
        return copy.deepcopy(docs)

    async def set(self, collection, doc_id, data):
        async with self._lock:
            self._col(collection)[doc_id] = copy.deepcopy(data)
            self._flush()
        return copy.deepcopy(data)

    async def update(self, collection, doc_id, patch):
        async with self._lock:
            doc = self._col(collection).get(doc_id)
            if doc is None:
                return None
            doc.update(copy.deepcopy(patch))
            self._flush()
            return copy.deepcopy(doc)

    async def delete(self, collection, doc_id):
        async with self._lock:
            existed = self._col(collection).pop(doc_id, None) is not None
            self._flush()
        return existed

    async def next_sequence(self, name, start=1000):
        async with self._lock:
            counters = self._col("counters")
            doc = counters.setdefault(name, {"value": start})
            doc["value"] += 1
            self._flush()
            return doc["value"]

    async def adjust_stock(self, deltas):
        async with self._lock:
            products = self._col("products")
            for pid, delta in deltas.items():
                p = products.get(pid)
                available = p.get("stock", 0) if p else 0
                if p is None or available + delta < 0:
                    raise InsufficientStock(pid, available)
            for pid, delta in deltas.items():
                p = products[pid]
                p["stock"] = p.get("stock", 0) + delta
                p["sales_count"] = max(0, p.get("sales_count", 0) - delta)
            self._flush()

    async def increment(self, collection, doc_id, field, delta):
        async with self._lock:
            doc = self._col(collection).setdefault(doc_id, {})
            doc[field] = doc.get(field, 0) + delta
            self._flush()
