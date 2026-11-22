"""Deterministic reading of a shopper's message: budget, intent and search words.

Used two ways: to keep the session context (budget, last search) up to date
whatever the model does, and to answer on its own when Groq is unavailable.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

# ---------------------------------------------------------------- budget
_NUM = r"(?:₹|rs\.?|inr|rupees?)?\s*(\d[\d,]*(?:\.\d+)?)\s*(k)?\s*(?:₹|rs\.?|inr|rupees?|/-)?"
_BETWEEN = re.compile(rf"(?:between|from)\s+{_NUM}\s*(?:and|to|-|–)\s*{_NUM}", re.I)
_RANGE = re.compile(rf"{_NUM}\s*(?:-|–|to)\s*{_NUM}", re.I)
_UNDER = re.compile(rf"(?:under|below|less than|within|upto|up to|max(?:imum)?|cheaper than|not more than|<|budget(?: of| is)?)\s*{_NUM}", re.I)
_OVER = re.compile(rf"(?:over|above|more than|at least|min(?:imum)?|starting|>)\s*{_NUM}", re.I)


def _amount(digits: str, k: str | None) -> float:
    value = float(digits.replace(",", ""))
    return value * 1000 if k else value


@dataclass
class Budget:
    min: float | None = None
    max: float | None = None

    def as_dict(self) -> dict:
        return {"min": self.min, "max": self.max}


def parse_budget(text: str) -> Budget | None:
    """'under ₹1,500' → max 1500; 'between 1000 and 2000' → 1000..2000; '₹2k-3k' → 2000..3000."""
    for pattern in (_BETWEEN, _RANGE):
        if m := pattern.search(text):
            lo, hi = _amount(m.group(1), m.group(2)), _amount(m.group(3), m.group(4))
            if lo > hi:
                lo, hi = hi, lo
            # A bare "10-12" is more likely a size than a price.
            if hi >= 100:
                return Budget(lo, hi)
    hi = _UNDER.search(text)
    lo = _OVER.search(text)
    if hi or lo:
        return Budget(_amount(lo.group(1), lo.group(2)) if lo else None, _amount(hi.group(1), hi.group(2)) if hi else None)
    return None


# ---------------------------------------------------------------- intents

_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("order_status", re.compile(r"\b(my orders?|order status|track(ing)?|where is my|om-\d+|order (no|number|#))\b", re.I)),
    ("custom_enquiry", re.compile(
        r"\b(custom\w*|customi[sz]\w*|bespoke|commission\w*|made for me|one[- ]off|personali[sz]\w*|"
        r"(my|our) (own )?(idea|design|concept|sketch|drawing)s?|own (idea|design|concept)s?|i have an? (idea|design)|"
        r"(make|made|design|create|print) (it |one |something |this )?(for me|to my|from my|as per my|according to my)|"
        r"can (you|u) (make|design|create|print) (me |something|a |an |my )|"
        r"(with|put) (my|a|our|their) (name|photo|logo|text|initials) on)\b"
        r"|^\s*(an? |my )?(own )?ideas?\s*[?.!]*\s*$", re.I)),
    ("compare", re.compile(r"\b(compare|comparison|versus|vs\.?|difference between|which is better)\b", re.I)),
    ("faq", re.compile(r"\b(ship(ping)?|deliver(y|ed)?|return|refund|cancel|payment|pay|cod|cash on|partial|upi|"
                        r"care|clean|contact|email|phone|international|abroad|packag|watertight|damaged|broken)\b", re.I)),
    ("product_details", re.compile(r"\b(dimensions?|how (big|tall|wide|large)|size of|made of|material|colou?rs?|"
                                    r"tell me (more )?about|details|weight|available in)\b", re.I)),
]
_GREETING = re.compile(r"^\s*(hi|hello|hey|hiya|namaste|good (morning|afternoon|evening))[\s!.]*$", re.I)


def detect_intent(text: str) -> str:
    if _GREETING.match(text):
        return "greeting"
    for name, pattern in _PATTERNS:
        if pattern.search(text):
            return name
    return "product_search"


# --------------------------------------------------------------- keywords
_STOP = set("""
a an and any are as at be best buy can could do does find for from get give good have help i id i'd im i'm in is it
its looking like me more my need nice of on one ones or our please recommend recommendation recommendations see
send show some something somethings suggest suggestion suggestions that the them there these thing things this
to under unique want what which with would you your below over above between less than upto up within budget cheap
cheapest affordable premium expensive luxury price priced prices rs inr rupees options option products product
piece pieces item items available stock got sell selling have range collection explore browse decorative another
other else also all lot really very kind sort type style styles just only k
""".split())

# Words shoppers use, mapped to words likely to appear in the shop's own category names or slugs.
# These are matched against the real categories at runtime; nothing here names a product.
CATEGORY_HINTS: dict[str, tuple[str, ...]] = {
    "lamp": ("light", "lamp"), "lamps": ("light", "lamp"), "light": ("light", "lamp"), "lights": ("light", "lamp"),
    "lighting": ("light",), "sculpture": ("sculpt",), "sculptures": ("sculpt",), "idol": ("sculpt", "idol"),
    "idols": ("sculpt", "idol"), "statue": ("sculpt", "statue"), "statues": ("sculpt", "statue"),
    "figurine": ("sculpt",), "figurines": ("sculpt",), "desk": ("desk",), "office": ("desk",),
    "decor": ("decor",), "décor": ("decor",), "home": ("decor",), "organizer": ("organi",),
    "organizers": ("organi",), "organiser": ("organi",), "storage": ("organi",), "weird": ("weird",),
    "quirky": ("weird",), "odd": ("weird",),
}
# Words that describe the purpose rather than the object; they steer sorting, not matching.
GIFT_WORDS = {"gift", "gifts", "gifting", "present", "presents", "birthday", "anniversary", "housewarming", "diwali"}


def _singular(w: str) -> str:
    if len(w) > 4 and w.endswith("ies"):
        return w[:-3] + "y"
    if len(w) > 3 and w.endswith("s") and not w.endswith("ss"):
        return w[:-1]
    return w


@dataclass
class Parsed:
    intent: str
    budget: Budget | None
    words: list[str] = field(default_factory=list)       # search words, singular
    category_hints: list[str] = field(default_factory=list)
    gift: bool = False
    sort: str | None = None                                # price_asc / price_desc when asked for


def parse(text: str) -> Parsed:
    lower = text.lower()
    budget = parse_budget(lower)
    stripped = lower
    for pattern in (_BETWEEN, _RANGE, _UNDER, _OVER):
        stripped = pattern.sub(" ", stripped)
    tokens = re.findall(r"[a-zà-ÿ]+", stripped)
    hints: list[str] = []
    words: list[str] = []
    gift = False
    for t in tokens:
        if t in GIFT_WORDS:
            gift = True
            continue
        if t in CATEGORY_HINTS:
            hints.extend(h for h in CATEGORY_HINTS[t] if h not in hints)
            # Keep the object word too ("lamp" also matches tags), but not generic ones.
            if t not in ("home", "decor", "décor", "office", "weird", "quirky", "odd", "lighting", "storage"):
                words.append(_singular(t))
            continue
        if t in _STOP or len(t) < 3:
            continue
        words.append(_singular(t))
    sort = None
    if re.search(r"\b(cheapest|lowest price|least expensive|most affordable|budget friendly)\b", lower):
        sort = "price_asc"
    elif re.search(r"\b(premium|luxur|most expensive|high[- ]end|statement)\w*", lower):
        sort = "price_desc"
    return Parsed(detect_intent(text), budget, list(dict.fromkeys(words)), hints, gift, sort)


def is_confirmation(text: str) -> bool:
    """An explicit yes to sending an enquiry. Deliberately narrow."""
    return bool(re.search(r"^\s*(yes|yep|yeah|confirm(ed)?|submit( it)?|send( it)?|go ahead|please (send|submit)|"
                          r"looks good|that'?s (right|correct)|correct)\b", text, re.I))


EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
URL = re.compile(r"https?://[^\s<>\"']+", re.I)
