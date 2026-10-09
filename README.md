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

At checkout, the **Test card** method has a "Simulate a declined card" switch. **Cash on delivery** confirms immediately.
Coupons `ODDONE` (10% off) and `FREESHIP` are seeded.

Data persists to `backend/.data/store.json`. Delete `backend/.data` to reseed.

```bash
cd backend && .venv/bin/python -m pytest      # API tests
cd frontend && npm run build                  # typecheck + production build
```

## Architecture

**The API owns every business rule.** React never computes money or decides whether a payment succeeded.

- **Pricing** (`services/pricing.py`) is the single source of truth. The bag, drawer and checkout render `POST /api/cart/quote`, and checkout recomputes the quote server-side.
- **Stock** is reserved atomically when an order is placed (a Firestore transaction). It is released on cancel or when payment can't start.
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

**Frontend → Vercel or Netlify**

Build command `npm run build`, output `dist`. `vercel.json` and `netlify.toml` already include SPA rewrites.

Nothing is provider-specific: the API is a plain ASGI app (there's also a `Dockerfile`), and the frontend is static files plus one env var.

## Not included yet

- **Transactional email** (order confirmation, shipped). Hook it into `OrderService` status changes, e.g. with the Firebase "Trigger Email" extension or Resend.
- **FCM push notifications.** The spec made these optional. The same status-change hook is the place to send them.
- **Razorpay webhooks** as a backup to client-side confirmation. Add a `/payments/razorpay/webhook` route that calls `confirm_payment`.
- **Expiring unpaid orders.** Unpaid `pending` orders hold stock until cancelled. A Cloud Scheduler job that cancels them after ~30 minutes is recommended.
