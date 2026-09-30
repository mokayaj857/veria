# Aegent Verifier — Build pipeline for Rust → PolkaVM
#
# Prerequisites:
#   cargo install polkatool
#   rustup component add rust-src
#
# Usage:
#   make              — build + link → contract.polkavm
#   make deploy       — deploy to Paseo testnet (set ETH_RPC_URL and ETH_FROM)
#   make selectors    — print ABI selectors (requires cast from Foundry)

.PHONY: build link clean deploy selectors

# Default: build and link
all: build link

# Step 1: Compile Rust → ELF binary
build:
	cargo +nightly build --release --target-dir target

# Step 2: Link ELF → .polkavm module (deployment artifact)
link: build
	polkatool link \
		--strip \
		target/riscv64emac-unknown-none-polkavm/release/aegent_verifier \
		-o contract.polkavm
	@echo ""
	@echo "✅ Built: contract.polkavm"
	@polkatool stats contract.polkavm

# Clean build artifacts
clean:
	cargo +nightly clean
	rm -f contract.polkavm

# Print function selectors (must match Rust constants)
# Run this and update the selector constants in src/lib.rs
selectors:
	@echo "Function selectors (first 4 bytes of keccak256):"
	@echo "  verifyAndHash(bytes32,bytes32) → $$(cast sig 'verifyAndHash(bytes32,bytes32)')"
	@echo "  computeAgentId(bytes32,bytes32) → $$(cast sig 'computeAgentId(bytes32,bytes32)')"

# Deploy to Paseo testnet
# Set these first:
#   export ETH_RPC_URL="https://testnet-passet-hub-eth-rpc.polkadot.io"
#   export ETH_FROM=<your-address>
deploy: all
	cast send --account dev-account --create "$$(xxd -p -c 99999 contract.polkavm)"