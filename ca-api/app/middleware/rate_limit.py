import logging
import time
from collections import defaultdict
from typing import Callable

from fastapi import FastAPI, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

logger = logging.getLogger(__name__)


class TokenBucket:
    def __init__(self, rate: float, burst: int):
        self._rate = rate
        self._burst = burst
        self._tokens = float(burst)
        self._last_refill = time.monotonic()

    def consume(self, tokens: int = 1) -> bool:
        now = time.monotonic()
        elapsed = now - self._last_refill
        self._tokens = min(float(self._burst), self._tokens + elapsed * self._rate)
        self._last_refill = now

        if self._tokens >= tokens:
            self._tokens -= tokens
            return True
        return False

    @property
    def retry_after(self) -> float:
        return (1.0 - self._tokens) / self._rate if self._tokens < 1.0 else 0.0


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app: ASGIApp,
        requests_per_minute: int = 60,
        burst_size: Optional[int] = None,
        excluded_paths: Optional[list[str]] = None,
    ):
        super().__init__(app)
        self._requests_per_minute = requests_per_minute
        self._burst_size = burst_size or requests_per_minute
        self._excluded_paths = set(excluded_paths or ["/health", "/docs", "/openapi.json", "/redoc"])
        self._buckets: dict[str, TokenBucket] = defaultdict(
            lambda: TokenBucket(
                rate=requests_per_minute / 60.0,
                burst=self._burst_size,
            )
        )

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if request.url.path in self._excluded_paths:
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        bucket = self._buckets[client_ip]

        if not bucket.consume():
            retry_after = max(1.0, int(bucket.retry_after))
            logger.warning("Rate limit exceeded for %s", client_ip)
            return Response(
                status_code=429,
                content='{"detail": "Rate limit exceeded. Please slow down."}',
                media_type="application/json",
                headers={"Retry-After": str(retry_after), "X-RateLimit-Limit": str(self._requests_per_minute)},
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Remaining"] = str(int(bucket._tokens))
        response.headers["X-RateLimit-Limit"] = str(self._requests_per_minute)
        return response
