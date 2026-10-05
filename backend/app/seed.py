"""Demo catalogue. Seeded automatically on the memory backend; run
`python -m scripts.seed` to push it to Firestore."""
from __future__ import annotations

import logging
import random
from datetime import timedelta

from app.core.container import Services
from app.core.utils import now
from app.models.catalog import CategoryCreate, Dimensions, ProductCreate, ProductImage
from app.models.marketing import CouponCreate
from app.models.order import StatusEvent

log = logging.getLogger(__name__)

CATEGORIES = [
    ("Home Décor", "home-decor", "Vases, bowls and planters with opinions.", "melt-vase"),
    ("Lighting", "lighting", "Lamps that change the mood of a room when they're off, too.", "fungal-lamp"),
    ("Sculptures", "sculptures", "Objects whose only job is to be looked at.", "pebble-tower"),
    ("Desk Objects", "desk-objects", "Things for the desk you'll pick up during every call.", "stair-to-nowhere"),
    ("Organizers", "organizers", "Somewhere for the clutter to live, beautifully.", "vortex-pen-cup"),
    ("Weird Things", "weird-things", "We couldn't categorise these. Neither can you.", "egg-on-legs"),
]

PLA = "Plant-based PLA, built up in 0.16 mm layers and hand-finished"

# slug, name, category, price, compare_at, stock, tagline, description, tags, materials, (w,h,d), weight, flags, sales
PRODUCTS = [
    ("melt-vase", "Melt Vase", "home-decor", 2490, 2990, 14,
     "A vase caught halfway through changing its mind.",
     "The Melt Vase leans, twists and softens as it rises, as if it paused mid-thought. Sixteen spiralling ribs catch light differently through the day. Watertight inside, so fresh stems are fine.",
     ["vase", "twisted", "flowers", "pink"], [PLA, "Watertight inner coating"], (16, 24, 16), 420, "fbn", 128),
    ("spine-vase", "Spine Vase", "home-decor", 1890, None, 22,
     "Seven vertebrae, one stem.",
     "A tall bud vase built from stacked rings, like a spine standing up on its own. Holds a single stem or a dried branch.",
     ["vase", "bud vase", "black", "tall"], [PLA], (10, 30, 10), 260, "b", 96),
    ("gourd-of-questions", "Gourd of Questions", "home-decor", 3290, None, 6,
     "Swollen, fluted and slightly smug.",
     "A bulbous floor-to-shelf vessel with ten soft flutes. It looks heavy and isn't. Use as a vase with a liner, or leave empty and let people ask.",
     ["vessel", "vase", "white", "fluted"], [PLA, "Matte mineral finish"], (28, 25, 28), 610, "f", 41),
    ("fungal-lamp", "Fungal Lamp", "lighting", 5490, 6490, 9,
     "Grew overnight. Glows all evening.",
     "A mushroom table lamp with a 28-rib cap that throws a soft, scalloped halo on the table. Warm dimmable LED included; the cap is made in translucent peach so it glows warm when lit.",
     ["lamp", "mushroom", "table lamp", "led"], ["Translucent PETG cap", "Weighted PLA base", "2700K dimmable LED"], (44, 33, 44), 1240, "fbn", 87),
    ("hanging-bell", "Hanging Bell", "lighting", 6890, None, 4,
     "A pendant that rings with light, not sound.",
     "A bell-shaped pendant with a slow twist in its ribs so the light leaks out in a spiral. Ships with 1.5 m of black fabric cord and a ceiling rose.",
     ["pendant", "lamp", "ceiling", "white"], ["Diffusing PETG shade", "Fabric-wrapped cord", "E27 fitting"], (38, 30, 38), 780, "f", 33),
    ("ghost-lamp", "Ghost Lamp", "lighting", 4290, None, 0,
     "The friendliest thing in the corner.",
     "A floor-hugging lamp with a wobbling silhouette and a surface that ripples near the base. At night it looks like it moved slightly. It didn't. Probably.",
     ["lamp", "ghost", "white", "night light"], ["Translucent PLA", "USB-C LED module"], (30, 56, 30), 900, "b", 64),
    ("pebble-tower", "Pebble Tower", "sculptures", 2790, None, 18,
     "Three stones, balanced on purpose.",
     "A stacked-stone sculpture that sways off axis without ever tipping. Made as a single piece, so the balance is permanent.",
     ["sculpture", "stones", "balance", "black"], [PLA, "Stone-texture finish"], (30, 56, 30), 700, "n", 22),
    ("egg-on-legs", "Egg on Legs", "weird-things", 1990, 2490, 25,
     "It's an egg. It has legs. Next question.",
     "A smooth white egg perched on three thin steel legs. Serves no purpose and gets the most questions of anything on the shelf.",
     ["egg", "weird", "white", "legs"], [PLA, "Powder-coated steel legs"], (26, 34, 24), 340, "fb", 152),
    ("vortex-pen-cup", "Vortex Pen Cup", "organizers", 1290, None, 40,
     "Twenty-four ribs, twisting 140°.",
     "A pen cup whose ribs twist as they climb, so it looks like it's slowly spinning on your desk. Heavy base; won't tip when full.",
     ["pen holder", "desk", "twisted", "black"], [PLA, "Weighted base"], (9, 11, 9), 210, "b", 211),
    ("knuckle-holder", "Knuckle Holder", "organizers", 1490, None, 31,
     "Brushes, pencils, or anything that needs a grip.",
     "Five rounded rings stacked into a squat holder, like a clenched fist of plastic. Good for brushes, pencils and tools.",
     ["holder", "desk", "mint", "brushes"], [PLA], (9, 12, 9), 190, "n", 38),
    ("hourglass-planter", "Hourglass Planter", "home-decor", 2190, None, 12,
     "Time runs out. Plants don't.",
     "A pinched-waist planter with a counter-twist in its twelve ribs. Includes a drainage insert and saucer.",
     ["planter", "plants", "black", "hourglass"], [PLA, "Removable drainage insert"], (17, 20, 17), 380, "", 19),
    ("ruin-candle-column", "Ruin Candle Column", "home-decor", 2690, None, 7,
     "A classical column, slightly misremembered.",
     "A fluted column with a flared capital that holds a single pillar candle. Made in heat-resistant PETG.",
     ["candle", "column", "classical", "white"], ["Heat-resistant PETG"], (12, 24, 12), 350, "f", 27),
    ("tidal-bowl", "Tidal Bowl", "home-decor", 2390, 2790, 16,
     "Thirty ridges that look like they're moving.",
     "A wide fruit or catch-all bowl with thirty twisting ridges that read as a wave from above.",
     ["bowl", "fruit bowl", "blue", "catch-all"], [PLA, "Food-safe interior coat"], (26, 10, 26), 480, "n", 12),
    ("lump-bookend", "Lump Bookend", "desk-objects", 1790, None, 20,
     "Holds your books up. Asks nothing of your taste.",
     "A heavy, lumpy bookend with a surface like wet clay. Sand-filled so it stays put against a row of hardbacks.",
     ["bookend", "books", "lilac", "blob"], [PLA, "Sand-filled core"], (18, 16, 14), 900, "", 44),
    ("facet-planter", "Facet Planter", "home-decor", 1590, None, 3,
     "Eight sides, zero right angles.",
     "A tapering octagonal planter with sharp facets. Sized for a small succulent or snake plant.",
     ["planter", "succulent", "white", "faceted"], [PLA, "Drainage hole with plug"], (14, 18, 14), 300, "", 58),
    ("totem-no-5", "Totem No. 5", "sculptures", 3890, None, 5,
     "Five parts. No instructions.",
     "A stacked totem of five turned forms in black, white and dusty pink. The pieces are keyed, so you can rebuild it in any order you like.",
     ["totem", "sculpture", "stacking", "modular"], [PLA, "Magnetic keyed joints"], (19, 49, 19), 820, "fn", 16),
    ("stair-to-nowhere", "Stair to Nowhere", "desk-objects", 2290, None, 11,
     "Five steps up. Then nothing.",
     "An isometric staircase that climbs and stops. Put a small figure at the top, a plant at the bottom, or leave it as a question.",
     ["stairs", "desk", "white", "architecture", "escher"], [PLA], (28, 25, 14), 520, "fb", 73),
    ("grid-tray", "Grid Tray", "organizers", 1690, None, 26,
     "Twelve cells for the things that roll away.",
     "A modular tray of twelve cells at two heights, for rings, SD cards, clips and screws.",
     ["tray", "organizer", "black", "jewellery"], [PLA], (24, 7, 18), 330, "", 49),
    ("box-of-nothing", "Box of Nothing", "weird-things", 990, None, 60,
     "Contains nothing. Guaranteed.",
     "A sealed butter-yellow cube with NOTHING written on the lid. It's the best-selling gift we make and we're still not sure why.",
     ["gift", "weird", "yellow", "box"], [PLA], (10, 10, 10), 120, "b", 334),
    ("drip-candle-stand", "Drip Candle Stand", "home-decor", 1890, None, 13,
     "The drips are built in. The flame is yours.",
     "A candle stand with frozen drips down its stem, so it looks like it's been burning for hours from day one.",
     ["candle", "drip", "white", "stand"], ["Heat-resistant PETG", "Steel candle cup"], (13, 26, 13), 310, "n", 8),
    ("hand-of-keys", "Hand of Keys", "weird-things", 2590, None, 8,
     "Four fingers, always reaching.",
     "A wall-mounted key rack whose hooks droop like long fingers. Hang keys, dog leads or headphones.",
     ["keys", "wall", "hooks", "black", "weird"], [PLA, "Wall fixings included"], (30, 40, 6), 410, "n", 5),
]


