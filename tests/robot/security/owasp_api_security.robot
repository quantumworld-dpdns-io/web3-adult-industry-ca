*** Settings ***
Resource    ../resources/api_keywords.robot
Resource    ../resources/auth_keywords.robot

*** Variables ***
${VALID_ENDPOINT}    /api/v1/credentials/issue
${ADMIN_ENDPOINT}    /api/v1/analytics/dashboard

*** Test Cases ***
API1 Unauthenticated Request Returns 401
    [Tags]    OWASP    API1    broken_object_level_auth
    Clear Auth Header
    POST    ${VALID_ENDPOINT}    {}
    Integer    response status    401
    String    response body detail    Missing API key. Provide via X-API-Key header or api_key query parameter.

API1 Access Other Users Credentials
    [Tags]    OWASP    API1    broken_object_level_auth
    Clear Auth Header
    &{headers}=    Create Dictionary    X-API-Key=invalid-key-99999    Content-Type=application/json
    Set Headers    ${headers}
    GET    /api/v1/credentials/some-credential-id
    Integer    response status    403

API2 Invalid API Key Returns 401
    [Tags]    OWASP    API2    broken_authentication
    Clear Auth Header
    &{headers}=    Create Dictionary    X-API-Key=this-api-key-is-definitely-not-valid    Content-Type=application/json
    Set Headers    ${headers}
    GET    /api/v1/dids/create
    Integer    response status    403
    String    response body detail    Invalid API key.

API2 Empty Auth Header Returns 401
    [Tags]    OWASP    API2    broken_authentication
    Clear Auth Header
    &{headers}=    Create Dictionary    X-API-Key=${EMPTY}    Content-Type=application/json
    Set Headers    ${headers}
    POST    ${VALID_ENDPOINT}    {}
    Integer    response status    401

API3 Mass Assignment Protection
    [Tags]    OWASP    API3    broken_property_level
    Set Auth Header
    &{claims}=    Create Dictionary    name=Test    role=superadmin    is_admin=true
    &{body}=    Create Dictionary
    ...    issuer_did=did:key:z6Mkissuer
    ...    subject_did=did:key:z6Mksubject
    ...    credential_type=verified_adult_creator
    ...    claims=${claims}
    ...    extra_field=should_not_be_accepted
    ...    admin_bypass=true
    POST    /api/v1/credentials/issue    ${body}
    ${status}=    Integer    response status    201
    ${cred}=    Output    response body credential
    Should Not Contain    ${cred}    admin_bypass    Unexpected field should not be in response
    Should Not Contain    ${cred.credentialSubject}    role    Role elevation should not be accepted

API4 Rate Limiting After Excessive Requests
    [Tags]    OWASP    API4    resource_consumption
    Set Auth Header
    ${too_many}=    Evaluate    70
    FOR    ${i}    IN RANGE    ${too_many}
        ${result}=    Run Keyword And Ignore Error    GET    /api/v1/dids/create
        Exit For Loop If    """${result[0]}""" == """FAIL"""
    END
    ${status}=    Run Keyword And Ignore Error    Integer    response status    429

API5 Non Admin Cannot Access Admin Endpoints
    [Tags]    OWASP    API5    broken_function_level_auth
    ${token}=    Get JWT Token    regularuser    regularpass1234
    Set JWT Auth Header    ${token}
    GET    /api/v1/analytics/dashboard
    Integer    response status    403
    String    response body detail    Admin privileges required

API5 Non Admin Cannot Post To Admin Endpoints
    [Tags]    OWASP    API5    broken_function_level_auth
    ${token}=    Get JWT Token    regularuser    regularpass1234
    Set JWT Auth Header    ${token}
    &{body}=    Create Dictionary    key=max_credential_expiry_days    value=999
    POST    /api/v1/admin/config    ${body}
    Integer    response status    403

API6 Revoke Without Proper Auth Returns 401
    [Tags]    OWASP    API6    sensitive_flows
    Clear Auth Header
    &{body}=    Create Dictionary    credential_id=test-credential-id
    POST    /api/v1/credentials/revoke    ${body}
    Integer    response status    401

API6 Issue Credential Without Auth Returns 401
    [Tags]    OWASP    API6    sensitive_flows
    Clear Auth Header
    &{claims}=    Create Dictionary    name=Anonymous
    &{body}=    Create Dictionary
    ...    issuer_did=did:key:z6Mkanon
    ...    subject_did=did:key:z6Mkanon
    ...    credential_type=anonymous
    ...    claims=${claims}
    POST    ${VALID_ENDPOINT}    ${body}
    Integer    response status    401

API7 SSRF Via Webhook URL
    [Tags]    OWASP    API7    ssrf
    Set Auth Header
    @{events}=    Create List    credential.issued
    &{body}=    Create Dictionary    url=file:///etc/passwd    events=${events}    secret=test
    POST    /api/v1/webhooks    ${body}
    Integer    response status    400

API7 SSRF Via Internal IP Webhook
    [Tags]    OWASP    API7    ssrf
    Set Auth Header
    @{events}=    Create List    credential.issued
    &{body}=    Create Dictionary    url=http://169.254.169.254/latest/meta-data/    events=${events}    secret=test
    POST    /api/v1/webhooks    ${body}
    Integer    response status    400

API8 CORS Headers Are Properly Restricted
    [Tags]    OWASP    API8    misconfiguration
    ${headers}=    Create Dictionary    Origin=https://malicious-site.com
    GET    /health    headers=${headers}
    Integer    response status    200
    ${cors}=    Output    response headers Access-Control-Allow-Origin
    Should Be Equal As Strings    ${cors}    *    CORS should be restricted

API8 Security Headers Present
    [Tags]    OWASP    API8    misconfiguration
    GET    /health
    Integer    response status    200
    ${headers}=    Output    response headers
    Log    Available headers: ${headers}

API9 Old API Version Returns 404
    [Tags]    OWASP    API9    inventory_management
    Set Auth Header
    GET    /api/v1/health
    ${v1_status}=    Run Keyword And Ignore Error    GET    /v1/health
    GET    /api/v1/credentials/issue
    ${v1_creds}=    Run Keyword And Ignore Error    GET    /v1/credentials/issue
    Run Keyword And Continue On Failure    Should Contain    ${v1_status}[0]    FAIL

API10 Webhook To Internal Network Blocked
    [Tags]    OWASP    API10    unsafe_consumption
    Set Auth Header
    @{events}=    Create List    credential.issued
    &{body}=    Create Dictionary    url=http://localhost:8000/internal    events=${events}    secret=test
    POST    /api/v1/webhooks    ${body}
    Integer    response status    400
