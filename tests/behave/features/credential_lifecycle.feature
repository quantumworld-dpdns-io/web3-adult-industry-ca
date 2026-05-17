Feature: Credential Lifecycle
  As a certification authority operator
  I want to manage Verifiable Credentials
  So that creators and venues can be verified

  Background:
    Given the CA API is running
    And I have a valid API key

  Scenario: Issue a Verified Adult Creator credential
    When I create a DID using the key method
    And I issue a credential of type "verified_adult_creator" for that DID
    Then the credential should have a valid proof
    And the credential type should include "VerifiedAdultCreator"

  Scenario: Verify a valid credential
    Given a valid credential has been issued
    When I verify the credential
    Then the verification result should be "valid"

  Scenario: Revoke a credential
    Given a valid credential has been issued
    When I revoke the credential
    Then the credential should be marked as revoked

  Scenario: Verify a revoked credential fails
    Given a credential has been revoked
    When I verify the credential
    Then the verification result should be "invalid"
