# Tatkal-Defeater Architecture

## 1. Identity Verification Service

### 1.1 Hexagonal Architecture (Ports & Adapters)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CONTROLLER LAYER                               │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  IdentityController                                              │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │  │
│  │  │ POST /init   │  │ POST /verify │  │ POST /consent/revoke │  │  │
│  │  └──────┬───────┘  └──────┬───────┘  └───────────────────────┘  │  │
│  └─────────┼──────────────────┼──────────────────────────────────────┘  │
└────────────┼──────────────────┼─────────────────────────────────────────┘
             │                  │
┌────────────┼──────────────────┼─────────────────────────────────────────┐
│            ▼                  ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    SERVICE LAYER (Domain)                        │  │
│  │                                                                  │  │
│  │  ┌─────────────────────────────────────────────────────────┐    │  │
│  │  │           IdentityVerificationService                     │    │  │
│  │  │  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐  │    │  │
│  │  │  │ Initiate│ │ Verify   │ │ Generate │ │ Publish     │  │    │  │
│  │  │  │ Session │ │ OTP      │ │ Identity │ │ Event       │  │    │  │
│  │  │  └─────────┘ └──────────┘ └───┬──────┘ └──────┬──────┘  │    │  │
│  │  └───────────────────────────────┼───────────────┼──────────┘    │  │
│  └──────────────────────────────────┼───────────────┼────────────────┘  │
│                                     │               │                   │
│  ┌──────────────────────────────────┼───────────────┼────────────────┐  │
│  │             PORT INTERFACES       │               │                │  │
│  │  ┌──────────────┐ ┌──────────┐ ┌─▼───────────┐ ┌─▼───────────┐  │  │
│  │  │ IdentityProv │ │ RateLimt │ │ IdentityRepo │ │ EventPub    │  │  │
│  │  │ ierPort      │ │ Port     │ │ Port         │ │ lisherPort  │  │  │
│  │  └──────┬───────┘ └────┬─────┘ └──────┬───────┘ └──────┬──────┘  │  │
│  └─────────┼──────────────┼───────────────┼───────────────┼──────────┘  │
└────────────┼──────────────┼───────────────┼───────────────┼─────────────┘
             │              │               │               │
┌────────────┼──────────────┼───────────────┼───────────────┼─────────────┐
│            ▼              ▼               ▼               ▼             │
│  ┌──────────────┐ ┌────────────┐ ┌──────────────┐ ┌────────────────┐  │
│  │  Aadhaar     │ │  Redis     │ │  Prisma      │ │  Kafka/Rabbit  │  │
│  │  Provider    │ │  RateLimit │ │  Repo        │ │  Outbox Pub    │  │
│  └──────────────┘ └────────────┘ └──────────────┘ └────────────────┘  │
│                    INFRASTRUCTURE ADAPTERS                              │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Identity Verification Flow (Detailed)

```
                     IDENTITY VERIFICATION SEQUENCE
┌──────┐    ┌──────────┐    ┌──────────┐    ┌────────┐    ┌──────────┐
│User  │    │Controller│    │ Service  │    │Provider│    │  Redis   │
│      │    │          │    │          │    │Adapter │    │  Cache   │
└──┬───┘    └────┬─────┘    └────┬─────┘    └───┬────┘    └────┬─────┘
   │             │               │               │             │
   │  Submit     │               │               │             │
   │  Identity   │               │               │             │
   │  +Consent   │               │               │             │
   │────────────►│               │               │             │
   │             │  DTO Validate │               │             │
   │             │  Rate Check   │               │             │
   │             │  Idempotency  │               │             │
   │             │──────────────►│               │             │
   │             │               │  Init Session │             │
   │             │               │──────────────►│             │
   │             │               │               │             │
   │             │               │  Cache Session│             │
   │             │               │  (TTL: 5 min) │────────────►│
   │             │               │               │             │
   │             │  Session ID   │               │             │
   │             │◄──────────────│               │             │
   │  Session ID │               │               │             │
   │◄────────────│               │               │             │
   │             │               │               │             │
   │  Submit OTP │               │               │             │
   │────────────►│               │               │             │
   │             │  Verify OTP   │               │             │
   │             │──────────────►│               │             │
   │             │               │  Verify OTP   │             │
   │             │               │──────────────►│             │
   │             │               │  Verified     │             │
   │             │               │◄──────────────│             │
   │             │               │               │             │
   │             │               │  SHA-256 Hash │             │
   │             │               │  Identity     │             │
   │             │               │               │             │
   │             │               │  Check Active │             │
   │             │               │  Queue Pos    │             │
   │             │               │──────────────►│             │
   │             │               │   (Redis)     │             │
   │             │               │               │             │
   │             │               │  Persist to   │             │
   │             │               │  PostgreSQL   │             │
   │             │               │  (Verified    │             │
   │             │               │   Identity)   │             │
   │             │               │               │             │
   │             │               │  Publish      │             │
   │             │               │  Identity     │             │
   │             │               │  Validated    │             │
   │             │               │  Event        │             │
   │             │               │  (Outbox)     │             │
   │             │               │               │             │
   │  Verified   │               │               │             │
   │◄────────────│               │               │             │
   │             │               │               │             │
```

