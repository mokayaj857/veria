#![no_std]
#![no_main]

use uapi::{HostFn, HostFnImpl as api, ReturnFlags};

// ABI selectors (bytes4 of keccak256 signature)
// verifyAndHash(bytes32,bytes32) → 0x98a6ae82
// computeAgentId(bytes32,bytes32) → 0x3190ad75
const VERIFY_AND_HASH: [u8; 4] = [0x98, 0xa6, 0xae, 0x82];
const COMPUTE_AGENT_ID: [u8; 4] = [0x31, 0x90, 0xad, 0x75];

#[panic_handler]
fn panic(_info: &core::panic::PanicInfo) -> ! {
    unsafe {
        core::arch::asm!("unimp");
        core::hint::unreachable_unchecked();
    }
}

#[no_mangle]
#[polkavm_derive::polkavm_export]
pub extern "C" fn deploy() {}

#[no_mangle]
#[polkavm_derive::polkavm_export]
pub extern "C" fn call() {
    // Read 4-byte selector at offset 0
    let mut selector = [0u8; 4];
    api::call_data_copy(&mut selector, 0);

    // Read 64 bytes of args at offset 4 (two bytes32 values)
    let mut args = [0u8; 64];
    api::call_data_copy(&mut args, 4);

    match selector {
        VERIFY_AND_HASH => handle_verify_and_hash(&args),
        COMPUTE_AGENT_ID => handle_compute_agent_id(&args),
        _ => {
            api::return_value(ReturnFlags::REVERT, &[]);
        }
    }
}

/// verifyAndHash(bytes32 publicKey, bytes32 messageHash) → (bool valid, bytes32 agentHash)
fn handle_verify_and_hash(data: &[u8]) {
    let mut public_key = [0u8; 32];
    let mut message_hash = [0u8; 32];
    public_key.copy_from_slice(&data[0..32]);
    message_hash.copy_from_slice(&data[32..64]);

    let pk_nonzero = public_key.iter().any(|&b| b != 0);
    let mh_nonzero = message_hash.iter().any(|&b| b != 0);
    let valid = pk_nonzero && mh_nonzero;

    let agent_hash = if valid {
        multi_round_hash(&public_key, &message_hash, 64)
    } else {
        [0u8; 32]
    };

    // ABI-encode: (bool, bytes32) = 64 bytes
    let mut result = [0u8; 64];
    if valid {
        result[31] = 1;
    }
    result[32..64].copy_from_slice(&agent_hash);

    api::return_value(ReturnFlags::empty(), &result);
}

/// computeAgentId(bytes32 publicKey, bytes32 salt) → bytes32
fn handle_compute_agent_id(data: &[u8]) {
    let mut public_key = [0u8; 32];
    let mut salt = [0u8; 32];
    public_key.copy_from_slice(&data[0..32]);
    salt.copy_from_slice(&data[32..64]);

    let agent_id = multi_round_hash(&public_key, &salt, 32);

    api::return_value(ReturnFlags::empty(), &agent_id);
}

/// Multi-round hash mixing function
fn multi_round_hash(a: &[u8; 32], b: &[u8; 32], rounds: u32) -> [u8; 32] {
    let mut state = [0u8; 32];
    for i in 0..32 {
        state[i] = a[i] ^ b[i];
    }

    for round in 0..rounds {
        let round_byte = (round & 0xFF) as u8;
        let mut temp = [0u8; 32];
        for i in 0..32 {
            let left = state[if i == 0 { 31 } else { i - 1 }];
            let right = state[if i == 31 { 0 } else { i + 1 }];
            temp[i] = state[i]
                ^ left.rotate_left(3)
                ^ right.wrapping_add(round_byte)
                ^ round_byte.wrapping_mul(0x9E);
        }

        let shift = ((round % 31) + 1) as usize;
        for i in 0..32 {
            state[i] = temp[(i + shift) % 32];
        }

        for i in 1..32 {
            state[i] ^= state[i - 1].rotate_right(2);
        }
        state[0] ^= state[31].rotate_left(5);
    }

    state
}
