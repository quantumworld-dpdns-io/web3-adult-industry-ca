use thiserror::Error;

#[derive(Error, Debug)]
pub enum PqcError {
    #[error("PQC operation not supported: {0}")]
    UnsupportedError(String),
    #[error("PQC not available: {0}")]
    NotAvailable(String),
}

pub struct PqcKeypair {
    pub public: Vec<u8>,
    pub private: Vec<u8>,
}

pub fn generate_pqc_keypair() -> Result<PqcKeypair, PqcError> {
    Err(PqcError::NotAvailable(
        "PQC not yet compiled - enable liboqs feature".to_string(),
    ))
}

pub fn sign_pqc(message: &[u8], private_key: &[u8]) -> Result<Vec<u8>, PqcError> {
    let _ = (message, private_key);
    Err(PqcError::UnsupportedError(
        "PQC signing not yet implemented".to_string(),
    ))
}

pub fn verify_pqc(
    message: &[u8],
    signature: &[u8],
    public_key: &[u8],
) -> Result<bool, PqcError> {
    let _ = (message, signature, public_key);
    Err(PqcError::UnsupportedError(
        "PQC verification not yet implemented".to_string(),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pqc_not_available() {
        let result = generate_pqc_keypair();
        assert!(result.is_err());
        assert!(matches!(result, Err(PqcError::NotAvailable(_))));
    }

    #[test]
    fn test_pqc_sign_unsupported() {
        let result = sign_pqc(b"test", &[0u8; 32]);
        assert!(result.is_err());
        assert!(matches!(result, Err(PqcError::UnsupportedError(_))));
    }

    #[test]
    fn test_pqc_verify_unsupported() {
        let result = verify_pqc(b"test", &[0u8; 64], &[0u8; 32]);
        assert!(result.is_err());
        assert!(matches!(result, Err(PqcError::UnsupportedError(_))));
    }
}
