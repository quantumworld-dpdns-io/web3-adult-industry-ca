from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from pydantic import BaseModel, Field, field_validator
import uuid


class CredentialSchema(BaseModel):
    id: str = Field(..., description="Unique identifier for the credential (URI)")
    type: list[str] = Field(..., description="Credential type URIs")
    issuer: str = Field(..., description="DID of the issuer")
    credentialSubject: dict = Field(..., description="Claims about the subject")
    issuanceDate: str = Field(..., description="ISO 8601 issuance date")
    expirationDate: Optional[str] = Field(None, description="ISO 8601 expiration date")
    proof: Optional[dict] = Field(None, description="Cryptographic proof")

    @field_validator("issuanceDate", mode="before")
    @classmethod
    def validate_date(cls, v: Any) -> str:
        if isinstance(v, datetime):
            return v.isoformat().replace("+00:00", "Z")
        return str(v)


class CredentialIssueRequest(BaseModel):
    issuer_did: str = Field(..., description="DID of the credential issuer")
    subject_did: str = Field(..., description="DID of the credential subject")
    credential_type: str = Field(..., description="Type of credential (e.g. AgeVerification, IdentityCheck)")
    claims: dict = Field(..., description="Claims/attributes to include in the credential")
    expiration_days: Optional[int] = Field(None, description="Days until credential expires", ge=1)


class CredentialIssueResponse(BaseModel):
    credential: CredentialSchema = Field(..., description="The issued verifiable credential")
    transaction_id: str = Field(..., description="Blockchain transaction ID for the issuance event")


class CredentialVerifyRequest(BaseModel):
    credential_json: dict = Field(..., description="The verifiable credential JSON to verify")


class CredentialVerifyResponse(BaseModel):
    valid: bool = Field(..., description="Whether the credential is valid")
    reason: Optional[str] = Field(None, description="Reason for invalidity if not valid")
    metadata: dict = Field(default_factory=dict, description="Additional verification metadata")


class CredentialRevokeRequest(BaseModel):
    credential_id: str = Field(..., description="ID of the credential to revoke")


class CredentialRevokeResponse(BaseModel):
    success: bool = Field(..., description="Whether revocation succeeded")
    credential_id: str = Field(..., description="ID of the revoked credential")
    transaction_id: str = Field(..., description="Blockchain transaction ID for revocation")


class DIDCreateRequest(BaseModel):
    method: str = Field(..., description="DID method: 'key' or 'web'", pattern=r"^(key|web)$")
    domain: Optional[str] = Field(None, description="Domain for did:web method (required if method=web)")
    public_key: str = Field(..., description="Base58-encoded public key")


class DIDCreateResponse(BaseModel):
    did: str = Field(..., description="The created DID string")
    did_document: dict = Field(..., description="The DID Document (JSON-LD)")


class WebhookCreateRequest(BaseModel):
    url: str = Field(..., description="Webhook callback URL")
    events: list[str] = Field(..., description="List of events to subscribe to")
    secret: str = Field(..., description="Secret for HMAC signature verification")


class WebhookCreateResponse(BaseModel):
    id: str = Field(..., description="Unique webhook ID")
    url: str = Field(..., description="Webhook callback URL")
    events: list[str] = Field(..., description="Subscribed events")
    active: bool = Field(..., description="Whether the webhook is active")
    created_at: str = Field(..., description="ISO 8601 creation timestamp")


class WebhookUpdateRequest(BaseModel):
    url: Optional[str] = Field(None, description="Updated callback URL")
    events: Optional[list[str]] = Field(None, description="Updated event subscriptions")
    secret: Optional[str] = Field(None, description="Updated secret")
    active: Optional[bool] = Field(None, description="Whether the webhook is active")


class AnalyticsQuery(BaseModel):
    query: str = Field(..., description="SQL query to execute against analytics DuckDB")
    params: Optional[dict[str, Any]] = Field(None, description="Optional query parameters")


class AnalyticsResponse(BaseModel):
    columns: list[str] = Field(..., description="Column names from the result set")
    rows: list[list] = Field(..., description="Data rows from the result set")
    execution_time_ms: float = Field(..., description="Query execution time in milliseconds")


class AdminUserCreate(BaseModel):
    username: str = Field(..., description="Admin username", min_length=3)
    password: str = Field(..., description="Admin password", min_length=8)
    role: str = Field(..., description="Admin role (admin, superadmin)", pattern=r"^(admin|superadmin)$")


class AdminUserResponse(BaseModel):
    id: str = Field(..., description="Unique user ID")
    username: str = Field(..., description="Admin username")
    role: str = Field(..., description="Admin role")
    created_at: str = Field(..., description="ISO 8601 creation timestamp")


class SystemConfig(BaseModel):
    key: str = Field(..., description="Configuration key")
    value: Any = Field(..., description="Configuration value")


class DashboardMetrics(BaseModel):
    total_credentials: int = Field(..., description="Total number of issued credentials")
    active_dids: int = Field(..., description="Number of active DIDs")
    issuance_rate: float = Field(..., description="Credentials issued per day (30-day average)")
    total_verifications: int = Field(..., description="Total verifications performed")
    verification_success_rate: float = Field(..., description="Percentage of successful verifications")
    active_webhooks: int = Field(..., description="Number of registered webhooks")
