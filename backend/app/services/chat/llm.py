"""The language models behind Oddly Assistant, wrapped so the rest of the assistant never sees an SDK.

Groq is the primary (free tier). The Claude API is the backup, used only when Groq
can't answer: rate limited, over its call budget, slow, down, or returning a broken
tool call. If both fail, the caller answers from the built-in fallback.

Both clients are built to fail fast:
- one request timeout; no SDK retries for Groq, at most one for Claude;
- a process-wide budget of calls per minute (GROQ_/ANTHROPIC_MAX_CALLS_PER_MINUTE);
- after a 429, no calls to that model (Groq) or provider (Claude) until its Retry-After has passed;
  Groq's limits are per model, so another configured Groq model answers meanwhile.

Messages use the OpenAI-style shape Groq takes (system / user / assistant with
`tool_calls` / tool); ClaudeLLM converts them. An assistant message may carry the
provider's raw content under `_raw` (with `_provider`), so Claude gets its own turns
back unchanged, thinking blocks included, as the API requires within a tool loop.
"""
from __future__ import annotations

import json
import logging
import time
from collections import deque
from dataclasses import dataclass, field
from typing import Any, Literal, Protocol

from app.core.config import Settings

log = logging.getLogger(__name__)

ErrorKind = Literal["not_configured", "rate_limited", "budget", "timeout", "unavailable", "bad_request", "refusal"]


class LLMError(Exception):
    def __init__(self, kind: ErrorKind, message: str = ""):
        super().__init__(message or kind)
        self.kind = kind


@dataclass
class ToolCall:
    id: str
    name: str
    arguments: str


@dataclass
class Completion:
    content: str
    tool_calls: list[ToolCall] = field(default_factory=list)
    model: str = ""
    prompt_tokens: int = 0
    completion_tokens: int = 0
    provider: str = ""
    # Providers tried first that failed, as "groq:rate_limited"; set by ChainLLM when the backup answered.
    skipped: list[str] = field(default_factory=list)
    # The provider's own assistant content, to send back unchanged on the next round of the tool loop.
    raw: Any = None


class LLM(Protocol):
    @property
    def enabled(self) -> bool: ...

    async def complete(self, messages: list[dict], tools: list[dict] | None = None,
                       tool_choice: str = "auto") -> Completion: ...


class DisabledLLM:
    """No API keys: every reply comes from the fallback."""
    enabled = False

    async def complete(self, messages, tools=None, tool_choice="auto") -> Completion:
        raise LLMError("not_configured")


class CallGate:
    """Calls per minute, and a pause after a 429. Per provider, per process."""

    def __init__(self, per_minute: int):
        self.per_minute = per_minute
        self._calls: deque[float] = deque()
        self.cooldown_until = 0.0

    def admit(self) -> None:
        now = time.monotonic()
        if now < self.cooldown_until:
            raise LLMError("rate_limited", "cooling down after a 429")
        while self._calls and now - self._calls[0] > 60:
            self._calls.popleft()
        if len(self._calls) >= self.per_minute:
            raise LLMError("budget", "per-minute call budget used")
        self._calls.append(now)

    def pause(self, exc) -> None:
        self.cooldown_until = time.monotonic() + _retry_after(exc)


def _retry_after(exc) -> float:
    """Seconds to wait after a 429, from its Retry-After header (5–120 s, 20 s if missing)."""
    try:
        value = float(exc.response.headers.get("retry-after", "20"))
    except (AttributeError, TypeError, ValueError):
        value = 20.0
    return min(max(value, 5.0), 120.0)


def _public(messages: list[dict]) -> list[dict]:
    """Drop the private `_raw`/`_provider` keys before a message goes to a provider."""
    return [{k: v for k, v in m.items() if not k.startswith("_")} for m in messages]


# ---------------------------------------------------------------------------- Groq
_MODEL_GONE = ("model_decommissioned", "model_not_found", "model_not_active", "does not exist", "decommissioned")


