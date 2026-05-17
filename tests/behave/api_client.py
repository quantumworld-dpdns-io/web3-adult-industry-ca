import json
import logging
import secrets

import requests
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ed25519

logger = logging.getLogger(__name__)

API_KEY_HEADER = "X-API-Key"
DEFAULT_API_KEY = "ca_dev_key_please_change_in_production"


def generate_ed25519_keypair():
    private_key = ed25519.Ed25519PrivateKey.generate()
    public_key = private_key.public_key()
    public_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    )
    return public_bytes.hex()


class ApiClient:
    def __init__(self, base_url: str = "http://localhost:8000", api_key: str = DEFAULT_API_KEY):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({API_KEY_HEADER: api_key})
        self.last_response = None
        self.last_json = None

    def _request(self, method: str, path: str, **kwargs):
        url = f"{self.base_url}{path}"
        self.last_response = resp = self.session.request(method, url, **kwargs)
        try:
            self.last_json = resp.json() if resp.text else {}
        except (json.JSONDecodeError, ValueError):
            self.last_json = {}
        logger.debug("%s %s -> %s %s", method, path, resp.status_code, self.last_json)
        return resp

    def health(self):
        return self._request("GET", "/health")

    def create_did(self, method: str, public_key: str = None, domain: str = None):
        if public_key is None:
            public_key = generate_ed25519_keypair()
        payload = {"method": method, "public_key": public_key}
        if domain:
            payload["domain"] = domain
        return self._request("POST", "/api/v1/dids/create", json=payload)

    def resolve_did(self, did: str):
        return self._request("GET", f"/api/v1/dids/resolve/{did}")

    def get_did_by_id(self, internal_id: str):
        return self._request("GET", f"/api/v1/dids/{internal_id}")

    def issue_credential(self, issuer_did: str, subject_did: str, credential_type: str, claims: dict = None, expiration_days: int = None):
        if claims is None:
            claims = {"name": "Test User", "age": 25}
        payload = {
            "issuer_did": issuer_did,
            "subject_did": subject_did,
            "credential_type": credential_type,
            "claims": claims,
        }
        if expiration_days:
            payload["expiration_days"] = expiration_days
        return self._request("POST", "/api/v1/credentials/issue", json=payload)

    def verify_credential(self, credential_json: dict):
        return self._request("POST", "/api/v1/credentials/verify", json={"credential_json": credential_json})

    def revoke_credential(self, credential_id: str):
        return self._request("POST", "/api/v1/credentials/revoke", json={"credential_id": credential_id})

    def get_credential(self, credential_id: str):
        return self._request("GET", f"/api/v1/credentials/{credential_id}")

    def create_webhook(self, url: str, events: list[str], secret: str = None):
        if secret is None:
            secret = secrets.token_hex(16)
        payload = {"url": url, "events": events, "secret": secret}
        return self._request("POST", "/api/v1/webhooks", json=payload)

    def list_webhooks(self):
        return self._request("GET", "/api/v1/webhooks")

    def delete_webhook(self, webhook_id: str):
        return self._request("DELETE", f"/api/v1/webhooks/{webhook_id}")
