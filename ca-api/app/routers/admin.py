import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.middleware.auth import (
    authenticate_admin,
    create_admin_user,
    delete_admin_user,
    get_api_key,
    get_current_user,
    list_admin_users,
    register_api_key,
    require_admin,
)
from app.models.schemas import AdminUserCreate, AdminUserResponse, SystemConfig
from app.services.credential_service import CredentialService
from app.services.did_service import DIDCreateRequest, DIDService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"])
credential_service = CredentialService()
did_service = DIDService()

_SYSTEM_CONFIG: dict[str, Any] = {
    "max_credential_expiry_days": 365,
    "rate_limit_per_minute": 60,
    "allow_web_did": True,
    "api_version": "0.1.0",
    "maintenance_mode": False,
}


@router.post(
    "/users",
    response_model=AdminUserResponse,
    status_code=status.HTTP_201_CREATED,
    operation_id="createAdminUser",
    description="Create a new admin user (requires admin privileges)",
    summary="Create Admin User",
)
async def create_user(
    request: AdminUserCreate,
    admin: dict[str, Any] = Depends(require_admin),
) -> AdminUserResponse:
    try:
        return create_admin_user(request.username, request.password, request.role)
    except Exception as exc:
        logger.exception("Failed to create admin user")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))


@router.get(
    "/users",
    response_model=list[AdminUserResponse],
    operation_id="listAdminUsers",
    description="List all admin users (requires admin privileges)",
    summary="List Admin Users",
)
async def list_users(
    admin: dict[str, Any] = Depends(require_admin),
) -> list[AdminUserResponse]:
    return [AdminUserResponse(**u) for u in list_admin_users()]


@router.delete(
    "/users/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="deleteAdminUser",
    description="Delete an admin user (requires admin privileges)",
    summary="Delete Admin User",
)
async def delete_user(
    user_id: str,
    admin: dict[str, Any] = Depends(require_admin),
) -> None:
    if not delete_admin_user(user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User not found: {user_id}")


@router.post(
    "/config",
    response_model=SystemConfig,
    operation_id="updateSystemConfig",
    description="Update a system configuration value (requires admin privileges)",
    summary="Update System Config",
)
async def update_config(
    config: SystemConfig,
    admin: dict[str, Any] = Depends(require_admin),
) -> SystemConfig:
    _SYSTEM_CONFIG[config.key] = config.value
    logger.info("System config updated: %s = %s", config.key, config.value)
    return config


@router.get(
    "/config",
    response_model=dict[str, Any],
    operation_id="getSystemConfig",
    description="Get all system configuration values (requires admin privileges)",
    summary="Get System Config",
)
async def get_config(
    admin: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    return dict(_SYSTEM_CONFIG)


@router.post(
    "/api-keys",
    operation_id="createApiKey",
    description="Register a new API key (requires admin privileges)",
    summary="Create API Key",
)
async def create_api_key(
    label: str = "default",
    admin: dict[str, Any] = Depends(require_admin),
) -> dict[str, str]:
    import hashlib
    import os

    key = f"ca_{hashlib.sha256(os.urandom(32)).hexdigest()[:48]}"
    register_api_key(key, label)
    return {"api_key": key, "label": label}


@router.post(
    "/seed-data",
    operation_id="seedDemoData",
    description="Seed the system with demo DIDs and credentials (requires admin privileges)",
    summary="Seed Demo Data",
)
async def seed_demo_data(
    admin: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    results: dict[str, list[str]] = {"dids": [], "credentials": []}

    demo_dids = [
        DIDCreateRequest(method="key", public_key="z6MkhaXgBZDvotDkL4f9oHhGqRqNqNAqp6WB8iEhMB3qFZRi"),
        DIDCreateRequest(method="key", public_key="z6MkqLp3YJqPqJFZGZfkTnZmMNZnLKvn3WnAqKqYzVvqW7Zh"),
        DIDCreateRequest(method="web", domain="issuer.example.com", public_key="z6MkhaXgBZDvotDkL4f9oHhGqRqNqNAqp6WB8iEhMB3qFZRi"),
    ]

    for did_req in demo_dids:
        try:
            resp = did_service.create_did(did_req)
            results["dids"].append(resp.did)
        except Exception as exc:
            logger.warning("Failed to seed DID: %s", exc)

    if len(results["dids"]) >= 2:
        from app.models.schemas import CredentialIssueRequest

        cred_req = CredentialIssueRequest(
            issuer_did=results["dids"][0],
            subject_did=results["dids"][1],
            credential_type="AgeVerification",
            claims={"age": 25, "dateOfBirth": "1999-05-17", "verifiedBy": "GovernmentID"},
            expiration_days=365,
        )
        try:
            cred_resp = credential_service.issue_credential(cred_req)
            results["credentials"].append(cred_resp.credential.id)
        except Exception as exc:
            logger.warning("Failed to seed credential: %s", exc)

    logger.info("Seed data created: %s", results)
    return {"message": "Demo data seeded successfully", "created": results}


@router.post(
    "/login",
    operation_id="adminLogin",
    description="Authenticate as admin and receive a JWT token",
    summary="Admin Login",
)
async def admin_login(
    request: Request,
) -> dict[str, str]:
    import json

    try:
        body = await request.json()
        username = body.get("username", "")
        password = body.get("password", "")
    except (json.JSONDecodeError, Exception):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON body")

    token = authenticate_admin(username, password)
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    return {"access_token": token, "token_type": "bearer"}
