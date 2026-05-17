# DuckDB Analytics Integration

Embedded analytics engine running inside FastAPI for real-time queries.

## Database

Persisted at `/data/analytics.duckdb`.

## Tables

- `credential_events` — Credential lifecycle audit data
- `did_registry` — Registered DIDs
- `webhook_logs` — Outbound webhook delivery logs

## Usage

```python
import duckdb
con = duckdb.connect("/data/analytics.duckdb")
con.execute("SELECT * FROM credential_events LIMIT 10").fetchall()
```

See `sample_queries.sql` for example analytics queries.
