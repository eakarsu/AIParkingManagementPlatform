# Audit Apply Note — AIParkingManagementPlatform

Source: `_AUDIT/reports/batch_06.md` section 9.

## Original Recommendations
### Missing AI counterparts
- `/asset-lifecycle-predict`
- `/facility-audit-recommend`
- `/intrusion-detect`

### Missing non-AI
- Ride-sharing demand correlation; mobile app; customer self-service; Waze/GMaps integration; vehicle registration DB

### Custom suggestions
- Autonomous pricing engine; CV enforcement (plate readers + citations); EV charging optimization; resident-permit fraud; Waze/GMaps traffic-aware guidance

## Implemented
Added three endpoints in `server/routes/ai.js`:
- `POST /api/ai/asset-lifecycle-predict`
- `POST /api/ai/facility-audit-recommend`
- `POST /api/ai/intrusion-detect`

Reused `callAI`, `persistAIResult`, `auth`, `aiRateLimiter`, and existing `ai_results` table.

## Backlog
| Item | Tag |
|---|---|
| Ride-sharing API integration | NEEDS-CREDS |
| Native mobile app | NEEDS-PRODUCT-DECISION |
| Customer self-service portal | NEEDS-PRODUCT-DECISION |
| Waze/GMaps broadcast integration | NEEDS-CREDS |
| Vehicle registration DB lookup | NEEDS-CREDS |
| Utility demand-response integration | NEEDS-CREDS |
| Permit fraud agentic monitoring | NEEDS-PRODUCT-DECISION |

## Apply pass 5 (all backlog)

Implemented all 7 backlog items as additive code.

**Backend** — new file `server/routes/extensions.js`, mounted under `/api`:
- Ride-sharing API integration (NEEDS-CREDS → 503 `missing: RIDESHARE_API_KEY`): `GET /api/rideshare/status`, `POST /api/rideshare/correlate`, `GET /api/rideshare/recent`. New table `rideshare_demand`.
- Waze/GMaps broadcast (NEEDS-CREDS → 503 `missing: WAZE_API_KEY` or `GMAPS_API_KEY`): `POST /api/broadcast/waze`, `POST /api/broadcast/gmaps`, `GET /api/broadcast/recent`. New table `broadcast_events`.
- Vehicle registration DB lookup (NEEDS-CREDS → 503 `missing: VEHICLE_REG_API_KEY`): `POST /api/vehicle-registration/lookup`.
- Utility demand-response integration (NEEDS-CREDS → 503 `missing: UTILITY_DR_API_KEY`): `POST /api/utility/demand-response`.
- Customer self-service portal (NEEDS-PRODUCT-DECISION): request types = [refund, dispute, lost-ticket, permit-renewal, access-issue, general]. Endpoints `POST/GET /api/self-service/requests`, `PATCH /api/self-service/requests/:id`. New table `self_service_requests`.
- Permit fraud agentic monitoring (NEEDS-PRODUCT-DECISION): `POST /api/permit-fraud/scan` returns 503 with `missing: OPENROUTER_API_KEY` if AI key absent.
- Native mobile app surfaces (NEEDS-PRODUCT-DECISION): `GET /api/mobile/manifest` (public), `POST /api/mobile/push-token`. New table `mobile_push_tokens`.

**Frontend** — new tabbed page `client/src/pages/Extensions.js` (Self-Service / Broadcast / Rideshare / Permit Fraud / Mobile), routed at `/extensions`. Uses fetch via axios with JWT bearer.

**Smoke test:**
- `POST /api/auth/login admin@parking.com/admin123` → 200
- `GET /api/self-service/requests` → 200
- `GET /api/mobile/manifest` → 200 (public)
- `POST /api/rideshare/correlate` → 503 with `missing: RIDESHARE_API_KEY`

No new deps, no `npm install`.

## Apply pass 3 (frontend)

Verified frontend coverage. `client/src/pages/AIPredictive.js` already wires the three pass-2 endpoints (`/asset-lifecycle-predict`, `/facility-audit-recommend`, `/intrusion-detect`) with a tabbed UI, per-tool form fields, JSON-or-text parsing, error display, and the `AIResponse` component. Other AI endpoints in `routes/ai.js` are surfaced via `AIHistory.js`, `Pricing.js`, `Plates.js`, etc. Action: LEFT-AS-IS — no frontend gap to close.
