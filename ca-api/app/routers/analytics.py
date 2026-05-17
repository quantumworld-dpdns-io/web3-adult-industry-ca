import logging
import time
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.middleware.auth import require_admin
from app.models.schemas import AnalyticsQuery, AnalyticsResponse, DashboardMetrics

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["Analytics"])

_analytics_db: Any = None


def set_analytics_db(db: Any) -> None:
    global _analytics_db
    _analytics_db = db


def _get_db():
    if _analytics_db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Analytics database not initialized",
        )
    return _analytics_db


@router.post(
    "/query",
    response_model=AnalyticsResponse,
    operation_id="runAnalyticsQuery",
    description="Execute a SQL query against the analytics database (requires admin privileges)",
    summary="Run Analytics SQL Query",
)
async def run_query(
    query: AnalyticsQuery,
    admin: dict[str, Any] = Depends(require_admin),
) -> AnalyticsResponse:
    db = _get_db()
    start = time.perf_counter()
    try:
        if query.params:
            result = db.execute(query.query, query.params)
        else:
            result = db.execute(query.query)

        columns = [desc[0] for desc in result.description] if result.description else []

        if query.query.strip().upper().startswith("SELECT"):
            rows = result.fetchall()
            rows = [list(r) for r in rows]
        else:
            rows = []

        execution_time = (time.perf_counter() - start) * 1000.0

        return AnalyticsResponse(
            columns=columns,
            rows=rows,
            execution_time_ms=round(execution_time, 2),
        )
    except Exception as exc:
        logger.exception("Analytics query failed")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Query execution failed: {exc}",
        )


@router.get(
    "/dashboard",
    response_model=DashboardMetrics,
    operation_id="getDashboardMetrics",
    description="Get dashboard-level analytics metrics (requires admin privileges)",
    summary="Get Dashboard Metrics",
)
async def get_dashboard(
    admin: dict[str, Any] = Depends(require_admin),
) -> DashboardMetrics:
    db = _get_db()
    try:
        total_creds = db.execute("SELECT COUNT(*) FROM credential_events WHERE event = 'credential.issued'").fetchone()[0]
        total_verifications = db.execute("SELECT COUNT(*) FROM credential_events WHERE event = 'credential.verified'").fetchone()[0]
        success_verifications = db.execute(
            "SELECT COUNT(*) FROM credential_events WHERE event = 'credential.verified' AND json_extract(data, '$.valid') = 'true'"
        ).fetchone()[0]
        active_dids = db.execute("SELECT COUNT(*) FROM credential_events WHERE event = 'did.created'").fetchone()[0]
        issuance_30d = db.execute(
            "SELECT COUNT(*) FROM credential_events WHERE event = 'credential.issued' AND created_at >= datetime('now', '-30 days')"
        ).fetchone()[0]
        webhook_count = db.execute("SELECT COUNT(*) FROM credential_events WHERE event = 'webhook.registered'").fetchone()[0]

        success_rate = (success_verifications / total_verifications * 100.0) if total_verifications > 0 else 100.0

        return DashboardMetrics(
            total_credentials=total_creds,
            active_dids=max(active_dids, 0),
            issuance_rate=round(issuance_30d / 30.0, 1) if issuance_30d > 0 else 0.0,
            total_verifications=total_verifications,
            verification_success_rate=round(success_rate, 1),
            active_webhooks=max(webhook_count, 0),
        )
    except Exception as exc:
        logger.exception("Failed to fetch dashboard metrics")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve dashboard metrics: {exc}",
        )


@router.get(
    "/reports/credentials-over-time",
    operation_id="getCredentialsOverTime",
    description="Get time series data for credential issuance (requires admin privileges)",
    summary="Credentials Over Time Report",
)
async def credentials_over_time(
    days: int = 30,
    admin: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    db = _get_db()
    try:
        result = db.execute(
            """
            SELECT DATE(created_at) as day, COUNT(*) as count
            FROM credential_events
            WHERE event = 'credential.issued'
              AND created_at >= datetime('now', ? || ' days')
            GROUP BY DATE(created_at)
            ORDER BY day ASC
            """,
            [f"-{days}"],
        )
        rows = result.fetchall()
        return {
            "period_days": days,
            "data": [{"date": r[0], "count": r[1]} for r in rows],
        }
    except Exception as exc:
        logger.exception("Failed to fetch credentials-over-time report")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate report: {exc}",
        )


@router.get(
    "/reports/verification-stats",
    operation_id="getVerificationStats",
    description="Get verification success/failure statistics (requires admin privileges)",
    summary="Verification Statistics Report",
)
async def verification_stats(
    days: int = 30,
    admin: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    db = _get_db()
    try:
        total = db.execute(
            """
            SELECT COUNT(*) FROM credential_events
            WHERE event = 'credential.verified'
              AND created_at >= datetime('now', ? || ' days')
            """,
            [f"-{days}"],
        ).fetchone()[0]

        success = db.execute(
            """
            SELECT COUNT(*) FROM credential_events
            WHERE event = 'credential.verified'
              AND json_extract(data, '$.valid') = 'true'
              AND created_at >= datetime('now', ? || ' days')
            """,
            [f"-{days}"],
        ).fetchone()[0]

        failed = total - success

        return {
            "period_days": days,
            "total_verifications": total,
            "successful": success,
            "failed": max(failed, 0),
            "success_rate": round(success / total * 100.0, 1) if total > 0 else 0.0,
        }
    except Exception as exc:
        logger.exception("Failed to fetch verification stats")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate verification stats: {exc}",
        )
