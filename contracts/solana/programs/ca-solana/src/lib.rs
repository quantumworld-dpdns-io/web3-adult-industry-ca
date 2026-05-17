use anchor_lang::prelude::*;

declare_id!("9a9Z1gqWqM5qzgZqqdTKKqQbFJGKsKSawMhHG7FDqLAV");

#[program]
pub mod ca_solana {
    use super::*;

    pub fn register_did(ctx: Context<RegisterDid>, did: String, document_uri: String) -> Result<()> {
        let registry = &mut ctx.accounts.did_registry;
        require!(!registry.active, DidError::DidAlreadyExists);
        registry.did = did;
        registry.owner = ctx.accounts.owner.key();
        registry.document_uri = document_uri;
        registry.active = true;
        registry.created_at = Clock::get()?.unix_timestamp;
        registry.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn update_did(ctx: Context<UpdateDid>, document_uri: String) -> Result<()> {
        let registry = &mut ctx.accounts.did_registry;
        require!(registry.active, DidError::Unauthorized);
        require!(
            registry.owner == ctx.accounts.owner.key(),
            DidError::Unauthorized
        );
        registry.document_uri = document_uri;
        registry.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn deactivate_did(ctx: Context<DeactivateDid>) -> Result<()> {
        let registry = &mut ctx.accounts.did_registry;
        require!(registry.active, DidError::Unauthorized);
        require!(
            registry.owner == ctx.accounts.owner.key(),
            DidError::Unauthorized
        );
        registry.active = false;
        registry.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn anchor_credential(
        ctx: Context<AnchorCredential>,
        credential_id: String,
        issuer_did: String,
        subject_did: String,
        credential_hash: String,
    ) -> Result<()> {
        let record = &mut ctx.accounts.credential_record;
        record.credential_id = credential_id;
        record.issuer_did = issuer_did;
        record.subject_did = subject_did;
        record.credential_hash = credential_hash;
        record.revoked = false;
        record.issued_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn revoke_credential(ctx: Context<RevokeCredential>) -> Result<()> {
        let record = &mut ctx.accounts.credential_record;
        require!(!record.revoked, DidError::AlreadyRevoked);
        record.revoked = true;
        Ok(())
    }

    pub fn update_reputation(
        ctx: Context<UpdateReputation>,
        total_credentials: u64,
        verified_credentials: u64,
        reported_instances: u64,
    ) -> Result<()> {
        let score = &mut ctx.accounts.reputation_score;
        score.total_credentials = total_credentials;
        score.verified_credentials = verified_credentials;
        score.reported_instances = reported_instances;
        let numerator: u128 = (verified_credentials as u128)
            .checked_mul(100u128)
            .unwrap_or(0);
        let denom: u128 = (total_credentials as u128)
            .checked_add(reported_instances as u128)
            .unwrap_or(1);
        if denom == 0 {
            score.score = 0;
        } else {
            score.score = (numerator.checked_div(denom).unwrap_or(0)) as u64;
        }
        Ok(())
    }
}

#[account]
#[derive(InitSpace)]
pub struct DidRegistry {
    #[max_len(64)]
    pub did: String,
    pub owner: Pubkey,
    #[max_len(256)]
    pub document_uri: String,
    pub active: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

#[account]
#[derive(InitSpace)]
pub struct CredentialRecord {
    #[max_len(64)]
    pub credential_id: String,
    #[max_len(64)]
    pub issuer_did: String,
    #[max_len(64)]
    pub subject_did: String,
    #[max_len(128)]
    pub credential_hash: String,
    pub revoked: bool,
    pub issued_at: i64,
}

#[account]
#[derive(InitSpace)]
pub struct ReputationScore {
    #[max_len(64)]
    pub subject_did: String,
    pub total_credentials: u64,
    pub verified_credentials: u64,
    pub reported_instances: u64,
    pub score: u64,
}

#[derive(Accounts)]
#[instruction(did: String)]
pub struct RegisterDid<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + DidRegistry::INIT_SPACE,
        seeds = [b"did", did.as_bytes()],
        bump
    )]
    pub did_registry: Account<'info, DidRegistry>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(did: String)]
pub struct UpdateDid<'info> {
    #[account(
        mut,
        seeds = [b"did", did.as_bytes()],
        bump
    )]
    pub did_registry: Account<'info, DidRegistry>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(did: String)]
pub struct DeactivateDid<'info> {
    #[account(
        mut,
        seeds = [b"did", did.as_bytes()],
        bump
    )]
    pub did_registry: Account<'info, DidRegistry>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(credential_id: String)]
pub struct AnchorCredential<'info> {
    #[account(
        init,
        payer = issuer,
        space = 8 + CredentialRecord::INIT_SPACE,
        seeds = [b"credential", credential_id.as_bytes()],
        bump
    )]
    pub credential_record: Account<'info, CredentialRecord>,
    #[account(mut)]
    pub issuer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(credential_id: String)]
pub struct RevokeCredential<'info> {
    #[account(
        mut,
        seeds = [b"credential", credential_id.as_bytes()],
        bump
    )]
    pub credential_record: Account<'info, CredentialRecord>,
    pub issuer: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(subject_did: String)]
pub struct UpdateReputation<'info> {
    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + ReputationScore::INIT_SPACE,
        seeds = [b"reputation", subject_did.as_bytes()],
        bump
    )]
    pub reputation_score: Account<'info, ReputationScore>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum DidError {
    #[msg("DID already exists and is active")]
    DidAlreadyExists,
    #[msg("Credential record not found")]
    CredentialNotFound,
    #[msg("Credential has already been revoked")]
    AlreadyRevoked,
    #[msg("Unauthorized: caller does not have permission")]
    Unauthorized,
}
