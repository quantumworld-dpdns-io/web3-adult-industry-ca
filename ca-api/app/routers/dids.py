import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status

from app.middleware.auth import get_api_key
from app.models.schemas import DIDCreateRequest, DIDCreateResponse
from app.services.did_service import DIDService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dids", tags=["DIDs"])
did_service = DIDService()


@router.post(
    "/create",
    response_model=DIDCreateResponse,
    status_code=status.HTTP_201_CREATED,
    operation_id="createDid",
    description="Create a new DID document using did:key or did:web method",
    summary="Create DID Document",
)
async def create_did(
    request: DIDCreateRequest,
    api_key: str = Depends(get_api_key),
) -> DIDCreateResponse:
    try:
        return did_service.create_did(request)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        logger.exception("Failed to create DID")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


@router.get(
    "/resolve/{did:path}",
    response_model=dict[str, Any],
    operation_id="resolveDid",
    description="Resolve a DID to its DID Document",
    summary="Resolve DID",
)
async def resolve_did(
    did: str,
    api_key: str = Depends(get_api_key),
) -> dict[str, Any]:
    document = did_service.resolve_did(did)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"DID not found or unsupported: {did}")
    return document


@router.get(
    "/{internal_id}",
    response_model=dict[str, Any],
    operation_id="getDid",
    description="Get a stored DID record by internal ID",
    summary="Get DID by Internal ID",
)
async def get_did(
    internal_id: str,
    api_key: str = Depends(get_api_key),
) -> dict[str, Any]:
    record = did_service.get_by_id(internal_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"DID record not found: {internal_id}")
    return record
