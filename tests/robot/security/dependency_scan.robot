*** Settings ***
Library    Collections
Library    Process
Library    OperatingSystem
Library    String

*** Variables ***
${PROJECT_ROOT}    ${CURDIR}/../..
${CA_API_DIR}    ${PROJECT_ROOT}/../ca-api
${CA_CORE_DIR}    ${PROJECT_ROOT}/../ca-core

*** Keywords ***
Run Pip Audit
    [Arguments]    ${requirements_file}=${CURDIR}/../requirements.txt    ${timeout}=120
    ${result}=    Run Process
    ...    pip-audit
    ...    --requirement    ${requirements_file}
    ...    --desc    on
    ...    --no-deps
    ...    timeout=${timeout}s
    ...    stderr=STDOUT
    RETURN    ${result}

Run Cargo Audit
    [Arguments]    ${manifest_path}=${CA_CORE_DIR}    ${timeout}=180
    ${result}=    Run Process
    ...    cargo    audit
    ...    --manifest-path    ${manifest_path}/Cargo.toml
    ...    timeout=${timeout}s
    ...    stderr=STDOUT
    RETURN    ${result}

Run Trivy Scan
    [Arguments]    ${target}=${PROJECT_ROOT}    ${timeout}=300
    ${result}=    Run Process
    ...    trivy    fs    --format    json    --quiet    ${target}
    ...    timeout=${timeout}s
    ...    stderr=STDOUT
    RETURN    ${result}

Check For Vulnerabilities
    [Arguments]    ${result}    ${tool_name}
    Should Be Equal As Integers    ${result.rc}    0
    ...    msg=${tool_name} found vulnerabilities. Output: ${result.stdout}
    Log    ${tool_name} output: ${result.stdout}    level=INFO

*** Test Cases ***
Python Dependencies Have No Known Vulnerabilities
    [Tags]    security    dependency    python
    ${result}=    Run Pip Audit
    Run Keyword And Continue On Failure
    ...    Should Be Equal As Integers    ${result.rc}    0
    ...    msg=Python dependencies have vulnerabilities:\n${result.stdout}
    Log    ${result.stdout}    level=INFO
    IF    ${result.rc} != 0
        ${vuln_count}=    Get Line Count    ${result.stdout}
        Log    Found ${vuln_count} vulnerabilities in Python dependencies    level=WARN
    END

Rust Dependencies Have No Known Vulnerabilities
    [Tags]    security    dependency    rust
    [Documentation]    Runs cargo audit on the Rust workspace
    ${result}=    Run Cargo Audit
    Run Keyword And Continue On Failure
    ...    Should Be Equal As Integers    ${result.rc}    0
    ...    msg=Rust dependencies have vulnerabilities:\n${result.stdout}
    Log    ${result.stdout}    level=INFO
    IF    ${result.rc} != 0
        ${vuln_count}=    Get Line Count    ${result.stdout}
        Log    Found ${vuln_count} vulnerabilities in Rust dependencies    level=WARN
    END

Full Workspace Trivy Scan
    [Tags]    security    dependency    trivy    full
    [Documentation]    Runs trivy filesystem scan on the entire project
    ${result}=    Run Trivy Scan
    Run Keyword And Continue On Failure
    ...    Should Be Equal As Integers    ${result.rc}    0
    ...    msg=Trivy found vulnerabilities in the workspace:\n${result.stdout}
    Log    ${result.stdout}    level=INFO

Critical Vulnerabilities Fail The Build
    [Tags]    security    dependency    critical    build_blocker
    [Documentation]    Ensures no critical severity vulnerabilities exist
    ${result}=    Run Pip Audit
    ${stdout}=    Set Variable    ${result.stdout}
    ${has_critical}=    Evaluate    'CRITICAL' in '''${stdout}'''
    IF    ${has_critical}
        Log    CRITICAL vulnerabilities found:\n${stdout}    level=WARN
    END
    Run Keyword And Continue On Failure
    ...    Should Not Be True    ${has_critical}
    ...    msg=Critical vulnerabilities found in dependencies

Summary Of Dependency Health
    [Tags]    security    dependency    summary
    [Documentation]    Aggregate summary of all dependency scans
    Log    Dependency scan summary for ${PROJECT_ROOT}    level=INFO
    ${pip_result}=    Run Pip Audit
    ${cargo_result}=    Run Cargo Audit
    Log    pip-audit exit code: ${pip_result.rc}    level=INFO
    Log    cargo audit exit code: ${cargo_result.rc}    level=INFO
    Run Keyword And Continue On Failure
    ...    Should Be Equal As Integers    ${pip_result.rc}    0
    ...    msg=pip-audit reported vulnerabilities
    Run Keyword And Continue On Failure
    ...    Should Be Equal As Integers    ${cargo_result.rc}    0
    ...    msg=cargo audit reported vulnerabilities
