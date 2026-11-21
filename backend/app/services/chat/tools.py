"""The only things Oddly Assistant can do, each a trusted backend function.

The model chooses a tool and proposes arguments; this module validates the
arguments with Pydantic, applies every business rule itself (published products
only, the customer's own orders only, explicit confirmation before an enquiry is
sent) and returns plain data. The model never sees a query language, and nothing
it says can widen what a tool returns.
"""
from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, TypeAdapter, ValidationError

from app.core.errors import NotFound
from app.models.catalog import Category, Product
from app.models.chat import (
    ChatProduct, Comparison, ComparisonRow, EnquiryDraft, FaqItem, OrderLine, OrderSummary, ReplyType,
)
from app.models.filament import FILAMENTS_BY_ID
from app.models.marketing import CustomRequestIn
from app.models.order import Order
from app.models.user import AuthUser
from app.services.catalog import CatalogService
from app.services.chat.knowledge import CONTACT_EMAIL, TOPICS, Knowledge
from app.services.chat.parsing import CATEGORY_HINTS, is_confirmation, parse
from app.services.insights import InsightsService
from app.services.orders import OrderService

log = logging.getLogger(__name__)

MAX_RESULTS = 4
STATUS_LABEL = {
    "pending": "Awaiting payment", "confirmed": "Confirmed", "processing": "Being made", "shipped": "Shipped",
    "out_for_delivery": "Out for delivery", "delivered": "Delivered", "cancelled": "Cancelled",
    "refunded": "Refunded",
}


# ------------------------------------------------------------- arguments
class _Args(BaseModel):
    # Models sometimes add stray keys; ignore them rather than fail, but never trust their values.
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)


class SearchArgs(_Args):
    keywords: str | None = Field(default=None, max_length=120)
    category: str | None = Field(default=None, max_length=60)
    min_price: float | None = Field(default=None, ge=0, le=1_000_000)
    max_price: float | None = Field(default=None, ge=0, le=1_000_000)
    # Every published piece is made to order, so "available" means published; unpublished pieces are never returned.
    availability: Literal["available", "any"] = "available"
    sort: Literal["relevance", "popular", "newest", "price_asc", "price_desc"] | None = None


class DetailsArgs(_Args):
    product_id: str = Field(min_length=1, max_length=140)


class CompareArgs(_Args):
    product_ids: list[str] = Field(min_length=2, max_length=4)


class FaqArgs(_Args):
    question: str = Field(default="", max_length=300)
    topic: Literal[TOPICS] | None = None  # type: ignore[valid-type]


class CustomerDetails(_Args):
    name: str | None = Field(default=None, max_length=80)
    email: str | None = Field(default=None, max_length=200)


class Requirements(_Args):
    idea: str | None = Field(default=None, max_length=2000)
    reference_url: str | None = Field(default=None, max_length=500)
    dimensions: str | None = Field(default=None, max_length=120)
    colours: list[str] | None = Field(default=None, max_length=8)
    quantity: int | None = Field(default=None, ge=1, le=500)
    notes: str | None = Field(default=None, max_length=1000)


class EnquiryArgs(_Args):
    customer_details: CustomerDetails = CustomerDetails()
    requirements: Requirements = Requirements()
    # Only honoured when the shopper's latest message is an explicit yes to a summary they've already seen.
    confirmed: bool = False


class OrderArgs(_Args):
    order_id: str | None = Field(default=None, max_length=40)


class BusinessArgs(_Args):
    topic: Literal[TOPICS]  # type: ignore[valid-type]


ARGS: dict[str, type[_Args]] = {
    "search_products": SearchArgs, "get_product_details": DetailsArgs, "compare_products": CompareArgs,
    "search_faq": FaqArgs, "create_custom_enquiry": EnquiryArgs, "get_order_status": OrderArgs,
    "get_business_information": BusinessArgs,
}


def _fn(name: str, description: str, properties: dict, required: list[str] | None = None) -> dict:
    return {"type": "function", "function": {
        "name": name, "description": description,
        "parameters": {"type": "object", "properties": properties, "required": required or []},
    }}


