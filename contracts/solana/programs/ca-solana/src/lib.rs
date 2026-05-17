use anchor_lang::prelude::*;

declare_id!("9a9Z1gqWqM5qzgZqqdTKKqQbFJGKsKSawMhHG7FDqLAV");

#[program]
pub mod ca_solana {
    use super::*;

    pub fn register_did(
        ctx: Context<RegisterDID>,
        did: String,
        document_uri: String,
    ) -> Result<()> {
        require!(
            did.len() > 0 && did.len() <= 200,
            CAError::InvalidDIDLength
        );
        require!(
            document_uri.len() > 0 && document_uri.len() <= 500,
            CAError::InvalidDocumentURILength
        );
        require!(
            !ctx.accounts.did_registry.active,
            CAError::DIDAlreadyRegistered
        );

        let registry = &mut ctx.accounts.did_registry;
        registry.did = did;
        registry.owner = ctx.accounts.authority.key();
        registry.document_uri = document_uri;
        registry.active = true;
        registry.created_at = Clock::get()?.unix_timestamp;
        registry.updated_at = Clock::get()?.unix_timestamp;

        Ok(())
    }

    pub fn update_did(ctx: Context<UpdateDID>, document_uri: String) -> Result<()> {
        require!(
            document_uri.len() > 0 && document_uri.len() <= 500,
            CAError::InvalidDocumentURILength
        );
        require!(
            ctx.accounts.did_registry.active,
            CAError::DIDNotActive
        );

        let registry = &mut ctx.accounts.did_registry;
        registry.document_uri = document_uri;
        registry.updated_at = Clock::get()?.unix_timestamp;

        Ok(())
    }

    pub fn deactivate_did(ctx: Context<DeactivateDID>) -> Result<()> {
        let registry = &mut ctx.accounts.did_registry;
        require!(registry.active, CAError::DIDNotActive);

        registry.active = false;
        registry.updated_at = Clock::get()?.unix_timestamp;

        Ok(())
    }

    pub fn anchor_credential(
        ctx: Context<AnchorCredential>,
        credential_id: String,
        issuer_did: String,
        subject_did: String,
        credential_hash: [u8; 32],
    ) -> Result<()> {
        require!(
            credential_id.len() > 0 && credential_id.len() <= 100,
            CAError::InvalidCredentialIDLength
        );
        require!(
            issuer_did.len() > 0 && issuer_did.len() <= 200,
            CAError::InvalidDIDLength
        );
        require!(
            subject_did.len() > 0 && subject_did.len() <= 200,
            CAError::InvalidDIDLength
        );
        require!(
            ctx.accounts.issuer_registry.active,
            CAError::IssuerDIDNotActive
        );

        let record = &mut ctx.accounts.credential_record;
        record.credential_id = credential_id;
        record.issuer_did = issuer_did;
        record.subject_did = subject_did;
        record.credential_hash = credential_hash;
        record.revoked = false;
        record.revocation_reason = String::new();
        record.issued_at = Clock::get()?.unix_timestamp;

        Ok(())
    }

    pub fn revoke_credential(
        ctx: Context<RevokeCredential>,
        credential_id: String,
        reason: String,
    ) -> Result<()> {
        require!(
            reason.len() <= 500,
            CAError::InvalidRevocationReasonLength
        );
        require!(
            !ctx.accounts.credential_record.revoked,
            CAError::CredentialAlreadyRevoked
        );

        let record = &mut ctx.accounts.credential_record;
        record.revoked = true;
        record.revocation_reason = reason;

        Ok(())
    }

    pub fn update_reputation(
        ctx: Context<UpdateReputation>,
        subject_did: String,
        verified: bool,
        reported: bool,
    ) -> Result<()> {
        require!(
            subject_did.len() > 0 && subject_did.len() <= 200,
            CAError::InvalidDIDLength
        );

        let reputation = &mut ctx.accounts.reputation_score;
        reputation.subject_did = subject_did;
        reputation.total_credentials += 1;

        if verified {
            reputation.verified_credentials += 1;
        }

        if reported {
            reputation.reported_instances += 1;
        }

        let verified_weight: i64 = 10;
        let reported_penalty: i64 = 20;
        reputation.score = (reputation.verified_credentials as i64 * verified_weight)
            - (reputation.reported_instances as i64 * reported_penalty);
        reputation.last_updated = Clock::get()?.unix_timestamp;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(did: String, document_uri: String)]
pub struct RegisterDID<'info> {
    #[account(
        init,
        payer = authority,
        space = DIDRegistry::SPACE,
        seeds = [b"did_registry", did.as_bytes()],
        bump
    )]
    pub did_registry: Account<'info, DIDRegistry>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(document_uri: String)]
