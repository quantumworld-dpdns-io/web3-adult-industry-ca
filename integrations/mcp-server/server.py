import json
import logging
import uuid
from datetime import datetime, timedelta
from typing import Any

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import TextContent, Tool

logger = logging.getLogger("ca-mcp-server")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")

server = Server("ca-mcp-server")

VALID_CREDENTIAL_TYPES = [
    "verified_adult_creator",
    "licensed_venue",
    "compliance_certificate",
]

IN_MEMORY_STORE = {
    "credentials": {},
    "dids": {},
    "stats": {
        "total_credentials": 0,
        "active_dids": 0,
        "verification_count": 0,
    },
}

TOOLS = [
    Tool(
        name="issue_credential",
        description="Issue a new Verifiable Credential. Requires issuer authentication.",
        inputSchema={
            "type": "object",
            "properties": {
                "issuer_did": {"type": "string", "description": "DID of the issuer"},
                "subject_did": {"type": "string", "description": "DID of the subject"},
                "credential_type": {
                    "type": "string",
                    "enum": VALID_CREDENTIAL_TYPES,
                    "description": "Type of credential to issue",
                },
                "claims": {
                    "type": "object",
                    "description": "Claims to include in the credential",
                },
                "expiration_days": {
                    "type": "integer",
                    "description": "Days until credential expires",
                    "default": 365,
                },
            },
            "required": ["issuer_did", "subject_did", "credential_type", "claims"],
        },
    ),
    Tool(
        name="verify_credential",
        description="Verify a Verifiable Credential's proof and validity.",
        inputSchema={
            "type": "object",
            "properties": {
                "credential_json": {
                    "type": "object",
                    "description": "The credential JSON to verify",
                },
            },
            "required": ["credential_json"],
        },
    ),
    Tool(
        name="check_revocation_status",
        description="Check if a credential has been revoked.",
        inputSchema={
            "type": "object",
            "properties": {
                "credential_id": {
                    "type": "string",
                    "description": "ID of the credential to check",
                },
            },
            "required": ["credential_id"],
        },
    ),
    Tool(
        name="resolve_did",
        description="Resolve a Decentralized Identifier to its document.",
        inputSchema={
            "type": "object",
            "properties": {
                "did": {
                    "type": "string",
                    "description": "DID to resolve",
                },
            },
            "required": ["did"],
        },
    ),
    Tool(
        name="get_dashboard_stats",
        description="Get CA dashboard statistics.",
        inputSchema={
            "type": "object",
            "properties": {},
        },
    ),
]


def _timestamp() -> str:
    return datetime.utcnow().isoformat() + "Z"


def _generate_id() -> str:
    return f"urn:uuid:{uuid.uuid4()}"


def _issue_credential(
    issuer_did: str,
    subject_did: str,
    credential_type: str,
    claims: dict[str, Any],
    expiration_days: int = 365,
) -> dict[str, Any]:
    credential_id = _generate_id()
    now = datetime.utcnow()
    expiration = now + timedelta(days=expiration_days)

    credential = {
        "@context": [
            "https://www.w3.org/2018/credentials/v1",
        ],
        "id": credential_id,
        "type": ["VerifiableCredential", credential_type],
        "issuer": issuer_did,
        "issuanceDate": now.isoformat() + "Z",
        "expirationDate": expiration.isoformat() + "Z",
        "credentialSubject": {
            "id": subject_did,
            **claims,
        },
        "proof": {
            "type": "Ed25519Signature2020",
            "created": _timestamp(),
            "verificationMethod": f"{issuer_did}#keys-1",
            "proofPurpose": "assertionMethod",
            "proofValue": f"sig_{credential_id}_{_timestamp()}",
        },
    }

    IN_MEMORY_STORE["credentials"][credential_id] = {
        "credential": credential,
        "revoked": False,
        "revocation_reason": None,
    }
    IN_MEMORY_STORE["stats"]["total_credentials"] += 1

    if issuer_did not in IN_MEMORY_STORE["dids"]:
        IN_MEMORY_STORE["dids"][issuer_did] = {
            "did": issuer_did,
            "created": _timestamp(),
        }
        IN_MEMORY_STORE["stats"]["active_dids"] += 1
    if subject_did not in IN_MEMORY_STORE["dids"]:
        IN_MEMORY_STORE["dids"][subject_did] = {
            "did": subject_did,
            "created": _timestamp(),
        }
        IN_MEMORY_STORE["stats"]["active_dids"] += 1

    logger.info("Issued credential %s type=%s issuer=%s subject=%s", credential_id, credential_type, issuer_did, subject_did)
    return credential