async def seed_catalogue(svc: Services) -> None:
    cats = {}
    for i, (name, slug, desc, art) in enumerate(CATEGORIES, 1):
        c = await svc.catalog.create_category(CategoryCreate(name=name, slug=slug, description=desc,
                                                             image=f"/seed/{art}-2.svg", position=i))
        cats[slug] = c.id
    ids = {}
    base = now() - timedelta(days=60)
    for idx, (slug, name, cat, price, cmp, stock, tagline, desc, tags, mats, (w, h, d), wt, flags, sales) \
            in enumerate(PRODUCTS):
        p = await svc.catalog.create_product(ProductCreate(
            name=name, slug=slug, tagline=tagline, description=desc, price=price, compare_at_price=cmp, stock=stock,
            category_id=cats[cat], tags=tags, materials=mats,
            dimensions=Dimensions(width_cm=w, height_cm=h, depth_cm=d), weight_g=wt,
            manufacturing="Designed in-house and made to order in small batches. "
                          "Each piece is sanded and inspected by hand; tiny layer lines are part of the look.",
            images=[ProductImage(url=f"/seed/{slug}-{n}.svg", alt=f"{name}, {v}")
                    for n, v in ((1, "studio view"), (2, "lit view"), (3, "detail"))],
            is_featured="f" in flags, is_bestseller="b" in flags, is_new_arrival="n" in flags,
        ))
        created = base + timedelta(days=idx * 2 + (40 if "n" in flags else 0))
        await svc.store.update("products", p.id, {"sales_count": sales, "created_at": min(created, now())})
        ids[slug] = p.id
    pairs = {"melt-vase": ["facet-planter", "tidal-bowl"], "fungal-lamp": ["egg-on-legs", "box-of-nothing"],
             "vortex-pen-cup": ["grid-tray", "stair-to-nowhere"]}
    for a, bs in pairs.items():
        await svc.store.update("products", ids[a], {"frequently_bought_with": [ids[b] for b in bs]})

    await svc.coupons.create(CouponCreate(code="ODDONE", description="10% off your first order", kind="percent",
                                          value=10, max_discount=1000))
    await svc.coupons.create(CouponCreate(code="FREESHIP", description="Free standard shipping", kind="free_shipping",
                                          min_subtotal=999))
    svc.catalog.invalidate()
    await _seed_history(svc, ids)


