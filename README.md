# Simply Odd

Storefront, customer accounts and admin dashboard for Simply Odd: quirky, 3D-printed home décor.

```
frontend/   React 19 + TypeScript + Vite + Tailwind 4, React Router, TanStack Query, Zustand
backend/    FastAPI + Pydantic. All pricing, orders, payments, reviews and admin live here
firebase/   Firestore/Storage security rules and indexes
```

## Run it locally (no Firebase needed)

The backend ships with an in-memory data store seeded with 21 demo products, orders and reviews.
The frontend ships with a dev sign-in, so the whole stack runs before any credentials exist.

```bash
# API → http://localhost:8000  (docs at /api/docs)
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
cp .env.example .env
.venv/bin/uvicorn app.main:app --reload --port 8000

# Storefront → http://localhost:5173
cd frontend
npm install
npm run dev
```

In dev sign-in mode **any password works**:

| Email | What you get |
|---|---|
| `demo@simplyodd.dev` | Customer with delivered orders (can write reviews) |
| `admin@simplyodd.dev` | Admin dashboard at `/admin` |
| anything else | A fresh customer account |

At checkout, the **Test card** method has a "Simulate a declined card" switch.
Coupons `ODDONE` (10% off) and `FREESHIP` are seeded.

Data persists to `backend/.data/store.json`. Delete `backend/.data` to reseed.

```bash
cd backend && .venv/bin/python -m pytest      # API tests
cd frontend && npm test                       # widget tests (Vitest)
cd frontend && npm run build                  # typecheck + production build
```

## Architecture

**The API owns every business rule.** React never computes money or decides whether a payment succeeded.

- **Pricing** (`services/pricing.py`) is the single source of truth. The bag, drawer and checkout render `POST /api/cart/quote`, and checkout recomputes the quote server-side.
- **No stock tracking.** Every piece is made to order, so anything published can be bought in any quantity. Placing an order adds to each product's `sales_count`; cancelling takes it back off.
- **Orders** follow a guarded status flow: `pending → confirmed → processing → shipped → out_for_delivery → delivered`, with `cancelled`/`refunded` branches. Invalid jumps are rejected.
- **Reviews** are only accepted from verified purchasers (a confirmed-or-later order containing the product). Each change recomputes the product's average and distribution.
- **Storage abstraction** (`repositories/store.py`): services talk to a small `DocumentStore` interface. `FirestoreStore` is used in production and `MemoryStore` in tests and local dev. Moving to another database means one new class.
- **Catalogue search/filtering** runs over a short-lived in-process cache of published products. That fits a small-batch catalogue; swap `_all_products` for Algolia/Typesense if it grows into thousands of products.
- **Carts**: guests keep their bag in `localStorage`. On sign-in the bag merges into `carts/{uid}` and then syncs, so it follows the user across devices. Wishlists work the same way.

### Payments are pluggable

| Layer | File |
|---|---|
| Backend contract (`start` / `verify` / `refund`) | `backend/app/services/payments/base.py` |
| Providers: `mock`, `razorpay` | `backend/app/services/payments/*.py` |
| Frontend adapters (open provider UI, return payload) | `frontend/src/features/payments/*` |

