"""Storage abstraction.

The business layer talks to a tiny document-store interface rather than to
Firestore directly. That keeps services testable (an in-memory store backs the
test-suite and local development) and keeps the door open to a different
database later without touching services or routes.
"""
from __future__ import annotations

from typing import Any, Literal, Protocol

WhereOp = Literal["==", "!=", "<", "<=", ">", ">=", "in", "array_contains"]
Where = tuple[str, WhereOp, Any]


class DocumentStore(Protocol):
    async def get(self, collection: str, doc_id: str) -> dict | None: ...

    async def get_many(self, collection: str, ids: list[str]) -> dict[str, dict]: ...

    async def list(
        self,
        collection: str,
        where: list[Where] | None = None,
        order_by: str | None = None,
        descending: bool = False,
        limit: int | None = None,
    ) -> list[dict]: ...

    async def set(self, collection: str, doc_id: str, data: dict) -> dict: ...

    async def update(self, collection: str, doc_id: str, patch: dict) -> dict | None: ...

    async def delete(self, collection: str, doc_id: str) -> bool: ...

    async def next_sequence(self, name: str, start: int = 1000) -> int: ...

    async def record_sales(self, deltas: dict[str, int]) -> None:
        """Atomically add `delta` to each product's `sales_count` (negative = undo
        a sale). Products that no longer exist are skipped."""
        ...

    async def increment(self, collection: str, doc_id: str, field: str, delta: float) -> None: ...
