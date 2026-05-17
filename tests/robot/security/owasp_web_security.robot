*** Settings ***
Resource    ../resources/api_keywords.robot
Resource    ../resources/auth_keywords.robot

*** Test Cases ***
XSS In Search Fields
    [Tags]    OWASP    XSS    injection
    Set Auth Header
    &{claims}=    Create Dictionary    name=<script>alert('xss')</script>    description=<img src=x onerror=alert(1)>
    &{body}=    Create Dictionary
    ...    issuer_did=did:key:z6Mkissuer
    ...    subject_did=did:key:z6Mksubject
    ...    credential_type=verified_adult_creator
    ...    claims=${claims}
    POST    /api/v1/credentials/issue    ${body}
    Integer    response status    201
    ${cred}=    Output    response body credential
    ${subject}=    Set Variable    ${cred}[credentialSubject]
    Should Contain    ${subject}[name]    <script>alert('xss')</script>
    Should Not Contain    ${subject}[name]    <script>    XSS should not be executed or stripped

SQL Injection In Analytics
    [Tags]    OWASP    SQLI    injection
    ${token}=    Get Admin Token
    Set JWT Auth Header    ${token}
    &{body}=    Create Dictionary    query=SELECT * FROM credential_events; DROP TABLE credential_events; --
    POST    /api/v1/analytics/query    ${body}
    Run Keyword And Ignore Error    Integer    response status    400

Path Traversal In DID Resolution
    [Tags]    OWASP    path_traversal    injection
    Set Auth Header
    GET    /api/v1/dids/resolve/../../../etc/passwd
    Integer    response status    404

Path Traversal In DID Resolution Encoded
    [Tags]    OWASP    path_traversal    injection
    Set Auth Header
    GET    /api/v1/dids/resolve/..%2F..%2F..%2Fetc%2Fpasswd
    Integer    response status    404

Path Traversal In Credential Lookup
    [Tags]    OWASP    path_traversal    injection
    Set Auth Header
    GET    /api/v1/credentials/../../etc/shadow
    Integer    response status    404

Open Redirect Prevention
    [Tags]    OWASP    redirect    validation
    Set Auth Header
    @{events}=    Create List    credential.issued
    &{body}=    Create Dictionary    url=http://evil.com/phishing    events=${events}    secret=test
    POST    /api/v1/webhooks    ${body}
    Integer    response status    400

Open Redirect Via DID Resolve
    [Tags]    OWASP    redirect    validation
    Set Auth Header
    GET    /api/v1/dids/resolve/http://evil.com
    Integer    response status    404
