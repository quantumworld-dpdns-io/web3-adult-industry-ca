*** Settings ***
Resource    ../resources/api_keywords.robot
Resource    ../resources/auth_keywords.robot
Test Setup    Set Auth Header

*** Test Cases ***
Health Check Should Succeed
    GET    /health
    Integer    response status    200
    String    response body status    ok

Issue Verified Adult Creator Credential
    ${pub_key}=    Generate Test Keypair
    ${did_response}=    Create DID    key    ${pub_key}
    ${issuer_did}=    Output    response body did
    ${claims}=    Create Dictionary    name=Test Creator    platform=OnlyFans    verified_since=2024-01-01
    POST Credential Issue    ${issuer_did}    did:key:z6Mktest    verified_adult_creator    ${claims}
    String    response body credential.credentialSubject.name    Test Creator

Issue Licensed Venue Credential
    ${pub_key}=    Generate Test Keypair
    ${did_response}=    Create DID    key    ${pub_key}
    ${claims}=    Create Dictionary    venue_name=Test Club    address=123 Main St    license_number=LIC-2024-001    jurisdiction=California
    POST Credential Issue    did:key:z6Mkissuer    did:key:z6Mkvenue    licensed_venue    ${claims}
    String    response body credential.credentialSubject.venue_name    Test Club

Verify Valid Credential
    ${pub_key}=    Generate Test Keypair
    ${did_response}=    Create DID    key    ${pub_key}
    ${claims}=    Create Dictionary    name=Test Creator    platform=OnlyFans
    POST Credential Issue    did:key:z6Mkissuer    did:key:z6Mksubject    verified_adult_creator    ${claims}
    ${cred}=    Output    response body credential
    POST Credential Verify    ${cred}
    Boolean    response body valid    True

Revoke Credential
    ${pub_key}=    Generate Test Keypair
    ${did_response}=    Create DID    key    ${pub_key}
    ${claims}=    Create Dictionary    name=Test Creator
    POST Credential Issue    did:key:z6Mkissuer    did:key:z6Mksubject    verified_adult_creator    ${claims}
    ${cred_id}=    Output    response body credential.id
    POST Credential Revoke    ${cred_id}
    Integer    response status    200

Verify Revoked Credential Fails
    [Setup]    Set Auth Header
    ${pub_key}=    Generate Test Keypair
    ${did_response}=    Create DID    key    ${pub_key}
    ${claims}=    Create Dictionary    name=Test Creator
    POST Credential Issue    did:key:z6Mkissuer    did:key:z6Mksubject    verified_adult_creator    ${claims}
    ${cred}=    Output    response body credential
    ${cred_id}=    Set Variable    ${cred}[id]
    POST Credential Revoke    ${cred_id}
    POST Credential Verify    ${cred}
    Boolean    response body valid    False
