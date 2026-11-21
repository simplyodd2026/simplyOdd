"""Oddly Assistant. Groq is never called: the LLM is a scripted fake, and the Groq client
wrapper is tested against a fake SDK client."""
import asyncio
import json
from datetime import timedelta
from types import SimpleNamespace

import groq
import httpx
import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.utils import now
from app.main import create_app
from app.repositories.memory import MemoryStore
from app.services.chat.llm import Completion, GroqLLM, LLMError, ToolCall
from app.services.chat.parsing import parse, parse_budget
from tests.conftest import ADMIN, CUSTOMER, OTHER

DEMO = {"Authorization": "Bearer dev:demo-customer:demo@simplyodd.dev"}
GUEST = {"Authorization": "Bearer dev:guest-abc123:"}


class FakeLLM:
    """Plays back a script. Each step is a Completion, an LLMError to raise, or a callable(messages)."""
    enabled = True

    def __init__(self, *steps):
        self.steps = list(steps)
        self.calls: list[list[dict]] = []

    async def complete(self, messages, tools=None, tool_choice="auto"):
        self.calls.append(messages)
        step = self.steps.pop(0) if self.steps else Completion(content="Done.")
        if isinstance(step, Exception):
            raise step
        return step(messages) if callable(step) else step


def call(name, **args):
    return Completion(content="", tool_calls=[ToolCall(id=f"c_{name}", name=name, arguments=json.dumps(args))],
                      model="fake", prompt_tokens=100, completion_tokens=20)


def make_client(llm=None, **overrides):
    settings = Settings(_env_file=None, env="test", memory_persist_path=None, catalog_cache_seconds=0,
                        payment_providers=["mock"], allow_dev_auth=True, rate_limit=False, groq_api_key=None,
                        **overrides)
    return TestClient(create_app(settings, MemoryStore(), llm=llm))


@pytest.fixture
def chat():
    with make_client() as c:
        yield c


def start(c, headers=None):
    r = c.post("/api/chat/sessions", json={"visitor_id": "visitor-123456"}, headers=headers or {})
    assert r.status_code == 201, r.text
    s = r.json()
    return s["session_id"], {"X-Chat-Token": s["token"], **(headers or {})}


def say(c, sid, h, text, expect=200):
    r = c.post("/api/chat/message", json={"session_id": sid, "message": text}, headers=h)
    assert r.status_code == expect, r.text
    return r.json()


def catalogue(c):
    products = c.get("/api/products?page_size=100").json()["items"]
    cats = {x["id"]: x["slug"] for x in c.get("/api/categories").json()}
    return {p["id"]: {**p, "cats": [cats[i] for i in p["category_ids"]]} for p in products}


# ---------------------------------------------------------------- parsing
@pytest.mark.parametrize("text,lo,hi", [
    ("Find products under ₹1,500", None, 1500),
    ("Suggest gifts between ₹1,000 and ₹2,000", 1000, 2000),
    ("something below rs 999", None, 999),
    ("gifts 1k-2k", 1000, 2000),
    ("lamps over 3000", 3000, None),
    ("premium decor under ₹3,000", None, 3000),
])
def test_budget_parsing(text, lo, hi):
    b = parse_budget(text.lower())
    assert b is not None and (b.min, b.max) == (lo, hi)


def test_no_budget_in_sizes():
    assert parse_budget("a vase 10-12 cm tall") is None


def test_intents_and_words():
    assert parse("Do you have any Hanuman idols?").words == ["hanuman", "idol"]
    assert parse("What does shipping cost?").intent == "faq"
    assert parse("Where is my order OM-1001?").intent == "order_status"
    assert parse("Compare these").intent == "compare"
    assert parse("I want a custom piece").intent == "custom_enquiry"
    assert parse("Suggest something for gifting").gift


