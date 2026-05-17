# Apache Iceberg Integration — Credential Audit Lake

Immutable credential audit trail built on Apache Iceberg table format with Nessie catalog support for versioned audit data.

## Schema

Defined in `schema/credential_events.avsc` — tracks credential lifecycle events (ISSUED, VERIFIED, REVOKED, EXPIRED).

## Setup

1. Start a Nessie catalog server (e.g., via Docker)
2. Configure Spark with `spark_config.conf`
3. Create the table using the provided Avro schema

## Query Examples (Spark SQL)

```sql
-- All revocations in the last 7 days
SELECT * FROM ca.audit.credential_events
WHERE event_type = 'REVOKED'
  AND timestamp > current_timestamp - INTERVAL '7' DAY;
```