async def _seed_history(svc: Services, ids: dict[str, str]) -> None:
    """A demo customer with delivered orders and reviews, so the account and
    admin screens aren't empty."""
    from app.models.cart import CartLine
    from app.models.order import CheckoutRequest, ShippingAddress
    from app.models.review import ReviewIn
    from app.models.user import AddressIn, AuthUser, ProfileUpdate

    rng = random.Random(7)
    admin = AuthUser(uid="dev-admin", email="diveshkasyap5@gmail.com", name="Studio Admin", is_admin=True)
    await svc.accounts.ensure_profile(admin)
    people = [("demo-customer", "demo@simplyodd.dev", "Aarav Mehta"), ("c-riya", "riya@example.com", "Riya Sen"),
              ("c-kabir", "kabir@example.com", "Kabir Das"), ("c-ira", "ira@example.com", "Ira Kapoor")]
    reviews = [
        (5, "Better than the photos", "The layer lines catch the light in a way the photos don't show. Everyone asks about it."),
        (4, "Strange in the best way", "Slightly smaller than I imagined but beautifully finished."),
        (5, "Gift that worked", "Bought it as a gift and then bought one for myself a week later."),
        (3, "Nice, took a while", "Lovely object. Shipping took a couple of days longer than the estimate."),
        (5, "Conversation starter", "It sits on my desk and I've explained it to every visitor."),
    ]
    slugs = list(ids)
    for uid, email, name in people:
        user = AuthUser(uid=uid, email=email, name=name, email_verified=True)
        await svc.accounts.ensure_profile(user)
        addr = dict(full_name=name, phone="9876543210", line1="12 Example Street", city="Mumbai",
                    state="Maharashtra", postal_code="400001", country="India")
        await svc.accounts.update_profile(user, ProfileUpdate(phone="9876543210"))
        await svc.accounts.add_address(user, AddressIn(**addr, is_default=True))
        for n in range(rng.randint(1, 3)):
            picks = rng.sample([s for s in slugs if s not in ("ghost-lamp",)], rng.randint(1, 2))
            req = CheckoutRequest(items=[CartLine(product_id=ids[s], quantity=1) for s in picks],
                                  address=ShippingAddress(**addr, email=email),
                                  payment_provider="cod" if svc.payments.get("cod") else "mock")
            order, _ = await svc.orders.checkout(user, req)
            placed = now() - timedelta(days=rng.randint(2, 28), hours=rng.randint(0, 23))
            status = rng.choice(["delivered", "delivered", "shipped", "processing"])
            order.created_at = placed
            order.history = [StatusEvent(status="pending", at=placed, note="Order placed"),
                             StatusEvent(status="confirmed", at=placed + timedelta(minutes=2))]
            if status != "processing":
                order.history.append(StatusEvent(status="processing", at=placed + timedelta(hours=20)))
            order.history.append(StatusEvent(status=status, at=placed + timedelta(days=2)))
            order.status = status
            order.payment.status = "paid" if status == "delivered" else order.payment.status
            order.tracking_number = f"DTDC{rng.randint(10**8, 10**9)}" if status in ("shipped", "delivered") else None
            await svc.store.set("orders", order.id, order.model_dump())
            if status == "delivered":
                for s in picks:
                    if rng.random() < 0.8:
                        rating, title, body = rng.choice(reviews)
                        try:
                            await svc.reviews.create(user, ids[s], ReviewIn(rating=rating, title=title, body=body), name)
                        except Exception:
                            pass
    await svc.insights.subscribe("hello@example.com")


async def seed_if_empty(svc: Services) -> None:
    if await svc.store.list("products", limit=1):
        return
    log.info("Seeding demo catalogue")
    await seed_catalogue(svc)
