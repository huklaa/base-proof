# Architecture

## Overview

Base Proof separates **evidence collection** from **onchain proof registration**.

```
GitHub PR
   |
   v
Public evidence collector
   |
   v
Canonical JSON
   |
   +--> keccak256 --> evidenceHash
   |
   +--> source string --> sourceId
   |
   v
Verifier wallet
   |
   v
BaseProofRegistry (Base Sepolia)
   |
   v
Public read / verification
```

## Canonicalization

The evidence object is recursively encoded with object keys sorted lexicographically. Arrays preserve their source order.

This is required because normal JSON object-key order must not be the integrity primitive. Two implementations that build the same logical evidence object should hash the same canonical representation.

## Source identity

For the GitHub adapter:

```
source = "github:<owner>/<repo>#<pull_number>"
sourceId = keccak256(utf8(source))
```

The source ID identifies the work item. The evidence hash identifies one exact evidence snapshot of that work item.

A PR can therefore produce a different evidence hash later if its public state changes, such as new reviews or CI results.

## Proof identity

```
proofId = keccak256(
  abi.encode(
    subject,
    sourceId,
    evidenceHash,
    chainId
  )
)
```

Including `chainId` avoids treating registrations on different EVM networks as the same proof.

## Trust model

The current MVP is a **verifier registry**, not a trustless oracle.

What is independently verifiable today:

- the onchain proof record
- proof creation time
- subject address
- source ID
- evidence hash
- revoked state
- the public GitHub data used to reconstruct evidence

What still depends on the verifier / client implementation:

- correct evidence collection
- canonicalization implementation
- interpretation of third-party source data
- future semantic claims about impact or quality

The design intentionally avoids assigning quality scores in the MVP.

## Next protocol step

The next major protocol change should move from a single verifier allowlist toward signed verifier attestations and multiple evidence adapters, while preserving deterministic evidence hashes.
