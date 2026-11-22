"""What Oddly Assistant knows about the business, in one place.

Every answer here is taken from copy the storefront already publishes (the Help
pages, the Customise page, the product page's care note) or from the values the
shop runs on (app.core.constants, the enabled payment providers). Nothing here is
a new policy. If you change a policy on the site, change it here too:

    frontend/src/pages/HelpPage.tsx          shipping, returns, materials
    frontend/src/features/custom/CustomOrder custom creations
    frontend/src/pages/ProductPage.tsx       care
    frontend/src/pages/CheckoutPage.tsx      PARTIAL_PAYMENT_AVAILABLE

Questions this can't answer are passed to a person (CONTACT_EMAIL).
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from functools import lru_cache

from app.core.constants import EXPRESS_SHIPPING_FEE, FREE_SHIPPING_THRESHOLD, STANDARD_SHIPPING_FEE
from app.core.constants import COD_FEE, PARTIAL_SHARE

CONTACT_EMAIL = "simplyodd2026@gmail.com"

TOPICS = ("about", "shipping", "delivery", "payments", "returns", "refunds", "cancellation", "custom_orders",
          "care", "materials", "international", "contact", "tracking")


def _rupees(n: float) -> str:
    return f"₹{n:,.0f}"


@dataclass(frozen=True)
class Entry:
    id: str
    topic: str
    question: str
    answer: str
    keywords: tuple[str, ...] = field(default_factory=tuple)


def _entries(payment_labels: tuple[str, ...]) -> list[Entry]:
    methods = ", ".join(payment_labels) if payment_labels else "the online payment options shown at checkout"
    share = f"{int(PARTIAL_SHARE * 100)}%"
    partial = (f"Only for personalised pieces. Because they're made just for you, orders with a personalised piece "
               f"are paid {share} online at checkout and the rest when the order is delivered. Other orders are paid "
               "in full online or by cash on delivery.")
    return [
        Entry("about", "about", "What is Simply Odd?",
              "Simply Odd makes quirky, 3D-printed home décor. Everything is designed in-house, printed on our own "
              "machines in small batches, made to order, and inspected by hand before it ships.",
              ("about", "who", "brand", "studio", "company")),
        Entry("ship-when", "shipping", "When will my order ship?",
              "Every piece is made to order, so how long it takes depends on the piece and what else is on the "
              "printers. Your order page shows when it goes into production and when it ships.",
              ("ship", "dispatch", "when", "production", "make", "time")),
        Entry("delivery-time", "delivery", "How long does delivery take?",
              "It depends on where you are and the courier, so we can't promise a date. Once your order ships, its "
              "tracking number on your order page shows where it is.",
              ("delivery", "deliver", "long", "days", "arrive", "timeline", "eta")),
        Entry("ship-cost", "shipping", "What does shipping cost?",
              f"Standard shipping is {_rupees(STANDARD_SHIPPING_FEE)}, and free on orders over "
              f"{_rupees(FREE_SHIPPING_THRESHOLD)}. Express shipping is {_rupees(EXPRESS_SHIPPING_FEE)}.",
              ("shipping", "cost", "charge", "fee", "free", "express", "standard")),
        Entry("packing", "shipping", "How is it packed?",
              "Every piece is wrapped in recycled paper pulp and boxed with enough space that nothing touches the "
              "walls. No plastic fillers.",
              ("pack", "packed", "packaging", "box", "plastic")),
        Entry("tracking", "tracking", "Can I track my order?",
              "Yes. When your order ships we add a tracking number to your order page in your account. If you're "
              "signed in, I can look up your orders here too.",
              ("track", "tracking", "where", "status")),
        Entry("international", "international", "Do you ship outside India?",
              "Not yet. We're working on it.",
              ("international", "abroad", "outside", "overseas", "country", "countries", "worldwide")),
        Entry("payment-methods", "payments", "How can I pay?",
              f"You can pay in full online ({methods}) or by cash on delivery (an extra {_rupees(COD_FEE)}). "
              "Orders with a personalised piece "
              f"are paid {share} online at checkout and the rest on delivery.",
              ("pay", "payment", "methods", "upi", "card", "netbanking", "razorpay")),
        Entry("cod", "payments", "Do you offer cash on delivery?",
              f"Yes, you can pay in cash or UPI when your order arrives, for an extra {_rupees(COD_FEE)}. "
              "It isn't available for orders with a "
              f"personalised piece: those are paid {share} online at checkout and the rest on delivery.",
              ("cod", "cash")),
        Entry("partial", "payments", "Can I pay part now and the rest later?", partial,
              ("partial", "payment", "advance", "half", "installment", "instalment", "later", "deposit", "50")),
        Entry("returns", "returns", "Can I return something?",
              "Unused pieces in their original packaging can be returned within 14 days of delivery for a full "
              "refund of the item price.",
              ("return", "returns", "exchange", "send", "back")),
        Entry("damaged", "returns", "It arrived damaged.",
              f"Email {CONTACT_EMAIL} with your order number and a photo within 48 hours of delivery. We'll remake "
              "it at no cost.",
              ("damaged", "broken", "cracked", "damage", "defect")),
        Entry("refunds", "refunds", "How do refunds work?",
              "Refunds go back to the original payment method within 5–7 business days of the return reaching us.",
              ("refund", "refunds", "money")),
        Entry("cancel", "cancellation", "Can I cancel my order?",
              "You can cancel from your account until the order is in production. After that, return it once it "
              "arrives.",
              ("cancel", "cancellation")),
        Entry("materials", "materials", "What are the pieces made of?",
              "Mostly plant-based PLA. Pieces that meet heat or water, like candle holders and lamps, use PETG. Each "
              "product page lists its materials.",
              ("material", "materials", "made", "pla", "petg", "plastic")),
        Entry("layer-lines", "materials", "Why can I see lines on the surface?",
              "They're the fine layer lines left as each piece is built up. We keep them on purpose, because they "
              "show how the object was made.",
              ("lines", "surface", "layer", "texture")),
        Entry("watertight", "materials", "Are vases watertight?",
              "Vases marked watertight have a sealed interior. Planters include a drainage insert.",
              ("watertight", "water", "vase", "planter", "leak", "drainage")),
        Entry("care", "care", "How do I care for my piece?",
              "Dust with a soft, dry cloth. Keep away from direct heat and strong afternoon sun.",
              ("care", "clean", "cleaning", "dust", "wash", "sun", "heat", "maintain")),
        Entry("custom", "custom_orders", "Can you make something custom?",
              "Yes. Send us a brief with what you have in mind: a description, a reference, the space it is for. "
              "Within three working days we reply with questions, a first sketch and a fixed price. There's no "
              "payment until you've approved the details and the price. I can take your brief here, or you can use "
              "the Customise page.",
              ("custom", "customise", "customize", "bespoke", "personalised", "personalized", "commission", "design")),
        Entry("custom-price", "custom_orders", "How much does a custom piece cost, and how long does it take?",
              "It depends on the design, so the studio confirms a fixed price after reviewing your brief, within "
              "three working days. Timelines are confirmed then too.",
              ("custom", "quote", "price", "cost", "long")),
        Entry("contact", "contact", "How do I contact you?",
              f"Email {CONTACT_EMAIL}. A person from the studio will reply.",
              ("contact", "email", "reach", "human", "person", "support", "help", "phone", "call")),
    ]


_WORD = re.compile(r"[a-z0-9]+")
_FILLER = {"a", "an", "the", "i", "me", "my", "we", "you", "your", "can", "do", "does", "is", "are", "how", "what",
           "when", "will", "it", "to", "of", "for", "on", "in", "and", "or", "if", "make", "get", "there", "any"}


class Knowledge:
    """FAQ search over the entries above. Built once per process (the content is static)."""

    def __init__(self, payment_labels: tuple[str, ...] = ()):
        self.entries = _entries(payment_labels)

    def by_topic(self, topic: str) -> list[Entry]:
        return [e for e in self.entries if e.topic == topic]

    def search(self, question: str = "", topic: str | None = None, limit: int = 3) -> list[Entry]:
        words = set(_WORD.findall(question.lower())) - _FILLER
        pool = [e for e in self.entries if not topic or e.topic == topic]
        scored = []
        for e in pool:
            kw = set(e.keywords)
            score = 3 * len(words & kw) + len(words & set(_WORD.findall(e.question.lower())))
            if score or (topic and not words):
                scored.append((score, e))
        scored.sort(key=lambda s: s[0], reverse=True)
        return [e for _, e in scored[:limit]]


@lru_cache(maxsize=8)
def get_knowledge(payment_labels: tuple[str, ...] = ()) -> Knowledge:
    return Knowledge(payment_labels)
