import hashlib
import logging
import uuid
from typing import Any, Optional

from app.models.schemas import DIDCreateRequest, DIDCreateResponse

logger = logging.getLogger(__name__)

_DID_STORE: dict[str, dict[str, Any]] = {}
_DID_BY_ID: dict[str, dict[str, Any]] = {}


class DIDService:

    def create_did(self, request: DIDCreateRequest) -> DIDCreateResponse:
        internal_id = str(uuid.uuid4())

        if request.method == "key":
            did = f"did:key:{request.public_key}"
            did_document = self._build_key_did_document(did, request.public_key)
        elif request.method == "web":
            domain = request.domain or "localhost"
            did = f"did:web:{domain}"
            did_document = self._build_web_did_document(did, domain, request.public_key)
        else:
            raise ValueError(f"Unsupported DID method: {request.method}")

        record = {
            "id": internal_id,
            "did": did,
            "method": request.method,
            "document": did_document,
            "created_at": __import__("datetime").datetime.now(
                __import__("datetime").timezone.utc
            ).isoformat(),
        }
        _DID_STORE[did] = record
        _DID_BY_ID[internal_id] = record

        logger.info("DID created: %s (method: %s)", did, request.method)
        return DIDCreateResponse(did=did, did_document=did_document)

    def resolve_did(self, did: str) -> Optional[dict[str, Any]]:
        record = _DID_STORE.get(did)
        if record:
            return record["document"]

        if did.startswith("did:key:"):
            public_key = did[len("did:key:"):]
            return self._build_key_did_document(did, public_key)

        if did.startswith("did:web:"):
            domain = did[len("did:web:"):]
            return self._build_web_did_document(did, domain, "")

        return None

    def get_by_id(self, internal_id: str) -> Optional[dict[str, Any]]:
        return _DID_BY_ID.get(internal_id)

    def list_all(self) -> list[dict[str, Any]]:
        return list(_DID_STORE.values())

    @staticmethod
    def _build_key_did_document(did: str, public_key: str) -> dict:
        key_id = f"{did}#keys-1"
        return {
            "@context": [
                "https://www.w3.org/ns/did/v1",
                "https://w3id.org/security/suites/ed25519-2020/v1",
            ],
            "id": did,
            "verificationMethod": [
                {
                    "id": key_id,
                    "type": "Ed25519VerificationKey2020",
                    "controller": did,
                    "publicKeyMultibase": f"z{public_key}",
                }
            ],
            "authentication": [key_id],
            "assertionMethod": [key_id],
        }

    @staticmethod
    def _build_web_did_document(did: str, domain: str, public_key: str) -> dict:
        key_id = f"{did}#keys-1"
        doc: dict[str, Any] = {
            "@context": [
                "https://www.w3.org/ns/did/v1",
                "https://w3id.org/security/suites/ed25519-2020/v1",
            ],
            "id": did,
            "alsoKnownAs": [f"https://{domain}"],
        }

        if public_key:
            doc["verificationMethod"] = [
                {
                    "id": key_id,
                    "type": "Ed25519VerificationKey2020",
                    "controller": did,
                    "publicKeyMultibase": f"z{public_key}",
                }
            ]
            doc["authentication"] = [key_id]
            doc["assertionMethod"] = [key_id]

        service = [
            {
                "id": f"{did}#api",
                "type": "CertificationAuthorityAPI",
                "serviceEndpoint": f"https://{domain}/api/v1",
            }
        ]
        doc["service"] = service

        return doc