### 1.3 Core Domain Entities

```typescript
// ─── Identity Verification Domain ──────────────────────────────

interface VerifiedIdentity {
  id: string;
  identityHash: string;       // SHA-256 of identity number
  identityType: IdentityType; // AADHAAR | PAN | PASSPORT | PHONE | EMAIL
  maskedIdentity: string;     // Last 4 digits only (XXXX-XXXX-1234)
  consentGrantedAt: Date;
  consentRevokedAt?: Date;
  deviceFingerprints: string[];
  verifiedAt: Date;
  lastVerifiedAt: Date;
  verificationCount: number;
  metadata: Record<string, unknown>;

  // One user can have multiple identities
  userId?: string;
}

interface VerificationSession {
  id: string;
  identityHash: string;
  status: SessionStatus;       // PENDING | OTP_SENT | VERIFIED | EXPIRED | FAILED
  providerSessionId: string;   // External provider's session ID
  otpAttempts: number;
  maxOtpAttempts: number;      // Default: 3
  expiresAt: Date;
  deviceFingerprint?: string;
  ipAddress?: string;
  metadata: Record<string, unknown>;
}

interface QueueIdentity {
  id: string;
  identityHash: string;
  queueToken: string;          // HMAC-signed queue admission token
  status: QueueTokenStatus;    // ACTIVE | IN_QUEUE | ADMITTED | EXPIRED
  activeQueuePosition?: string;
  enteredQueueAt?: Date;
  admittedAt?: Date;
  expiresAt: Date;
}
```

### 1.4 Database Schema (Prisma)

```prisma
model VerifiedIdentity {
  id                  String   @id @default(uuid())
  identityHash        String   @unique // SHA-256 — deterministic dedup
  identityType        IdentityType
  maskedIdentity      String
  consentGrantedAt    DateTime
  consentRevokedAt    DateTime?
  deviceFingerprints  Json?    // Array of known fingerprints
  verifiedAt          DateTime @default(now())
  lastVerifiedAt      DateTime @updatedAt
  verificationCount   Int      @default(1)
  metadata            Json?
  userId              String?  // Linked user account (optional)

  // Relationships
  verificationSessions VerificationSession[]
  queueEntries         QueueEntry[]
  auditLogs            AuditLog[]

  @@index([identityHash])
  @@index([userId])
  @@index([identityType])
}

enum IdentityType { AADHAAR PAN PASSPORT PHONE EMAIL }

model VerificationSession {
  id                String        @id @default(uuid())
  identityHash      String
  status            SessionStatus @default(PENDING)
  providerSessionId String
  providerName      String        // "aadhaar", "mock", etc.
  otpAttempts       Int           @default(0)
  maxOtpAttempts    Int           @default(3)
  expiresAt         DateTime
  deviceFingerprint String?
  ipAddress         String?
  metadata          Json?
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  // Link to verified identity (if completed)
  verifiedIdentity  VerifiedIdentity? @relation(fields: [identityHash], references: [identityHash])

  @@index([identityHash])
  @@index([status, expiresAt])
  @@index([providerSessionId])
}

enum SessionStatus { PENDING OTP_SENT VERIFIED EXPIRED FAILED }

model QueueEntry {
  id              String          @id @default(uuid())
  identityHash    String
  queueToken      String          @unique // HMAC-signed
  status          QueueTokenStatus @default(ACTIVE)
  activePosition  Int?
  enteredQueueAt  DateTime?
  admittedAt      DateTime?
  expiresAt       DateTime
  createdAt       DateTime        @default(now())

  // Link to verified identity
  verifiedIdentity VerifiedIdentity? @relation(fields: [identityHash], references: [identityHash])

  @@index([identityHash, status])
  @@index([queueToken])
  @@index([status, expiresAt])
}

enum QueueTokenStatus { ACTIVE IN_QUEUE ADMITTED EXPIRED }

model OutboxEvent {
  id            String   @id @default(uuid())
  aggregateId   String
  aggregateType String   // "Identity", "Reservation", "Payment"
  eventType     String   // "IdentityValidated", "SeatAllocated", etc.
  payload       Json
  status        OutboxStatus @default(PENDING)
  retryCount    Int      @default(0)
  maxRetries    Int      @default(3)
  createdAt     DateTime @default(now())
  processedAt   DateTime?
  lockedAt      DateTime? // For outbox processor locking
  correlationId String?

  @@index([status, createdAt])
  @@index([aggregateId, aggregateType])
  @@index([correlationId])
}

enum OutboxStatus { PENDING PROCESSING FAILED COMPLETED }

model AuditLog {
  id            String   @id @default(uuid())
  eventType     String   // "IDENTITY_VERIFIED", "QUEUE_ENTERED", etc.
  actorId       String?  // userId or identityHash
  resourceType  String?
  resourceId    String?
  action        String   // "CREATE", "UPDATE", "DELETE", "VERIFY"
  details       Json?
  ipAddress     String?
  deviceFingerprint String?
  correlationId String?
  createdAt     DateTime @default(now())

  @@index([eventType, createdAt])
  @@index([actorId, createdAt])
  @@index([correlationId])
  @@index([createdAt])
}
```