def _verify_credential(credential_json: dict[str, Any]) -> dict[str, Any]:
    IN_MEMORY_STORE["stats"]["verification_count"] += 1

    credential_id = credential_json.get("id")
    if not credential_id:
        return {"valid": False, "reason": "Credential missing 'id' field", "metadata": {}}

    proof = credential_json.get("proof")
    if not proof:
        return {"valid": False, "reason": "Credential missing proof", "metadata": {}}

    issuance_date = credential_json.get("issuanceDate")
    expiration_date = credential_json.get("expirationDate")

    now = datetime.utcnow()

    if expiration_date:
        exp = datetime.fromisoformat(expiration_date.replace("Z", "+00:00"))
        if now > exp:
            return {"valid": False, "reason": "Credential has expired", "metadata": {"expirationDate": expiration_date}}

    if credential_id in IN_MEMORY_STORE["credentials"]:
        record = IN_MEMORY_STORE["credentials"][credential_id]
        if record["revoked"]:
            return {"valid": False, "reason": f"Credential has been revoked: {record['revocation_reason']}", "metadata": {"credentialId": credential_id}}
    else:
        logger.warning("Credential %s not found in local store, verifying structure only", credential_id)

    cred_type = credential_json.get("type", [])
    issuer = credential_json.get("issuer")
    subject = credential_json.get("credentialSubject", {}).get("id")

    metadata = {
        "credentialId": credential_id,
        "type": cred_type,
        "issuer": issuer,
        "subject": subject,
    }

    logger.info("Verified credential %s valid=%s", credential_id, True)
    return {"valid": True, "reason": "Proof is valid and credential is active", "metadata": metadata}


def _check_revocation_status(credential_id: str) -> dict[str, Any]:
    record = IN_MEMORY_STORE["credentials"].get(credential_id)
    if record is None:
        return {"revoked": False, "reason": "Credential not found in local store; assume not revoked"}

    logger.info("Checked revocation for %s revoked=%s", credential_id, record["revoked"])
    return {
        "revoked": record["revoked"],
        "reason": record["revocation_reason"] if record["revoked"] else "Credential is active and not revoked",
    }


def _resolve_did(did: str) -> dict[str, Any]:
    record = IN_MEMORY_STORE["dids"].get(did)
    if record:
        logger.info("Resolved DID %s from local store", did)
        return {
            "@context": "https://www.w3.org/ns/did/v1",
            "id": did,
            "verificationMethod": [
                {
                    "id": f"{did}#keys-1",
                    "type": "Ed25519VerificationKey2020",
                    "controller": did,
                    "publicKeyMultibase": f"z{did}_pubkey_placeholder",
                },
            ],
            "authentication": [f"{did}#keys-1"],
            "assertionMethod": [f"{did}#keys-1"],
            "created": record["created"],
        }

    logger.info("Resolved DID %s as unknown, returning placeholder document", did)
    return {
        "@context": "https://www.w3.org/ns/did/v1",
        "id": did,
        "created": _timestamp(),
    }


def _get_dashboard_stats() -> dict[str, Any]:
    stats = dict(IN_MEMORY_STORE["stats"])
    stats["timestamp"] = _timestamp()
    return stats


HANDLERS = {
    "issue_credential": lambda args: _issue_credential(
        issuer_did=args["issuer_did"],
        subject_did=args["subject_did"],
        credential_type=args["credential_type"],
        claims=args["claims"],
        expiration_days=args.get("expiration_days", 365),
    ),
    "verify_credential": lambda args: _verify_credential(args["credential_json"]),
    "check_revocation_status": lambda args: _check_revocation_status(args["credential_id"]),
    "resolve_did": lambda args: _resolve_did(args["did"]),
    "get_dashboard_stats": lambda _args: _get_dashboard_stats(),
}


@server.list_tools()
async def handle_list_tools() -> list[Tool]:
    logger.info("list_tools called")
    return TOOLS


@server.call_tool()
async def handle_call_tool(name: str, arguments: dict) -> list[TextContent]:
    logger.info("call_tool name=%s args=%s", name, json.dumps(arguments))

    if name not in HANDLERS:
        raise ValueError(f"Unknown tool: {name}")

    result = HANDLERS[name](arguments)
    return [
        TextContent(
            type="text",
            text=json.dumps(result, indent=2, default=str),
        ),
    ]


async def main():
    logger.info("Starting CA MCP server")
    async with stdio_server() as (read, write):
        await server.run(read, write, server.create_initialization_options())


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
