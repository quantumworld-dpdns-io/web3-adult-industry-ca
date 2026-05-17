from behave import given, then, when


@when('I create a DID using the "{method}" method')
def step_create_did_with_method(context, method):
    resp = context.client.create_did(method)
    assert resp.status_code == 201, f"DID creation failed: {resp.status_code} {context.client.last_json}"
    context.created_did = context.client.last_json["did"]
    context.did_document = context.client.last_json["did_document"]


@when('I create a DID using the "{method}" method with domain "{domain}"')
def step_create_did_with_domain(context, method, domain):
    resp = context.client.create_did(method, domain=domain)
    assert resp.status_code == 201, f"DID creation failed: {resp.status_code} {context.client.last_json}"
    context.created_did = context.client.last_json["did"]
    context.did_document = context.client.last_json["did_document"]


@then('the DID should start with "{prefix}"')
def step_did_starts_with(context, prefix):
    assert context.created_did is not None, "No DID was created"
    assert context.created_did.startswith(prefix), f"DID '{context.created_did}' does not start with '{prefix}'"


@then("the DID document should contain a verification method")
def step_did_doc_contains_vm(context):
    assert context.did_document is not None
    vm = context.did_document.get("verificationMethod")
    assert vm is not None and len(vm) > 0, "No verificationMethod in DID document"
    assert "publicKeyMultibase" in vm[0], "Verification method missing publicKeyMultibase"
    assert "id" in vm[0], "Verification method missing id"


@then("the DID document should contain the domain")
def step_did_doc_contains_domain(context):
    assert context.did_document is not None
    also_known = context.did_document.get("alsoKnownAs", [])
    assert any("example.com" in entry for entry in also_known), (
        f"Domain not found in alsoKnownAs: {also_known}"
    )
    services = context.did_document.get("service", [])
    assert any("example.com" in s.get("serviceEndpoint", "") for s in services), (
        f"Domain not found in service endpoints: {services}"
    )


@given("I have created a DID")
def step_have_created_did(context):
    resp = context.client.create_did("key")
    assert resp.status_code == 201, f"DID creation failed: {resp.status_code} {context.client.last_json}"
    context.created_did = context.client.last_json["did"]
    context.did_document = context.client.last_json["did_document"]


@when("I resolve the DID")
def step_resolve_did(context):
    assert context.created_did is not None
    resp = context.client.resolve_did(context.created_did)
    assert resp.status_code == 200, f"Resolve failed: {resp.status_code} {context.client.last_json}"
    context.resolved_document = context.client.last_json


@then("the DID document should be returned")
def step_did_document_returned(context):
    assert context.resolved_document is not None
    assert "id" in context.resolved_document, "Resolved document missing 'id'"
    assert context.resolved_document["id"] == context.created_did, (
        f"Resolved DID '{context.resolved_document['id']}' != expected '{context.created_did}'"
    )
    assert "verificationMethod" in context.resolved_document
