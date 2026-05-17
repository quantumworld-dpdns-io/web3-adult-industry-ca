// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/// @title CertificationRegistry
/// @notice Manages DID registration and credential anchoring for the adult industry Web3 ecosystem
contract CertificationRegistry {
    address public owner;
    uint256 private didCount;

    struct DID {
        string did;
        address didOwner;
        string documentUri;
        bool active;
        uint256 createdAt;
        uint256 updatedAt;
    }

    struct Credential {
        string credentialId;
        string issuerDid;
        string subjectDid;
        string credentialHash;
        bool revoked;
        uint256 issuedAt;
    }

    mapping(string => DID) private dids;
    mapping(string => Credential) private credentials;

    event DIDRegistered(string indexed did, address indexed owner, string documentUri);
    event DIDUpdated(string indexed did, string documentUri);
    event DIDDeactivated(string indexed did);
    event CredentialAnchored(string indexed credentialId, string issuerDid, string subjectDid);
    event CredentialRevoked(string indexed credentialId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }

    modifier didExists(string calldata _did) {
        require(dids[_did].active, "DID does not exist or is inactive");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Register a new DID
    /// @param _did The decentralized identifier
    /// @param _documentUri URI to the DID document
    function registerDID(string calldata _did, string calldata _documentUri) external {
        require(!dids[_did].active, "DID already exists and is active");
        dids[_did] = DID({
            did: _did,
            didOwner: msg.sender,
            documentUri: _documentUri,
            active: true,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });
        didCount++;
        emit DIDRegistered(_did, msg.sender, _documentUri);
    }

    /// @notice Update a DID document URI
    /// @param _did The DID to update
    /// @param _documentUri New document URI
    function updateDID(string calldata _did, string calldata _documentUri) external didExists(_did) {
        require(dids[_did].didOwner == msg.sender, "Not the DID owner");
        dids[_did].documentUri = _documentUri;
        dids[_did].updatedAt = block.timestamp;
        emit DIDUpdated(_did, _documentUri);
    }

    /// @notice Deactivate a DID
    /// @param _did The DID to deactivate
    function deactivateDID(string calldata _did) external didExists(_did) {
        require(dids[_did].didOwner == msg.sender, "Not the DID owner");
        dids[_did].active = false;
        dids[_did].updatedAt = block.timestamp;
        emit DIDDeactivated(_did);
    }

    /// @notice Anchor a credential on-chain
    /// @param _credentialId Unique credential identifier
    /// @param _issuerDid DID of the issuer
    /// @param _subjectDid DID of the subject
    /// @param _credentialHash Hash of the credential payload
    function anchorCredential(
        string calldata _credentialId,
        string calldata _issuerDid,
        string calldata _subjectDid,
        string calldata _credentialHash
    ) external {
        require(bytes(credentials[_credentialId].credentialId).length == 0, "Credential ID already exists");
        credentials[_credentialId] = Credential({
            credentialId: _credentialId,
            issuerDid: _issuerDid,
            subjectDid: _subjectDid,
            credentialHash: _credentialHash,
            revoked: false,
            issuedAt: block.timestamp
        });
        emit CredentialAnchored(_credentialId, _issuerDid, _subjectDid);
    }

    /// @notice Revoke a previously anchored credential
    /// @param _credentialId The credential to revoke
    function revokeCredential(string calldata _credentialId) external {
        require(bytes(credentials[_credentialId].credentialId).length > 0, "Credential not found");
        require(!credentials[_credentialId].revoked, "Credential already revoked");
        credentials[_credentialId].revoked = true;
        emit CredentialRevoked(_credentialId);
    }

    /// @notice Check if a credential is revoked
    /// @param _credentialId The credential to check
    /// @return True if revoked
    function isCredentialRevoked(string calldata _credentialId) external view returns (bool) {
        require(bytes(credentials[_credentialId].credentialId).length > 0, "Credential not found");
        return credentials[_credentialId].revoked;
    }

    /// @notice Get total number of registered DIDs
    /// @return DID count
    function getDIDCount() external view returns (uint256) {
        return didCount;
    }
}
