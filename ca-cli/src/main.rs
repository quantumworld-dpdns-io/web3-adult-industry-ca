use base64::Engine as _;
use ca_core::crypto;
use ca_core::did;
use ca_core::vc::{CredentialBuilder, issue_credential, verify_credential};
use clap::{Parser, Subcommand};
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "ca-cli", version = "0.1.0", about = "Web3 Adult Industry Certification Authority CLI")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    Key {
        #[command(subcommand)]
        action: KeyCommands,
    },
    Did {
        #[command(subcommand)]
        action: DidCommands,
    },
    Vc {
        #[command(subcommand)]
        action: VcCommands,
    },
    Health {
        #[arg(long)]
        url: String,
    },
}

#[derive(Subcommand)]
enum KeyCommands {
    Generate,
}

#[derive(Subcommand)]
enum DidCommands {
    Create {
        #[arg(long)]
        method: String,
        #[arg(long)]
        public_key: String,
        #[arg(long)]
        domain: Option<String>,
    },
}

#[derive(Subcommand)]
enum VcCommands {
    Issue {
        #[arg(long)]
        issuer: String,
        #[arg(long)]
        subject: String,
        #[arg(long)]
        r#type: String,
        #[arg(long)]
        private_key: String,
    },
    Verify {
        #[arg(long)]
        credential: PathBuf,
    },
}

fn main() {
    let cli = Cli::parse();

    match cli.command {
        Commands::Key { action } => match action {
            KeyCommands::Generate => cmd_key_generate(),
        },
        Commands::Did { action } => match action {
            DidCommands::Create {
                method,
                public_key,
                domain,
            } => cmd_did_create(&method, &public_key, domain.as_deref()),
        },
        Commands::Vc { action } => match action {
            VcCommands::Issue {
                issuer,
                subject,
                r#type,
                private_key,
            } => cmd_vc_issue(&issuer, &subject, &r#type, &private_key),
            VcCommands::Verify { credential } => cmd_vc_verify(&credential),
        },
        Commands::Health { url } => {
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(cmd_health(&url));
        }
    }
}

fn cmd_key_generate() {
    let kp = crypto::generate_keypair();
    let did_key = crypto::key_to_did_key(&kp.public);

    let output = serde_json::json!({
        "private_key_b64": base64::engine::general_purpose::STANDARD.encode(&kp.private),
        "public_key_b64": base64::engine::general_purpose::STANDARD.encode(&kp.public),
        "did_key": did_key,
    });

    println!("{}", serde_json::to_string_pretty(&output).unwrap());
}

fn cmd_did_create(method: &str, public_key_b64: &str, domain: Option<&str>) {
    let pub_key_bytes = match base64::engine::general_purpose::STANDARD
        .decode(public_key_b64)
    {
        Ok(bytes) => bytes,
        Err(e) => {
            eprintln!("Error: Invalid base64 public key: {}", e);
            std::process::exit(1);
        }
    };

    let doc = match method {
        "key" => did::create_did_key(&pub_key_bytes),
        "web" => {
            let domain = domain.unwrap_or_else(|| {
                eprintln!("Error: --domain is required for did:web method");
                std::process::exit(1);
            });
            did::create_did_web(domain, "", &pub_key_bytes)
        }
        other => {
            eprintln!("Error: Unsupported DID method '{}'. Use 'key' or 'web'.", other);
            std::process::exit(1);
        }
    };

    println!("{}", serde_json::to_string_pretty(&doc).unwrap());
}

fn cmd_vc_issue(
    issuer_did: &str,
    subject_did: &str,
    cred_type: &str,
    private_key_b64: &str,
) {
    let priv_key_bytes = match base64::engine::general_purpose::STANDARD
        .decode(private_key_b64)
    {
        Ok(bytes) => bytes,
        Err(e) => {
            eprintln!("Error: Invalid base64 private key: {}", e);
            std::process::exit(1);
        }
    };

    let verification_method = format!(
        "{}#{}",
        issuer_did,
        issuer_did.trim_start_matches("did:key:")
    );

    let mut credential = match CredentialBuilder::new()
        .id(format!("urn:uuid:{}", uuid::Uuid::new_v4()))
        .type_(vec![
            "VerifiableCredential".to_string(),
            cred_type.to_string(),
        ])
        .issuer(serde_json::json!(issuer_did))
        .issuance_date(chrono::Utc::now().to_rfc3339())
        .credential_subject(serde_json::json!({
            "id": subject_did,
        }))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            eprintln!("Error building credential: {}", e);
            std::process::exit(1);
        }
    };

    if let Err(e) = issue_credential(&mut credential, &priv_key_bytes, &verification_method) {
        eprintln!("Error issuing credential: {}", e);
        std::process::exit(1);
    }

    println!("{}", serde_json::to_string_pretty(&credential).unwrap());
}

fn cmd_vc_verify(path: &PathBuf) {
    let file_content = match std::fs::read_to_string(path) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("Error reading credential file: {}", e);
            std::process::exit(1);
        }
    };

    let credential: ca_core::vc::Credential = match serde_json::from_str(&file_content) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("Error parsing credential JSON: {}", e);
            std::process::exit(1);
        }
    };

    if credential.proof.is_none() {
        eprintln!("Error: Credential has no proof");
        std::process::exit(1);
    }

    let did_str = &credential.issuer;
    let did = match did_str.as_str() {
        Some(d) => d,
        None => {
            eprintln!("Error: Issuer is not a string DID");
            std::process::exit(1);
        }
    };

    let resolved = match did::resolve_did(did) {
        Ok(d) => d,
        Err(e) => {
            eprintln!("Error resolving issuer DID: {}", e);
            std::process::exit(1);
        }
    };

    let vm = &resolved.verification_method[0];
    let multibase = &vm.public_key_multibase;
    let encoded = multibase.strip_prefix('z').unwrap_or(multibase);

    let decoded = match crypto::base58_decode(encoded) {
        Ok(d) => d,
        Err(e) => {
            eprintln!("Error decoding public key: {}", e);
            std::process::exit(1);
        }
    };

    let public_key = if decoded.len() > 2 && decoded[0] == 0xed && decoded[1] == 0x01 {
        &decoded[2..]
    } else if decoded.len() > 1 && decoded[0] == 0xed {
        &decoded[1..]
    } else {
        &decoded
    };

    match verify_credential(&credential, public_key) {
        Ok(true) => {
            println!("{}", serde_json::json!({ "verified": true }));
        }
        Ok(false) => {
            println!("{}", serde_json::json!({ "verified": false }));
            std::process::exit(1);
        }
        Err(e) => {
            eprintln!("Error verifying credential: {}", e);
            std::process::exit(1);
        }
    }
}

async fn cmd_health(url: &str) {
    let client = reqwest::Client::new();
    match client.get(url).send().await {
        Ok(resp) => {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            let output = serde_json::json!({
                "status": status.as_u16(),
                "healthy": status.is_success(),
                "body": body,
            });
            println!("{}", serde_json::to_string_pretty(&output).unwrap());
            if !status.is_success() {
                std::process::exit(1);
            }
        }
        Err(e) => {
            let output = serde_json::json!({
                "status": 0,
                "healthy": false,
                "error": e.to_string(),
            });
            println!("{}", serde_json::to_string_pretty(&output).unwrap());
            std::process::exit(1);
        }
    }
}