pub struct UpdateDID<'info> {
    #[account(
        mut,
        seeds = [b"did_registry", did_registry.did.as_bytes()],
        bump,
        has_one = owner @ CAError::Unauthorized
    )]
    pub did_registry: Account<'info, DIDRegistry>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct DeactivateDID<'info> {
    #[account(
        mut,
        seeds = [b"did_registry", did_registry.did.as_bytes()],
        bump,
        has_one = owner @ CAError::Unauthorized
    )]
    pub did_registry: Account<'info, DIDRegistry>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(credential_id: String, issuer_did: String, subject_did: String, credential_hash: [u8; 32])]
pub struct AnchorCredential<'info> {
    #[account(
        seeds = [b"did_registry", issuer_did.as_bytes()],
        bump
    )]
    pub issuer_registry: Account<'info, DIDRegistry>,

    #[account(
        init,
        payer = authority,
        space = CredentialRecord::SPACE,
        seeds = [b"credential", credential_id.as_bytes()],
        bump
    )]
    pub credential_record: Account<'info, CredentialRecord>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(credential_id: String, reason: String)]
pub struct RevokeCredential<'info> {
    #[account(
        mut,
        seeds = [b"credential", credential_id.as_bytes()],
        bump,
        has_one = issuer_did_registry @ CAError::Unauthorized
    )]
    pub credential_record: Account<'info, CredentialRecord>,

    /// CHECK: Only used to verify ownership via the has_one constraint on credential_record.
    #[account(
        seeds = [b"did_registry", credential_record.issuer_did.as_bytes()],
        bump
    )]
    pub issuer_did_registry: Account<'info, DIDRegistry>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(subject_did: String, verified: bool, reported: bool)]
pub struct UpdateReputation<'info> {
    #[account(
        init_if_needed,
        payer = authority,
        space = ReputationScore::SPACE,
        seeds = [b"reputation", subject_did.as_bytes()],
        bump
    )]
    pub reputation_score: Account<'info, ReputationScore>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct DIDRegistry {
    pub did: String,
    pub owner: Pubkey,
    pub document_uri: String,
    pub active: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

impl DIDRegistry {
    const SPACE: usize = 8 + // discriminator
        4 + 200 + // did: String (max 200)
        32 + // owner: Pubkey
        4 + 500 + // document_uri: String (max 500)
        1 + // active: bool
        8 + // created_at: i64
        8; // updated_at: i64
}

#[account]
pub struct CredentialRecord {
    pub credential_id: String,
    pub issuer_did: String,
    pub subject_did: String,
    pub credential_hash: [u8; 32],
    pub revoked: bool,
    pub revocation_reason: String,
    pub issued_at: i64,
}

impl CredentialRecord {
    const SPACE: usize = 8 + // discriminator
        4 + 100 + // credential_id: String (max 100)
        4 + 200 + // issuer_did: String (max 200)
        4 + 200 + // subject_did: String (max 200)
        32 + // credential_hash: [u8; 32]
        1 + // revoked: bool
        4 + 500 + // revocation_reason: String (max 500)
        8; // issued_at: i64
}

#[account]
pub struct ReputationScore {
    pub subject_did: String,
    pub total_credentials: u64,
    pub verified_credentials: u64,
    pub reported_instances: u64,
    pub score: i64,
    pub last_updated: i64,
}

impl ReputationScore {
    const SPACE: usize = 8 + // discriminator
        4 + 200 + // subject_did: String (max 200)
        8 + // total_credentials: u64
        8 + // verified_credentials: u64
        8 + // reported_instances: u64
        8 + // score: i64
        8; // last_updated: i64
}

#[error_code]
pub enum CAError {
    #[msg("DID string length must be between 1 and 200 characters")]
    InvalidDIDLength,
    #[msg("Document URI length must be between 1 and 500 characters")]
    InvalidDocumentURILength,
    #[msg("DID is already registered and active")]
    DIDAlreadyRegistered,
    #[msg("DID is not active")]
    DIDNotActive,
    #[msg("Credential ID length must be between 1 and 100 characters")]
    InvalidCredentialIDLength,
    #[msg("Revocation reason must not exceed 500 characters")]
    InvalidRevocationReasonLength,
    #[msg("Credential has already been revoked")]
    CredentialAlreadyRevoked,
    #[msg("Issuer DID is not active")]
    IssuerDIDNotActive,
    #[msg("You are not authorized to perform this action")]
    Unauthorized,
}