# --------------------------------------------------------------- sessions
def test_session_and_history_need_the_token(chat):
    sid, h = start(chat)
    assert sid.startswith("cs_")
    say(chat, sid, h, "Show decorative lamps")
    assert chat.get(f"/api/chat/history/{sid}").status_code == 404
    assert chat.get(f"/api/chat/history/{sid}", headers={"X-Chat-Token": "wrong"}).status_code == 404
    msgs = chat.get(f"/api/chat/history/{sid}", headers=h).json()["messages"]
    assert [m["role"] for m in msgs] == ["user", "assistant"]
    assert msgs[1]["type"] == "product_recommendations" and msgs[1]["payload"]["products"]


def test_signed_in_session_belongs_to_that_account(chat):
    sid, h = start(chat, CUSTOMER)
    token = {"X-Chat-Token": h["X-Chat-Token"]}
    assert chat.get(f"/api/chat/history/{sid}", headers=token).status_code == 403
    assert chat.get(f"/api/chat/history/{sid}", headers={**token, **OTHER}).status_code == 403
    assert chat.get(f"/api/chat/history/{sid}", headers=h).status_code == 200


def test_guest_session_is_claimed_on_sign_in(chat):
    sid, h = start(chat)
    say(chat, sid, {**h, **CUSTOMER}, "hi")
    assert chat.get(f"/api/chat/history/{sid}", headers=h).status_code == 403  # signed out again


def test_expired_session(chat):
    sid, h = start(chat)
    store = chat.app.state.services.store
    asyncio.run(store.update("chat_sessions", sid, {"expires_at": now() - timedelta(minutes=1)}))
    say(chat, sid, h, "hi", expect=410)


def test_cleanup_removes_expired_conversations(chat):
    sid, h = start(chat)
    say(chat, sid, h, "hi")
    store = chat.app.state.services.store
    asyncio.run(store.update("chat_sessions", sid, {"expires_at": now() - timedelta(minutes=1)}))
    assert chat.post("/api/admin/chat/cleanup", headers=ADMIN).json() == {"sessions": 1, "messages": 2}
    assert chat.post("/api/admin/chat/cleanup", headers=CUSTOMER).status_code == 403


def test_message_validation(chat):
    sid, h = start(chat)
    say(chat, sid, h, "x" * 601, expect=400)
    say(chat, sid, h, "   ", expect=400)
    r = chat.post("/api/chat/message", json={"session_id": "nope", "message": "hi"}, headers=h)
    assert r.status_code == 422


def test_oversized_body_is_refused(chat):
    sid, h = start(chat)
    r = chat.post("/api/chat/message", content=json.dumps({"session_id": sid, "message": "a" * 20000}),
                  headers={**h, "Content-Type": "application/json"})
    assert r.status_code == 413


def test_per_visitor_rate_limit():
    with make_client(chat_messages_per_minute=2) as c:
        sid, h = start(c)
        say(c, sid, h, "hi")
        say(c, sid, h, "hi")
        r = c.post("/api/chat/message", json={"session_id": sid, "message": "hi"}, headers=h)
        assert r.status_code == 429 and "Retry-After" in r.headers


# ------------------------------------------------- fallback (no Groq key)
def test_search_by_category(chat):
    cat = catalogue(chat)
    sid, h = start(chat)
    r = say(chat, sid, h, "Show decorative lamps")
    assert r["type"] == "product_recommendations" and r["fallback"] is True
    assert r["products"] and all("lighting" in cat[p["id"]]["cats"] for p in r["products"])
    p = r["products"][0]
    assert p["url"] == f"/product/{cat[p['id']]['slug']}" and p["price"] == cat[p["id"]]["price"]
    assert p["image"] == cat[p["id"]]["images"][0]["url"]


@pytest.mark.parametrize("text,lo,hi", [("Find products under ₹1,500", 0, 1500),
                                        ("Suggest gifts between ₹1,000 and ₹2,000", 1000, 2000)])
def test_budget_is_never_exceeded(chat, text, lo, hi):
    sid, h = start(chat)
    r = say(chat, sid, h, text)
    assert r["products"] and all(lo <= p["price"] <= hi for p in r["products"])


def test_cheapest(chat):
    cheapest = min(p["price"] for p in catalogue(chat).values())
    sid, h = start(chat)
    assert say(chat, sid, h, "Show the cheapest available products")["products"][0]["price"] == cheapest


