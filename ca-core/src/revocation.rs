use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum RevocationError {
    #[error("Index out of bounds: {0}")]
    IndexOutOfBounds(u64),
    #[error("Serialization error: {0}")]
    SerializationError(String),
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct RevocationRegistry {
    pub id: String,
    pub issuer: String,
    pub bits: Vec<u8>,
    #[serde(rename = "totalCredentials")]
    pub total_credentials: u64,
}

impl RevocationRegistry {
    pub fn new(id: &str, issuer: &str) -> Self {
        RevocationRegistry {
            id: id.to_string(),
            issuer: issuer.to_string(),
            bits: Vec::new(),
            total_credentials: 0,
        }
    }

    pub fn revoke(&mut self, index: u64) -> Result<(), RevocationError> {
        let byte_index = (index / 8) as usize;
        let bit_offset = (index % 8) as u8;

        if byte_index >= self.bits.len() {
            self.bits.resize(byte_index + 1, 0);
        }

        if index >= self.total_credentials {
            self.total_credentials = index + 1;
        }

        self.bits[byte_index] |= 1 << bit_offset;

        Ok(())
    }

    pub fn is_revoked(&self, index: u64) -> Result<bool, RevocationError> {
        let byte_index = (index / 8) as usize;
        let bit_offset = (index % 8) as u8;

        if index >= self.total_credentials {
            return Err(RevocationError::IndexOutOfBounds(index));
        }

        if byte_index >= self.bits.len() {
            return Ok(false);
        }

        Ok((self.bits[byte_index] & (1 << bit_offset)) != 0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_registry() {
        let reg = RevocationRegistry::new("reg-1", "did:key:test");
        assert_eq!(reg.id, "reg-1");
        assert_eq!(reg.issuer, "did:key:test");
        assert!(reg.bits.is_empty());
        assert_eq!(reg.total_credentials, 0);
    }

    #[test]
    fn test_revoke_and_check() {
        let mut reg = RevocationRegistry::new("reg-1", "did:key:test");
        reg.revoke(0).unwrap();
        reg.revoke(7).unwrap();
        reg.revoke(8).unwrap();
        reg.revoke(255).unwrap();

        assert!(reg.is_revoked(0).unwrap());
        assert!(reg.is_revoked(7).unwrap());
        assert!(reg.is_revoked(8).unwrap());
        assert!(reg.is_revoked(255).unwrap());
        assert!(!reg.is_revoked(1).unwrap());
        assert!(!reg.is_revoked(6).unwrap());
        assert!(!reg.is_revoked(9).unwrap());
    }

    #[test]
    fn test_revoke_out_of_order() {
        let mut reg = RevocationRegistry::new("reg-1", "did:key:test");
        reg.revoke(100).unwrap();
        assert!(reg.is_revoked(100).unwrap());
        assert!(!reg.is_revoked(99).unwrap());
        assert_eq!(reg.total_credentials, 101);
    }

    #[test]
    fn test_check_out_of_bounds() {
        let reg = RevocationRegistry::new("reg-1", "did:key:test");
        let result = reg.is_revoked(5);
        assert!(matches!(result, Err(RevocationError::IndexOutOfBounds(5))));
    }

    #[test]
    fn test_serialization_roundtrip() {
        let mut reg = RevocationRegistry::new("reg-1", "did:key:test");
        reg.revoke(0).unwrap();
        reg.revoke(5).unwrap();

        let json = serde_json::to_string(&reg).unwrap();
        let deserialized: RevocationRegistry =
            serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.id, reg.id);
        assert_eq!(deserialized.total_credentials, reg.total_credentials);
        assert!(deserialized.is_revoked(0).unwrap());
        assert!(deserialized.is_revoked(5).unwrap());
        assert!(!deserialized.is_revoked(1).unwrap());
    }
}
