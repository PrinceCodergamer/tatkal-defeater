# Fake User Testing System

Simulates real and hostile traffic against the Tatkal-Defeater platform to
prove the two core guarantees: **zero double bookings** and **speed-independent
fairness**.

## Prereqs

```bash
# 1. Infrastructure up
docker compose up -d

# 2. Schema + seed
pnpm db:push && pnpm db:seed

# 3. API running
pnpm dev:api          # NestJS on :3001

# 4. Web running (browser simulator only)
pnpm dev:web          # Next.js on :3000
```

## Level 1 — Admission Gate Load Test (k6)

10,000 virtual users arrive in a 2-second window. Verifies the gate survives
the herd and rate limiting engages without 5xx.

```bash
# Install k6 first: https://grafana.com/docs/k6/latest/set-up/install-k6/
pnpm test:load:api
```

## Level 2 — Tatkal Time Warp (zero double-booking)

The definitive test. N bots fire `/reservation/allocate` at the same instant
against one slot with `SEATS` capacity. The atomic
`UPDATE ... WHERE availableCapacity >= qty` must grant exactly `SEATS` and
reject the rest — any oversubscription fails the run.

```bash
# 1,000 bots racing for 40 seats
pnpm test:load:tatkal --bots 1000 --seats 40

# Heavier: 10,000 bots, 40 seats (the real Tatkal shape)
pnpm test:load:tatkal --bots 10000 --seats 40

# Point at a different slot
SLOT_ID=custom-slot pnpm test:load:tatkal --bots 500 --seats 20
```

Exit code 0 = passed (zero double bookings), 1 = failed.

## Level 3 — Browser Simulator (bot vs human fairness)

Headless browsers in two cohorts: "humans" (random typing speed, human
scrolling, hesitation) vs "bots" (zero-latency programmatic flow). Asserts the
bot success rate does not materially exceed the human rate — proving the
random lottery neutralizes the bot speed advantage.

```bash
pnpm test:load:browser
```

Requires Playwright browsers installed once:

```bash
pnpm exec playwright install chromium
```

## What We Verify vs IRCTC

| Metric | IRCTC New Site | Our Target | Test |
|--------|---------------|------------|------|
| Double bookings / 10K attempts | Unknown (>0 likely) | **Zero** | Level 2 |
| Bot success vs human success | Bots 10–50× higher | **Equal** | Level 3 |
| Server crash at 10:00 peak | Common | **Zero** | Level 1 |