class GroqLLM:
    enabled = True
    provider = "groq"

    def __init__(self, settings: Settings, client=None):
        from groq import AsyncGroq

        # No SDK retries: the SDK would sleep through a 429's Retry-After (seconds, in a chat). Failing at once
        # lets the Claude backup or the built-in fallback answer while the pause runs.
        self.client = client or AsyncGroq(api_key=settings.groq_api_key, timeout=settings.groq_timeout_seconds,
                                          max_retries=0)
        self.models = list(dict.fromkeys([settings.groq_model, *settings.groq_fallback_models]))
        self.max_tokens = settings.groq_max_tokens
        self.gate = CallGate(settings.groq_max_calls_per_minute)
        # Model -> skip until (monotonic). Groq's limits are per model, so a 429 pauses only that model
        # (its Retry-After) and the next one answers; a retired model is skipped for an hour.
        self._dead: dict[str, float] = {}

    async def complete(self, messages: list[dict], tools: list[dict] | None = None,
                       tool_choice: str = "auto") -> Completion:
        import groq

        now = time.monotonic()
        candidates = [m for m in self.models if self._dead.get(m, 0) < now]
        if not candidates:
            raise LLMError("rate_limited", "every Groq model is paused")
        self.gate.admit()
        last: LLMError | None = None
        for model in candidates:
            kwargs: dict = {"model": model, "messages": _public(messages), "temperature": 0.3,
                            "max_tokens": self.max_tokens}
            # Some Groq models call a tool even under tool_choice="none" (a 400), so the final round offers none.
            if tools and tool_choice != "none":
                kwargs.update(tools=tools, tool_choice=tool_choice, parallel_tool_calls=True)
            try:
                resp = await self.client.chat.completions.create(**kwargs)
            except groq.RateLimitError as exc:
                self._dead[model] = time.monotonic() + _retry_after(exc)
                log.warning("Groq rate limited %s; trying the next model", model)
                last = LLMError("rate_limited")
                continue
            except groq.APITimeoutError as exc:
                raise LLMError("timeout") from exc
            except groq.APIConnectionError as exc:
                raise LLMError("unavailable", "connection failed") from exc
            except groq.AuthenticationError as exc:
                log.error("Groq rejected the API key; check GROQ_API_KEY")
                raise LLMError("unavailable", "authentication failed") from exc
            except (groq.NotFoundError, groq.BadRequestError) as exc:
                text = str(exc).lower()
                if isinstance(exc, groq.NotFoundError) or any(s in text for s in _MODEL_GONE):
                    log.warning("Groq model %s is unavailable; trying the next configured model", model)
                    self._dead[model] = time.monotonic() + 3600
                    last = LLMError("unavailable", f"model {model} unavailable")
                    continue
                # Typically tool_use_failed: the model produced a malformed tool call.
                log.info("Groq refused the request (%s): %s", model, text[:200])
                raise LLMError("bad_request") from exc
            except groq.APIStatusError as exc:
                raise LLMError("unavailable", f"status {exc.status_code}") from exc

            choice = resp.choices[0].message
            usage = getattr(resp, "usage", None)
            calls = [ToolCall(id=c.id, name=c.function.name, arguments=c.function.arguments or "{}")
                     for c in (choice.tool_calls or [])]
            return Completion(content=(choice.content or "").strip(), tool_calls=calls, model=model,
                              prompt_tokens=getattr(usage, "prompt_tokens", 0) or 0,
                              completion_tokens=getattr(usage, "completion_tokens", 0) or 0, provider=self.provider)
        raise last or LLMError("unavailable")


# -------------------------------------------------------------------------- Claude
# Opt-in server-side refusal fallback: on a policy decline the API re-runs the request on a fallback model
# inside the same call, routed by refusal category.
CLAUDE_BETAS = ["server-side-fallback-2026-07-01"]


def to_claude(messages: list[dict], tools: list[dict] | None) -> tuple[list[dict], list[dict], list[dict]]:
    """OpenAI-style messages and tools → Claude's (system blocks, messages, tools)."""
    system: list[dict] = []
    out: list[dict] = []
    results: list[dict] = []  # consecutive tool results travel together in one user message

    def flush() -> None:
        if results:
            out.append({"role": "user", "content": list(results)})
            results.clear()

    for m in messages:
        role = m["role"]
        if role == "system":
            # The first system message (the fixed prompt) is cached together with the tools ahead of it.
            block = {"type": "text", "text": m["content"]}
            if not system:
                block["cache_control"] = {"type": "ephemeral"}
            system.append(block)
        elif role == "tool":
            results.append({"type": "tool_result", "tool_use_id": m["tool_call_id"], "content": m["content"]})
        elif role == "assistant":
            flush()
            if m.get("_provider") == "anthropic" and m.get("_raw"):
                out.append({"role": "assistant", "content": m["_raw"]})  # unchanged, thinking blocks included
                continue
            content: list[dict] = []
            if m.get("content"):
                content.append({"type": "text", "text": m["content"]})
            for c in m.get("tool_calls") or []:
                try:
                    args = json.loads(c["function"]["arguments"] or "{}")
                except ValueError:
                    args = {}
                content.append({"type": "tool_use", "id": c["id"], "name": c["function"]["name"],
                                "input": args if isinstance(args, dict) else {}})
            if content:
                out.append({"role": "assistant", "content": content})
        else:
            flush()
            out.append({"role": "user", "content": m["content"]})
    flush()
    claude_tools = [{"name": t["function"]["name"], "description": t["function"].get("description", ""),
                     "input_schema": t["function"]["parameters"]} for t in tools or []]
    return system, out, claude_tools


