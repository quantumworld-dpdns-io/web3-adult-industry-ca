// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract CertificationRegistry {
    /// @notice Emitted when a new DID is registered.
    /// @param did The decentralized identifier
    /// @param owner The address that registered the DID
    /// @param documentURI URI pointing to the DID document
    event DIDRegistered(string indexed did, address indexed owner, string documentURI);

    /// @notice Emitted when a DID document URI is updated.
    /// @param did The decentralized identifier
    /// @param newDocumentURI The updated URI
    event DIDUpdated(string indexed did, string newDocumentURI);

    /// @notice Emitted when a DID is deactivated.
    /// @param did The decentralized identifier being deactivated
    event DIDDeactivated(string indexed did);

    /// @notice Emitted when a credential is anchored to the registry.
    /// @param credentialId Unique identifier for the credential
    /// @param issuerDid The DID of the issuer
    /// @param subjectDid The DID of the subject
    /// @param credentialHash The hash of the credential document
    event CredentialAnchored(
        string indexed credentialId,
        string indexed issuerDid,
        string indexed subjectDid,
        bytes32 credentialHash
    );

    /// @notice Emitted when a credential is revoked.
    /// @param credentialId Unique identifier for the credential
    /// @param reason Reason for revocation
    event CredentialRevoked(string indexed credentialId, string reason);

    /// @notice Emitted when a DID is registered or re-activated after deactivation.
    /// @param did The decentralized identifier
    event DIDReactivated(string indexed did);

    struct DIDRecord {
        string did;
        address owner;
        string documentURI;
        bool active;
        uint256 createdAt;
        uint256 updatedAt;
    }

    struct CredentialRecord {
        string credentialId;
        string issuerDid;
        string subjectDid;
        bytes32 credentialHash;
        bool revoked;
        string revocationReason;
        uint256 issuedAt;
    }

    mapping(string => DIDRecord) private _dids;
    mapping(string => CredentialRecord) private _credentials;
    string[] private _didList;

    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }

    modifier onlyDIDOwner(string memory did) {
        require(_dids[did].owner == msg.sender, "Caller does not own this DID");
        _;
    }

    /// @notice Contract constructor sets the contract owner.
    constructor() {
        owner = msg.sender;
    }

    /// @notice Registers a new DID.
    /// @param did The decentralized identifier to register
    /// @param documentURI URI of the DID document
    function registerDID(string memory did, string memory documentURI) external {
        require(bytes(did).length > 0, "DID cannot be empty");
        require(bytes(documentURI).length > 0, "Document URI cannot be empty");
        require(!_dids[did].active, "DID already registered and active");

        DIDRecord storage record = _dids[did];
        bool isNew = bytes(record.did).length == 0;

        record.did = did;
        record.owner = msg.sender;
        record.documentURI = documentURI;
        record.active = true;
        record.createdAt = block.timestamp;
        record.updatedAt = block.timestamp;

        if (isNew) {
            _didList.push(did);
            emit DIDRegistered(did, msg.sender, documentURI);
        } else {
            emit DIDReactivated(did);
        }
    }

    /// @notice Updates the DID document URI.
    /// @param documentURI New URI of the DID document
    function updateDID(string memory documentURI) external {
        require(bytes(documentURI).length > 0, "Document URI cannot be empty");
        require(_dids[msg.sender].active, "No active DID found for caller");

        string memory did = _dids[msg.sender].did;
        _dids[did].documentURI = documentURI;
        _dids[did].updatedAt = block.timestamp;

        emit DIDUpdated(did, documentURI);
    }

    /// @notice Deactivates the caller's DID.
    function deactivateDID() external {
        string memory did = _dids[msg.sender].did;
        require(_dids[did].active, "DID is not active or does not exist");

        _dids[did].active = false;
        _dids[did].updatedAt = block.timestamp;

        emit DIDDeactivated(did);
    }

    /// @notice Anchors a credential hash on-chain.
    /// @param credentialId Unique identifier for the credential
    /// @param issuerDid The DID of the issuer
    /// @param subjectDid The DID of the subject
    /// @param credentialHash The hash of the credential
    function anchorCredential(
        string memory credentialId,
        string memory issuerDid,
        string memory subjectDid,
        bytes32 credentialHash
    ) external onlyDIDOwner(issuerDid) {
        require(bytes(credentialId).length > 0, "Credential ID cannot be empty");
        require(_dids[issuerDid].active, "Issuer DID is not active");
        require(
            bytes(_credentials[credentialId].credentialId).length == 0,
            "Credential ID already exists"
        );

        CredentialRecord storage record = _credentials[credentialId];
        record.credentialId = credentialId;
        record.issuerDid = issuerDid;
        record.subjectDid = subjectDid;
        record.credentialHash = credentialHash;
        record.revoked = false;
        record.revocationReason = "";
        record.issuedAt = block.timestamp;

        emit CredentialAnchored(credentialId, issuerDid, subjectDid, credentialHash);
    }

    /// @notice Revokes an existing credential.
    /// @param credentialId The credential to revoke
    /// @param reason Reason for revocation
    function revokeCredential(string memory credentialId, string memory reason) external {
        CredentialRecord storage record = _credentials[credentialId];
        require(
            bytes(record.credentialId).length > 0,
            "Credential does not exist"
        );
        require(
            _dids[record.issuerDid].owner == msg.sender,
            "Only the issuer can revoke"
        );
        require(!record.revoked, "Credential already revoked");

        record.revoked = true;
        record.revocationReason = reason;

        emit CredentialRevoked(credentialId, reason);
    }

    /// @notice Checks if a credential has been revoked.
    /// @param credentialId The credential to check
    /// @return true if revoked, false otherwise
    function isCredentialRevoked(string memory credentialId) external view returns (bool) {
        return _credentials[credentialId].revoked;
    }

    /// @notice Returns the total number of registered DIDs.
    /// @return The count of registered DIDs
    function getDIDCount() external view returns (uint256) {
        return _didList.length;
    }

    /// @notice Transfers contract ownership.
    /// @param newOwner Address of the new owner
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }
}
