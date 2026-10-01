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


class InsufficientStock(Exception):
    def __init__(self, product_id: str, available: int):
        self.product_id = product_id
        self.available = available
        super().__init__(f"Only {available} left of {product_id}")


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

    async def adjust_stock(self, deltas: dict[str, int]) -> None:
        """Atomically add `delta` to each product's stock (negative = reserve).
        Also moves `sales_count` in the opposite direction. Raises
        InsufficientStock and applies nothing if any product would go below 0."""
        ...

    async def increment(self, collection: str, doc_id: str, field: str, delta: float) -> None: ...