def test_follow_up_keeps_the_previous_search(chat):
    cat = catalogue(chat)
    sid, h = start(chat)
    first = say(chat, sid, h, "Show me sculptures")
    assert all("sculptures" in cat[p["id"]]["cats"] for p in first["products"])
    r = say(chat, sid, h, "Show me something under ₹3,000")
    assert r["products"]
    assert all("sculptures" in cat[p["id"]]["cats"] and p["price"] <= 3000 for p in r["products"])
    # The demo catalogue has no sculptures under ₹2,000: say so, don't show other things.
    r = say(chat, sid, h, "and under ₹2,000?")
    assert r["products"] == [] and "in sculptures under ₹2,000" in r["message"]


def test_no_exact_match_is_said_plainly(chat):
    sid, h = start(chat)
    r = say(chat, sid, h, "Show me Krishna sculptures")
    assert "krishna" in r["message"].lower() and "exactly" in r["message"].lower()
    assert "custom" in r["message"].lower()


def test_empty_search(chat):
    sid, h = start(chat)
    r = say(chat, sid, h, "Show me zeppelins under ₹10")
    assert r["type"] == "text" and r["products"] == [] and "couldn't find" in r["message"]


def test_product_details_from_the_catalogue(chat):
    cat = catalogue(chat)
    melt = next(p for p in cat.values() if p["name"] == "Melt Vase")
    sid, h = start(chat)
    r = say(chat, sid, h, "What are the dimensions of the Melt Vase?")
    assert r["products"][0]["id"] == melt["id"]
    assert f"{melt['dimensions']['width_cm']:g} × {melt['dimensions']['height_cm']:g}" in r["message"]


def test_compare_recent_products(chat):
    sid, h = start(chat)
    shown = say(chat, sid, h, "Show decorative lamps")["products"]
    r = say(chat, sid, h, "Compare these")
    assert r["type"] == "product_comparison"
    assert [p["id"] for p in r["comparison"]["products"]] == [p["id"] for p in shown[:3]]
    labels = [row["label"] for row in r["comparison"]["rows"]]
    assert {"Price", "Dimensions", "Material", "Availability"} <= set(labels)


def test_faq_uses_real_policy(chat):
    sid, h = start(chat)
    r = say(chat, sid, h, "What does shipping cost?")
    assert r["type"] == "faq" and "₹199" in r["message"] and "₹1,499" in r["message"]
    assert "isn't offered" in say(chat, sid, h, "Can I make a partial payment?")["message"]
    assert "14 days" in say(chat, sid, h, "What is your return policy?")["message"]


def test_unknown_question_offers_a_person(chat):
    sid, h = start(chat)
    r = say(chat, sid, h, "Do you deliver by drone?")
    assert "simplyodd2026@gmail.com" in r["message"] or r["faq"]


def test_starter_suggestions_come_from_real_categories(chat):
    names = {f"Explore {c['name'].lower()}" for c in chat.get("/api/categories").json()}
    s = chat.post("/api/chat/sessions", json={}).json()["suggestions"]
    assert len(s) == 4 and s[0] in names


# ------------------------------------------------------------------ orders
def test_orders_need_sign_in(chat):
    for headers in ({}, GUEST):
        sid, h = start(chat, headers)
        r = say(chat, sid, h, "Where is my order?")
        assert r["type"] == "order_status" and r["orders"] == [] and "sign in" in r["message"]


def test_own_orders_only(chat):
    demo_orders = chat.get("/api/me/orders", headers=DEMO).json()
    assert demo_orders
    number = demo_orders[0]["number"] or demo_orders[0]["id"]  # seeded orders have no number
    sid, h = start(chat, DEMO)
    r = say(chat, sid, h, f"Where is my order {number}?")
    assert [o["number"] for o in r["orders"]] == [number]
    assert r["orders"][0]["url"] == f"/account/orders/{demo_orders[0]['id']}"
    sid, h = start(chat, OTHER)
    r = say(chat, sid, h, f"Where is my order {number}?")
    assert r["orders"] == [] and "couldn't find" in r["message"]


