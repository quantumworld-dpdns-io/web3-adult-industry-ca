Feature: Webhook Delivery
  As a webhook consumer
  I want to receive events when credentials are issued or revoked
  So that I can react to changes

  Scenario: Register a webhook for credential events
    When I register a webhook URL for "credential.issued" events
    Then the webhook should be registered successfully
    And I should receive a webhook secret

  Scenario: Webhook is triggered on credential issue
    Given a webhook is registered for "credential.issued" events
    When I issue a new credential
    Then the webhook endpoint should receive an event

  Scenario: Delete a webhook
    Given a webhook is registered
    When I delete the webhook
    Then the webhook should no longer be listed