Enable providers with `PAYMENT_PROVIDERS=razorpay` plus `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`.
Customers pay the full total online, or 50% online and the rest on delivery (the order's `payment.plan`).
Razorpay signatures are verified server-side with HMAC-SHA256.

To add Stripe:
1. Write one `PaymentProvider` subclass in the backend.
2. Write one adapter in the frontend.
3. Register both.

`mock` refuses to start in production.

### Firestore collections

`products`, `categories`, `orders`, `reviews`, `users` (profile + addresses), `carts`, `wishlists`, `coupons`, `newsletter`, `search_stats`, `counters`

Images go to Cloud Storage under `products/{id}/`, `categories/` and `avatars/{uid}/`. Firestore stores their URLs and paths.

## Going live with Firebase

1. **Create a Firebase project** and enable **Authentication** with the **Google** provider only (sign-in and sign-up are the same button), **Firestore** and **Storage**.
2. **Deploy the rules and indexes:**
   ```bash
   cd firebase && firebase deploy --only firestore,storage --project <project-id>
   ```
   The browser never touches Firestore directly: all access goes through the API using the Admin SDK.
3. **Configure the backend (`.env`):**
   - `DATA_BACKEND=firestore`
   - `ALLOW_DEV_AUTH=false`
   - `ENV=production`
   - `FIREBASE_PROJECT_ID` and `FIREBASE_STORAGE_BUCKET`
   - `CORS_ORIGINS=https://your-site`
4. **Seed the catalogue** (optional): `DATA_BACKEND=firestore python -m scripts.seed`
5. **Make yourself an admin:** sign in once, then run `python -m scripts.set_admin you@example.com` or set `is_admin` to `true` on your `users/{uid}` document in the Firestore console. It applies on the next request.
6. **Configure the frontend (`.env`):** `VITE_FIREBASE_*` from the Firebase console, and `VITE_API_URL` set to the Cloud Run URL. Once `VITE_FIREBASE_API_KEY` is set, the dev sign-in is no longer used.

## Deployment

**API → Cloud Run (auto-deploys from `main`)**

The API runs on Cloud Run as `simplyodd-api` in project `simply-odd`, region `asia-south1`: https://simplyodd-api-18861122418.asia-south1.run.app (docs at `/api/docs`).

`.github/workflows/deploy-backend.yml` runs the backend tests, builds the image into Artifact Registry (`simplyodd`, which keeps the newest 2 images), and deploys it on every push to `main` that touches `backend/`, or on demand from the Actions tab. GitHub signs in with Workload Identity Federation as `simplyodd-deployer` (Cloud Run Developer, plus write access to the image repo), so there are no keys and no GitHub variables to set.

Everything else lives on the Cloud Run service and carries over to each new revision:

- **Env vars:** `ENV=production`, `ALLOW_DEV_AUTH=false`, `DATA_BACKEND=firestore`, `SEED_DEMO_DATA=false`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET=simply-odd.firebasestorage.app`, `MEDIA_BACKEND=firebase`, `PAYMENT_PROVIDERS`, `CORS_ORIGINS`, `PUBLIC_BASE_URL`. Change them with `gcloud run services update simplyodd-api --region asia-south1 --update-env-vars KEY=value`, or in the console under **Cloud Run → simplyodd-api → Edit & deploy new revision**.
- **Sizing:** 1 vCPU, 512Mi, CPU only during requests, min 0 and max 1 instances, concurrency 40.
- **Access:** public (`allUsers` has Cloud Run Invoker). The service runs as `simplyodd-api`, which can use Firestore (Datastore User), check Firebase sign-ins (Firebase Authentication Viewer) and manage objects in the image bucket only. No key file or `FIREBASE_CREDENTIALS_JSON` is needed.

Images go to the Firebase Storage bucket `simply-odd.firebasestorage.app` in `us-central1`, the region covered by the Cloud Storage free tier. The bucket is private; `firebase/storage.rules` makes `products/`, `categories/` and `avatars/` readable through download links.

The service scales to zero when idle, so the first request after a quiet period takes a few seconds.

**Frontend → Vercel**

Build command `npm run build`, output `dist`. `vercel.json` already includes SPA rewrites and security headers.

Nothing is provider-specific: the API is a plain ASGI app (there's also a `Dockerfile`), and the frontend is static files plus one env var.

## Oddly Assistant (AI shopping chat)

A chat widget on every storefront page (hidden on checkout) that finds products, filters by budget, compares pieces,
answers policy questions, takes custom-creation briefs and shows a signed-in customer their own orders.

**How it works.** `POST /api/chat/message` → `ChatService` (`backend/app/services/chat/`) sends the message, a compact
JSON session context (last search, budget, recently shown products) and the last few turns to Groq with seven tools.
The model can only *call* tools; `tools.py` validates every argument with Pydantic and runs it against the existing
services: published products only, the caller's own orders only, and a brief is sent only after the customer
explicitly confirms (the **Send brief** button, or a "yes" to a summary they've seen). Product cards, prices, images
and links in a reply are copied from the catalogue by the server, never from model text.

**Three layers.** Groq answers first (free tier). If Groq is rate limited, over its call budget, slow, down or returns a
broken tool call, the **Claude API** (`ANTHROPIC_API_KEY`, `claude-opus-5-5` at effort `low` by default) takes that
call with the same tools and rules. If both fail, or neither key is set, the same tools answer directly (`parsing.py`
reads the budget, intent and search words). Shopping never depends on either model.

Claude is paid per token (Opus 5.5: $4 / $20 per million input/output tokens; a chat turn is roughly 2–3 calls of a few
thousand input tokens, most of them served from the prompt cache). `ANTHROPIC_MAX_CALLS_PER_MINUTE` (10) caps how fast
it can spend, and the analytics report `llm_backup_rescues` and `llm_calls_by_provider` so you can see how often it
runs. Requests opt into server-side refusal fallbacks (`fallbacks: "default"`), so a policy decline is retried on
another model inside the same call. To spend less, set `ANTHROPIC_MODEL=claude-sonnet-5-5` or `claude-haiku-5-5`.

| File | What |
|---|---|
| `services/chat/knowledge.py` | FAQ/policy answers, copied from the Help, Customise and product pages. Edit both together. |
| `services/chat/tools.py` | `search_products`, `get_product_details`, `compare_products`, `search_faq`, `create_custom_enquiry`, `get_order_status`, `get_business_information` |
| `services/chat/llm.py` | Groq then Claude (`ChainLLM`). Each: one SDK retry, pause after a 429 (honours `Retry-After`), per-minute call budget. Groq also falls through retired models |
| `services/chat/service.py` | Sessions, context, the tool loop (max 3 rounds), fallback, persistence, analytics |
| `frontend/src/features/chat/` | Widget (the panel is lazy-loaded on first open) |

**Endpoints** (all JSON; each request after session creation sends the `X-Chat-Token` returned at creation):

| | |
|---|---|
| `POST /api/chat/sessions` | `{visitor_id?}` → `{session_id, token, expires_at, greeting, suggestions}` |
| `POST /api/chat/message` | `{session_id, message}` → `{type, message, products, comparison, faq, enquiry, orders, suggestions, fallback}` |
| `GET /api/chat/history/{session_id}` | The conversation. A signed-in conversation also needs that account's bearer token. |
| `POST /api/chat/enquiries` | Sends a custom brief to the existing `custom_requests` (admin → Custom requests, marked "Oddly Assistant") |
| `POST /api/chat/feedback` | `{session_id, message_id, rating: up\|down}` |
| `GET /api/admin/chat/analytics?days=30` | Conversations, messages, intents, failed queries, Groq failures/429s, tokens, latency, top recommended products |
| `POST /api/admin/chat/cleanup` | Deletes expired conversations |

**Storage** (Firestore, through `DocumentStore` like everything else): `chat_sessions`, `chat_messages` (both carry
`expires_at`), `chat_stats` (one doc per day), `chat_product_stats`. Deploy the new index with
`firebase deploy --only firestore:indexes`. To expire old chats automatically, add TTL policies:
```bash
gcloud firestore fields ttls update expires_at --collection-group=chat_sessions --enable-ttl --project simply-odd
gcloud firestore fields ttls update expires_at --collection-group=chat_messages --enable-ttl --project simply-odd
```

**Limits.** Per IP (`main.py`): 20 messages/min and 300/hour. Per visitor or customer: `CHAT_MESSAGES_PER_MINUTE` (12) and
`CHAT_MESSAGES_PER_DAY` (200). Messages are capped at `CHAT_MAX_MESSAGE_CHARS` (600) and chat bodies at 16 KB.
Groq calls are capped at `GROQ_MAX_CALLS_PER_MINUTE` (25) for the whole process; past that, replies use the fallback.
A message costs 2–3 Groq calls (one per tool round). Groq's free tier has per-model request and token limits, is not
guaranteed for production use, and can change. Check your limits at console.groq.com/settings/limits.

**Set up Groq**
1. Create a key at https://console.groq.com/keys.
2. Pick a production model from https://console.groq.com/docs/models (all Groq models support tool calling).
   The default is `openai/gpt-oss-20b`, then `openai/gpt-oss-120b`. Free-tier limits are per model (8,000 tokens a
   minute each on the key tested), and a 429 moves to the next model, so add every tool-capable model your key
   lists to `GROQ_FALLBACK_MODELS` (e.g. `qwen/qwen3.8-27b`). A chat message uses roughly 2,500 tokens per call.
3. Locally: set `GROQ_API_KEY` in `backend/.env` (see `.env.example` for every `GROQ_*`/`CHAT_*` setting).
4. Cloud Run: keep the key in Secret Manager rather than a plain env var:
   ```bash
   printf %s "$KEY" | gcloud secrets create groq-api-key --data-file=- --project simply-odd
   gcloud secrets add-iam-policy-binding groq-api-key --project simply-odd \
     --member serviceAccount:simplyodd-api@simply-odd.iam.gserviceaccount.com --role roles/secretmanager.secretAccessor
   gcloud run services update simplyodd-api --region asia-south1 \
     --update-secrets GROQ_API_KEY=groq-api-key:latest --update-env-vars GROQ_MODEL=openai/gpt-oss-20b
   ```
   Like the other env vars, it carries over to every new revision the deploy workflow creates.
5. Optional backup: create a Claude API key at https://platform.claude.com/settings/keys and add it the same way
   (`groq-api-key` → `anthropic-api-key`, `GROQ_API_KEY` → `ANTHROPIC_API_KEY`).

## Not included yet

- **Transactional email** (order confirmation, shipped). Hook it into `OrderService` status changes, e.g. with the Firebase "Trigger Email" extension or Resend.
- **FCM push notifications.** The spec made these optional. The same status-change hook is the place to send them.
- **Razorpay webhooks** as a backup to client-side confirmation. Add a `/payments/razorpay/webhook` route that calls `confirm_payment`.
- **Expiring unpaid orders.** Unpaid `pending` orders stay open until cancelled. A Cloud Scheduler job that cancels them after ~30 minutes is recommended.
