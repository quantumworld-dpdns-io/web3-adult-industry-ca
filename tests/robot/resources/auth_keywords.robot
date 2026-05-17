*** Settings ***
Library    REST    ${API_URL}
Library    Collections

*** Variables ***
${ADMIN_USERNAME}    admin
${ADMIN_PASSWORD}    admin123456
${API_URL}    http://localhost:8000

*** Keywords ***
Get JWT Token
    [Arguments]    ${username}=${ADMIN_USERNAME}    ${password}=${ADMIN_PASSWORD}
    Clear Auth Header
    &{body}=    Create Dictionary    username=${username}    password=${password}
    POST    /api/v1/admin/login    ${body}
    Integer    response status    200
    ${token}=    Output    response body access_token
    RETURN    ${token}

Set JWT Auth Header
    [Arguments]    ${token}
    &{headers}=    Create Dictionary    Authorization=Bearer ${token}    Content-Type=application/json
    Set Headers    ${headers}

Get Admin Token
    ${token}=    Get JWT Token    ${ADMIN_USERNAME}    ${ADMIN_PASSWORD}
    RETURN    ${token}

Verify 401 Without Auth
    [Arguments]    ${endpoint}    ${method}=GET
    Clear Auth Header
    IF    "${method}" == "GET"
        GET    ${endpoint}
    ELSE IF    "${method}" == "POST"
        POST    ${endpoint}    {}
    ELSE IF    "${method}" == "DELETE"
        DELETE    ${endpoint}
    ELSE IF    "${method}" == "PATCH"
        PATCH    ${endpoint}    {}
    END
    Integer    response status    401

Verify 403 For Non Admin
    [Arguments]    ${endpoint}    ${method}=GET
    ${token}=    Get JWT Token    regularuser    regularpass1234
    Set JWT Auth Header    ${token}
    IF    "${method}" == "GET"
        GET    ${endpoint}
    ELSE IF    "${method}" == "POST"
        POST    ${endpoint}    {}
    ELSE IF    "${method}" == "DELETE"
        DELETE    ${endpoint}
    ELSE IF    "${method}" == "PATCH"
        PATCH    ${endpoint}    {}
    END
    Integer    response status    403

Create Admin User Via Api
    [Arguments]    ${username}    ${password}    ${role}=admin
    Set Auth Header
    &{body}=    Create Dictionary    username=${username}    password=${password}    role=${role}
    POST    /api/v1/admin/users    ${body}
    Integer    response status    201

Verify Forbidden Access
    [Arguments]    ${endpoint}    ${method}=GET
    Verify 403 For Non Admin    ${endpoint}    ${method}

Get Non Admin Token
    ${token}=    Get JWT Token    regularuser    regularpass1234
    RETURN    ${token}
