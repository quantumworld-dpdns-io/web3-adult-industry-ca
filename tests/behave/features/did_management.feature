Feature: DID Management
  As a user of the CA
  I want to create and resolve DIDs
  So that I can establish decentralized identifiers

  Scenario: Create a did:key identifier
    When I create a DID using the "key" method
    Then the DID should start with "did:key:"
    And the DID document should contain a verification method

  Scenario: Create a did:web identifier
    When I create a DID using the "web" method with domain "example.com"
    Then the DID should start with "did:web:"
    And the DID document should contain the domain

  Scenario: Resolve an existing DID
    Given I have created a DID
    When I resolve the DID
    Then the DID document should be returned
