import hashlib
import json
import logging
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ed25519

from app.models.schemas import (
    CredentialIssueRequest,
    CredentialIssueResponse,
    CredentialRevokeResponse,
    CredentialSchema,
    CredentialVerifyRequest,
    CredentialVerifyResponse,
)

logger = logging.getLogger(__name__)

_CREDENTIALS_STORE: dict[str, dict[str, Any]] = {}
_REVOKED_CREDENTIALS: set[str] = set()


class CredentialService:

    def __init__(self, analytics_db: Any = None):
        self._analytics_db = analytics_db

    def issue_credential(self, request: CredentialIssueRequest) -> CredentialIssueResponse:
        credential_id = f"urn:uuid:{uuid.uuid4()}"
        transaction_id = f"0x{hashlib.sha256(f'{credential_id}:{time.time_ns()}'.encode()).hexdigest()[:64]}"
        now = datetime.now(timezone.utc)

        issuance_date = now.isoformat().replace("+00:00", "Z")[:-9] + "Z"
        expiration_date: Optional[str] = None
        if request.expiration_days:
            exp = now + timedelta(days=request.expiration_days)
            expiration_date = exp.isoformat().replace("+00:00", "Z")[:-9] + "Z"

        credential_data = {
            "id": credential_id,
            "type": ["VerifiableCredential", request.credential_type],
            "issuer": request.issuer_did,
            "issuanceDate": issuance_date,
            "expirationDate": expiration_date,
            "credentialSubject": {
                "id": request.subject_did,
                **request.claims,
            },
        }

        proof = self._generate_proof(credential_data)
        credential_data["proof"] = proof

        credential = CredentialSchema(**credential_data)

        _CREDENTIALS_STORE[credential_id] = credential_data

        self._log_analytics("credential.issued", {
            "credential_id": credential_id,
            "credential_type": request.credential_type,
            "issuer_did": request.issuer_did,
            "subject_did": request.subject_did,
            "transaction_id": transaction_id,
            "timestamp": issuance_date,
        })

        logger.info("Credential issued: %s (tx: %s)", credential_id, transaction_id)
        return CredentialIssueResponse(credential=credential, transaction_id=transaction_id)

    def verify_credential(self, credential_json: dict) -> CredentialVerifyResponse:
        errors: list[str] = []
        metadata: dict[str, Any] = {"checks": []}

        if "id" not in credential_json:
            errors.append("Missing required field: id")
        if "type" not in credential_json:
            errors.append("Missing required field: type")
        if "issuer" not in credential_json:
            errors.append("Missing required field: issuer")
        if "issuanceDate" not in credential_json:
            errors.append("Missing required field: issuanceDate")
        if "credentialSubject" not in credential_json:
            errors.append("Missing required field: credentialSubject")

        if errors:
            metadata["checks"] = [{"name": "structure", "passed": False, "errors": errors}]
            return CredentialVerifyResponse(valid=False, reason="; ".join(errors), metadata=metadata)

        credential_id = credential_json["id"]

        if credential_id in _REVOKED_CREDENTIALS:
            metadata["checks"] = [{"name": "revocation", "passed": False}]
            return CredentialVerifyResponse(valid=False, reason="Credential has been revoked", metadata=metadata)

        checks: list[dict[str, Any]] = [{"name": "structure", "passed": True}]

        exp_date = credential_json.get("expirationDate")
        if exp_date:
            try:
                exp_dt = datetime.fromisoformat(exp_date.replace("Z", "+00:00"))
                if exp_dt < datetime.now(timezone.utc):
                    checks.append({"name": "expiration", "passed": False})
                    errors.append("Credential has expired")
                else:
                    checks.append({"name": "expiration", "passed": True})
            except (ValueError, TypeError):
                checks.append({"name": "expiration", "passed": False, "error": "Invalid expiration date"})
                errors.append("Invalid expiration date format")
        else:
            checks.append({"name": "expiration", "passed": True, "note": "No expiration date set"})

        proof = credential_json.get("proof")
        if proof:
            proof_ok = self._verify_proof(credential_json)
            checks.append({"name": "proof", "passed": proof_ok})
            if not proof_ok:
                errors.append("Cryptographic proof verification failed")
        else:
            checks.append({"name": "proof", "passed": False})
            errors.append("No cryptographic proof found")

        metadata["checks"] = checks
        valid = len(errors) == 0

        self._log_analytics("credential.verified", {
            "credential_id": credential_id,
            "valid": valid,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        return CredentialVerifyResponse(valid=valid, reason="; ".join(errors) if errors else None, metadata=metadata)

    def revoke_credential(self, credential_id: str) -> CredentialRevokeResponse:
        if credential_id not in _CREDENTIALS_STORE:
            raise ValueError(f"Credential not found: {credential_id}")

        _REVOKED_CREDENTIALS.add(credential_id)
        transaction_id = f"0x{hashlib.sha256(f'revoke:{credential_id}:{time.time_ns()}'.encode()).hexdigest()[:64]}"

        self._log_analytics("credential.revoked", {
            "credential_id": credential_id,
            "transaction_id": transaction_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        logger.info("Credential revoked: %s (tx: %s)", credential_id, transaction_id)
        return CredentialRevokeResponse(success=True, credential_id=credential_id, transaction_id=transaction_id)

    def get_credential(self, credential_id: str) -> Optional[dict[str, Any]]:
        return _CREDENTIALS_STORE.get(credential_id)

    def _generate_proof(self, credential_data: dict) -> dict:
        private_key = ed25519.Ed25519PrivateKey.generate()
        public_key = private_key.public_key()

        proof_payload = self._build_proof_payload(credential_data)
        signature = private_key.sign(proof_payload)

        public_key_bytes = public_key.public_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PublicFormat.Raw,
        )

        return {
            "type": "Ed25519Signature2020",
            "created": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")[:-9] + "Z",
            "verificationMethod": f"{credential_data.get('issuer', '')}#keys-1",
            "proofPurpose": "assertionMethod",
            "signature": signature.hex(),
            "publicKeyMultibase": f"z{public_key_bytes.hex()}",
        }

    def _verify_proof(self, credential_json: dict) -> bool:
        proof = credential_json.get("proof", {})
        signature_hex = proof.get("signature")
        public_key_multibase = proof.get("publicKeyMultibase")

        if not signature_hex or not public_key_multibase:
            return False

        try:
            proof_data = credential_json.copy()
            proof_data.pop("proof", None)
            payload = self._build_proof_payload(proof_data)

            signature = bytes.fromhex(signature_hex)
            key_bytes = bytes.fromhex(public_key_multibase.lstrip("z"))

            public_key = ed25519.Ed25519PublicKey.from_public_bytes(key_bytes)
            public_key.verify(signature, payload)
            return True
        except (InvalidSignature, ValueError, Exception) as exc:
            logger.warning("Proof verification failed: %s", exc)
            return False

    @staticmethod
    def _build_proof_payload(credential_data: dict) -> bytes:
        canonical = json.dumps(credential_data, sort_keys=True, separators=(",", ":"))
        return canonical.encode("utf-8")

    def _log_analytics(self, event: str, data: dict) -> None:
        if self._analytics_db is None:
            return
        try:
            self._analytics_db.execute(
                "INSERT INTO credential_events (event, data, created_at) VALUES (?, ?, ?)",
                [event, json.dumps(data), datetime.now(timezone.utc).isoformat()],
            )
        except Exception as exc:
            logger.warning("Failed to log analytics event: %s", exc)
