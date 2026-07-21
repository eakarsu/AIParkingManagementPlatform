# Governed parking fulfillment operations

## Intended use and limits

The governed API validates versioned space inventory and pricing, reservations, staff ownership, payment states, service completion, refunds, and exceptions. It blocks overlapping reservations, unreconciled totals, captured cancellations without refunds, and unowned no-show or partial-fulfillment cases. Traffic/navigation data is advisory until an approved provider request is delivered.

## Data and integrations

Signed tenant claims isolate locations. Payment, tax, inventory, scheduling, messaging, accounting, delivery, and navigation actions use an approval-gated transactional outbox with request-bound idempotency, bounded retry, dead letters, and reconciliation. Never put payment credentials in payloads. Independent finance/operations approval is required for consequential actions.

## Deploy, rollback, and recovery

Run `./start.sh check`, take a PostgreSQL backup, then use `ALLOW_SCHEMA_MIGRATION=1 ./start.sh migrate`. Deploy code before exposing the governed endpoint. Roll back code while retaining additive governance tables. For recovery, restore a verified backup, reconcile reservations and settlements, then replay only nonterminal outbox records with original keys. Rotate JWT/payment credentials via the secret manager and invalidate old sessions.

Alert on double-booking, inventory races, payment divergence, unsettled refunds, dead letters, stale exceptions, cross-tenant access, and incomplete erasure receipts.
