#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Certificate {
    pub id: String,
    pub document_hash: String,
    pub issuer: Address,
    pub issued_at: u64,
}

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Admin,
    Issuer(Address),
    Certificate(String),
}

#[contract]
pub struct VeriIdContract;

#[contractimpl]
impl VeriIdContract {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Issuer(admin.clone()), &true);
    }

    pub fn authorize_issuer(env: Env, admin: Address, issuer: Address, authorized: bool) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).expect("not initialized");
        if admin != stored_admin { panic!("admin only"); }
        env.storage().instance().set(&DataKey::Issuer(issuer), &authorized);
    }

    pub fn register_certificate(env: Env, issuer: Address, id: String, document_hash: String) -> Certificate {
        issuer.require_auth();
        let authorized: bool = env.storage().instance().get(&DataKey::Issuer(issuer.clone())).unwrap_or(false);
        if !authorized { panic!("issuer not authorized"); }
        if id.len() == 0 || id.len() > 80 { panic!("invalid id"); }
        if document_hash.len() != 64 { panic!("hash must be 64 hexadecimal characters"); }
        if env.storage().persistent().has(&DataKey::Certificate(id.clone())) { panic!("certificate already exists"); }
        let certificate = Certificate { id: id.clone(), document_hash, issuer, issued_at: env.ledger().timestamp() };
        env.storage().persistent().set(&DataKey::Certificate(id), &certificate);
        certificate
    }

    pub fn get_certificate(env: Env, id: String) -> Option<Certificate> {
        env.storage().persistent().get(&DataKey::Certificate(id))
    }

    pub fn verify_certificate(env: Env, id: String, document_hash: String) -> bool {
        let certificate: Option<Certificate> = env.storage().persistent().get(&DataKey::Certificate(id));
        match certificate { Some(c) => c.document_hash == document_hash, None => false }
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    #[test]
    fn register_and_verify_certificate() {
        let env = Env::default();
        let contract_id = env.register(VeriIdContract, ());
        let client = VeriIdContractClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        env.mock_all_auths();
        client.initialize(&admin);
        let id = String::from_str(&env, "CERT-001");
        let hash = String::from_str(&env, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
        client.register_certificate(&admin, &id, &hash);
        assert!(client.verify_certificate(&id, &hash));
        let other = String::from_str(&env, "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
        assert!(!client.verify_certificate(&id, &other));
    }
    
    #[test]
    fn duplicate_certificate_is_rejected() {
        let env = Env::default();
        let contract_id = env.register(VeriIdContract, ());
        let client = VeriIdContractClient::new(&env, &contract_id);
        let admin = Address::generate(&env);

        env.mock_all_auths();
        client.initialize(&admin);

        let id = String::from_str(&env, "CERT-001");
        let hash = String::from_str(
            &env,
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        );

        client.register_certificate(&admin, &id, &hash);

        let result = client.try_register_certificate(&admin, &id, &hash);

        assert!(result.is_err());
    }

}