### 1.5 Distributed Systems Patterns

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TRANSACTIONAL OUTBOX PATTERN                      │
│                                                                      │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐   │
│  │  Service  │────►│   ACID   │────►│ Outbox   │────►│  Message │   │
│  │  Action   │     │  TX      │     │ Event    │     │  Broker  │   │
│  │           │     │ ┌──────┐ │     │ ┌──────┐ │     │ (Kafka)  │   │
│  │ Save      │     │ │ DB   │ │     │ │ JSON  │ │     │          │   │
│  │ Identity  │     │ │ +    │ │     │ │ Payld │ │     │ Consumer │   │
│  │ + Outbox  │     │ │Outbox│ │     │ │      │ │     │          │   │
│  │ Atomically│     │ └──────┘ │     │ └──────┘ │     │ ┌──────┐ │   │
│  └──────────┘     └──────────┘     └────┬─────┘     │ │Queue │ │   │
│                                         │           │ │Srvc  │ │   │
│                              ┌──────────▼──────┐    │ └──────┘ │   │
│                              │  Outbox Worker   │    └──────────┘   │
│                              │  (BullMQ/Cron)   │                   │
│                              │  Polls → Publishes                  │
│                              └─────────────────┘                   │
│                                                                      │
│  BENEFITS: No dual-write problem. Exactly-once delivery guarantee.  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    DISTRIBUTED LOCKING STRATEGY                      │
│                                                                      │
│  "One Active Queue Position Per Verified User"                       │
│                                                                      │
│  ┌─────────────────────────────────────────────┐                    │
│  │  Redis SET NX EX (lock)                      │                    │
│  │                                              │                    │
│  │  Key: lock:queue:entry:{identityHash}        │                    │
│  │  Value: queueToken + timestamp               │                    │
│  │  TTL: 10 seconds (auto-release)             │                    │
│  │                                              │                    │
│  │  On failure: "Already in queue"              │                    │
│  └─────────────────────────────────────────────┘                    │
│                                                                      │
│  Fallback: PostgreSQL SELECT ... FOR UPDATE SKIP LOCKED             │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    IDEMPOTENCY STRATEGY                              │
│                                                                      │
│  ┌────────────┐     ┌────────────────────────┐                     │
│  │ Request    │────►│ Cache Check (Redis)     │                     │
│  │ +IdempKey  │     │ Key: idemp:{key}        │                     │
│  └────────────┘     │ If exists → return      │                     │
│                     │ Cached Response         │                     │
│                     └───────────┬────────────┘                     │
│                                 │                                   │
│                     ┌───────────▼────────────┐                     │
│                     │ DB Unique Constraint   │                     │
│                     │ Outbox.idempotencyKey  │                     │
│                     │ @unique                │                     │
│                     └────────────────────────┘                     │
│                                                                      │
│  Source: Idempotency-Key header or request body field               │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    CIRCUIT BREAKER (Identity Provider)               │
│                                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐      │
│  │  CLOSED  │───►│   OPEN   │───►│ HALF-OPEN│───►│  CLOSED  │      │
│  │ (Normal) │    │ (Failing)│    │ (Testing)│    │ (Recover)│      │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘      │
│                                                                      │
│  Failure threshold: 5 consecutive failures in 60s                  │
│  Cooldown: 30 seconds                                                │
│  Half-open max requests: 1                                          │
│                                                                      │
│  On OPEN: return cached "stale" identity if available               │
│  On OPEN + no cache: return 503 Service Unavailable                 │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    RETRY WITH EXPONENTIAL BACKOFF                    │
│                                                                      │
│  delay = min(baseDelay * 2^attempt, maxDelay) + jitter              │
│                                                                      │
│  Base: 100ms │ Max: 10s │ Max retries: 3                            │
│                                                                      │
│  Attempt 1: ~100ms + random(0-50ms)                                 │
│  Attempt 2: ~200ms + random(0-50ms)                                 │
│  Attempt 3: ~400ms + random(0-50ms)                                 │
│  → Dead Letter Queue after 3 failures                               │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    DEAD LETTER QUEUE                                 │
│                                                                      │
│  Events that fail after max retries go to DLQ:                      │
│  - Kafka: __consumer_offsets + dlq-{topic}                          │
│  - Redis: List key `dlq:{eventType}`                                │
│                                                                      │
│  DLQ Consumer:                                                       │
│  1. Log full event + error                                           │
│  2. Alert (PrometheusAlertManager)                                  │
│  3. Manual replay via admin API                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.6 Observability

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TELEMETRY (OpenTelemetry)                         │
│                                                                      │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐        │
│  │  Traces  │   │  Metrics │   │  Logs    │   │  Profiling│        │
│  │ (Jaeger) │   │(Prometh.)│   │ (Loki)   │   │ (Pyrosc.)│        │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘        │
│                                                                      │
│  Every request gets a correlationId (UUID v7)                       │
│  Propagated via: HTTP headers / Kafka message headers               │
│                                                                      │
│  METRICS (Prometheus):                                               │
│  ┌────────────────────────────────────────────┐                    │
│  │ tatkal_identity_verifications_total        │                    │
│  │ tatkal_identity_verification_duration_ms   │                    │
│  │ tatkal_identity_provider_errors_total      │                    │
│  │ tatkal_identity_provider_circuit_breaker   │                    │
│  │ tatkal_queue_admissions_total              │                    │
│  │ tatkal_queue_position_depth                │                    │
│  │ tatkal_otp_attempts_total                  │                    │
│  │ tatkal_outbox_events_total                 │                    │
│  │ tatkal_outbox_events_lag_seconds           │                    │
│  └────────────────────────────────────────────┘                    │
│                                                                      │
│  LOGS (Structured JSON):                                            │
│  { "level":"info","correlationId":"...","service":"identity",       │
│    "action":"verify_otp","result":"success","duration_ms":234 }     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Performance Testing Architecture

