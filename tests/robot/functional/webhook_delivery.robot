*** Settings ***
Resource    ../resources/api_keywords.robot
Test Setup    Set Auth Header

*** Variables ***
${TEST_WEBHOOK_URL}    https://webhook.site/test-callback
${WEBHOOK_SECRET}    whsec_test_secret

*** Test Cases ***
Register Webhook For Credential Issued Event
    ${pub_key}=    Generate Test Keypair
    Create DID    key    ${pub_key}
    ${events}=    Create List    credential.issued
    Set Auth Header
    &{body}=    Create Dictionary    url=${TEST_WEBHOOK_URL}    events=${events}    secret=${WEBHOOK_SECRET}
    POST    /api/v1/webhooks    ${body}
    Integer    response status    201
    String    response body url    ${TEST_WEBHOOK_URL}
    String    response body events[0]    credential.issued
    Boolean    response body active    True

Register Webhook For Multiple Events
    ${events}=    Create List    credential.issued    credential.verified    credential.revoked
    Set Auth Header
    &{body}=    Create Dictionary    url=${TEST_WEBHOOK_URL}    events=${events}    secret=${WEBHOOK_SECRET}
    POST    /api/v1/webhooks    ${body}
    Integer    response status    201
    String    response body url    ${TEST_WEBHOOK_URL}
    Integer    response body events.length    3

Delete Webhook
    ${events}=    Create List    did.created
    Set Auth Header
    &{body}=    Create Dictionary    url=${TEST_WEBHOOK_URL}/delete-test    events=${events}    secret=${WEBHOOK_SECRET}
    POST    /api/v1/webhooks    ${body}
    Integer    response status    201
    ${webhook_id}=    Output    response body id
    Set Auth Header
    DELETE    /api/v1/webhooks/${webhook_id}
    Integer    response status    204

List Registered Webhooks
    ${events}=    Create List    credential.issued
    Set Auth Header
    &{body}=    Create Dictionary    url=${TEST_WEBHOOK_URL}/list-test    events=${events}    secret=${WEBHOOK_SECRET}
    POST    /api/v1/webhooks    ${body}
    Integer    response status    201
    Set Auth Header
    GET    /api/v1/webhooks
    Integer    response status    200
    Array    response body
