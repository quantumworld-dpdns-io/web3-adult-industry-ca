use base64::Engine as _;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum VcError {
    #[error("Missing proof on credential")]
    MissingProof,
    #[error("Serialization error: {0}")]
    SerializationError(String),
    #[error("Crypto error: {0}")]
    CryptoError(#[from] crate::crypto::CryptoError),
    #[error("Invalid credential: {0}")]
    InvalidCredential(String),
    #[error("Builder error: {0}")]
    BuilderError(String),
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Credential {
    #[serde(rename = "@context")]
    pub context: Vec<String>,
    pub id: String,
    #[serde(rename = "type")]
    pub type_: Vec<String>,
    pub issuer: Value,
    #[serde(rename = "issuanceDate")]
    pub issuance_date: String,
    #[serde(rename = "expirationDate")]
    pub expiration_date: Option<String>,
    #[serde(rename = "credentialSubject")]
    pub credential_subject: Value,
    pub proof: Option<Proof>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Proof {
    #[serde(rename = "type")]
    pub type_: String,
    pub created: String,
    #[serde(rename = "verificationMethod")]
    pub verification_method: String,
    #[serde(rename = "proofPurpose")]
    pub proof_purpose: String,
    #[serde(rename = "proofValue")]
    pub proof_value: String,
}

pub struct CredentialBuilder {
    context: Option<Vec<String>>,
    id: Option<String>,
    type_: Option<Vec<String>>,
    issuer: Option<Value>,
    issuance_date: Option<String>,
    expiration_date: Option<String>,
    credential_subject: Option<Value>,
}

impl CredentialBuilder {
    pub fn new() -> Self {
        CredentialBuilder {
            context: None,
            id: None,
            type_: None,
            issuer: None,
            issuance_date: None,
            expiration_date: None,
            credential_subject: None,
        }
    }

    pub fn context(mut self, context: Vec<String>) -> Self {
        self.context = Some(context);
        self
    }

    pub fn id(mut self, id: String) -> Self {
        self.id = Some(id);
        self
    }

    pub fn type_(mut self, type_: Vec<String>) -> Self {
        self.type_ = Some(type_);
        self
    }

    pub fn issuer(mut self, issuer: Value) -> Self {
        self.issuer = Some(issuer);
        self
    }

    pub fn issuance_date(mut self, date: String) -> Self {
        self.issuance_date = Some(date);
        self
    }

    pub fn expiration_date(mut self, date: String) -> Self {
        self.expiration_date = Some(date);
        self
    }

    pub fn credential_subject(mut self, subject: Value) -> Self {
        self.credential_subject = Some(subject);
        self
    }

    pub fn build(self) -> Result<Credential, VcError> {
        Ok(Credential {
            context: self.context.unwrap_or_else(|| {
                vec!["https://www.w3.org/2018/credentials/v1".to_string()]
            }),
            id: self.id.ok_or_else(|| {
                VcError::BuilderError("id is required".to_string())
            })?,
            type_: self.type_.ok_or_else(|| {
                VcError::BuilderError("type is required".to_string())
            })?,
            issuer: self.issuer.ok_or_else(|| {
                VcError::BuilderError("issuer is required".to_string())
            })?,
            issuance_date: self.issuance_date.ok_or_else(|| {
                VcError::BuilderError("issuance_date is required".to_string())
            })?,
            expiration_date: self.expiration_date,
            credential_subject: self.credential_subject.ok_or_else(|| {
                VcError::BuilderError(
                    "credential_subject is required".to_string(),
                )
            })?,
            proof: None,
        })
    }
}

impl Default for CredentialBuilder {
    fn default() -> Self {
        Self::new()
    }
}

pub fn issue_credential(
    credential: &mut Credential,
    private_key: &[u8],
    verification_method: &str,
) -> Result<(), VcError> {
    credential.proof = None;

    let credential_json = serde_json::to_string(credential)
        .map_err(|e| VcError::SerializationError(e.to_string()))?;

    let hash = Sha256::digest(credential_json.as_bytes());

    let signature = crate::crypto::sign(&hash, private_key)?;

    let proof = Proof {
        type_: "DataIntegrityProof".to_string(),
        created: chrono::Utc::now().to_rfc3339(),
        verification_method: verification_method.to_string(),
        proof_purpose: "assertionMethod".to_string(),
        proof_value: base64::engine::general_purpose::STANDARD
            .encode(&signature),
    };

    credential.proof = Some(proof);
    Ok(())
}

pub fn verify_credential(
    credential: &Credential,
    public_key: &[u8],
) -> Result<bool, VcError> {
    let proof = credential
        .proof
        .as_ref()
        .ok_or(VcError::MissingProof)?;

    let mut credential_clone = credential.clone();
    credential_clone.proof = None;

    let credential_json = serde_json::to_string(&credential_clone)
        .map_err(|e| VcError::SerializationError(e.to_string()))?;

    let hash = Sha256::digest(credential_json.as_bytes());

    let signature = base64::engine::general_purpose::STANDARD
        .decode(&proof.proof_value)
        .map_err(|e| VcError::SerializationError(e.to_string()))?;

    crate::crypto::verify(&hash, &signature, public_key)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::crypto;

    #[test]
    fn test_credential_builder() {
        let kp = crypto::generate_keypair();
        let did = crypto::public_key_to_did_key(&kp.public);

        let credential = CredentialBuilder::new()
            .id("urn:uuid:test-123".to_string())
            .type_(vec!["VerifiableCredential".to_string()])
            .issuer(Value::String(did.clone()))
            .issuance_date("2024-01-01T00:00:00Z".to_string())
            .credential_subject(serde_json::json!({
                "id": did,
                "ageOver": 21
            }))
            .build()
            .unwrap();

        assert_eq!(credential.type_[0], "VerifiableCredential");
        assert!(credential.proof.is_none());
    }

    #[test]
    fn test_issue_and_verify_credential() {
        let kp = crypto::generate_keypair();
        let did = crypto::public_key_to_did_key(&kp.public);
        let vm = format!("{}#{}", did, did.trim_start_matches("did:key:"));

        let mut credential = CredentialBuilder::new()
            .id("urn:uuid:test-456".to_string())
            .type_(vec![
                "VerifiableCredential".to_string(),
                "AgeVerificationCredential".to_string(),
            ])
            .issuer(Value::String(did.clone()))
            .issuance_date("2024-06-15T12:00:00Z".to_string())
            .credential_subject(serde_json::json!({
                "id": "did:key:zFakeSubject",
                "ageOver": 21
            }))
            .build()
            .unwrap();

        issue_credential(&mut credential, &kp.private, &vm).unwrap();
        assert!(credential.proof.is_some());

        let verified = verify_credential(&credential, &kp.public).unwrap();
        assert!(verified);
    }

    #[test]
    fn test_verify_tampered_credential() {
        let kp = crypto::generate_keypair();
        let did = crypto::public_key_to_did_key(&kp.public);
        let vm = format!("{}#{}", did, did.trim_start_matches("did:key:"));

        let mut credential = CredentialBuilder::new()
            .id("urn:uuid:test-789".to_string())
            .type_(vec!["VerifiableCredential".to_string()])
            .issuer(Value::String(did.clone()))
            .issuance_date("2024-06-15T12:00:00Z".to_string())
            .credential_subject(serde_json::json!({
                "id": did,
                "ageOver": 18
            }))
            .build()
            .unwrap();

        issue_credential(&mut credential, &kp.private, &vm).unwrap();

        credential.credential_subject = serde_json::json!({
            "id": did,
            "ageOver": 99
        });

        let verified = verify_credential(&credential, &kp.public).unwrap();
        assert!(!verified);
    }

    #[test]
    fn test_verify_missing_proof() {
        let kp = crypto::generate_keypair();
        let credential = CredentialBuilder::new()
            .id("urn:uuid:test-missing".to_string())
            .type_(vec!["VerifiableCredential".to_string()])
            .issuer(Value::String("did:key:test".to_string()))
            .issuance_date("2024-01-01T00:00:00Z".to_string())
            .credential_subject(serde_json::json!({"id": "did:key:test"}))
            .build()
            .unwrap();

        let result = verify_credential(&credential, &kp.public);
        assert!(matches!(result, Err(VcError::MissingProof)));
    }
}