### 2.1 Test Infrastructure

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PERFORMANCE TEST INFRASTRUCTURE                   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │                    k6 Distributed Load                    │      │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │      │
│  │  │ k6 Node 1│  │ k6 Node 2│  │ k6 Node N│  │  k6       │ │      │
│  │  │(10K VUs) │  │(10K VUs) │  │(10K VUs) │  │ Operator │ │      │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │      │
│  └──────────────────────────────────────────────────────────┘      │
│                              │                                      │
│                              ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │                    Target System                          │      │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │      │
│  │  │ Identity │  │ Queue    │  │Reservtn  │  │  Payment │ │      │
│  │  │ Service  │  │ Service  │  │ Service  │  │  Service │ │      │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │      │
│  └──────────────────────────────────────────────────────────┘      │
│                              │                                      │
│                              ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │                    Observability Backend                  │      │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │      │
│  │  │Prometheus│  │  Grafana │  │  Loki    │  │  Jaeger  │ │      │
│  │  │ (Metrics)│  │ (Dashbd) │  │  (Logs)  │  │ (Traces) │ │      │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │      │
│  └──────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Test Scenarios

| Scenario | VUs | Duration | Target | Success Criteria |
|----------|-----|----------|--------|-----------------|
| Identity Verification Spike | 50K ramp 5s | 2 min | `/api/identity/init` | p95 < 2s, 0% error |
| OTP Submission Wave | 50K ramp 5s | 2 min | `/api/identity/verify` | p95 < 1s, 0% double-verify |
| Queue Admission Burst | 100K instant | 30s | `/api/admission/enter` | 500/s throughput, 0 DB deadlock |
| Lottery Fairness | 10K sustained | 5 min | `/api/admission/lottery-tick` | Chi-square p > 0.05 |
| Reservation Allocation | 1K × 10 concurrent | 1 min | `/api/reservation/allocate` | 0 double bookings |
| Payment Idempotency | 5K retry storm | 30s | `/api/payment/create` | Exactly 1 payment per key |
| Mixed Workload | 80K ramp 30s | 10 min | All endpoints | No cascading failure |
| Chaos Injection | 10K sustained | 15 min | All endpoints | Graceful degradation |