# --------------------------------------------------------------- enquiries
def test_enquiry_endpoint_validates_and_saves(chat):
    sid, h = start(chat)
    brief = {"session_id": sid, "name": "Asha", "email": "asha@example.com",
             "idea": "A Krishna sculpture playing the flute, for a puja shelf", "dimensions": "20 cm tall",
             "colours": ["white", "gold"], "quantity": 2, "reference_url": "https://example.com/ref.jpg"}
    assert chat.post("/api/chat/enquiries", json={**brief, "email": "nope"}, headers=h).status_code == 422
    assert chat.post("/api/chat/enquiries", json={**brief, "reference_url": "javascript:alert(1)"},
                     headers=h).status_code == 400
    assert chat.post("/api/chat/enquiries", json=brief).status_code == 404  # no token
    r = chat.post("/api/chat/enquiries", json=brief, headers=h)
    assert r.status_code == 201 and "three working days" in r.json()["message"]
    saved = chat.get("/api/admin/custom-requests", headers=ADMIN).json()[0]
    assert saved["id"] == r.json()["id"] and saved["source"] == "chat" and saved["chat_session_id"] == sid
    assert saved["quantity"] == 2 and saved["dimensions"] == "20 cm tall"


def test_custom_intent_opens_a_brief(chat):
    sid, h = start(chat, CUSTOMER)
    r = say(chat, sid, h, "I'd like a custom piece made")
    assert r["type"] == "custom_enquiry"
    assert r["enquiry"]["email"] == "test@example.com" and "idea" in r["enquiry"]["missing"]


# ------------------------------------------------------------------- Groq
def test_tool_calls_drive_the_reply():
    llm = FakeLLM(call("search_products", keywords="lamp", max_price=5000),
                  Completion(content="Here are a couple of lamps under ₹5,000.", model="fake"))
    with make_client(llm) as c:
        cat = catalogue(c)
        sid, h = start(c)
        r = say(c, sid, h, "lamps under 5000")
        assert r["fallback"] is False and r["message"] == "Here are a couple of lamps under ₹5,000."
        assert r["products"] and all(cat[p["id"]]["price"] <= 5000 for p in r["products"])
        tool_msg = next(m for m in llm.calls[1] if m["role"] == "tool")
        assert json.loads(tool_msg["content"])["filters"]["max_price"] == 5000


def test_context_is_sent_to_the_model():
    llm = FakeLLM(call("search_products", category="sculptures"), Completion(content="Sculptures."),
                  lambda msgs: Completion(content="ok"))
    with make_client(llm) as c:
        sid, h = start(c)
        say(c, sid, h, "Show me sculptures")
        say(c, sid, h, "under ₹2,000")
        note = llm.calls[-1][1]["content"]
        assert "category=sculptures" in note and "max=2000" in note and "Recently shown" in note
        assert [m["role"] for m in llm.calls[-1][2:]] == ["user", "assistant", "user"]


def test_invalid_tool_arguments_are_rejected():
    llm = FakeLLM(call("search_products", max_price="lots"), call("get_product_details", product_id="p_nope"),
                  call("drop_tables"), Completion(content="Sorry, I couldn't find that."))
    with make_client(llm) as c:
        sid, h = start(c)
        r = say(c, sid, h, "something")
        results = [json.loads(m["content"]) for m in llm.calls[-1] if m["role"] == "tool"]
        assert [x.get("error") for x in results] == [
            "Invalid arguments", "No published product with that id", "Unknown tool 'drop_tables'"]
        assert r["products"] == [] and r["type"] == "text"


def test_model_cannot_reach_other_customers_orders():
    with make_client() as c:
        first = c.get("/api/me/orders", headers=DEMO).json()[0]
        number = first["number"] or first["id"]
    llm = FakeLLM(call("get_order_status", order_id=number), Completion(content="Not found."))
    with make_client(llm) as c:
        sid, h = start(c, OTHER)
        r = say(c, sid, h, f"show order {number}")
        assert r["orders"] == []
        sid, h = start(c)
        llm.steps = [call("get_order_status"), Completion(content="Sign in.")]
        assert say(c, sid, h, "my orders")["orders"] == []


