*** Settings ***
Resource    ../resources/api_keywords.robot
Test Setup    Set Auth Header

*** Test Cases ***
Create DID Using Key Method
    ${pub_key}=    Generate Test Keypair
    Create DID    key    ${pub_key}
    Integer    response status    201
    String    response body did    did:key:${pub_key}
    Object    response body did_document
    String    response body did_document.@context    https://www.w3.org/ns/did/v1
    String    response body did_document.id    did:key:${pub_key}

Create DID Using Web Method
    ${pub_key}=    Generate Test Keypair
    Create DID    web    ${pub_key}    domain=issuer.example.com
    Integer    response status    201
    String    response body did    did:web:issuer.example.com
    Object    response body did_document
    String    response body did_document.id    did:web:issuer.example.com

Resolve Existing DID
    ${pub_key}=    Generate Test Keypair
    Create DID    key    ${pub_key}
    ${created_did}=    Output    response body did
    Resolve DID    ${created_did}
    Integer    response status    200
    Object    response body
    String    response body id    ${created_did}

DID Document Contains Required Fields
    ${pub_key}=    Generate Test Keypair
    Create DID    key    ${pub_key}
    Object    response body did_document
    String    response body did_document.@context    https://www.w3.org/ns/did/v1
    String    response body did_document.id    did:key:${pub_key}
    Array    response body did_document.verificationMethod
    Array    response body did_document.assertionMethod
    Integer    response body did_document.verificationMethod.length    1
    String    response body did_document.verificationMethod[0].type    Ed25519VerificationKey2018
