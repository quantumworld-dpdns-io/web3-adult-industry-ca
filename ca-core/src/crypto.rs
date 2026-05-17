use ed25519_dalek::{Signature, Signer, SigningKey, Verifier, VerifyingKey};
use rand::rngs::OsRng;
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum CryptoError {
    #[error("Invalid key length")]
    InvalidKeyLength,
    #[error("Signature verification failed")]
    SignatureVerificationFailed,
    #[error("Key generation failed")]
    KeyGenerationFailed,
    #[error("Serialization error: {0}")]
    SerializationError(String),
    #[error("Base58 decode error: {0}")]
    Base58Error(String),
}

#[derive(Clone, Debug)]
pub struct Keypair {
    pub public: Vec<u8>,
    pub private: Vec<u8>,
}

#[derive(Serialize, Deserialize)]
pub struct KeyStorage {
    pub public_key: Vec<u8>,
    pub private_key: Vec<u8>,
}

impl Keypair {
    pub fn to_storage(&self) -> KeyStorage {
        KeyStorage {
            public_key: self.public.clone(),
            private_key: self.private.clone(),
        }
    }

    pub fn from_storage(storage: &KeyStorage) -> Result<Self, CryptoError> {
        if storage.public_key.len() != 32 || storage.private_key.len() != 32 {
            return Err(CryptoError::InvalidKeyLength);
        }
        Ok(Keypair {
            public: storage.public_key.clone(),
            private: storage.private_key.clone(),
        })
    }
}

impl Serialize for Keypair {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        self.to_storage().serialize(serializer)
    }
}

impl<'de> Deserialize<'de> for Keypair {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let storage = KeyStorage::deserialize(deserializer)?;
        Keypair::from_storage(&storage).map_err(serde::de::Error::custom)
    }
}

pub fn generate_keypair() -> Keypair {
    let mut csprng = OsRng;
    let signing_key = SigningKey::generate(&mut csprng);
    let verifying_key = signing_key.verifying_key();

    Keypair {
        public: verifying_key.to_bytes().to_vec(),
        private: signing_key.to_bytes().to_vec(),
    }
}

pub fn sign(message: &[u8], private_key: &[u8]) -> Result<Vec<u8>, CryptoError> {
    let bytes: [u8; 32] = private_key
        .try_into()
        .map_err(|_| CryptoError::InvalidKeyLength)?;
    let signing_key =
        SigningKey::from_key_bytes(&bytes).map_err(|_| CryptoError::KeyGenerationFailed)?;
    let signature = signing_key.sign(message);
    Ok(signature.to_bytes().to_vec())
}

pub fn verify(
    message: &[u8],
    signature: &[u8],
    public_key: &[u8],
) -> Result<bool, CryptoError> {
    let pk_bytes: [u8; 32] = public_key
        .try_into()
        .map_err(|_| CryptoError::InvalidKeyLength)?;
    let sig_bytes: [u8; 64] = signature
        .try_into()
        .map_err(|_| CryptoError::InvalidKeyLength)?;
    let verifying_key =
        VerifyingKey::from_bytes(&pk_bytes).map_err(|_| CryptoError::KeyGenerationFailed)?;
    let sig = Signature::from_bytes(&sig_bytes);
    Ok(verifying_key.verify(message, &sig).is_ok())
}

const BASE58_ALPHABET: &[u8] = b"123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

fn base58_encode(data: &[u8]) -> String {
    let leading_zeros = data.iter().take_while(|&&b| b == 0).count();
    let mut digits = vec![0u8];
    for &byte in data {
        let mut carry = byte as usize;
        for digit in digits.iter_mut() {
            carry += 256 * *digit as usize;
            *digit = (carry % 58) as u8;
            carry /= 58;
        }
        while carry > 0 {
            digits.push((carry % 58) as u8);
            carry /= 58;
        }
    }
    while digits.last() == Some(&0) {
        digits.pop();
    }
    let encoded: String = std::iter::repeat('1')
        .take(leading_zeros)
        .chain(
            digits
                .iter()
                .rev()
                .map(|&d| BASE58_ALPHABET[d as usize] as char),
        )
        .collect();
    encoded
}

pub fn base58_decode(data: &str) -> Result<Vec<u8>, CryptoError> {
    let leading_ones = data.chars().take_while(|&c| c == '1').count();
    let mut num = Vec::new();
    for c in data.chars() {
        let idx = BASE58_ALPHABET
            .iter()
            .position(|&a| a == c as u8)
            .ok_or_else(|| {
                CryptoError::Base58Error(format!("Invalid base58 character: {}", c))
            })? as u32;
        let mut carry = idx;
        for byte in num.iter_mut() {
            carry += 58 * *byte as u32;
            *byte = (carry % 256) as u8;
            carry /= 256;
        }
        while carry > 0 {
            num.push((carry % 256) as u8);
            carry /= 256;
        }
    }
    num.reverse();
    let result: Vec<u8> = std::iter::repeat(0u8)
        .take(leading_ones)
        .chain(num.into_iter())
        .collect();
    Ok(result)
}

pub fn public_key_to_did_key(public_key: &[u8]) -> String {
    let mut multicodec_key = vec![0xed, 0x01];
    multicodec_key.extend_from_slice(public_key);
    let encoded = base58_encode(&multicodec_key);
    format!("did:key:z{}", encoded)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_keypair() {
        let kp = generate_keypair();
        assert_eq!(kp.public.len(), 32);
        assert_eq!(kp.private.len(), 32);
        assert_ne!(kp.public, kp.private);
    }

    #[test]
    fn test_sign_verify() {
        let kp = generate_keypair();
        let message = b"Hello, Web3 Adult Industry!";
        let signature = sign(message, &kp.private).unwrap();
        assert_eq!(signature.len(), 64);
        let result = verify(message, &signature, &kp.public).unwrap();
        assert!(result);
    }

    #[test]
    fn test_verify_invalid_signature() {
        let kp = generate_keypair();
        let kp2 = generate_keypair();
        let message = b"Test message";
        let signature = sign(message, &kp.private).unwrap();
        let result = verify(message, &signature, &kp2.public).unwrap();
        assert!(!result);
    }

    #[test]
    fn test_keypair_serialization_roundtrip() {
        let kp = generate_keypair();
        let json = serde_json::to_string(&kp).unwrap();
        let deserialized: Keypair = serde_json::from_str(&json).unwrap();
        assert_eq!(kp.public, deserialized.public);
        assert_eq!(kp.private, deserialized.private);
    }

    #[test]
    fn test_public_key_to_did_key_format() {
        let kp = generate_keypair();
        let did = public_key_to_did_key(&kp.public);
        assert!(did.starts_with("did:key:z"));
        assert!(did.len() > 50 && did.len() < 70);
    }

    #[test]
    fn test_base58_roundtrip() {
        let test_data: Vec<&[u8]> = vec![
            &[0x00],
            &[0x01],
            &[0x00, 0x00],
            &[0x00, 0x01],
            &[0xff],
            &[0xed, 0x01, 0xab, 0xcd, 0xef],
            &[0x01, 0x02, 0x03, 0x04],
        ];
        for data in test_data {
            let encoded = base58_encode(data);
            let decoded = base58_decode(&encoded).unwrap();
            assert_eq!(data, &decoded);
        }
    }
}
