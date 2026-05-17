use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum RevocationError {
    #[error("Index out of range: {0}")]
    IndexOutOfRange(u64),
    #[error("Serialization error: {0}")]
    SerializationError(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RevocationEntry {
    pub credential_id: String,
    pub reason: String,
    pub revoked_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BitmapRevocation {
    pub id: String,
    pub issuer: String,
    pub bits: Vec<u8>,
    pub total_credentials: u64,
}

impl BitmapRevocation {
    pub fn new(id: &str, issuer: &str) -> Self {
        Self {
            id: id.to_string(),
            issuer: issuer.to_string(),
            bits: vec![0; 32],
            total_credentials: 0,
        }
    }

    pub fn revoke(&mut self, index: u64) -> Result<(), RevocationError> {
        let byte_index = (index / 8) as usize;
        let bit_offset = (index % 8) as u8;

        while self.bits.len() <= byte_index {
            self.bits.push(0);
        }

        self.bits[byte_index] |= 1 << bit_offset;

        if index >= self.total_credentials {
            self.total_credentials = index + 1;
        }

        Ok(())
    }

    pub fn is_revoked(&self, index: u64) -> Result<bool, RevocationError> {
        let byte_index = (index / 8) as usize;
        let bit_offset = (index % 8) as u8;

        if byte_index >= self.bits.len() {
            return Err(RevocationError::IndexOutOfRange(index));
        }

        Ok((self.bits[byte_index] >> bit_offset) & 1 == 1)
    }

    pub fn revoke_count(&self) -> u64 {
        self.bits.iter().map(|&b| b.count_ones() as u64).sum()
    }

    pub fn to_json(&self) -> Result<String, RevocationError> {
        serde_json::to_string_pretty(self)
            .map_err(|e| RevocationError::SerializationError(e.to_string()))
    }

    pub fn from_json(json: &str) -> Result<Self, RevocationError> {
        serde_json::from_str(json)
            .map_err(|e| RevocationError::SerializationError(e.to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_revoke_and_check() {
        let mut registry = BitmapRevocation::new("reg-1", "did:key:zissuer");

        registry.revoke(5).unwrap();
        registry.revoke(100).unwrap();
        registry.revoke(255).unwrap();

        assert!(registry.is_revoked(5).unwrap());
        assert!(registry.is_revoked(100).unwrap());
        assert!(registry.is_revoked(255).unwrap());
        assert!(!registry.is_revoked(0).unwrap());
        assert!(!registry.is_revoked(50).unwrap());

        assert_eq!(registry.revoke_count(), 3);
    }

    #[test]
    fn test_bitmap_expansion() {
        let mut registry = BitmapRevocation::new("reg-2", "did:key:zissuer");
        assert_eq!(registry.bits.len(), 32);

        registry.revoke(300).unwrap();
        assert!(registry.bits.len() > 38);
        assert!(registry.is_revoked(300).unwrap());
    }

    #[test]
    fn test_out_of_range() {
        let registry = BitmapRevocation::new("reg-1", "did:key:zissuer");
        assert!(registry.is_revoked(300).is_err());
    }

    #[test]
    fn test_json_roundtrip() {
        let mut registry = BitmapRevocation::new("reg-1", "did:key:zissuer");
        registry.revoke(1).unwrap();
        registry.revoke(10).unwrap();

        let json = registry.to_json().unwrap();
        let restored = BitmapRevocation::from_json(&json).unwrap();

        assert_eq!(registry.id, restored.id);
        assert_eq!(registry.issuer, restored.issuer);
        assert!(restored.is_revoked(1).unwrap());
        assert!(restored.is_revoked(10).unwrap());
        assert!(!restored.is_revoked(2).unwrap());
    }

    #[test]
    fn test_total_credentials_tracking() {
        let mut registry = BitmapRevocation::new("reg-3", "did:key:zissuer");
        assert_eq!(registry.total_credentials, 0);

        registry.revoke(5).unwrap();
        assert_eq!(registry.total_credentials, 6);

        registry.revoke(100).unwrap();
        assert_eq!(registry.total_credentials, 101);
    }
}
