import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status

from app.middleware.auth import get_api_key
from app.models.schemas import (
    CredentialIssueRequest,
    CredentialIssueResponse,
    CredentialRevokeRequest,
    CredentialRevokeResponse,
    CredentialVerifyRequest,
    CredentialVerifyResponse,
)
from app.services.credential_service import CredentialService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/credentials", tags=["Credentials"])
credential_service = CredentialService()


@router.post(
    "/issue",
    response_model=CredentialIssueResponse,
    status_code=status.HTTP_201_CREATED,
    operation_id="issueCredential",
    description="Issue a new Verifiable Credential",
    summary="Issue Verifiable Credential",
    responses={
        201: {"description": "Credential issued successfully"},
        400: {"description": "Invalid request parameters"},
        401: {"description": "Missing or invalid API key"},
    },
    openapi_extra={"x-openai-isConsequential": True},
)
async def issue_credential(
    request: CredentialIssueRequest,
    api_key: str = Depends(get_api_key),
) -> CredentialIssueResponse:
    try:
        return credential_service.issue_credential(request)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        logger.exception("Failed to issue credential")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


@router.post(
    "/verify",
    response_model=CredentialVerifyResponse,
    operation_id="verifyCredential",
    description="Verify a Verifiable Credential's structure and proof",
    summary="Verify Verifiable Credential",
)
async def verify_credential(
    request: CredentialVerifyRequest,
    api_key: str = Depends(get_api_key),
) -> CredentialVerifyResponse:
    try:
        return credential_service.verify_credential(request.credential_json)
    except Exception as exc:
        logger.exception("Failed to verify credential")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))


@router.post(
    "/revoke",
    response_model=CredentialRevokeResponse,
    operation_id="revokeCredential",
    description="Revoke a previously issued Verifiable Credential",
    summary="Revoke Verifiable Credential",
    openapi_extra={"x-openai-isConsequential": True},
)
async def revoke_credential(
    request: CredentialRevokeRequest,
    api_key: str = Depends(get_api_key),
) -> CredentialRevokeResponse:
    try:
        return credential_service.revoke_credential(request.credential_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        logger.exception("Failed to revoke credential")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))


@router.get(
    "/{credential_id}",
    response_model=dict[str, Any],
    operation_id="getCredential",
    description="Get a Verifiable Credential by its ID",
    summary="Get Credential by ID",
)
async def get_credential(
    credential_id: str,
    api_key: str = Depends(get_api_key),
) -> dict[str, Any]:
    credential = credential_service.get_credential(credential_id)
    if credential is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Credential not found: {credential_id}")
    return credential