### 2.3 Chaos Engineering Scenarios

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CHAOS EXPERIMENTS                                 │
│                                                                      │
│  ┌─ DB Failover ─────────────────────────────────────────────────┐  │
│  │  What: Kill PostgreSQL primary                                 │  │
│  │  Expect: Read replicas serve, writes queue, 30s recovery       │  │
│  │  Metric: Error rate spike < 10%, recovery < 60s               │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─ Redis Failure ───────────────────────────────────────────────┐  │
│  │  What: Kill Redis node                                         │  │
│  │  Expect: Rate limiting falls back to in-memory, queue degrades │  │
│  │  Metric: Admission rate drops < 50%, no data loss             │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─ Network Latency ─────────────────────────────────────────────┐  │
│  │  What: Inject 500ms latency between services                   │  │
│  │  Expect: Circuit breakers open, requests queue gracefully      │  │
│  │  Metric: p99 latency < 5s, no cascading failures              │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─ Identity Provider Outage ────────────────────────────────────┐  │
│  │  What: Mock provider returns 503                               │  │
│  │  Expect: Circuit breaker opens, cached sessions work           │  │
│  │  Metric: New verifications fail gracefully (503 + retry-after) │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─ Pod Kill ────────────────────────────────────────────────────┐  │
│  │  What: Kill 2 of 5 API pods randomly                           │  │
│  │  Expect: Remaining pods absorb load, no connection loss        │  │
│  │  Metric: Error rate < 2% during kill                          │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─ Thundering Herd ─────────────────────────────────────────────┐  │
│  │  What: 100K users hit "Book" at exactly 10:00:00.000           │  │
│  │  Expect: Admission gate rate-limits to 500/s, lottery is fair  │  │
│  │  Metric: No crash, bot success == human success               │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─ Kafka/MQ Outage ────────────────────────────────────────────┐  │
│  │  What: Stop message broker                                     │  │
│  │  Expect: Outbox accumulates, no data loss on replay           │  │
│  │  Metric: Outbox lag grows, no data loss when broker recovers  │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─ Resource Exhaustion ─────────────────────────────────────────┐  │
│  │  What: Fill 90% of DB connections, 80% of Redis memory        │  │
│  │  Expect: Connection pooling handles, eviction policy works     │  │
│  │  Metric: No OOM, no connection timeout cascade                │  │
│  └────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.4 Grafana Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  Row 1: System Overview                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────┐  │
│  │ Request Rate │ │ Error Rate   │ │ p50/p95/p99  │ │ Active   │  │
│  │ (rps)        │ │ (%)          │ │ Latency (ms) │ │ Users    │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────┘  │
│                                                                      │
│  Row 2: Identity Service                                            │
│  ┌──────────────────────────────┐ ┌──────────────────────────────┐  │
│  │  Verifications/sec           │ │  OTP Attempts (success/fail) │  │
│  └──────────────────────────────┘ └──────────────────────────────┘  │
│  ┌──────────────────────────────┐ ┌──────────────────────────────┐  │
│  │  Circuit Breaker State       │ │  Provider Latency (p95)      │  │
│  └──────────────────────────────┘ └──────────────────────────────┘  │
│                                                                      │
│  Row 3: Queue & Reservation                                         │
│  ┌──────────────────────────────┐ ┌──────────────────────────────┐  │
│  │  Queue Depth                 │ │  Admission Rate (lottery)    │  │
│  └──────────────────────────────┘ └──────────────────────────────┘  │
│  ┌──────────────────────────────┐ ┌──────────────────────────────┐  │
│  │  Holds Active / Expired      │ │  Double Bookings (≤0)        │  │
│  └──────────────────────────────┘ └──────────────────────────────┘  │
│                                                                      │
│  Row 4: Infrastructure                                              │
│  ┌──────────────────────────────┐ ┌──────────────────────────────┐  │
│  │  DB Connection Pool Usage    │ │  Redis Memory Usage          │  │
│  └──────────────────────────────┘ └──────────────────────────────┘  │
│  ┌──────────────────────────────┐ ┌──────────────────────────────┐  │
│  │  Kafka Lag (per partition)   │ │  Outbox Pending Count        │  │
│  └──────────────────────────────┘ └──────────────────────────────┘  │
│                                                                      │
│  Row 5: Chaos Engineering (active experiment)                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Experiment: "Kill DB Primary"                                │  │
│  │  Status: RUNNING (23s elapsed)                                │  │
│  │  Impact: Error rate 3.2% (threshold: 10%)                    │  │
│  │  Remaining: 37s until steady-state check                     │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. CQRS Readiness / Eventual Consistency

