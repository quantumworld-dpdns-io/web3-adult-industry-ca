import logging
import os
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import AsyncGenerator

import duckdb
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.middleware.auth import register_api_key
from app.middleware.rate_limit import RateLimitMiddleware
from app.routers import admin, analytics, credentials, dids, webhooks
from app.telemetry import setup_telemetry

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

_analytics_db: duckdb.DuckDBPyConnection = None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    global _analytics_db

    logger.info("Initializing CA-API application...")

    _analytics_db = duckdb.connect(":memory:")
    _analytics_db.execute("""
        CREATE TABLE IF NOT EXISTS credential_events (
            id INTEGER PRIMARY KEY,
            event VARCHAR,
            data VARCHAR,
            created_at VARCHAR
        )
    """)
    _analytics_db.execute("CREATE SEQUENCE IF NOT EXISTS event_seq START 1")

    analytics.set_analytics_db(_analytics_db)

    from app.middleware.auth import _API_KEYS

    default_key = os.getenv("CA_API_DEFAULT_KEY", "ca_dev_key_please_change_in_production")
    register_api_key(default_key, "default")
    logger.info("Default API key registered")

    otlp_endpoint = os.getenv("OTLP_ENDPOINT")
    if otlp_endpoint:
        setup_telemetry(app_name="ca-api", otlp_endpoint=otlp_endpoint)
    else:
        logger.info("OpenTelemetry disabled (no OTLP_ENDPOINT configured)")

    logger.info("CA-API application started successfully")
    yield

    if _analytics_db:
        _analytics_db.close()
        logger.info("Analytics database connection closed")
    logger.info("CA-API application shutdown complete")


app = FastAPI(
    title="Web3 Adult Industry CA API",
    description="""
# Web3 Adult Industry Certification Authority API

## Overview
This API provides a comprehensive REST interface for managing Verifiable Credentials (VCs),
Decentralized Identifiers (DIDs), and related infrastructure for the Web3 Adult Industry
Certification Authority.

## Features
- **Verifiable Credentials**: Issue, verify, and revoke W3C-compliant VCs with Ed25519 proofs
- **DID Management**: Create and resolve `did:key` and `did:web` identifiers
- **Webhooks**: Register event-driven callbacks for credential lifecycle events
- **Analytics**: SQL-based analytics and dashboard metrics via DuckDB
- **Admin**: User management, system configuration, and API key management

## Authentication
- **API Key**: Required for most endpoints. Pass via `X-API-Key` header or `api_key` query parameter.
- **JWT Bearer Token**: Required for admin endpoints. Obtain via `POST /admin/login`.

## AI/LLM Tool Calling
This API is designed for AI-assisted tool calling. All endpoints have descriptive `operationId`
values for easy integration with LLM function-calling frameworks.
    """,
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    contact={
        "name": "Web3 Adult Industry CA",
        "url": "https://github.com/anomalyco/web3-adult-industry-ca",
    },
    license_info={
        "name": "MIT",
    },
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    RateLimitMiddleware,
    requests_per_minute=int(os.getenv("RATE_LIMIT_RPM", "60")),
    excluded_paths=["/health", "/docs", "/openapi.json", "/redoc", "/admin/login"],
)

app.include_router(credentials.router, prefix="/api/v1")
app.include_router(dids.router, prefix="/api/v1")
app.include_router(webhooks.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")


@app.get(
    "/health",
    operation_id="healthCheck",
    description="Health check endpoint for load balancers and monitoring",
    summary="Health Check",
    tags=["System"],
)
async def health_check() -> dict:
    return {
        "status": "ok",
        "version": "0.1.0",
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")[:-9] + "Z",
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "path": request.url.path},
    )
