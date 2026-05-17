use serde::{Deserialize, Serialize};
use serde_json::Value;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum DidError {
    #[error("Unsupported DID method")]
    UnsupportedDidMethod,
    #[error("Unsupported key type")]
    UnsupportedKeyType,
    #[error("Invalid DID string: {0}")]
    InvalidDid(String),
    #[error("HTTP resolution required: {0}")]
    HttpResolutionRequired(String),
    #[error("Crypto error: {0}")]
    CryptoError(#[from] crate::crypto::CryptoError),
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DidDocument {
    #[serde(rename = "@context")]
    pub context: Value,
    pub id: String,
    #[serde(rename = "verificationMethod")]
    pub verification_method: Vec<VerificationMethod>,
    pub authentication: Vec<String>,
    #[serde(rename = "assertionMethod")]
    pub assertion_method: Vec<String>,
    pub service: Option<Vec<Service>>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct VerificationMethod {
    pub id: String,
    #[serde(rename = "type")]
    pub type_: String,
    pub controller: String,
    #[serde(rename = "publicKeyMultibase")]
    pub public_key_multibase: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Service {
    pub id: String,
    #[serde(rename = "type")]
    pub type_: String,
    #[serde(rename = "serviceEndpoint")]
    pub service_endpoint: String,
}

pub fn create_did_key(public_key: &[u8]) -> DidDocument {
    let did = crate::crypto::public_key_to_did_key(public_key);
    let key_fragment = did.trim_start_matches("did:key:");
    let vm_id = format!("{}#{}", did, key_fragment);

    DidDocument {
        context: Value::Array(vec![Value::String(
            "https://www.w3.org/ns/did/v1".to_string(),
        )]),
        id: did.clone(),
        verification_method: vec![VerificationMethod {
            id: vm_id.clone(),
            type_: "Ed25519VerificationKey2018".to_string(),
            controller: did.clone(),
            public_key_multibase: key_fragment.to_string(),
        }],
        authentication: vec![vm_id.clone()],
        assertion_method: vec![vm_id],
        service: None,
    }
}

pub fn create_did_web(domain: &str, path: &str, public_key: &[u8]) -> DidDocument {
    let did_key = crate::crypto::public_key_to_did_key(public_key);
    let key_fragment = did_key.trim_start_matches("did:key:");

    let did_web = if path.is_empty() || path == "/" {
        format!("did:web:{}", domain)
    } else {
        let path_part = path.trim_start_matches('/').replace('/', ":");
        format!("did:web:{}:{}", domain, path_part)
    };

    let vm_id = format!("{}#{}", did_web, key_fragment);

    DidDocument {
        context: Value::Array(vec![Value::String(
            "https://www.w3.org/ns/did/v1".to_string(),
        )]),
        id: did_web.clone(),
        verification_method: vec![VerificationMethod {
            id: vm_id.clone(),
            type_: "Ed25519VerificationKey2018".to_string(),
            controller: did_web.clone(),
            public_key_multibase: key_fragment.to_string(),
        }],
        authentication: vec![vm_id.clone()],
        assertion_method: vec![vm_id],
        service: None,
    }
}

pub fn resolve_did(did: &str) -> Result<DidDocument, DidError> {
    if let Some(encoded) = did.strip_prefix("did:key:") {
        let multibase = encoded.strip_prefix('z').unwrap_or(encoded);
        let decoded = crate::crypto::base58_decode(multibase)?;
        if decoded.len() > 2 && decoded[0] == 0xed && decoded[1] == 0x01 {
            let public_key = &decoded[2..];
            Ok(create_did_key(public_key))
        } else if decoded.len() > 1 && decoded[0] == 0xed {
            let public_key = &decoded[1..];
            Ok(create_did_key(public_key))
        } else {
            Err(DidError::UnsupportedKeyType)
        }
    } else if let Some(_) = did.strip_prefix("did:web:") {
        Err(DidError::HttpResolutionRequired(did.to_string()))
    } else {
        Err(DidError::UnsupportedDidMethod)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::crypto;

    #[test]
    fn test_create_did_key() {
        let kp = crypto::generate_keypair();
        let doc = create_did_key(&kp.public);
        assert!(doc.id.starts_with("did:key:z"));
        assert_eq!(doc.verification_method.len(), 1);
        assert_eq!(doc.authentication.len(), 1);
        assert_eq!(doc.assertion_method.len(), 1);
        assert!(doc.service.is_none());
        assert_eq!(
            doc.verification_method[0].type_,
            "Ed25519VerificationKey2018"
        );
        assert!(doc.verification_method[0]
            .public_key_multibase
            .starts_with('z'));
    }

    #[test]
    fn test_create_did_web_root() {
        let kp = crypto::generate_keypair();
        let doc = create_did_web("example.com", "", &kp.public);
        assert_eq!(doc.id, "did:web:example.com");
        assert!(doc.verification_method[0].id.starts_with("did:web:example.com#"));
    }

    #[test]
    fn test_create_did_web_with_path() {
        let kp = crypto::generate_keypair();
        let doc = create_did_web("example.com", "api/v1", &kp.public);
        assert_eq!(doc.id, "did:web:example.com:api:v1");
    }

    #[test]
    fn test_resolve_did_key() {
        let kp = crypto::generate_keypair();
        let doc = create_did_key(&kp.public);
        let resolved = resolve_did(&doc.id).unwrap();
        assert_eq!(resolved.id, doc.id);
    }

    #[test]
    fn test_resolve_did_web_returns_http_error() {
        let result = resolve_did("did:web:example.com");
        assert!(result.is_err());
        assert!(matches!(
            result,
            Err(DidError::HttpResolutionRequired(_))
        ));
    }

    #[test]
    fn test_resolve_unsupported_did() {
        let result = resolve_did("did:unsupported:123");
        assert!(result.is_err());
        assert!(matches!(result, Err(DidError::UnsupportedDidMethod)));
    }

    #[test]
    fn test_did_document_json() {
        let kp = crypto::generate_keypair();
        let doc = create_did_key(&kp.public);
        let json = serde_json::to_string_pretty(&doc).unwrap();
        assert!(json.contains("@context"));
        assert!(json.contains("verificationMethod"));
        assert!(json.contains("publicKeyMultibase"));
    }
}
