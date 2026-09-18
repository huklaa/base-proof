# Challenge / Dispute Protocol

Base Proof V2 adds an explicit challenge lifecycle so a proof is not treated as permanently unquestionable.

## Lifecycle

```
Active proof
    |
    | openChallenge(proofId, reasonHash)
    v
Open challenge
   / \
  /   \
Reject Uphold
 |       |
 v       v
Proof    Proof
stays    revoked
active
```

## Challenge identity

A challenge references:

- `proofId` — the onchain proof being disputed
- `challenger` — the address opening the dispute
- `reasonHash` — a hash of the offchain challenge statement / evidence bundle
- creation and resolution timestamps
- challenge status

The deterministic challenge ID is:

```solidity
keccak256(
    abi.encode(
        proofId,
        challenger,
        reasonHash,
        block.chainid
    )
)
```

## Status values

```text
0 None
1 Open
2 Upheld
3 Rejected
```

## Resolution semantics

### Rejected

The proof remains active. The challenge is permanently recorded as rejected.

### Upheld

The challenged proof is automatically marked revoked.

The original proof record is not deleted. Historical data remains inspectable:

- who registered the proof
- what evidence hash was anchored
- when it was created
- that a dispute was later upheld
- that the proof is now revoked

## MVP governance

V2 intentionally separates **opening** from **resolving** a challenge:

- anyone can open a challenge against an active proof
- only the contract owner can resolve a challenge in the MVP

This is centralized dispute resolution and is explicitly a temporary design.

Future resolver options include:

- verifier quorum
- multisig arbitration
- bonded challenges
- external arbitration contracts
- optimistic dispute windows
- reputation-weighted reviewers

## Why reasonHash instead of storing text?

Challenge text can be arbitrarily long and expensive to store onchain.

The contract therefore stores a `bytes32 reasonHash`. A future evidence service can pin the full challenge bundle to content-addressed storage and place that content hash in `reasonHash`.

## Anti-spam scope

The MVP allows one unresolved challenge per proof at a time.

It does not yet require a bond, fee, rate limit, or challenger reputation. Those should be added before a permissionless production deployment.
