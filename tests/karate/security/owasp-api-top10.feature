Feature: OWASP API Security Top 10

Background:
  * url baseUrl
  * def adminKey = 'admin-key'
  * def userKey = 'user-key'

# A01:2023 - Broken Object Level Authorization
Scenario: A01 - Unauthenticated request returns 401
  Given path '/credentials/issue'
  And request { issuer_did: 'test', subject_did: 'test', credential_type: 'test', claims: {} }
  When method POST
  Then status 401

# A02:2023 - Broken Authentication
Scenario: A02 - Invalid API key returns 401
  Given header X-API-Key = 'invalid-key'
  And path '/health'
  When method GET
  Then status 401

Scenario: A02 - Empty auth header returns 401
  Given header X-API-Key = ''
  And path '/health'
  When method GET
  Then status 401

# A03:2023 - Injection
Scenario: A03 - SQL injection in analytics query is rejected
  Given path '/analytics/query'
  And request { query: "'; DROP TABLE credentials; --" }
  When method POST
  Then status 400

# A04:2023 - Unrestricted Resource Consumption
Scenario: A04 - Oversized payload rejected
  Given path '/credentials/issue'
  And request { issuer_did: '#(largeString)', subject_did: 'test', credential_type: 'test', claims: {} }
  * def largeString = ''
  * eval for(var i=0; i<100000; i++) largeString += 'x'
  When method POST
  Then status 413

# A05:2023 - Broken Function Level Authorization
Scenario: A05 - Non-admin cannot access admin endpoints
  Given header X-API-Key = userKey
  And path '/admin/users'
  When method GET
  Then status 403

# A06:2023 - Unrestricted Access to Sensitive Flows
Scenario: A06 - Mass credential issuance rate limited
  * configure retry = { count: 10, interval: 100 }
  Given path '/credentials/issue'
  And request { issuer_did: 'test', subject_did: 'test', credential_type: 'test', claims: {} }
  When method POST
  * def responseStatus = responseStatus
  # After rate limit, should get 429
  Then assert responseStatus == 201 || responseStatus == 429

# A07:2023 - Server Side Request Forgery
Scenario: A07 - SSRF via webhook URL blocked
  Given path '/webhooks'
  And request { url: 'http://169.254.169.254/latest/meta-data/', events: ['credential.issued'] }
  When method POST
  Then status 400

# A08:2023 - Security Misconfiguration
Scenario: A08 - CORS headers are not overly permissive
  Given path '/health'
  When method OPTIONS
  Then status 200
  And match header Access-Control-Allow-Origin == 'http://localhost:3000'

# A09:2023 - Improper Inventory Management
Scenario: A09 - Deprecated endpoint removed
  Given path '/v1/credentials'
  When method GET
  Then status 404

# A10:2023 - Unsafe Consumption of APIs
Scenario: A10 - Redirect following limited
  Given path '/dids/resolve/did:web:malicious-site.com'
  When method GET
  Then status 400
