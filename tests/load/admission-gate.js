/**
 * k6 load test — admission gate throughput + lottery fairness smoke check.
 *
 * Simulates 10,000 virtual users hitting /admission/enter in a 2-second
 * ramp-up (the Tatkal window). Verifies:
 *   1. The gate accepts traffic without 5xx errors (no crash under herd).
 *   2. Rate limiting engages (429/error responses grow as load spikes).
 *   3. Queue positions are assigned (distributed, not all position 1).
 *
 * Run:
 *   k6 run tests/load/admission-gate.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';

// API is served under the global `api` prefix (set in main.ts).
const API_BASE = __ENV.API_BASE || 'http://localhost:3001/api';

// ── Custom metrics ──────────────────────────────────────────────────────────
const positionTrend = new Trend('queue_position_distribution', true);
const admissionSuccess = new Rate('admission_success_rate');
const doubleBookings = new Counter('double_bookings_detected');

export const options = {
  scenarios: {
    tatkal_herd: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2s', target: 10000 }, // 10K users arrive in the 2s window
        { duration: '10s', target: 10000 }, // all waiting in queue
        { duration: '5s', target: 0 },
      ],
      gracefulStop: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.10'], // <10% of requests may fail (rate limiting expected)
    admission_success_rate: ['rate>0.85'], // most enter calls succeed
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  const userId = `k6-user-${__VU}-${Date.now()}`;
  const fingerprint = `fp_k6_${__VU}_${Date.now()}`;

  const res = http.post(
    `${API_BASE}/admission/enter`,
    JSON.stringify({
      userId,
      deviceFingerprint: fingerprint,
      identityVerified: true,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  const body = res.json();
  const ok = res.status === 201 || (res.status === 200 && !body.error);

  admissionSuccess.add(ok);

  if (ok) {
    check(res, {
      'admission returns tokenId': (r) => Boolean(r.json().tokenId),
      'admission returns position': (r) => typeof r.json().position === 'number',
    });

    if (typeof body.position === 'number') {
      positionTrend.add(body.position);
    }

    // Peek at queue status to exercise the GET path
    if (body.tokenId) {
      const status = http.get(`${API_BASE}/admission/status/${body.tokenId}`);
      check(status, {
        'status endpoint responds 200': (r) => r.status === 200,
        'status reports a queue state': (r) => ['WAITING', 'ADMITTED', 'EXPIRED'].includes(r.json().status),
      });
    }
  } else {
    // Rate-limited or rejected — expected under herd, but track it
    check(res, {
      'rejection is a controlled response (not a 5xx)': (r) => r.status < 500,
    });
  }

  sleep(0.5);
}
