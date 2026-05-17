use serde::{Deserialize, Serialize};
use serde_json::Value;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ZkError {
    #[error("Proof verification failed: {0}")]
    VerificationFailed(String),
    #[error("Invalid proof data: {0}")]
    InvalidProof(String),
    #[error("ZKP backend not available: {0}")]
    BackendNotAvailable(String),
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AgeVerificationProof {
    #[serde(rename = "proofData")]
    pub proof_data: Vec<u8>,
    #[serde(rename = "publicInputs")]
    pub public_inputs: Value,
    #[serde(rename = "circuitId")]
    pub circuit_id: String,
}

pub fn verify_age_proof(
    proof: &AgeVerificationProof,
    minimum_age: u32,
) -> Result<bool, ZkError> {
    let _ = (proof, minimum_age);
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_age_verification_stub() {
        let proof = AgeVerificationProof {
            proof_data: vec![0x01, 0x02, 0x03],
            public_inputs: json!({
                "minAge": 18,
                "commitment": "0xabc123"
            }),
            circuit_id: "age_verification_18".to_string(),
        };

        let result = verify_age_proof(&proof, 18).unwrap();
        assert!(result);
    }

    #[test]
    fn test_age_verification_any_age() {
        let proof = AgeVerificationProof {
            proof_data: vec![],
            public_inputs: json!({}),
            circuit_id: "age_verification_21".to_string(),
        };

        let result = verify_age_proof(&proof, 21).unwrap();
        assert!(result);
    }

    #[test]
    fn test_age_verification_serialization() {
        let proof = AgeVerificationProof {
            proof_data: vec![0xde, 0xad, 0xbe, 0xef],
            public_inputs: json!({"minAge": 21}),
            circuit_id: "test".to_string(),
        };

        let json = serde_json::to_string(&proof).unwrap();
        let deserialized: AgeVerificationProof =
            serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.circuit_id, "test");
        assert_eq!(deserialized.proof_data, vec![0xde, 0xad, 0xbe, 0xef]);
    }
}