```
┌─────────────────────────────────────────────────────────────────────┐
│                    COMMAND SIDE (WRITE)                             │
│                                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│  │ Identity │    │ Queue    │    │Reservtn  │    │  Payment │     │
│  │ Command  │    │ Command  │    │ Command  │    │  Command │     │
│  └─────┬────┘    └─────┬────┘    └─────┬────┘    └─────┬────┘     │
│        │               │               │               │           │
│        ▼               ▼               ▼               ▼           │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                    PostgreSQL (Source of Truth)             │    │
│  └────────────────────────────────────────────────────────────┘    │
│        │                                                           │
│        ▼                                                           │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Transactional Outbox → Kafka/RabbitMQ                      │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
         │
         │ Eventual Consistency (seconds)
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    QUERY SIDE (READ)                                │
│                                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│  │  Redis   │    │  Read    │    │  Search  │    │  Cache   │     │
│  │  Queue   │    │  Model   │    │  Index   │    │  Invalid │     │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Module Structure (NestJS)

```
apps/api/src/
├── identity/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── verified-identity.entity.ts
│   │   │   ├── verification-session.entity.ts
│   │   │   └── queue-identity.entity.ts
│   │   ├── ports/
│   │   │   ├── identity-provider.port.ts       # Interface
│   │   │   ├── identity-repository.port.ts
│   │   │   ├── rate-limiter.port.ts
│   │   │   └── event-publisher.port.ts
│   │   └── services/
│   │       └── identity-verification.service.ts
│   ├── application/
│   │   ├── commands/
│   │   │   ├── initiate-verification.command.ts
│   │   │   ├── verify-otp.command.ts
│   │   │   └── revoke-consent.command.ts
│   │   └── events/
│   │       ├── identity-validated.event.ts
│   │       └── identity-consent-revoked.event.ts
│   ├── infrastructure/
│   │   ├── adapters/
│   │   │   ├── providers/
│   │   │   │   ├── mock-identity.provider.ts
│   │   │   │   └── aadhaar-identity.provider.ts
│   │   │   ├── repositories/
│   │   │   │   ├── prisma-identity.repository.ts
│   │   │   │   └── redis-queue.repository.ts
│   │   │   └── messaging/
│   │   │       ├── kafka-event.publisher.ts
│   │   │       └── outbox-event.publisher.ts
│   │   ├── decorators/
│   │   │   ├── rate-limit.decorator.ts
│   │   │   └── idempotency.decorator.ts
│   │   ├── guards/
│   │   │   ├── throttler.guard.ts
│   │   │   └── device-fingerprint.guard.ts
│   │   └── interceptors/
│   │       ├── logging.interceptor.ts
│   │       ├── tracing.interceptor.ts
│   │       └── circuit-breaker.interceptor.ts
│   └── presentation/
│       ├── controllers/
│       │   ├── identity.controller.ts
│       │   └── admin-identity.controller.ts
│       ├── dtos/
│       │   ├── initiate-verification.dto.ts
│       │   ├── verify-otp.dto.ts
│       │   └── revoke-consent.dto.ts
│       └── transformers/
│           └── identity-response.transformer.ts
├── common/
│   ├── decorators/
│   │   ├── correlation-id.decorator.ts
│   │   └── public.decorator.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
│   ├── interceptors/
│   │   ├── response-transform.interceptor.ts
│   │   └── timeout.interceptor.ts
│   └── middleware/
│       ├── correlation-id.middleware.ts
│       └── request-logging.middleware.ts
├── config/
│   ├── configuration.module.ts
│   └── configuration.service.ts
└── telemetry/
    ├── tracing.module.ts
    ├── metrics.module.ts
    └── logging.module.ts
```
