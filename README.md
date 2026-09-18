# Base Proof

**Prove the work. Not the claim.**

Base Proof is a proof-of-work registry for verifiable software contributions. It turns public GitHub pull-request evidence into a deterministic evidence hash and anchors that evidence on Base.

## Live MVP

Production: https://base-proof-ertekh-1454s-projects.vercel.app

Network: **Base Sepolia**

Registry contract: `0x0329a4ED3e098EE7bb5AbEda6f509dE41F9cfC10`

Canonical proof example:

- Source: `github:base/base#4650`
- Proof ID: `0x0449c4c761ed0db4f7abd36cba758e51cb725f534253f0be545b65dd1a5d88a2`
- Evidence hash: `0x5083831a139c581a4950c7adba272fadffef4283a5f6219b7e2e822cf6555caa`

## What it does

1. Accepts a public GitHub pull-request URL.
2. Reads public PR metadata, commits, reviews, and check runs.
3. Builds a deterministic evidence object.
4. Canonicalizes that object by recursively sorting object keys.
5. Computes a Keccak-256 evidence hash.
6. Computes a source ID from `github:owner/repo#PR`.
7. Registers the proof on Base Sepolia through the verifier wallet.
8. Lets anyone independently read the proof from the registry contract.

## Why

A profile can claim that work happened. Base Proof records evidence that can be independently checked.

The MVP deliberately avoids opaque quality scores. It stores verifiable facts and hashes first; reputation can be derived later by applications with their own rules.

## Current evidence schema

The GitHub collector includes:

- repository and PR number
- PR title and author
- PR state and merge state
- head/base commit SHAs
- additions, deletions, and changed files
- commit SHAs, authors, messages, and GitHub verification flags
- submitted reviews
- CI/check-run names, status, and conclusions
- source ID and deterministic evidence hash

## Contract model

`BaseProofRegistry` stores:

```solidity
struct Proof {
    address subject;
    bytes32 sourceId;
    bytes32 evidenceHash;
    uint64 createdAt;
    bool revoked;
}
```

Only authorized verifier addresses can register or revoke proofs in the current MVP.

A proof ID is deterministic:

```
keccak256(
  abi.encode(
    subject,
    sourceId,
    evidenceHash,
    block.chainid
  )
)
```

That makes duplicate registration of the same proof detectable before submitting a transaction.

## Security notes

- No private key is committed to this repository.
- The public web build uses a connected wallet for writes.
- The current contract has an owner-managed verifier allowlist.
- The MVP is deployed on Base Sepolia, not Base mainnet.
- GitHub evidence is public-source evidence. Future versions should support signed attestations, stronger provenance checks, immutable evidence bundles, and challenge/dispute flows.

## Roadmap

- persistent content-addressed evidence bundles
- richer GitHub pagination and linked-issue evidence
- proof profile pages
- challenge / dispute flow
- verifier signatures and delegated verification
- ERC-8004 integration for agent identity / reputation evidence
- ERC-8021 attribution support
- additional evidence adapters beyond GitHub

## Status

Working MVP. The protocol and evidence schema are expected to evolve.

## License

MIT
