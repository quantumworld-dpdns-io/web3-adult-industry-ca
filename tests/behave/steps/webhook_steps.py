import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from behave import given, then, when


class WebhookTestHandler(BaseHTTPRequestHandler):
    received_events = []

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)
        WebhookTestHandler.received_events.append({
            "path": self.path,
            "headers": dict(self.headers),
            "body": body.decode("utf-8"),
        })
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'{"status":"ok"}')

    def log_message(self, fmt, *args):
        pass


def start_webhook_server(context):
    if hasattr(context, "_webhook_server") and context._webhook_server:
        return

    WebhookTestHandler.received_events.clear()
    server = HTTPServer(("127.0.0.1", 0), WebhookTestHandler)
    context._webhook_server = server
    context._webhook_server_url = f"http://127.0.0.1:{server.server_address[1]}"
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()


def stop_webhook_server(context):
    if hasattr(context, "_webhook_server") and context._webhook_server:
        context._webhook_server.shutdown()
        context._webhook_server = None


@when('I register a webhook URL for "{event}" events')
def step_register_webhook(context, event):
    start_webhook_server(context)
    events = [event]
    resp = context.client.create_webhook(
        url=context._webhook_server_url,
        events=events,
    )
    assert resp.status_code == 201, f"Webhook registration failed: {resp.status_code} {context.client.last_json}"
    context.webhook_id = context.client.last_json["id"]
    context.webhook_secret = context.client.last_json.get("secret")


@then("the webhook should be registered successfully")
def step_webhook_registered(context):
    assert context.webhook_id is not None, "No webhook ID stored"
    resp = context.client.list_webhooks()
    assert resp.status_code == 200
    ids = [w["id"] for w in context.client.last_json]
    assert context.webhook_id in ids, f"Webhook {context.webhook_id} not found in list"


@then("I should receive a webhook secret")
def step_webhook_secret(context):
    assert context.webhook_secret is not None, "No webhook secret received"
    assert len(context.webhook_secret) > 0, "Webhook secret is empty"


@given('a webhook is registered for "{event}" events')
def step_webhook_registered_for_event(context, event):
    start_webhook_server(context)
    events = [event]
    resp = context.client.create_webhook(
        url=context._webhook_server_url,
        events=events,
    )
    assert resp.status_code == 201, f"Webhook registration failed: {resp.status_code}"
    context.webhook_id = context.client.last_json["id"]


@given("a webhook is registered")
def step_webhook_registered_generic(context):
    start_webhook_server(context)
    resp = context.client.create_webhook(
        url=context._webhook_server_url,
        events=["credential.issued"],
    )
    assert resp.status_code == 201, f"Webhook registration failed: {resp.status_code}"
    context.webhook_id = context.client.last_json["id"]


@when("I issue a new credential")
def step_issue_new_credential(context):
    WebhookTestHandler.received_events.clear()
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


@then("the webhook endpoint should receive an event")
def step_webhook_received_event(context):
    assert len(WebhookTestHandler.received_events) > 0, "Webhook did not receive any events"
    last = WebhookTestHandler.received_events[-1]
    assert "credential.issued" in str(last.get("body", "")), f"Unexpected event body: {last}"
    assert "X-Webhook-Event" in last.get("headers", {}), "Missing X-Webhook-Event header"


@when("I delete the webhook")
def step_delete_webhook(context):
    assert context.webhook_id is not None
    resp = context.client.delete_webhook(context.webhook_id)
    assert resp.status_code == 204, f"Delete failed: {resp.status_code}"


@then("the webhook should no longer be listed")
def step_webhook_not_listed(context):
    resp = context.client.list_webhooks()
    assert resp.status_code == 200
    ids = [w["id"] for w in context.client.last_json]
    assert context.webhook_id not in ids, f"Webhook {context.webhook_id} still listed after deletion"