class ClaudeLLM:
    enabled = True
    provider = "anthropic"

    def __init__(self, settings: Settings, client=None):
        import anthropic

        self.client = client or anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key,
                                                         timeout=settings.anthropic_timeout_seconds, max_retries=1)
        self.model = settings.anthropic_model
        self.effort = settings.anthropic_effort
        self.max_tokens = settings.anthropic_max_tokens
        self.gate = CallGate(settings.anthropic_max_calls_per_minute)

    async def complete(self, messages: list[dict], tools: list[dict] | None = None,
                       tool_choice: str = "auto") -> Completion:
        import anthropic

        self.gate.admit()
        system, msgs, claude_tools = to_claude(messages, tools)
        kwargs: dict = {"model": self.model, "max_tokens": self.max_tokens, "system": system, "messages": msgs,
                        "output_config": {"effort": self.effort}, "betas": CLAUDE_BETAS, "fallbacks": "default"}
        if claude_tools:
            kwargs.update(tools=claude_tools, tool_choice={"type": "none" if tool_choice == "none" else "auto"})
        try:
            resp = await self.client.beta.messages.create(**kwargs)
        except anthropic.RateLimitError as exc:
            self.gate.pause(exc)
            log.warning("Claude API rate limited; pausing Claude calls")
            raise LLMError("rate_limited") from exc
        except anthropic.APITimeoutError as exc:
            raise LLMError("timeout") from exc
        except anthropic.APIConnectionError as exc:
            raise LLMError("unavailable", "connection failed") from exc
        except (anthropic.AuthenticationError, anthropic.PermissionDeniedError) as exc:
            log.error("The Claude API rejected the key; check ANTHROPIC_API_KEY")
            raise LLMError("unavailable", "authentication failed") from exc
        except anthropic.NotFoundError as exc:
            log.error("Claude model %s not found; check ANTHROPIC_MODEL", self.model)
            raise LLMError("unavailable", "model not found") from exc
        except anthropic.BadRequestError as exc:
            log.info("Claude API refused the request: %s", str(exc)[:200])
            raise LLMError("bad_request") from exc
        except anthropic.APIStatusError as exc:
            raise LLMError("unavailable", f"status {exc.status_code}") from exc

        if resp.stop_reason == "refusal":
            raise LLMError("refusal")
        text = "".join(b.text for b in resp.content if b.type == "text").strip()
        calls = [ToolCall(id=b.id, name=b.name, arguments=json.dumps(b.input))
                 for b in resp.content if b.type == "tool_use"]
        if resp.stop_reason == "max_tokens" and not text and not calls:
            raise LLMError("bad_request", "ran out of tokens")
        usage = resp.usage
        return Completion(content=text, tool_calls=calls, model=resp.model, provider=self.provider,
                          prompt_tokens=(usage.input_tokens or 0) + (getattr(usage, "cache_read_input_tokens", 0) or 0)
                          + (getattr(usage, "cache_creation_input_tokens", 0) or 0),
                          completion_tokens=usage.output_tokens or 0, raw=resp.content)


# --------------------------------------------------------------------------- chain
class ChainLLM:
    """Try each model in order; the first answer wins. Used as Groq → Claude."""
    enabled = True

    def __init__(self, links: list):
        self.links = links

    async def complete(self, messages: list[dict], tools: list[dict] | None = None,
                       tool_choice: str = "auto") -> Completion:
        last: LLMError | None = None
        skipped: list[str] = []
        for i, link in enumerate(self.links):
            try:
                completion = await link.complete(messages, tools, tool_choice)
                completion.skipped = skipped
                return completion
            except LLMError as exc:
                last = exc
                skipped.append(f"{link.provider}:{exc.kind}")
                if i + 1 < len(self.links):
                    log.info("%s unavailable (%s); trying %s", link.provider, exc.kind, self.links[i + 1].provider)
        raise last or LLMError("unavailable")


def build_llm(settings: Settings) -> LLM:
    links: list = []
    if settings.groq_api_key:
        links.append(GroqLLM(settings))
    if settings.anthropic_api_key:
        links.append(ClaudeLLM(settings))
    if not links:
        log.info("No GROQ_API_KEY or ANTHROPIC_API_KEY; Oddly Assistant will answer from the catalogue and FAQ directly")
        return DisabledLLM()
    return links[0] if len(links) == 1 else ChainLLM(links)
