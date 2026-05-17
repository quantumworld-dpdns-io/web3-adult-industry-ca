*** Settings ***
Library    REST    ${API_URL}
Library    Collections
Library    String
Library    ../libs/crypto_keywords.py

*** Variables ***
${API_URL}    http://localhost:8000
${API_KEY}    test-api-key-12345
${CONTENT_TYPE}    application/json

*** Keywords ***
Set Auth Header
    &{headers}=    Create Dictionary    X-API-Key=${API_KEY}    Content-Type=${CONTENT_TYPE}
    Set Headers    ${headers}

Clear Auth Header
    &{headers}=    Create Dictionary    Content-Type=${CONTENT_TYPE}
    Set Headers    ${headers}

Health Check
    GET    /health
    Integer    response status    200

Issue Credential
    [Arguments]    ${issuer_did}    ${subject_did}    ${credential_type}    ${claims}
    Set Auth Header
    &{body}=    Create Dictionary
    ...    issuer_did=${issuer_did}
    ...    subject_did=${subject_did}
    ...    credential_type=${credential_type}
    ...    claims=${claims}
    POST    /api/v1/credentials/issue    ${body}
    Integer    response status    201

POST Credential Issue
    [Arguments]    ${issuer_did}    ${subject_did}    ${credential_type}    ${claims}
    Issue Credential    ${issuer_did}    ${subject_did}    ${credential_type}    ${claims}

Verify Credential
    [Arguments]    ${credential_json}
    Set Auth Header
    &{body}=    Create Dictionary    credential_json=${credential_json}
    POST    /api/v1/credentials/verify    ${body}
    Integer    response status    200

POST Credential Verify
    [Arguments]    ${credential_json}
    Verify Credential    ${credential_json}

Revoke Credential
    [Arguments]    ${credential_id}
    Set Auth Header
    &{body}=    Create Dictionary    credential_id=${credential_id}
    POST    /api/v1/credentials/revoke    ${body}
    Integer    response status    200

POST Credential Revoke
    [Arguments]    ${credential_id}
    Revoke Credential    ${credential_id}

Get Credential
    [Arguments]    ${credential_id}
    Set Auth Header
    GET    /api/v1/credentials/${credential_id}
    Integer    response status    200

GET Credential By Id
    [Arguments]    ${credential_id}
    Get Credential    ${credential_id}

Create DID
    [Arguments]    ${method}    ${public_key}    ${domain}=${None}
    Set Auth Header
    &{body}=    Create Dictionary    method=${method}    public_key=${public_key}
    IF    "${domain}" != "${None}"
        Set To Dictionary    ${body}    domain=${domain}
    END
    POST    /api/v1/dids/create    ${body}
    Integer    response status    201

Resolve DID
    [Arguments]    ${did}
    Set Auth Header
    GET    /api/v1/dids/resolve/${did}
    Integer    response status    200

Register Webhook
    [Arguments]    ${url}    ${events}
    Set Auth Header
    &{body}=    Create Dictionary    url=${url}    events=${events}    secret=whsec_test
    POST    /api/v1/webhooks    ${body}
    Integer    response status    201

Create Webhook
    [Arguments]    ${url}    ${events}
    Register Webhook    ${url}    ${events}

Get Dashboard Metrics
    Set Auth Header
    GET    /api/v1/analytics/dashboard
    Integer    response status    200

Generate Test Keypair
    ${key}=    Evaluate    __import__('cryptography').hazmat.primitives.asymmetric.ed25519.Ed25519PrivateKey.generate()
    ${pub_key}=    Evaluate    __import__('base64').b64encode(${key}.public_key().public_bytes_raw()).decode()    modules=base64
    RETURN    ${pub_key}

Send Rapid Requests
    [Arguments]    ${count}    ${url}=/api/v1/dids/create    ${method}=GET
    FOR    ${i}    IN RANGE    ${count}
        ${status}=    Run Keyword And Ignore Error    GET    ${url}
    END

Generate Large Payload
    [Arguments]    ${size_kb}
    ${large_string}=    Evaluate    "X" * ${size_kb * 1024}
    &{claims}=    Create Dictionary    data=${large_string}
    RETURN    ${claims}