def test_enquiry_needs_the_customers_yes():
    details = {"customer_details": {"name": "Asha", "email": "asha@example.com"},
               "requirements": {"idea": "A Hanuman idol, 30 cm, matte stone finish", "quantity": 1}}
    llm = FakeLLM(call("create_custom_enquiry", **details, confirmed=True), Completion(content="Please confirm."),
                  call("create_custom_enquiry", confirmed=True), Completion(content="Sent!"))
    with make_client(llm) as c:
        sid, h = start(c)
        r = say(c, sid, h, "Make me a Hanuman idol. I'm Asha, asha@example.com")
        assert r["type"] == "custom_enquiry" and r["enquiry"]["ready"] and not r["enquiry"]["submitted"]
        assert c.get("/api/admin/custom-requests", headers=ADMIN).json() == []
        r = say(c, sid, h, "Yes, submit it")
        assert r["enquiry"]["submitted"] and r["enquiry"]["request_id"]
        assert c.get("/api/admin/custom-requests", headers=ADMIN).json()[0]["source"] == "chat"


@pytest.mark.parametrize("kind", ["unavailable", "rate_limited", "timeout", "bad_request"])
def test_groq_failure_falls_back(kind):
    with make_client(FakeLLM(LLMError(kind))) as c:
        sid, h = start(c)
        r = say(c, sid, h, "Show decorative lamps")
        assert r["fallback"] is True and r["products"]


def test_store_failure_is_a_503(chat):
    sid, h = start(chat)
    svc = chat.app.state.services

    async def boom(*a, **k):
        raise RuntimeError("firestore down")
    svc.chat.tools.search_products = boom
    r = chat.post("/api/chat/message", json={"session_id": sid, "message": "lamps"}, headers=h)
    assert r.status_code == 503 and "firestore" not in r.text


# ---------------------------------------------------- Groq client wrapper
def _settings(**kw):
    return Settings(_env_file=None, env="test", groq_api_key="test-key", groq_model="model-a",
                    groq_fallback_models=["model-b"], **kw)


def _resp(content="hi"):
    msg = SimpleNamespace(content=content, tool_calls=None)
    return SimpleNamespace(choices=[SimpleNamespace(message=msg)],
                           usage=SimpleNamespace(prompt_tokens=10, completion_tokens=2))


class FakeGroqClient:
    def __init__(self, *outcomes):
        self.outcomes = list(outcomes)
        self.models: list[str] = []
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self.create))

    async def create(self, **kwargs):
        self.models.append(kwargs["model"])
        out = self.outcomes.pop(0)
        if isinstance(out, Exception):
            raise out
        return out


def _http_error(cls, code, headers=None, body="error"):
    request = httpx.Request("POST", "https://api.groq.com/openai/v1/chat/completions")
    return cls(body, response=httpx.Response(code, request=request, headers=headers or {}), body=None)


async def test_groq_429_moves_to_the_next_model():
    """Groq's limits are per model: a 429 pauses that model, and the next one answers."""
    client = FakeGroqClient(_http_error(groq.RateLimitError, 429, {"retry-after": "30"}), _resp("from b"), _resp("b again"))
    llm = GroqLLM(_settings(), client)
    assert (await llm.complete([{"role": "user", "content": "hi"}])).content == "from b"
    await llm.complete([{"role": "user", "content": "hi"}])
    assert client.models == ["model-a", "model-b", "model-b"]  # model-a sits out its Retry-After


async def test_groq_all_models_rate_limited():
    client = FakeGroqClient(_http_error(groq.RateLimitError, 429, {"retry-after": "30"}),
                            _http_error(groq.RateLimitError, 429, {"retry-after": "30"}))
    llm = GroqLLM(_settings(), client)
    for _ in range(2):
        with pytest.raises(LLMError) as e:
            await llm.complete([{"role": "user", "content": "hi"}])
        assert e.value.kind == "rate_limited"
    assert len(client.models) == 2  # paused: no requests at all the second time


