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
    Issue Credential    ${issuer_did}    did:key:z6Mktest    verified_adult_creator    ${claims}
    String    response body credential.credentialSubject.name    Test Creator
    String    response body credential.type[0]    VerifiableCredential

Issue Licensed Venue Credential
    ${pub_key}=    Generate Test Keypair
    ${did_response}=    Create DID    key    ${pub_key}
    ${issuer_did}=    Output    response body did
    ${claims}=    Create Dictionary    venue_name=Test Club    address=123 Main St    license_number=LIC-2024-001    jurisdiction=California
    Issue Credential    ${issuer_did}    did:key:z6Mkvenue    licensed_venue    ${claims}
    String    response body credential.credentialSubject.venue_name    Test Club
    String    response body credential.credentialSubject.jurisdiction    California

Verify Valid Credential Returns True
    ${pub_key}=    Generate Test Keypair
    ${did_response}=    Create DID    key    ${pub_key}
    ${issuer_did}=    Output    response body did
    ${claims}=    Create Dictionary    name=Test Creator    platform=OnlyFans
    Issue Credential    ${issuer_did}    did:key:z6Mksubject    verified_adult_creator    ${claims}
    ${cred}=    Output    response body credential
    Verify Credential    ${cred}
    Boolean    response body valid    True

Revoke Credential Succeeds
    ${pub_key}=    Generate Test Keypair
    ${did_response}=    Create DID    key    ${pub_key}
    ${issuer_did}=    Output    response body did
    ${claims}=    Create Dictionary    name=Test Creator
    Issue Credential    ${issuer_did}    did:key:z6Mksubject    verified_adult_creator    ${claims}
    ${cred_id}=    Output    response body credential.id
    Revoke Credential    ${cred_id}
    Boolean    response body success    True
    String    response body credential_id    ${cred_id}

Verify Revoked Credential Returns False
    ${pub_key}=    Generate Test Keypair
    ${did_response}=    Create DID    key    ${pub_key}
    ${issuer_did}=    Output    response body did
    ${claims}=    Create Dictionary    name=Test Creator
    Issue Credential    ${issuer_did}    did:key:z6Mksubject    verified_adult_creator    ${claims}
    ${cred}=    Output    response body credential
    ${cred_id}=    Set Variable    ${cred}[id]
    Revoke Credential    ${cred_id}
    Verify Credential    ${cred}
    Boolean    response body valid    False
