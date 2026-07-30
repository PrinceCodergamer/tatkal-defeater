# 🚆 Tatkal Defeater

> **A high-scale, fair reservation & admission lottery system** — designed to defeat bots, scalpers, and unfair booking practices for high-demand events like train tatkal bookings, concert tickets, flash sales, and visa slots.

[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-%3E%3D9-blue)](https://pnpm.io)
[![NestJS](https://img.shields.io/badge/NestJS-11-red)](https://nestjs.com)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)](https://postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D)](https://redis.io)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748)](https://prisma.io)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![CI](https://img.shields.io/badge/CI-GitHub_Actions-2088FF?logo=github-actions&logoColor=white)](https://github.com/Pm987/tatkal-defeater/actions/workflows/ci.yml)
[![Docker](https://img.shields.io/badge/Docker-GHCR-2496ED?logo=docker&logoColor=white)](https://github.com/Pm987/tatkal-defeater/pkgs/container/tatkal-defeater)
[![Load Test](https://img.shields.io/badge/load_test-k6-7D64FF?logo=k6&logoColor=white)](tests/load/admission-gate.js)

---

## 🧠 Problem

When demand far exceeds supply (train tatkal quotas, concert tickets, flash sales), traditional first-come-first-served systems create perverse incentives:

- **Bots** submit thousands of requests per second
- **Scalpers** hoard seats with fake identities
- **Faster internet** gives unfair advantage
- **CAPTCHAs** annoy real users but barely slow bots
- **Page refreshes** under load break the experience

## 💡 Solution

Tatkal Defeater replaces first-click-wins with **random lottery admission** at a controlled rate. Every user who arrives in the opening window has an equal probability of being admitted, regardless of connection speed, browser automation, or number of parallel requests.

---

## ✨ Key Features

- **🎲 Randomized Lottery Admission** — 500 admissions/sec via random selection from a Redis sorted-set waiting queue
- **🔐 HMAC-Signed Queue Tokens** — tamper-proof tokens prevent queue-jumping and token forgery
- **🛡️ Anti-Bot Defense** — device fingerprinting, per-device and per-IP rate limiting, multi-account detection
- **📡 Real-Time WebSocket Updates** — Socket.IO gateway pushes queue position updates every 500ms
- **⚡ PostgreSQL Optimistic Concurrency** — `SELECT FOR UPDATE SKIP LOCKED` + version-based locking prevents double bookings
- **🔁 Idempotency Key Protection** — safe retries without duplicate charges or double allocations
- **⏱️ 5-Minute Seat Hold** — locked seat gives time to complete booking without racing
- **🔄 Expired Hold Release** — automatic cleanup of abandoned holds every 30 seconds
- **🏗️ Turborepo Monorepo** — shared types, database client, and apps in a single repo

---

## 🏗️ Architecture

```mermaid
graph TB
    subgraph "Client"
        Web[Next.js 15 Web App]
    end

    subgraph "API Gateway"
        Auth[Auth Module<br/>Identity Verification]
        AB[Anti-Bot Module<br/>Rate Limiting & Trust Profiles]
    end

    subgraph "Admission"
        AC[Admission Controller<br/>Queue Entry & Status]
        AG[Admission Gateway<br/>WebSocket Position Updates]
        ALS[Admission Lottery Worker<br/>500/sec Random Draw]
        AS[Admission Service<br/>HMAC Tokens & Seat Allocation]
    end

    subgraph "Reservation"
        RS[Reservation Service<br/>Atomic Seat Allocation<br/>Version-Based Locking]
    end

    subgraph "Payment"
        PS[Payment Service<br/>Idempotent Payments]
    end

    subgraph "Data Stores"
        PG[(PostgreSQL 16<br/>Prisma ORM<br/>Inventory, Reservations, Trust)]
        RD[(Redis 7<br/>Waiting Queue<br/>Rate Limits<br/>Fingerprint Registry)]
    end

    subgraph "Background"
        HEW[Hold Expiry Worker<br/>Every 30s]
    end

    Web -->|Socket.IO<br/>queue:update| AG
    Web -->|REST /api| AC
    Web -->|REST /api| RS
    Web -->|REST /api| PS

    AC --> AS
    AG --> AS
    AS --> RD
    AS --> PG

    ALS -->|tick 100ms| AS

    RS --> PG
    PS --> PG
    PS --> RS

    AB --> RD
    AB --> PG

    HEW -->|release expired| PG

    Auth --> PG
```

### Admission Flow

```
User → Auth (verify phone/ID) → Queue Entry (get HMAC-signed token)
  → Redis Sorted Set (positioned by timestamp)
  → WebSocket (real-time position updates every 500ms)
  → Lottery Draw (random 50/tick, 10 ticks/sec = 500/sec)
  → Seat Allocation (SELECT FOR UPDATE SKIP LOCKED)
  → 5-Minute Hold (version-incrementing optimistic lock)
  → Payment (idempotent) → Confirmed!
```

---

## 🛠️ Tech Stack

| Layer       | Technology                                    |
|------------|-----------------------------------------------|
| **Monorepo** | Turborepo 2, pnpm 9                          |
| **API**      | NestJS 11, Express, Socket.IO, BullMQ        |
| **Frontend** | Next.js 15, React 19, Tailwind CSS 4         |
| **Database** | PostgreSQL 16 via Prisma 6 (ORM)             |
| **Cache**    | Redis 7 via ioredis                          |
| **Background** | BullMQ workers + setInterval workers      |
| **Auth**     | Phone OTP verification (pluggable)           |
| **Anti-Bot** | Device fingerprinting, rate limiting, trust profiles |

---

## 📁 Project Structure

```
tatkal-defeater/
├── apps/
│   ├── api/                          # NestJS 11 API server
│   │   └── src/
│   │       ├── admission/            # Queue entry, lottery, WebSocket gateway
│   │       ├── anti-bot/              # Rate limiting, device fingerprinting, trust
│   │       ├── auth/                  # Identity verification (phone OTP)
│   │       ├── payment/              # Payment processing & webhooks
│   │       ├── reservation/          # Atomic seat allocation & booking
│   │       ├── redis/                # Redis client module (global)
│   │       ├── workers/              # Background workers (lottery, hold expiry)
│   │       ├── app.module.ts         # Root module
│   │       └── main.ts               # Bootstrap
│   └── web/                          # Next.js 15 frontend
│       └── app/
│           ├── page.tsx              # Home (verify + enter queue)
│           ├── layout.tsx            # Root layout
│           ├── globals.css           # Tailwind + CSS variables
│           ├── waiting-room/         # Real-time queue position
│           └── booking/              # 5-min seat hold + payment
├── packages/
│   ├── database/                     # Prisma client, schema, seed
│   │   ├── prisma/schema.prisma     # Database schema
│   │   └── src/
│   │       ├── client.ts            # Singleton PrismaClient
│   │       └── seed.ts              # 40-slot train inventory seed
│   └── shared/                       # Types, enums, DTOs, error classes
│       └── src/index.ts
├── docker-compose.yml               # PostgreSQL 16 + Redis 7
├── turbo.json                       # Turborepo task pipeline
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0 (`npm install -g pnpm`)
- **Docker** (for PostgreSQL & Redis) or local instances
- **Git**

### Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd tatkal-defeater

# 2. Install dependencies
pnpm install

# 3. Start infrastructure (PostgreSQL + Redis)
docker compose up -d

# 4. Push Prisma schema and seed data
pnpm db:push
pnpm db:seed

# 5. Start development servers
pnpm dev
```

This starts:
- **API server** at `http://localhost:3001` (with `--watch`)
- **Web app** at `http://localhost:3000` (Next.js HMR)

> **Note:** The API and web run concurrently via Turborepo. You can also run individually:
> - `pnpm dev:api` — API only
> - `pnpm dev:web` — Web only

### Verify It Works

```bash
# Enter the queue
curl -X POST http://localhost:3001/api/admission/enter \
  -H "Content-Type: application/json" \
  -d '{"userId": "9999999999", "deviceFingerprint": "test-fp-001"}'

# Check queue status (replace TOKEN_ID with actual)
curl http://localhost:3001/api/admission/status/<TOKEN_ID>

# Check anti-bot status
curl -X POST http://localhost:3001/api/anti-bot/check \
  -H "Content-Type: application/json" \
  -d '{"deviceFingerprint": "test-fp-001", "userId": "9999999999"}'
```

---

## 🔌 API Overview

All endpoints are prefixed with `/api`.

### Auth

| Method | Path               | Description                       |
|--------|--------------------|-----------------------------------|
| POST   | `/api/auth/verify` | Verify identity via phone number  |
| GET    | `/api/auth/check/:sessionToken` | Check session validity |

### Admission (Queue)

| Method | Path                            | Description                                  |
|--------|---------------------------------|----------------------------------------------|
| POST   | `/api/admission/enter`          | Enter waiting queue (returns HMAC-signed token + position) |
| GET    | `/api/admission/status/:tokenId` | Current queue position and status            |
| POST   | `/api/admission/lottery-tick`   | Manually trigger a lottery draw (dev/debug)  |
| POST   | `/api/admission/release-expired`| Release expired holds (dev/debug)            |

### Reservation

| Method | Path                         | Description                                   |
|--------|------------------------------|-----------------------------------------------|
| POST   | `/api/reservation/allocate`  | Atomically allocate a seat (optimistic locking) |
| POST   | `/api/reservation/confirm`   | Confirm reservation after payment             |
| POST   | `/api/reservation/cancel`    | Cancel reservation & release inventory        |

### Payment

| Method | Path                    | Description                          |
|--------|-------------------------|--------------------------------------|
| POST   | `/api/payment/create`   | Create payment (idempotent)          |
| POST   | `/api/payment/process`  | Process simulated payment            |
| POST   | `/api/payment/webhook`  | Stripe-style async webhook           |

### Anti-Bot

| Method | Path                        | Description                                  |
|--------|-----------------------------|----------------------------------------------|
| POST   | `/api/anti-bot/check`       | Check rate limits + trust level              |
| POST   | `/api/anti-bot/fingerprint` | Track device fingerprint association         |

### WebSocket

| Namespace | Event              | Direction | Description                       |
|-----------|--------------------|-----------|-----------------------------------|
| `/queue`  | `subscribe:position` | Client → Server | Start receiving position updates |
| `/queue`  | `queue:update`     | Server → Client | Position, totalWaiting, status (every 500ms) |
| `/queue`  | `queue:admitted`   | Server → Client | You've been admitted to book!    |

---

## 🧩 Core Concepts

### 1. Queue & HMAC-Signed Tokens

Users entering the system receive an **HMAC-SHA256-signed token** containing their `userId`, `sessionId`, and a timestamp. This prevents:

- **Token forgery** — tokens cannot be re-signed without the secret
- **Queue-jumping** — position is determined by Redis sorted set insertion order
- **Session replay** — tokens are tied to a specific session

The token is a base64-encoded payload concatenated with its HMAC signature: `<base64(payload)>.<hex(signature)>`

### 2. Random Lottery Admission

Instead of first-come-first-served (which rewards bots and fast connections), admission uses a **weighted random lottery**:

- The **Admission Lottery Worker** runs every 100ms (10 draws/second)
- Each draw picks 50 random candidates from the front of the Redis sorted set
- Candidates are **shuffled randomly** before allocation attempts
- At 500 seats/second, most users are admitted within seconds — fairly

```
Rate: 500/sec = 10 ticks/sec × 50 admits/tick
```

### 3. Anti-Bot Defense System

| Layer                 | Mechanism                                       | Threshold     |
|-----------------------|-------------------------------------------------|---------------|
| Device Fingerprinting | Unique browser/device signature                 | —             |
| Per-Device Rate Limit | Redis counter with 60s TTL                     | 30 req/min    |
| Per-IP Rate Limit     | Redis counter with 60s TTL                     | 100 req/min   |
| Multi-Account Detection | Redis set tracking fingerprints per account   | ≥10 accounts  |
| Trust Profiles        | Persistent user scoring (TRUSTED → BANNED)     | Escalating    |

When a device fingerprint is associated with 10+ accounts, **all** accounts are flagged, restricting their ability to book.

### 4. Atomic Seat Allocation

The core of the reservation system uses **PostgreSQL optimistic concurrency**:

```sql
UPDATE "InventorySlot"
SET available_capacity = available_capacity - 1,
    version = version + 1,
    hold_expires_at = NOW() + INTERVAL '5 minutes'
WHERE id = $1
  AND available_capacity >= $2
  AND (hold_expires_at IS NULL OR hold_expires_at < NOW())
RETURNING id, available_capacity, version, hold_expires_at;
```

- **`SELECT FOR UPDATE SKIP LOCKED`** skips already-locked rows instead of waiting
- **Version column** prevents lost updates via optimistic locking
- **No application-level mutexes** — the database handles concurrency

### 5. Idempotency Keys

Every mutation endpoint requires an [idempotency key](https://stripe.com/docs/api/idempotent_requests). If a request is retried with the same key, the system returns the existing result without side effects. This is critical for payment and reservation flows where network retries are common.

---

## ⚙️ Configuration

Environment variables are loaded from `.env` files. Create `apps/api/.env`:

```env
# Server
API_PORT=3001
CORS_ORIGIN=http://localhost:3000

# Database
DATABASE_URL=postgresql://tatkal:tatkal_dev@localhost:5432/tatkal_defeater

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Security
HMAC_SECRET=change-this-to-a-strong-random-secret-in-production

# Admission
ADMISSION_RATE=500        # Users admitted per second
```

The `docker-compose.yml` provides sensible defaults for local development:
- PostgreSQL: `tatkal` / `tatkal_dev` on port 5432
- Redis: port 6379

---

## 🧪 Load Testing

Built-in load testing scripts (using the `test` scripts in `package.json`):

```bash
# k6-based API load test (requires k6)
pnpm test:load:api

# Simulate 1000 users hitting the tatkal opening
pnpm test:load:tatkal

# Playwright-based browser simulation
pnpm test:load:browser
```

---

## 📦 Deployment

### Docker / Docker Compose

The included `docker-compose.yml` runs PostgreSQL and Redis. For production, consider:

1. **PostgreSQL** — Managed (RDS, Cloud SQL, Supabase) or replicated self-hosted
2. **Redis** — Managed (ElastiCache, Upstash) or Redis Cluster
3. **API** — Containerized, deployed behind a load balancer (ECS, GKE, Railway, Fly.io)
4. **Web** — Static export or Vercel / Cloudflare Pages

```bash
# Build all packages
pnpm build

# Start production server
pnpm --filter=@tatkal/api start
```

### Environment Variables (Production)

Ensure all secrets are set in your deployment environment:
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_HOST` / `REDIS_PORT` — Redis connection
- `HMAC_SECRET` — **Strong, unique secret** for token signing
- `CORS_ORIGIN` — Frontend URL
- `ADMISSION_RATE` — Tickets to admit per second

---

## 🧰 Development

```bash
pnpm dev          # Run both API and Web in dev mode
pnpm lint         # Lint all packages
pnpm test         # Run all tests
pnpm db:studio    # Open Prisma Studio (DB GUI)
```

---

## 🗺️ Roadmap

- [ ] JWT-based auth with real OTP providers (Twilio, AWS SNS)
- [ ] Stripe/PhonePe payment integration
- [ ] Admin dashboard (real-time monitoring, manual adjustments)
- [ ] Refundable deposit system to deter fake entries
- [ ] k6-based CI load testing pipeline
- [ ] Multi-region Redis cluster for geo-distributed queues
- [ ] Rate-limit banning with automatic IP blacklisting

---

## 🤝 Contributing

Contributions are welcome! Please ensure:

1. **Tests pass** — `pnpm test` before submitting
2. **Lint clean** — `pnpm lint`
3. **New features include tests** — at minimum, a load test for admission changes
4. **Type safety** — TypeScript strict mode is enabled project-wide

---

## 📄 License

MIT

---

## 🙏 Inspiration

This project was inspired by the challenges of India's IRCTC tatkal system, where millions compete for a few thousand seats daily. The lottery-based approach is inspired by concert ticket systems (Ticketmaster's Verified Fan, Dice.fm) and fair queuing systems (Cloudflare's Waiting Room).