async def test_groq_retired_model_falls_through():
    client = FakeGroqClient(_http_error(groq.NotFoundError, 404, body="model_not_found"), _resp("from b"))
    llm = GroqLLM(_settings(), client)
    out = await llm.complete([{"role": "user", "content": "hi"}])
    assert out.content == "from b" and client.models == ["model-a", "model-b"]
    client.outcomes.append(_resp("again"))
    await llm.complete([{"role": "user", "content": "hi"}])
    assert client.models[-1] == "model-b"  # the retired model is skipped from now on


async def test_groq_call_budget():
    llm = GroqLLM(_settings(groq_max_calls_per_minute=1), FakeGroqClient(_resp(), _resp()))
    await llm.complete([{"role": "user", "content": "hi"}])
    with pytest.raises(LLMError) as e:
        await llm.complete([{"role": "user", "content": "hi"}])
    assert e.value.kind == "budget"


async def test_groq_timeout():
    request = httpx.Request("POST", "https://api.groq.com")
    llm = GroqLLM(_settings(), FakeGroqClient(groq.APITimeoutError(request=request)))
    with pytest.raises(LLMError) as e:
        await llm.complete([{"role": "user", "content": "hi"}])
    assert e.value.kind == "timeout"


# --------------------------------------------------- feedback & analytics
def test_feedback_and_analytics(chat):
    sid, h = start(chat)
    r = say(chat, sid, h, "Show decorative lamps")
    ok = chat.post("/api/chat/feedback", json={"session_id": sid, "message_id": r["message_id"], "rating": "up"},
                   headers=h)
    assert ok.status_code == 200
    other_sid, other_h = start(chat)
    assert chat.post("/api/chat/feedback", json={"session_id": other_sid, "message_id": r["message_id"],
                                                 "rating": "up"}, headers=other_h).status_code == 404
    stats = chat.get("/api/admin/chat/analytics", headers=ADMIN).json()
    assert stats["conversations"] == 2 and stats["messages"] == 1 and stats["feedback"]["up"] == 1
    assert stats["intents"] == {"product_search": 1} and stats["products_recommended"] == len(r["products"])
    assert stats["top_products"][0]["product_id"] in {p["id"] for p in r["products"]}
    assert chat.get("/api/admin/chat/analytics", headers=CUSTOMER).status_code == 403


# ------------------------------------------------------- Claude API backup
import anthropic  # noqa: E402
import httpx2  # noqa: E402

from app.services.chat.llm import ChainLLM, ClaudeLLM, DisabledLLM, build_llm, to_claude  # noqa: E402
from app.services.chat.tools import TOOL_SCHEMAS  # noqa: E402


def _claude_settings(**kw):
    return Settings(_env_file=None, env="test", anthropic_api_key="test-key", **kw)


def _block(type_, **fields):
    return SimpleNamespace(type=type_, **fields)


def _claude_resp(*content, stop="end_turn"):
    return SimpleNamespace(content=list(content), stop_reason=stop, model="claude-opus-5-5",
                           usage=SimpleNamespace(input_tokens=50, output_tokens=10, cache_read_input_tokens=900,
                                                 cache_creation_input_tokens=0))


class FakeClaudeClient:
    def __init__(self, *outcomes):
        self.outcomes = list(outcomes)
        self.requests: list[dict] = []
        self.beta = SimpleNamespace(messages=SimpleNamespace(create=self.create))

    async def create(self, **kwargs):
        self.requests.append(kwargs)
        out = self.outcomes.pop(0)
        if isinstance(out, Exception):
            raise out
        return out


def _claude_error(cls, code, headers=None):
    request = httpx2.Request("POST", "https://api.anthropic.com/v1/messages")
    return cls("error", response=httpx2.Response(code, request=request, headers=headers or {}), body=None)


