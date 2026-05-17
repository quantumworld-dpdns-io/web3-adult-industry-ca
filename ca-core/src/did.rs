use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::crypto;

#[derive(Error, Debug)]
pub enum DidError {
    #[error("Invalid DID: {0}")]
    InvalidDid(String),
    #[error("Unsupported DID method: {0}")]
    UnsupportedMethod(String),
    #[error("HTTP resolution required for did:web: {0}")]
    HttpResolutionRequired(String),
    #[error("Crypto error: {0}")]
    CryptoError(#[from] crypto::CryptoError),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DidDocument {
    #[serde(rename = "@context")]
    pub context: Vec<String>,
    pub id: String,
    #[serde(rename = "verificationMethod")]
    pub verification_method: Vec<VerificationMethod>,
    pub authentication: Vec<String>,
    #[serde(rename = "assertionMethod")]
    pub assertion_method: Vec<String>,
    #[serde(rename = "capabilityInvocation")]
    pub capability_invocation: Vec<String>,
    #[serde(rename = "capabilityDelegation")]
    pub capability_delegation: Vec<String>,
    pub service: Vec<Service>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerificationMethod {
    pub id: String,
    #[serde(rename = "type")]
    pub verification_type: String,
    pub controller: String,
    #[serde(rename = "publicKeyMultibase")]
    pub public_key_multibase: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Service {
    pub id: String,
    #[serde(rename = "type")]
    pub service_type: String,
    #[serde(rename = "serviceEndpoint")]
    pub service_endpoint: String,
}

impl DidDocument {
    pub fn to_json(&self) -> Result<String, DidError> {
        serde_json::to_string_pretty(self)
            .map_err(|e| DidError::InvalidDid(format!("Serialization error: {}", e)))
    }

    pub fn from_json(json: &str) -> Result<Self, DidError> {
        serde_json::from_str(json)
            .map_err(|e| DidError::InvalidDid(format!("Deserialization error: {}", e)))
    }
}

pub fn create_did_key(public_key: &[u8]) -> DidDocument {
    use base64::Engine;
    let pub_b64 = base64::engine::general_purpose::STANDARD.encode(public_key);
    let did = format!("did:key:z{}", pub_b64);
    let verification_method_id = format!("{}#keys-1", did);

    DidDocument {
        context: vec!["https://www.w3.org/ns/did/v1".to_string()],
        id: did.clone(),
        verification_method: vec![VerificationMethod {
            id: verification_method_id.clone(),
            verification_type: "Ed25519VerificationKey2020".to_string(),
            controller: did.clone(),
            public_key_multibase: format!("z{}", pub_b64),
        }],
        authentication: vec![verification_method_id.clone()],
        assertion_method: vec![verification_method_id.clone()],
        capability_invocation: vec![verification_method_id.clone()],
        capability_delegation: vec![verification_method_id.clone()],
        service: vec![],
    }
}

pub fn create_did_web(domain: &str, path: &str, public_key: &[u8]) -> DidDocument {
    let did = if path.is_empty() {
        format!("did:web:{}", domain)
    } else {
        let clean_path = path.trim_start_matches('/');
        format!(
            "did:web:{}:{}",
            domain,
            clean_path.replace('/', ":")
        )
    };

    use base64::Engine;
    let pub_b64 = base64::engine::general_purpose::STANDARD.encode(public_key);
    let verification_method_id = format!("{}#keys-1", did);

    DidDocument {
        context: vec!["https://www.w3.org/ns/did/v1".to_string()],
        id: did.clone(),
        verification_method: vec![VerificationMethod {
            id: verification_method_id.clone(),
            verification_type: "Ed25519VerificationKey2020".to_string(),
            controller: did.clone(),
            public_key_multibase: format!("z{}", pub_b64),
        }],
        authentication: vec![verification_method_id.clone()],
        assertion_method: vec![verification_method_id.clone()],
        capability_invocation: vec![verification_method_id.clone()],
        capability_delegation: vec![verification_method_id.clone()],
        service: vec![],
    }
}

pub fn resolve_did(did: &str) -> Result<DidDocument, DidError> {
    if !did.starts_with("did:") {
        return Err(DidError::InvalidDid(
            "DID must start with 'did:'".into(),
        ));
    }

    let parts: Vec<&str> = did.splitn(3, ':').collect();
    if parts.len() < 3 {
        return Err(DidError::InvalidDid("Invalid DID format".into()));
    }

    let method = parts[1];
    match method {
        "key" => {
            let encoded = did.trim_start_matches("did:key:z");
            use base64::Engine;
            let public_key = base64::engine::general_purpose::STANDARD
                .decode(encoded)
                .map_err(|e| {
                    DidError::InvalidDid(format!("Invalid base64 in DID: {}", e))
                })?;
            Ok(create_did_key(&public_key))
        }
        "web" => Err(DidError::HttpResolutionRequired(
            "did:web requires HTTP resolution to fetch DID document".into(),
        )),
        _ => Err(DidError::UnsupportedMethod(method.into())),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_did_key() {
        let kp = crate::crypto::generate_keypair();
        let doc = create_did_key(&kp.public_key);
        assert!(doc.id.starts_with("did:key:z"));
        assert_eq!(doc.verification_method.len(), 1);
        assert_eq!(
            doc.verification_method[0].verification_type,
            "Ed25519VerificationKey2020"
        );
    }

    #[test]
    fn test_create_did_web() {
        let kp = crate::crypto::generate_keypair();
        let doc = create_did_web("example.com", "/alice", &kp.public_key);
        assert_eq!(doc.id, "did:web:example.com:alice");
    }

    #[test]
    fn test_create_did_web_root() {
        let kp = crate::crypto::generate_keypair();
        let doc = create_did_web("example.com", "", &kp.public_key);
        assert_eq!(doc.id, "did:web:example.com");
    }

    #[test]
    fn test_did_json_roundtrip() {
        let kp = crate::crypto::generate_keypair();
        let doc = create_did_key(&kp.public_key);
        let json = doc.to_json().unwrap();
        let restored = DidDocument::from_json(&json).unwrap();
        assert_eq!(doc.id, restored.id);
        assert_eq!(
            doc.verification_method.len(),
            restored.verification_method.len()
        );
    }

    #[test]
    fn test_resolve_did_key() {
        let kp = crate::crypto::generate_keypair();
        let doc = create_did_key(&kp.public_key);
        let resolved = resolve_did(&doc.id).unwrap();
        assert_eq!(doc.id, resolved.id);
    }

    #[test]
    fn test_resolve_did_web_returns_error() {
        let result = resolve_did("did:web:example.com");
        assert!(result.is_err());
        match result {
            Err(DidError::HttpResolutionRequired(_)) => {}
            _ => panic!("Expected HttpResolutionRequired error"),
        }
    }

    #[test]
    fn test_invalid_did() {
        let result = resolve_did("invalid");
        assert!(result.is_err());
    }

    #[test]
    fn test_did_with_path_traversal() {
        let kp = crate::crypto::generate_keypair();
        let doc = create_did_web("example.com", "/a/b/c", &kp.public_key);
        assert_eq!(doc.id, "did:web:example.com:a:b:c");
    }
}
