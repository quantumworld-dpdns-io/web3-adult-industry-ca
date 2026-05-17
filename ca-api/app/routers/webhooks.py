import hashlib
import hmac
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.middleware.auth import get_api_key
from app.models.schemas import WebhookCreateRequest, WebhookCreateResponse, WebhookUpdateRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

_WEBHOOKS: dict[str, dict[str, Any]] = {}

VALID_EVENTS = {"credential.issued", "credential.verified", "credential.revoked", "did.created"}


@router.post(
    "",
    response_model=WebhookCreateResponse,
    status_code=status.HTTP_201_CREATED,
    operation_id="registerWebhook",
    description="Register a new webhook endpoint to receive event callbacks",
    summary="Register Webhook",
)
async def register_webhook(
    request: WebhookCreateRequest,
    api_key: str = Depends(get_api_key),
) -> WebhookCreateResponse:
    invalid_events = [e for e in request.events if e not in VALID_EVENTS]
    if invalid_events:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid events: {invalid_events}. Valid events: {sorted(VALID_EVENTS)}",
        )

    webhook_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")[:-9] + "Z"

    record = {
        "id": webhook_id,
        "url": request.url,
        "events": request.events,
        "secret": request.secret,
        "active": True,
        "created_at": now,
    }
    _WEBHOOKS[webhook_id] = record

    logger.info("Webhook registered: %s -> %s", webhook_id, request.url)
    return WebhookCreateResponse(
        id=webhook_id,
        url=request.url,
        events=request.events,
        active=True,
        created_at=now,
    )


@router.get(
    "",
    response_model=list[WebhookCreateResponse],
    operation_id="listWebhooks",
    description="List all registered webhooks",
    summary="List Webhooks",
)
async def list_webhooks(
    api_key: str = Depends(get_api_key),
) -> list[WebhookCreateResponse]:
    return [
        WebhookCreateResponse(
            id=w["id"],
            url=w["url"],
            events=w["events"],
            active=w["active"],
            created_at=w["created_at"],
        )
        for w in _WEBHOOKS.values()
    ]


@router.delete(
    "/{webhook_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="deleteWebhook",
    description="Delete a registered webhook",
    summary="Delete Webhook",
)
async def delete_webhook(
    webhook_id: str,
    api_key: str = Depends(get_api_key),
) -> None:
    if webhook_id not in _WEBHOOKS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Webhook not found: {webhook_id}")
    del _WEBHOOKS[webhook_id]
    logger.info("Webhook deleted: %s", webhook_id)


@router.patch(
    "/{webhook_id}",
    response_model=WebhookCreateResponse,
    operation_id="updateWebhook",
    description="Update a registered webhook's configuration",
    summary="Update Webhook",
)
async def update_webhook(
    webhook_id: str,
    request: WebhookUpdateRequest,
    api_key: str = Depends(get_api_key),
) -> WebhookCreateResponse:
    if webhook_id not in _WEBHOOKS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Webhook not found: {webhook_id}")

    record = _WEBHOOKS[webhook_id]

    if request.url is not None:
        record["url"] = request.url
    if request.events is not None:
        invalid_events = [e for e in request.events if e not in VALID_EVENTS]
        if invalid_events:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid events: {invalid_events}. Valid events: {sorted(VALID_EVENTS)}",
            )
        record["events"] = request.events
    if request.secret is not None:
        record["secret"] = request.secret
    if request.active is not None:
        record["active"] = request.active

    return WebhookCreateResponse(
        id=record["id"],
        url=record["url"],
        events=record["events"],
        active=record["active"],
        created_at=record["created_at"],
    )


async def dispatch_webhook_event(event: str, payload: dict) -> None:
    for webhook in list(_WEBHOOKS.values()):
        if not webhook["active"] or event not in webhook["events"]:
            continue
        try:
            import httpx

            body = json.dumps({"event": event, "data": payload, "timestamp": datetime.now(timezone.utc).isoformat()})
            signature = hmac.new(
                webhook["secret"].encode("utf-8"),
                body.encode("utf-8"),
                hashlib.sha256,
            ).hexdigest()

            async with httpx.AsyncClient() as client:
                await client.post(
                    webhook["url"],
                    content=body,
                    headers={
                        "Content-Type": "application/json",
                        "X-Webhook-Signature": signature,
                        "X-Webhook-Event": event,
                    },
                    timeout=10.0,
                )
        except Exception as exc:
            logger.warning("Failed to dispatch webhook %s for event %s: %s", webhook["id"], event, exc)