def test_messages_convert_to_claude_shape():
    raw = [_block("thinking", thinking="", signature="sig"), _block("tool_use", id="t2", name="search_faq", input={})]
    system, msgs, tools = to_claude([
        {"role": "system", "content": "Prompt"}, {"role": "system", "content": "Context"},
        {"role": "user", "content": "hi"},
        {"role": "assistant", "content": None, "_provider": "groq", "_raw": None, "tool_calls": [
            {"id": "t1", "type": "function", "function": {"name": "search_products", "arguments": '{"keywords":"lamp"}'}}]},
        {"role": "tool", "tool_call_id": "t1", "content": "{}"},
        {"role": "assistant", "content": None, "_provider": "anthropic", "_raw": raw, "tool_calls": []},
        {"role": "tool", "tool_call_id": "t2", "content": "a"},
        {"role": "tool", "tool_call_id": "t3", "content": "b"},
    ], TOOL_SCHEMAS)
    assert system[0]["cache_control"] == {"type": "ephemeral"} and "cache_control" not in system[1]
    assert msgs[1]["content"] == [{"type": "tool_use", "id": "t1", "name": "search_products",
                                   "input": {"keywords": "lamp"}}]
    assert msgs[3]["content"] is raw  # Claude's own turn goes back unchanged, thinking included
    assert [b["tool_use_id"] for b in msgs[4]["content"]] == ["t2", "t3"]  # results share one user message
    assert [m["role"] for m in msgs] == ["user", "assistant", "user", "assistant", "user"]
    assert {t["name"] for t in tools} == {t["function"]["name"] for t in TOOL_SCHEMAS}
    assert all("input_schema" in t for t in tools)


async def test_claude_request_and_reply():
    client = FakeClaudeClient(_claude_resp(_block("thinking", thinking="", signature="s"),
                                           _block("text", text="Let me look."),
                                           _block("tool_use", id="tu_1", name="search_products", input={"max_price": 900}),
                                           stop="tool_use"))
    llm = ClaudeLLM(_claude_settings(), client)
    out = await llm.complete([{"role": "system", "content": "P"}, {"role": "user", "content": "hi"}], TOOL_SCHEMAS,
                             tool_choice="none")
    req = client.requests[0]
    assert req["model"] == "claude-opus-5-5" and req["output_config"] == {"effort": "low"}
    assert req["fallbacks"] == "default" and req["betas"] == ["server-side-fallback-2026-07-01"]
    assert req["tool_choice"] == {"type": "none"} and "temperature" not in req and "thinking" not in req
    assert out.provider == "anthropic" and out.content == "Let me look." and out.prompt_tokens == 950
    assert [(c.id, c.name, json.loads(c.arguments)) for c in out.tool_calls] == [("tu_1", "search_products", {"max_price": 900})]
    assert out.raw[0].type == "thinking"


@pytest.mark.parametrize("outcome,kind", [
    (_claude_resp(_block("text", text=""), stop="refusal"), "refusal"),
    (_claude_error(anthropic.RateLimitError, 429, {"retry-after": "30"}), "rate_limited"),
    (_claude_error(anthropic.AuthenticationError, 401), "unavailable"),
    (_claude_error(anthropic.BadRequestError, 400), "bad_request"),
    (anthropic.APITimeoutError(request=httpx2.Request("POST", "https://api.anthropic.com")), "timeout"),
])
async def test_claude_failures(outcome, kind):
    client = FakeClaudeClient(outcome, _claude_resp(_block("text", text="ok")))
    llm = ClaudeLLM(_claude_settings(), client)
    with pytest.raises(LLMError) as e:
        await llm.complete([{"role": "user", "content": "hi"}])
    assert e.value.kind == kind
    if kind == "rate_limited":  # paused: no second request during the cooldown
        with pytest.raises(LLMError):
            await llm.complete([{"role": "user", "content": "hi"}])
        assert len(client.requests) == 1


async def test_claude_call_budget():
    llm = ClaudeLLM(_claude_settings(anthropic_max_calls_per_minute=1),
                    FakeClaudeClient(_claude_resp(_block("text", text="a")), _claude_resp(_block("text", text="b"))))
    await llm.complete([{"role": "user", "content": "hi"}])
    with pytest.raises(LLMError) as e:
        await llm.complete([{"role": "user", "content": "hi"}])
    assert e.value.kind == "budget"


