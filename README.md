# Base Proof

> **Prove the work. Not the claim.**

Base Proof turns public GitHub contribution evidence into a deterministic evidence hash and anchors that snapshot on Base.

[Live MVP](https://base-proof-ertekh-1454s-projects.vercel.app) · [Registry on BaseScan](https://sepolia.basescan.org/address/0x0329a4ED3e098EE7bb5AbEda6f509dE41F9cfC10) · [Architecture](docs/ARCHITECTURE.md) · [Evidence schema](docs/EVIDENCE_SCHEMA.md)

## Live proof

Network: **Base Sepolia**

Registry:

`0x0329a4ED3e098EE7bb5AbEda6f509dE41F9cfC10`

Canonical example:

| Field | Value |
|---|---|
| Source | `github:base/base#4650` |
| Subject | `0xA6193caA92B0c42DaB3d823ccEd7b2426Ba7e627` |
| Proof ID | `0x0449c4c761ed0db4f7abd36cba758e51cb725f534253f0be545b65dd1a5d88a2` |
| Evidence hash | `0x5083831a139c581a4950c7adba272fadffef4283a5f6219b7e2e822cf6555caa` |

[View canonical registration transaction](https://sepolia.basescan.org/tx/0xcb6b1d42c3a024c51941db7fa86498c0dd2983882008ced8c47c97060ac499b1)

## Demo flow

```
GitHub PR URL
     ↓
public contribution evidence
     ↓
canonical JSON snapshot
     ↓
Keccak-256 evidence hash
     ↓
verifier registration
     ↓
BaseProofRegistry
     ↓
public proof verification
```

The current web MVP can:

1. Analyze a public GitHub pull request.
2. Read PR metadata, commits, submitted reviews, and CI/check runs.
3. Produce a deterministic canonical evidence snapshot.
4. Compute `sourceId` and `evidenceHash`.
5. Connect the authorized verifier wallet.
6. Detect an existing proof before sending a duplicate transaction.
7. Register a new proof on Base Sepolia.
8. Read any known proof directly from the registry.

## Why this exists

Developer profiles and reputation systems usually begin with a claim:

> “I worked on this.”

Base Proof starts one layer lower:

> “Here is the exact evidence snapshot that was anchored.”

The MVP intentionally does **not** assign an opaque contribution score. It records evidence first. Applications can later build reputation models on top of independently inspectable proof data.

## Evidence model

The GitHub adapter currently captures:

- repository and pull-request number
- PR URL, title, author, state, and merge state
- head and base commit SHAs
- additions, deletions, and changed-file count
- commit SHA, author, message, and GitHub verification flag
- submitted reviews
- CI/check-run names, status, and conclusions

The evidence object is recursively canonicalized before hashing.

See [GitHub Evidence Schema v1](docs/EVIDENCE_SCHEMA.md).

## Deterministic identities

GitHub source identity:

```text
source = "github:<owner>/<repo>#<pull_number>"
sourceId = keccak256(utf8(source))
```

Proof identity:

```solidity
proofId = keccak256(
    abi.encode(
        subject,
        sourceId,
        evidenceHash,
        block.chainid
    )
);
```

The same logical proof therefore has a deterministic ID on a given chain.

## Registry

The MVP contract stores:

```solidity
struct Proof {
    address subject;
    bytes32 sourceId;
    bytes32 evidenceHash;
    uint64 createdAt;
    bool revoked;
}
```

Current write access is restricted to an owner-managed verifier allowlist.

Contract source: [contracts/BaseProofRegistry.sol](contracts/BaseProofRegistry.sol)

## Trust boundary

Base Proof is currently a **verifier registry**, not a trustless oracle.

Independently verifiable today:

- onchain proof record
- subject address
- source ID
- evidence hash
- creation time
- revoked state
- public source data used to reconstruct a GitHub evidence snapshot

Still dependent on the verifier/client implementation:

- correct evidence collection
- complete GitHub pagination
- canonicalization correctness
- semantic interpretation of external source data

The MVP is on **Base Sepolia** and has not undergone a professional smart-contract audit.

See [SECURITY.md](SECURITY.md).

## Repository layout

```text
.
├── contracts/
│   └── BaseProofRegistry.sol
├── docs/
│   ├── ARCHITECTURE.md
│   └── EVIDENCE_SCHEMA.md
├── index.html
├── SECURITY.md
└── README.md
```

## Run the web MVP locally

The current UI is a static client.

```bash
python -m http.server 8080
```

Then open:

```text
http://127.0.0.1:8080
```

A wallet-enabled browser is required only for proof registration. Public proof verification is read-only.


## Live V2 proof

The canonical GitHub contribution snapshot has also been registered in V2.

- Proof ID: `0x0449c4c761ed0db4f7abd36cba758e51cb725f534253f0be545b65dd1a5d88a2`
- Registration tx: `0x9c1524ae010da5fcdf00049ae9759f8be5432618a497241c22775339ca66ea01`
- Explorer: https://sepolia.basescan.org/tx/0x9c1524ae010da5fcdf00049ae9759f8be5432618a497241c22775339ca66ea01

## Challenge / dispute protocol (V2)

V2 is implemented in [contracts/BaseProofRegistryV2.sol](contracts/BaseProofRegistryV2.sol).

It adds:

- permissionless `openChallenge(proofId, reasonHash)`
- one active unresolved challenge per proof
- deterministic challenge IDs
- explicit `Open / Upheld / Rejected` states
- owner resolution for the MVP
- automatic proof revocation when a challenge is upheld
- permanent challenge and resolution events

The full lifecycle and trust assumptions are documented in [docs/DISPUTES.md](docs/DISPUTES.md).

**Deployment status:** V2 is deployed on Base Sepolia.

- V2 contract: `0x1a6F58F1c98f2FCA265D3B3A0Fb3FD74273765De`
- Deployment tx: `0xa72c71848f700516cfbddeab842fd24decab13d1562fd50bcce8e4e7f2ecab5a`
- Live dispute UI: https://base-proof-ertekh-1454s-projects.vercel.app/v2.html

The original V1 proof remains available for backwards-compatible demo verification.

## Roadmap

- immutable/content-addressed evidence bundles
- complete pagination and linked-issue evidence
- proof profile pages
- challenge and dispute flows
- multiple independent verifiers
- verifier signatures / delegated verification
- ERC-8004 agent identity and reputation evidence
- ERC-8021 builder attribution
- evidence adapters beyond GitHub
- mainnet deployment after protocol hardening and audit

## Status

**Working MVP / experimental protocol.**

The evidence schema and trust model are expected to evolve.

## License

MIT
