use ed25519_dalek::{SigningKey, VerifyingKey, Signature, Signer, Verifier};
use rand::rngs::OsRng;
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum CryptoError {
    #[error("Signature verification failed")]
    SignatureVerificationFailed,
    #[error("Invalid key bytes: {0}")]
    InvalidKeyBytes(String),
    #[error("Base64 encoding error: {0}")]
    Base64Error(String),
    #[error("Serialization error: {0}")]
    SerializationError(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Keypair {
    pub public_key: Vec<u8>,
    pub secret_key: Vec<u8>,
}

impl Keypair {
    pub fn to_base64(&self) -> (String, String) {
        use base64::Engine;
        (
            base64::engine::general_purpose::STANDARD.encode(&self.public_key),
            base64::engine::general_purpose::STANDARD.encode(&self.secret_key),
        )
    }

    pub fn from_base64(public_key_b64: &str, secret_key_b64: &str) -> Result<Self, CryptoError> {
        use base64::Engine;
        let public_key = base64::engine::general_purpose::STANDARD
            .decode(public_key_b64)
            .map_err(|e| CryptoError::Base64Error(e.to_string()))?;
        let secret_key = base64::engine::general_purpose::STANDARD
            .decode(secret_key_b64)
            .map_err(|e| CryptoError::Base64Error(e.to_string()))?;
        Ok(Self { public_key, secret_key })
    }
}

pub fn generate_keypair() -> Keypair {
    let mut csprng = OsRng;
    let signing_key = SigningKey::generate(&mut csprng);
    let verifying_key = signing_key.verifying_key();

    Keypair {
        public_key: verifying_key.to_bytes().to_vec(),
        secret_key: signing_key.to_bytes().to_vec(),
    }
}

pub fn sign(message: &[u8], private_key: &[u8]) -> Result<Vec<u8>, CryptoError> {
    let secret_bytes: [u8; 32] = private_key
        .try_into()
        .map_err(|_| CryptoError::InvalidKeyBytes("private key must be 32 bytes".into()))?;
    let signing_key = SigningKey::from_bytes(&secret_bytes);
    let signature: Signature = signing_key.sign(message);
    Ok(signature.to_bytes().to_vec())
}

pub fn verify(message: &[u8], signature: &[u8], public_key: &[u8]) -> Result<bool, CryptoError> {
    let pub_bytes: [u8; 32] = public_key
        .try_into()
        .map_err(|_| CryptoError::InvalidKeyBytes("public key must be 32 bytes".into()))?;
    let verifying_key = VerifyingKey::from_bytes(&pub_bytes)
        .map_err(|e| CryptoError::InvalidKeyBytes(e.to_string()))?;
    let sig_bytes: [u8; 64] = signature
        .try_into()
        .map_err(|_| CryptoError::InvalidKeyBytes("signature must be 64 bytes".into()))?;
    let sig = Signature::from_bytes(&sig_bytes);

    match verifying_key.verify(message, &sig) {
        Ok(()) => Ok(true),
        Err(_) => Ok(false),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_keypair() {
        let kp = generate_keypair();
        assert_eq!(kp.public_key.len(), 32);
        assert_eq!(kp.secret_key.len(), 32);
    }

    #[test]
    fn test_sign_verify() {
        let kp = generate_keypair();
        let message = b"test message";

        let signature = sign(message, &kp.secret_key).unwrap();
        assert_eq!(signature.len(), 64);

        let result = verify(message, &signature, &kp.public_key).unwrap();
        assert!(result);
    }

    #[test]
    fn test_verify_wrong_key() {
        let kp1 = generate_keypair();
        let kp2 = generate_keypair();
        let message = b"test message";

        let signature = sign(message, &kp1.secret_key).unwrap();
        let result = verify(message, &signature, &kp2.public_key).unwrap();
        assert!(!result);
    }

    #[test]
    fn test_base64_roundtrip() {
        let kp = generate_keypair();
        let (pub_b64, sec_b64) = kp.to_base64();
        let restored = Keypair::from_base64(&pub_b64, &sec_b64).unwrap();
        assert_eq!(kp.public_key, restored.public_key);
        assert_eq!(kp.secret_key, restored.secret_key);
    }

    #[test]
    fn test_verify_tampered_message() {
        let kp = generate_keypair();
        let message = b"original message";
        let signature = sign(message, &kp.secret_key).unwrap();

        let result = verify(b"tampered message", &signature, &kp.public_key).unwrap();
        assert!(!result);
    }
}