def test_build_llm_picks_the_chain():
    base = dict(_env_file=None, env="test")
    assert isinstance(build_llm(Settings(**base)), DisabledLLM)
    assert isinstance(build_llm(Settings(**base, groq_api_key="g")), GroqLLM)
    assert isinstance(build_llm(Settings(**base, anthropic_api_key="a")), ClaudeLLM)
    chain = build_llm(Settings(**base, groq_api_key="g", anthropic_api_key="a"))
    assert isinstance(chain, ChainLLM) and [link.provider for link in chain.links] == ["groq", "anthropic"]


def test_claude_takes_over_when_groq_is_rate_limited():
    """End to end: Groq 429s, Claude runs the tool loop with real catalogue data, Groq is then left alone."""
    settings = _claude_settings(groq_api_key="g", groq_model="model-a", groq_fallback_models=[])
    groq_client = FakeGroqClient(_http_error(groq.RateLimitError, 429, {"retry-after": "60"}))  # its only model
    claude_client = FakeClaudeClient(
        _claude_resp(_block("thinking", thinking="", signature="s"),
                     _block("tool_use", id="tu_1", name="search_products", input={"keywords": "lamp", "max_price": 5000}),
                     stop="tool_use"),
        _claude_resp(_block("text", text="The Ghost Lamp fits your budget.")))
    chain = ChainLLM([GroqLLM(settings, groq_client), ClaudeLLM(settings, claude_client)])
    with make_client(chain) as c:
        cat = catalogue(c)
        sid, h = start(c)
        r = say(c, sid, h, "lamps under 5000")
        assert r["fallback"] is False and r["message"] == "The Ghost Lamp fits your budget."
        assert r["products"] and all(cat[p["id"]]["price"] <= 5000 for p in r["products"])
        assert len(groq_client.models) == 1  # one 429, then the cooldown kept Groq out of round two
        second = claude_client.requests[1]["messages"]
        assert second[-2]["content"][0].type == "thinking"  # Claude's turn replayed unchanged
        assert second[-1]["content"][0]["type"] == "tool_result"
        stats = c.get("/api/admin/chat/analytics", headers=ADMIN).json()
        assert stats["llm_calls_by_provider"] == {"groq": 0, "anthropic": 2} and stats["llm_backup_rescues"] == 1


def test_both_models_down_uses_the_builtin_fallback():
    settings = _claude_settings(groq_api_key="g", groq_model="model-a", groq_fallback_models=[])
    request = httpx.Request("POST", "https://api.groq.com")
    chain = ChainLLM([GroqLLM(settings, FakeGroqClient(groq.APITimeoutError(request=request))),
                      ClaudeLLM(settings, FakeClaudeClient(_claude_error(anthropic.InternalServerError, 529)))])
    with make_client(chain) as c:
        sid, h = start(c)
        r = say(c, sid, h, "Show decorative lamps")
        assert r["fallback"] is True and r["products"]


def test_model_failing_mid_turn_reanswers_from_the_fallback():
    """A search ran, then the model hit a 429: answer the whole message from the fallback, not a fragment."""
    llm = FakeLLM(call("get_product_details", product_id="p_nope"), LLMError("rate_limited"))
    with make_client(llm) as c:
        sid, h = start(c)
        r = say(c, sid, h, "Show decorative lamps")
        assert r["fallback"] is True and r["type"] == "product_recommendations" and r["products"]


def test_product_request_without_a_search_is_answered_from_the_catalogue():
    llm = FakeLLM(Completion(content="The Totem No. 5 at ₹3,890 is lovely. Let me search for more."))
    with make_client(llm) as c:
        sid, h = start(c)
        r = say(c, sid, h, "Suggest something for gifting under ₹2,000")
        assert r["fallback"] is True and r["products"] and all(p["price"] <= 2000 for p in r["products"])
        assert "Totem" not in r["message"]
        # Small talk is still the model's to answer.
        llm.steps = [Completion(content="You're welcome!")]
        assert say(c, sid, h, "thanks!")["message"] == "You're welcome!"
