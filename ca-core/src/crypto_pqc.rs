use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::crypto::{self, CryptoError};

#[derive(Error, Debug)]
pub enum PqcError {
    #[error("Post-quantum cryptography not available (compile with --features pqc)")]
    UnsupportedError,
    #[error("PQC operation failed: {0}")]
    OperationFailed(String),
    #[error("Crypto error: {0}")]
    CryptoError(#[from] CryptoError),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PqcKeypair {
    pub public_key: Vec<u8>,
    pub secret_key: Vec<u8>,
    pub ed25519_keypair: crypto::Keypair,
}

pub fn is_pqc_available() -> bool {
    #[cfg(feature = "pqc")]
    {
        true
    }
    #[cfg(not(feature = "pqc"))]
    {
        false
    }
}

pub fn generate_pqc_keypair() -> Result<PqcKeypair, PqcError> {
    let ed25519_keypair = crypto::generate_keypair();

    #[cfg(feature = "pqc")]
    {
        let sig = liboqs::sig::Sig::new(liboqs::sig::Algorithm::MLDSA65)
            .map_err(|e| PqcError::OperationFailed(format!("ML-DSA init: {}", e)))?;
        let (public_key, secret_key) = sig
            .keygen()
            .map_err(|e| PqcError::OperationFailed(format!("ML-DSA keygen: {}", e)))?;
        Ok(PqcKeypair {
            public_key: public_key.to_vec(),
            secret_key: secret_key.to_vec(),
            ed25519_keypair,
        })
    }

    #[cfg(not(feature = "pqc"))]
    {
        Err(PqcError::UnsupportedError)
    }
}

pub fn sign_pqc(message: &[u8], secret_key: &[u8]) -> Result<Vec<u8>, PqcError> {
    #[cfg(feature = "pqc")]
    {
        let sig = liboqs::sig::Sig::new(liboqs::sig::Algorithm::MLDSA65)
            .map_err(|e| PqcError::OperationFailed(format!("ML-DSA init: {}", e)))?;
        let signature = sig
            .sign(message, secret_key)
            .map_err(|e| PqcError::OperationFailed(format!("ML-DSA sign: {}", e)))?;
        Ok(signature.to_vec())
    }

    #[cfg(not(feature = "pqc"))]
    {
        Err(PqcError::UnsupportedError)
    }
}

pub fn verify_pqc(message: &[u8], signature: &[u8], public_key: &[u8]) -> Result<bool, PqcError> {
    #[cfg(feature = "pqc")]
    {
        let sig = liboqs::sig::Sig::new(liboqs::sig::Algorithm::MLDSA65)
            .map_err(|e| PqcError::OperationFailed(format!("ML-DSA init: {}", e)))?;
        match sig.verify(message, signature, public_key) {
            Ok(()) => Ok(true),
            Err(_) => Ok(false),
        }
    }

    #[cfg(not(feature = "pqc"))]
    {
        Err(PqcError::UnsupportedError)
    }
}

pub fn hybrid_sign(
    message: &[u8],
    pqc_keypair: &PqcKeypair,
) -> Result<Vec<u8>, PqcError> {
    let ed_sig = crypto::sign(message, &pqc_keypair.ed25519_keypair.secret_key)?;

    #[cfg(feature = "pqc")]
    {
        let sig = liboqs::sig::Sig::new(liboqs::sig::Algorithm::MLDSA65)
            .map_err(|e| PqcError::OperationFailed(format!("ML-DSA init: {}", e)))?;
        let ml_dsa_sig = sig
            .sign(message, &pqc_keypair.secret_key)
            .map_err(|e| PqcError::OperationFailed(format!("ML-DSA sign: {}", e)))?;

        let mut hybrid = Vec::with_capacity(2 + ed_sig.len() + ml_dsa_sig.len());
        hybrid.extend_from_slice(&(ed_sig.len() as u16).to_le_bytes());
        hybrid.extend_from_slice(&ed_sig);
        hybrid.extend_from_slice(&ml_dsa_sig);
        Ok(hybrid)
    }

    #[cfg(not(feature = "pqc"))]
    {
        Ok(ed_sig)
    }
}

pub fn hybrid_verify(
    message: &[u8],
    hybrid_sig: &[u8],
    public_key: &[u8],
    pqc_public_key: &[u8],
) -> Result<bool, PqcError> {
    if hybrid_sig.len() >= 66 {
        let sig_len = u16::from_le_bytes([hybrid_sig[0], hybrid_sig[1]]) as usize;
        if sig_len + 2 <= hybrid_sig.len() {
            let ed_sig = &hybrid_sig[2..2 + sig_len];
            if crypto::verify(message, ed_sig, public_key).unwrap_or(false) {
                return Ok(true);
            }
        }
    }

    #[cfg(feature = "pqc")]
    {
        verify_pqc(message, hybrid_sig, pqc_public_key)
    }

    #[cfg(not(feature = "pqc"))]
    {
        let _ = pqc_public_key;
        Ok(false)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[cfg(feature = "pqc")]
    #[test]
    fn test_pqc_keypair_generation() {
        let kp = generate_pqc_keypair().unwrap();
        assert!(!kp.public_key.is_empty());
        assert!(!kp.secret_key.is_empty());
        assert_eq!(kp.ed25519_keypair.public_key.len(), 32);
    }

    #[test]
    fn test_pqc_fallback() {
        let result = generate_pqc_keypair();
        #[cfg(not(feature = "pqc"))]
        assert!(result.is_err());
    }

    #[test]
    fn test_hybrid_ed25519_fallback() {
        let kp = crypto::generate_keypair();
        let pqc_kp = PqcKeypair {
            public_key: vec![],
            secret_key: vec![],
            ed25519_keypair: kp.clone(),
        };
        let msg = b"test hybrid message";

        let hybrid = hybrid_sign(msg, &pqc_kp).unwrap();
        #[cfg(not(feature = "pqc"))]
        {
            let ed_sig = crypto::sign(msg, &kp.secret_key).unwrap();
            assert_eq!(hybrid, ed_sig);
        }
    }

    #[test]
    fn test_is_pqc_available() {
        #[cfg(feature = "pqc")]
        assert!(is_pqc_available());
        #[cfg(not(feature = "pqc"))]
        assert!(!is_pqc_available());
    }
}