_STR = {"type": "string"}
_NUM = {"type": "number", "minimum": 0}
# Kept terse on purpose: these definitions go with every model call, and Groq's free tier counts every token.
TOOL_SCHEMAS: list[dict] = [
    _fn("search_products", "Find catalogue products, for any product request or follow-up.", {
        "keywords": {**_STR, "description": "What it is or depicts, e.g. 'krishna'. Not generic words."},
        "category": {**_STR, "description": "e.g. 'lighting', 'sculptures'"},
        "min_price": {**_NUM, "description": "INR"},
        "max_price": {**_NUM, "description": "INR"},
        "availability": {"type": "string", "enum": ["available", "any"]},
        "sort": {"type": "string", "enum": ["relevance", "popular", "newest", "price_asc", "price_desc"]},
    }),
    _fn("get_product_details", "One product's sizes, materials, colours, versions, personalisation.",
        {"product_id": {**_STR, "description": "id, slug or exact name"}}, ["product_id"]),
    _fn("compare_products", "Compare 2-4 products. Pass ids or exact names directly.",
        {"product_ids": {"type": "array", "items": _STR, "minItems": 2, "maxItems": 4}}, ["product_ids"]),
    _fn("search_faq", "Shop policies: shipping, payments, returns, care, custom orders, contact.",
        {"question": _STR, "topic": {"type": "string", "enum": list(TOPICS)}}),
    _fn("create_custom_enquiry", "Collect a custom-creation brief; reports what's missing. confirmed=true only "
        "after the customer saw the summary and said yes.", {
            "customer_details": {"type": "object", "properties": {"name": _STR, "email": _STR}},
            "requirements": {"type": "object", "properties": {
                "idea": _STR, "reference_url": _STR, "dimensions": _STR,
                "colours": {"type": "array", "items": _STR}, "quantity": {"type": "integer", "minimum": 1},
                "notes": _STR}},
            "confirmed": {"type": "boolean"},
        }),
    _fn("get_order_status", "The signed-in customer's own orders. Omit order_id for recent ones.",
        {"order_id": {**_STR, "description": "e.g. OM-1001"}}),
    _fn("get_business_information", "About Simply Odd on one topic.",
        {"topic": {"type": "string", "enum": list(TOPICS)}}, ["topic"]),
]


# --------------------------------------------------------------- results
@dataclass
class ToolContext:
    user: AuthUser | None
    session_id: str
    context: dict                 # the session's structured context; tools may update it
    user_message: str


@dataclass
class ToolResult:
    data: dict                                     # what the model sees (compact)
    type: ReplyType = "text"
    products: list[ChatProduct] = field(default_factory=list)
    comparison: Comparison | None = None
    faq: list[FaqItem] = field(default_factory=list)
    enquiry: EnquiryDraft | None = None
    orders: list[OrderSummary] = field(default_factory=list)
    ok: bool = True

    def for_model(self) -> str:
        return json.dumps(self.data, ensure_ascii=False, default=str, separators=(",", ":"))


def card(p: Product) -> ChatProduct:
    prices = {v.price for v in p.variants}
    summary = p.tagline or re.sub(r"\s+", " ", p.description).strip()
    return ChatProduct(
        id=p.id, slug=p.slug, name=p.name, price=p.price, compare_at_price=p.compare_at_price,
        price_varies=len(prices) > 1, image=p.images[0].url if p.images else None,
        url=f"/product/{p.slug}", summary=summary[:160],
    )


def _brief(p: Product, cats: dict[str, str]) -> dict:
    out: dict[str, Any] = {"id": p.id, "name": p.name, "price": p.price,
                           "category": cats.get(p.category_id or "", ""), "summary": (p.tagline or p.description)[:120]}
    if len({v.price for v in p.variants}) > 1:
        out["price_from"] = min(v.price for v in p.variants)
    return out


def _dims(p: Product) -> str | None:
    d = p.dimensions
    if not any((d.width_cm, d.height_cm, d.depth_cm)):
        return None
    return " × ".join(f"{x:g}" if x else "–" for x in (d.width_cm, d.height_cm, d.depth_cm)) + " cm (W × H × D)"


