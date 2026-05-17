import logging

from api_client import ApiClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def before_all(context):
    context.base_url = getattr(context.config, "base_url", "http://localhost:8000")
    context.api_key = getattr(context.config, "api_key", "ca_dev_key_please_change_in_production")
    context.client = ApiClient(base_url=context.base_url, api_key=context.api_key)

    resp = context.client.health()
    if resp.status_code != 200:
        logger.warning("CA API health check returned %s. Ensure the API is running.", resp.status_code)
    else:
        logger.info("CA API is healthy: %s", context.client.last_json)


def before_scenario(context, scenario):
    context.issued_credential = None
    context.credential_id = None
    context.created_did = None
    context.did_document = None
    context.webhook_id = None
    context.webhook_secret = None


def after_scenario(context, scenario):
    status = "PASSED" if scenario.status == "passed" else "FAILED"
    logger.info("Scenario '%s' %s", scenario.name, status)
    if hasattr(context, "failed_exception"):
        logger.error("Failure: %s", context.failed_exception)


def after_all(context):
    if hasattr(context, "client") and context.client:
        context.client.session.close()
        logger.info("API client session closed")
