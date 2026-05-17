from behave import given, then, when


@given("the CA API is running")
def step_ca_api_running(context):
    resp = context.client.health()
    assert resp.status_code == 200, f"Health check failed: {resp.status_code}"
    data = context.client.last_json
    assert data.get("status") == "ok", f"Unexpected health status: {data}"


@given("I have a valid API key")
def step_valid_api_key(context):
    assert context.client.api_key is not None
    resp = context.client.health()
    assert resp.status_code == 200


@when("I create a DID using the {method} method")
def step_create_did_method(context, method):
    resp = context.client.create_did(method)
    assert resp.status_code == 201, f"DID creation failed: {resp.status_code} {context.client.last_json}"
    context.created_did = context.client.last_json["did"]
    context.did_document = context.client.last_json["did_document"]


@when('I issue a credential of type "{credential_type}" for that DID')
def step_issue_credential_for_did(context, credential_type):
    assert context.created_did, "No DID available"
    resp = context.client.issue_credential(
        issuer_did=context.created_did,
        subject_did=context.created_did,
        credential_type=credential_type,
    )
    assert resp.status_code == 201, f"Issue failed: {resp.status_code} {context.client.last_json}"
    context.issued_credential = context.client.last_json["credential"]
    context.credential_id = context.issued_credential["id"]


@then("the credential should have a valid proof")
def step_credential_has_valid_proof(context):
    assert context.issued_credential is not None
    proof = context.issued_credential.get("proof")
    assert proof is not None, "Credential missing proof"
    assert "signature" in proof, "Proof missing signature"
    assert "type" in proof, "Proof missing type"
    assert proof["type"] in ("Ed25519Signature2020", "Ed25519Signature2018")


@then('the credential type should include "{expected_type}"')
def step_credential_type_include(context, expected_type):
    assert context.issued_credential is not None
    types = context.issued_credential.get("type", [])
    assert expected_type in types, f"Type '{expected_type}' not in {types}"


@given("a valid credential has been issued")
def step_valid_credential_issued(context):
    resp = context.client.create_did("key")
    assert resp.status_code == 201
    context.created_did = context.client.last_json["did"]
    context.did_document = context.client.last_json["did_document"]

    resp = context.client.issue_credential(
        issuer_did=context.created_did,
        subject_did=context.created_did,
        credential_type="AgeVerification",
        claims={"age": "25", "country": "US"},
    )
    assert resp.status_code == 201, f"Issue failed: {resp.status_code} {context.client.last_json}"
    context.issued_credential = context.client.last_json["credential"]
    context.credential_id = context.issued_credential["id"]


@when("I verify the credential")
def step_verify_credential(context):
    assert context.issued_credential is not None
    resp = context.client.verify_credential(context.issued_credential)
    assert resp.status_code == 200
    context.verification_result = context.client.last_json


@then('the verification result should be "{expected}"')
def step_verification_result(context, expected):
    assert context.verification_result is not None
    if expected == "valid":
        assert context.verification_result["valid"] is True, f"Expected valid, got: {context.verification_result}"
    else:
        assert context.verification_result["valid"] is False, f"Expected invalid, got: {context.verification_result}"


@when("I revoke the credential")
def step_revoke_credential(context):
    assert context.credential_id is not None
    resp = context.client.revoke_credential(context.credential_id)
    assert resp.status_code == 200, f"Revoke failed: {resp.status_code} {context.client.last_json}"
    context.revoke_response = context.client.last_json


@then("the credential should be marked as revoked")
def step_credential_marked_revoked(context):
    assert context.revoke_response is not None
    assert context.revoke_response.get("success") is True
    assert context.revoke_response.get("credential_id") == context.credential_id


@given("a credential has been revoked")
def step_credential_has_been_revoked(context):
    resp = context.client.create_did("key")
    assert resp.status_code == 201
    context.created_did = context.client.last_json["did"]

    resp = context.client.issue_credential(
        issuer_did=context.created_did,
        subject_did=context.created_did,
        credential_type="AgeVerification",
    )
    assert resp.status_code == 201
    context.issued_credential = context.client.last_json["credential"]
    context.credential_id = context.issued_credential["id"]

    resp = context.client.revoke_credential(context.credential_id)
    assert resp.status_code == 200

    context.verification_result = None
