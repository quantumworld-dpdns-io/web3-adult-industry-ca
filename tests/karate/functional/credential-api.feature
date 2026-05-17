Feature: Credential API Functional Tests

Background:
  * url baseUrl
  * header X-API-Key = apiKey

Scenario: Health check
  Given path '/health'
  When method GET
  Then status 200
  And match $.status == 'ok'

Scenario: Issue credential
  Given path '/credentials/issue'
  And request { issuer_did: 'did:key:z6Mktest', subject_did: 'did:key:z6Mksub', credential_type: 'verified_adult_creator', claims: { name: 'Test' } }
  When method POST
  Then status 201
  And match $.credential.credentialSubject.name == 'Test'

Scenario: Verify credential
  Given path '/credentials/verify'
  And request { credential: { '@context': ['https://www.w3.org/2018/credentials/v1'], id: 'test-1', type: ['VerifiableCredential', 'VerifiedAdultCreator'], issuer: 'did:key:z6Mktest', issuanceDate: '2026-05-17T00:00:00Z', credentialSubject: { name: 'Test' } } }
  When method POST
  Then status 200
  And match $.valid == true

Scenario: Create DID
  Given path '/dids/create'
  And request { method: 'key', public_key: 'test-public-key-base64' }
  When method POST
  Then status 201
  And match $.did contains 'did:key:'

Scenario: Resolve DID
  Given path '/dids/resolve/did:key:z6Mktest'
  When method GET
  Then status 200
  And match $.id contains 'did:key:'
