Feature: OWASP Web Security Top 10

# A1:2021 - Broken Access Control
Scenario: A1 - Direct object reference blocked
  Given url 'http://localhost:3000'
  And path '/admin'
  And header Authorization = 'Bearer invalid-token'
  When method GET
  Then status 401

# A3:2021 - Injection (XSS)
Scenario: A3 - XSS in search field sanitized
  Given url 'http://localhost:3000'
  And path '/credentials'
  And param search = '<script>alert("xss")</script>'
  When method GET
  Then status 200
  And match response !contains '<script>'

# A6:2021 - Security Misconfiguration
Scenario: A6 - Security headers present
  Given url 'http://localhost:3000'
  And path '/'
  When method GET
  Then status 200
  And match header contains 'X-Content-Type-Options' 'nosniff'