def _order_summary(o: Order) -> OrderSummary:
    return OrderSummary(
        id=o.id, number=o.number or o.id, status=o.status, status_label=STATUS_LABEL.get(o.status, o.status),
        total=o.total, currency=o.currency, created_at=o.created_at, tracking_number=o.tracking_number,
        items=[OrderLine(name=i.name, quantity=i.quantity) for i in o.items][:6], url=f"/account/orders/{o.id}",
    )


_EMAIL = TypeAdapter(EmailStr)


def _err(message: str, **extra) -> ToolResult:
    return ToolResult(data={"error": message, **extra}, ok=False)


# ----------------------------------------------------------------- tools
class ChatTools:
    def __init__(self, catalog: CatalogService, orders: OrderService, insights: InsightsService,
                 knowledge: Knowledge):
        self.catalog = catalog
        self.orders = orders
        self.insights = insights
        self.knowledge = knowledge

    async def run(self, name: str, raw_args: str | dict | None, ctx: ToolContext) -> ToolResult:
        """Validate and execute one tool call. Never raises for bad input: errors go back to the model."""
        model = ARGS.get(name)
        if model is None:
            return _err(f"Unknown tool {name!r}")
        try:
            raw = json.loads(raw_args) if isinstance(raw_args, str) and raw_args.strip() else (raw_args or {})
            if not isinstance(raw, dict):
                raise ValueError("arguments must be an object")
            args = model.model_validate(raw)
        except (ValueError, ValidationError) as exc:
            log.info("Rejected %s arguments: %s", name, str(exc)[:200])
            return _err("Invalid arguments", detail=str(exc)[:300])
        try:
            return await getattr(self, name)(args, ctx)
        except NotFound as exc:
            return _err(exc.detail)

    # ------------------------------------------------------------ catalogue
    async def _categories(self) -> list[Category]:
        return await self.catalog.list_categories()

    async def resolve_category(self, text: str | None, cats: list[Category] | None = None) -> Category | None:
        """A category from a slug, a name, or a shopper's word for it, matched against the real categories."""
        if not text:
            return None
        cats = cats if cats is not None else await self._categories()
        t = text.strip().lower()
        for c in cats:
            if t in (c.id.lower(), c.slug.lower(), c.name.lower()):
                return c
        hints = [h for w in re.findall(r"[a-zé]+", t) for h in CATEGORY_HINTS.get(w, (w,))]
        for h in hints:
            for c in cats:
                if len(h) >= 4 and (h in c.slug.lower() or h in c.name.lower()):
                    return c
        return None

    async def search_products(self, a: SearchArgs, ctx: ToolContext) -> ToolResult:
        cats = await self._categories()
        names = {c.id: c.name for c in cats}
        category = await self.resolve_category(a.category, cats)
        lo, hi = a.min_price, a.max_price
        if lo is not None and hi is not None and lo > hi:
            lo, hi = hi, lo
        parsed = parse(a.keywords or "")
        words = parsed.words
        # Words that only name the category ("sculpture" with category=sculptures) would just repeat the filter.
        if category is None and parsed.category_hints and not a.category:
            category = await self.resolve_category(" ".join(parsed.category_hints), cats)
        if category:
            words = [w for w in words if not any(h in category.slug or h in category.name.lower()
                                                 for h in CATEGORY_HINTS.get(w, CATEGORY_HINTS.get(w + "s", ())))]
        q = " ".join(words) or None
        sort = a.sort or ("relevance" if q else "popular")

        async def find(query: str | None):
            return await self.catalog.list_products(q=query, category=category.id if category else None,
                                                    min_price=lo, max_price=hi, sort=sort if query or sort != "relevance" else "popular",
                                                    page_size=MAX_RESULTS)

        page = await find(q)
        exact = page.total > 0
        note = None
        if not exact and q:
            # Nothing matches every word. Offer the nearest pieces under the same filters, and say so.
            fallback = await find(None) if (category or lo is not None or hi is not None) else None
            if fallback and fallback.items:
                page = fallback
                note = (f"No product matches '{q}'. These are other pieces"
                        f"{' in ' + category.name if category else ''}{' in the price range' if lo or hi else ''}; "
                        "present them as alternatives, not matches, and mention custom creations.")
            else:
                note = f"No product matches '{q}'. Suggest a custom creation or a broader search."
        elif not exact:
            note = "Nothing in the catalogue matches these filters."

        ctx.context["last_search"] = {"keywords": q, "category": category.slug if category else None,
                                      "min_price": lo, "max_price": hi}
        if lo is not None or hi is not None:
            ctx.context["budget"] = {"min": lo, "max": hi}
        ctx.context["recent_products"] = [{"id": p.id, "name": p.name, "price": p.price} for p in page.items]
        data = {"exact_match": exact, "total": page.total if exact else 0,
                "filters": {"keywords": q, "category": category.name if category else None,
                            "min_price": lo, "max_price": hi},
                "products": [_brief(p, names) for p in page.items]}
        if a.category and not category:
            data["category_note"] = f"No category called {a.category!r}; searched everything."
        if note:
            data["note"] = note
        return ToolResult(data=data, type="product_recommendations" if page.items else "text",
                          products=[card(p) for p in page.items])

    async def _find_product(self, ref: str) -> Product | None:
        try:
            return await self.catalog.get_product(ref)
        except NotFound:
            pass
        # The model may pass a name it saw; accept it only when it names exactly one product.
        page = await self.catalog.list_products(q=ref, page_size=5)
        named = [p for p in page.items if p.name.lower() == ref.strip().lower()]
        return named[0] if len(named) == 1 else None

    async def get_product_details(self, a: DetailsArgs, ctx: ToolContext) -> ToolResult:
        p = await self._find_product(a.product_id)
        if p is None:
            return _err("No published product with that id", product_id=a.product_id)
        cat = await self.catalog.get_category(p.category_id, missing_ok=True) if p.category_id else None
        colours = [FILAMENTS_BY_ID[c].name for c in p.colors if c in FILAMENTS_BY_ID]
        missing = [k for k, v in (("dimensions", _dims(p)), ("materials", p.materials), ("weight", p.weight_g),
                                  ("description", p.description)) if not v]
        data = {
            "id": p.id, "name": p.name, "url": f"/product/{p.slug}", "price": p.price,
            "compare_at_price": p.compare_at_price, "category": cat.name if cat else None,
            "tagline": p.tagline, "description": p.description[:700], "materials": p.materials,
            "dimensions": _dims(p), "weight_g": p.weight_g, "making": p.manufacturing or None,
            "colours": colours or "Comes as pictured",
            "versions": [{"label": v.label, "price": v.price} for v in p.variants] or None,
            "version_label": p.variant_label or None,
            "personalisation": ([f.label for f in p.personalization] or None),
            "personalisation_fee": p.personalization_fee or None,
            "rating": {"average": p.rating.average, "count": p.rating.count} if p.rating.count else None,
            "availability": "Available to order. Every piece is made to order.",
            "care": "Dust with a soft, dry cloth. Keep away from direct heat and strong afternoon sun.",
            "customisable": "A different size or colour, or a name on it, can be requested as a custom enquiry.",
            "not_listed": missing or None,
        }
        ctx.context["recent_products"] = [{"id": p.id, "name": p.name, "price": p.price}] + [
            r for r in ctx.context.get("recent_products", []) if r.get("id") != p.id][:5]
        return ToolResult(data={k: v for k, v in data.items() if v not in (None, [], "")},
                          type="product_recommendations", products=[card(p)])

    async def compare_products(self, a: CompareArgs, ctx: ToolContext) -> ToolResult:
        found: list[Product] = []
        unknown = []
        for ref in dict.fromkeys(a.product_ids):
            p = await self._find_product(ref)
            if p and p.id not in {f.id for f in found}:
                found.append(p)
            elif not p:
                unknown.append(ref)
        if len(found) < 2:
            return _err("Need at least two published products to compare", unknown=unknown)
        cats = {c.id: c.name for c in await self._categories()}

        def price(p: Product) -> str:
            prices = sorted({v.price for v in p.variants})
            return f"₹{p.price:,.0f}" + (f" (₹{prices[0]:,.0f}–₹{prices[-1]:,.0f} by version)" if len(prices) > 1 else "")

        rows = [
            ComparisonRow(label="Price", values=[price(p) for p in found]),
            ComparisonRow(label="Dimensions", values=[_dims(p) or "Not listed" for p in found]),
            ComparisonRow(label="Material", values=[", ".join(p.materials) or "Not listed" for p in found]),
            ComparisonRow(label="Category", values=[cats.get(p.category_id or "", "–") for p in found]),
            ComparisonRow(label="Design", values=[(p.tagline or p.description[:90] or "Not listed") for p in found]),
            ComparisonRow(label="Colours", values=[
                ", ".join(FILAMENTS_BY_ID[c].name for c in p.colors if c in FILAMENTS_BY_ID) or "As pictured"
                for p in found]),
            ComparisonRow(label="Personalisation", values=[
                ("Yes" + (f", +₹{p.personalization_fee:,.0f}" if p.personalization_fee else "")) if p.personalization
                else "No" for p in found]),
            ComparisonRow(label="Rating", values=[
                f"{p.rating.average:.1f} ({p.rating.count})" if p.rating.count else "No reviews yet" for p in found]),
            ComparisonRow(label="Availability", values=["Made to order" for _ in found]),
        ]
        ctx.context["recent_products"] = [{"id": p.id, "name": p.name, "price": p.price} for p in found]
        comparison = Comparison(products=[card(p) for p in found], rows=rows)
        data = {"products": [p.name for p in found], "rows": [r.model_dump() for r in rows]}
        if unknown:
            data["unknown"] = unknown
        return ToolResult(data=data, type="product_comparison", products=comparison.products, comparison=comparison)

    # ------------------------------------------------------------ knowledge
    async def search_faq(self, a: FaqArgs, ctx: ToolContext) -> ToolResult:
        hits = self.knowledge.search(a.question or ctx.user_message, a.topic)
        if not hits:
            return ToolResult(data={"found": False, "note": "No published policy covers this. Don't guess; offer "
                                    f"to pass it to the studio at {CONTACT_EMAIL}."}, type="faq")
        items = [FaqItem(question=e.question, answer=e.answer) for e in hits]
        return ToolResult(data={"found": True, "answers": [i.model_dump() for i in items]}, type="faq", faq=items)

    async def get_business_information(self, a: BusinessArgs, ctx: ToolContext) -> ToolResult:
        hits = self.knowledge.by_topic(a.topic)
        items = [FaqItem(question=e.question, answer=e.answer) for e in hits][:4]
        if not items:
            return ToolResult(data={"found": False, "contact": CONTACT_EMAIL}, type="faq")
        return ToolResult(data={"topic": a.topic, "answers": [i.model_dump() for i in items]}, type="faq", faq=items)

    # --------------------------------------------------------------- orders
    async def get_order_status(self, a: OrderArgs, ctx: ToolContext) -> ToolResult:
        user = ctx.user
        if user is None or user.is_anonymous:
            return ToolResult(data={"error": "sign_in_required",
                                    "note": "Order details are private. Ask the customer to sign in, then ask again. "
                                            "Guest checkout orders are on the order confirmation page."},
                              type="order_status", ok=False)
        mine = await self.orders.list_for_user(user.uid)
        # Strictly the signed-in customer's own orders, admins included: the chat never shows anyone else's.
        mine = [o for o in mine if o.user_id == user.uid]
        if a.order_id:
            ref = a.order_id.strip().lower().lstrip("#")
            match = [o for o in mine if ref in (o.id.lower(), o.number.lower())]
            if not match:
                return ToolResult(data={"error": "not_found", "note": "No order with that number on this account."},
                                  type="order_status", ok=False)
            orders = match
        else:
            orders = mine[:5]
        summaries = [_order_summary(o) for o in orders]
        return ToolResult(
            data={"orders": [{"number": s.number, "status": s.status_label, "total": s.total,
                              "placed": s.created_at.date().isoformat(), "tracking_number": s.tracking_number,
                              "items": [f"{i.quantity} × {i.name}" for i in s.items]} for s in summaries]
                  or "This account has no orders yet."},
            type="order_status", orders=summaries)

    # ------------------------------------------------------------- enquiry
    async def create_custom_enquiry(self, a: EnquiryArgs, ctx: ToolContext) -> ToolResult:
        draft = EnquiryDraft.model_validate(ctx.context.get("enquiry") or {})
        if draft.submitted:
            draft = EnquiryDraft()  # a new brief after a sent one
        patch = {**a.customer_details.model_dump(exclude_none=True), **a.requirements.model_dump(exclude_none=True)}
        changed = any(getattr(draft, k) != v for k, v in patch.items())
        draft = draft.model_copy(update=patch)
        user = ctx.user
        if user and not user.is_anonymous:
            draft.name = draft.name or user.name
            draft.email = draft.email or (str(user.email) if user.email else None)
        draft = validate_draft(draft)
        shown = bool(ctx.context.get("enquiry_shown")) and not changed

        if a.confirmed and draft.ready:
            if not (shown and is_confirmation(ctx.user_message)):
                # The model may not decide for the customer: they must say yes to the summary they were shown.
                ctx.context["enquiry"] = draft.model_dump()
                ctx.context["enquiry_shown"] = True
                return ToolResult(data={"status": "needs_confirmation", "summary": _summary(draft),
                                        "note": "Show the summary and ask the customer to confirm."},
                                  type="custom_enquiry", enquiry=draft)
            req = await self.submit(draft, ctx.session_id, user)
            draft.submitted, draft.request_id = True, req
            ctx.context["enquiry"] = draft.model_dump()
            ctx.context["enquiry_shown"] = False
            return ToolResult(data={"status": "submitted", "reference": req,
                                    "note": "Tell them the studio replies within three working days with questions, "
                                            "a sketch and a fixed price. Don't promise price, feasibility or dates."},
                              type="custom_enquiry", enquiry=draft)

        ctx.context["enquiry"] = draft.model_dump()
        ctx.context["enquiry_shown"] = draft.ready
        status = "ready_for_confirmation" if draft.ready else "collecting"
        return ToolResult(data={"status": status, "missing": draft.missing, "problems": draft.errors,
                                "summary": _summary(draft)}, type="custom_enquiry", enquiry=draft)

    async def submit(self, draft: EnquiryDraft, session_id: str, user: AuthUser | None) -> str:
        """Send a validated brief through the same path as the Customise page."""
        body = CustomRequestIn(
            name=draft.name or "", email=draft.email or "", idea=draft.idea or "", kind="other",
            colours=draft.colours, reference_url=draft.reference_url, dimensions=draft.dimensions,
            quantity=draft.quantity, notes=draft.notes,
        )
        req = await self.insights.request_custom(body, source="chat", chat_session_id=session_id,
                                                 user_id=user.uid if user and not user.is_anonymous else None)
        return req.id


def validate_draft(draft: EnquiryDraft) -> EnquiryDraft:
    """Mark what's missing or wrong. Same rules as the Customise form (CustomRequestIn)."""
    errors, missing = [], []
    if not (draft.name and draft.name.strip()):
        missing.append("name")
    if not draft.email:
        missing.append("email")
    else:
        try:
            draft.email = str(_EMAIL.validate_python(draft.email.strip())).lower()
        except ValidationError:
            errors.append("The email address doesn't look right.")
    if not draft.idea:
        missing.append("idea")
    elif len(draft.idea.strip()) < 10:
        errors.append("The idea needs a little more detail (at least 10 characters).")
    if draft.reference_url:
        if not re.match(r"^https?://[^\s/]+\.[^\s]+$", draft.reference_url.strip(), re.I):
            errors.append("The reference link should be a web address starting with https://")
    draft.colours = [c.strip()[:20] for c in draft.colours if c.strip()][:8]
    draft.missing, draft.errors = missing, errors
    draft.ready = not missing and not errors
    return draft


def _summary(d: EnquiryDraft) -> dict:
    return {k: v for k, v in d.model_dump(include={"name", "email", "idea", "reference_url", "dimensions", "colours",
                                                   "quantity", "notes"}).items() if v}
