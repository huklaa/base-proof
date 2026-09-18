# Security

Base Proof is an experimental MVP deployed on **Base Sepolia**.

## Current assumptions

- GitHub is treated as an external public data source.
- The current registry uses an owner-managed verifier allowlist.
- A proof means that a verifier anchored a specific evidence hash. It does **not** by itself prove code quality, authorship intent, or economic impact.
- The web client never needs a private key embedded in source code. Registration uses a connected wallet.
- Do not use production-value keys or funds with the MVP.

## Known limitations

- GitHub API pagination is limited in the current web client.
- Public GitHub data can change after a proof snapshot is created.
- Evidence bundles are not yet pinned to decentralized storage.
- There is no challenge/slashing/dispute mechanism yet.
- The verifier set is centralized in the MVP contract.
- The contract has not undergone a professional security audit.

## Reporting

Please open a GitHub issue for non-sensitive bugs.

For a vulnerability that could put keys, funds, or users at risk, avoid publishing exploit details until a fix is available.
