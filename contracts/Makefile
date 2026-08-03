# Goal Vault — build / test / optimize
# Requires: Rust 1.89 (+ wasm32-unknown-unknown) and the Stellar CLI.

WASM = target/wasm32-unknown-unknown/release/goal_vault.wasm

default: build

build:
	cargo +1.89.0 build --release --target wasm32-unknown-unknown
	@ls -lh $(WASM)

# Pure-Rust unit tests (no network, no toolchain beyond cargo).
test:
	cargo +1.89.0 test

optimize: build
	stellar contract optimize --wasm $(WASM)

fmt:
	cargo +1.89.0 fmt --all

lint:
	cargo +1.89.0 clippy --all-targets -- -D warnings

clean:
	cargo clean

.PHONY: default build test optimize fmt lint clean
