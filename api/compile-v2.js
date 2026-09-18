import solc from "solc";

const SOURCE = "// SPDX-License-Identifier: MIT\npragma solidity ^0.8.24;\n\n/// @title BaseProofRegistryV2\n/// @notice Evidence registry with an explicit challenge / dispute lifecycle.\n/// @dev MVP governance remains owner-resolved. Future versions can replace the\n///      resolver with multisig, quorum, arbitration, or cryptoeconomic rules.\ncontract BaseProofRegistryV2 {\n    enum ChallengeStatus {\n        None,\n        Open,\n        Upheld,\n        Rejected\n    }\n\n    struct Proof {\n        address subject;\n        bytes32 sourceId;\n        bytes32 evidenceHash;\n        uint64 createdAt;\n        bool revoked;\n    }\n\n    struct Challenge {\n        bytes32 proofId;\n        address challenger;\n        bytes32 reasonHash;\n        uint64 createdAt;\n        uint64 resolvedAt;\n        ChallengeStatus status;\n    }\n\n    address public owner;\n\n    mapping(address => bool) public verifiers;\n    mapping(bytes32 => Proof) public proofs;\n    mapping(bytes32 => Challenge) public challenges;\n\n    /// @dev At most one unresolved challenge per proof in the MVP.\n    mapping(bytes32 => bytes32) public activeChallengeByProof;\n\n    event OwnershipTransferred(\n        address indexed previousOwner,\n        address indexed newOwner\n    );\n\n    event VerifierUpdated(\n        address indexed verifier,\n        bool allowed\n    );\n\n    event ProofRegistered(\n        bytes32 indexed proofId,\n        address indexed subject,\n        bytes32 indexed sourceId,\n        bytes32 evidenceHash\n    );\n\n    event ProofRevoked(\n        bytes32 indexed proofId\n    );\n\n    event ChallengeOpened(\n        bytes32 indexed challengeId,\n        bytes32 indexed proofId,\n        address indexed challenger,\n        bytes32 reasonHash\n    );\n\n    event ChallengeResolved(\n        bytes32 indexed challengeId,\n        bytes32 indexed proofId,\n        ChallengeStatus status,\n        bool proofRevoked\n    );\n\n    error NotOwner();\n    error NotVerifier();\n    error ZeroAddress();\n    error ProofExists();\n    error ProofNotFound();\n    error ProofAlreadyRevoked();\n    error ActiveChallengeExists();\n    error ChallengeNotFound();\n    error ChallengeNotOpen();\n\n    modifier onlyOwner() {\n        if (msg.sender != owner) revert NotOwner();\n        _;\n    }\n\n    modifier onlyVerifier() {\n        if (!verifiers[msg.sender]) revert NotVerifier();\n        _;\n    }\n\n    constructor() {\n        owner = msg.sender;\n        verifiers[msg.sender] = true;\n\n        emit OwnershipTransferred(address(0), msg.sender);\n        emit VerifierUpdated(msg.sender, true);\n    }\n\n    function transferOwnership(address newOwner) external onlyOwner {\n        if (newOwner == address(0)) revert ZeroAddress();\n\n        address previousOwner = owner;\n        owner = newOwner;\n\n        emit OwnershipTransferred(previousOwner, newOwner);\n    }\n\n    function setVerifier(\n        address verifier,\n        bool allowed\n    ) external onlyOwner {\n        if (verifier == address(0)) revert ZeroAddress();\n\n        verifiers[verifier] = allowed;\n        emit VerifierUpdated(verifier, allowed);\n    }\n\n    function computeProofId(\n        address subject,\n        bytes32 sourceId,\n        bytes32 evidenceHash\n    ) public view returns (bytes32) {\n        return keccak256(\n            abi.encode(\n                subject,\n                sourceId,\n                evidenceHash,\n                block.chainid\n            )\n        );\n    }\n\n    function registerProof(\n        address subject,\n        bytes32 sourceId,\n        bytes32 evidenceHash\n    ) external onlyVerifier returns (bytes32 proofId) {\n        if (subject == address(0)) revert ZeroAddress();\n\n        proofId = computeProofId(\n            subject,\n            sourceId,\n            evidenceHash\n        );\n\n        if (proofs[proofId].createdAt != 0) {\n            revert ProofExists();\n        }\n\n        proofs[proofId] = Proof({\n            subject: subject,\n            sourceId: sourceId,\n            evidenceHash: evidenceHash,\n            createdAt: uint64(block.timestamp),\n            revoked: false\n        });\n\n        emit ProofRegistered(\n            proofId,\n            subject,\n            sourceId,\n            evidenceHash\n        );\n    }\n\n    function revokeProof(\n        bytes32 proofId\n    ) external onlyVerifier {\n        Proof storage proof = proofs[proofId];\n\n        if (proof.createdAt == 0) revert ProofNotFound();\n        if (proof.revoked) revert ProofAlreadyRevoked();\n\n        proof.revoked = true;\n\n        emit ProofRevoked(proofId);\n    }\n\n    /// @notice Open a challenge against an existing, active proof.\n    /// @param proofId Existing proof identifier.\n    /// @param reasonHash Hash of an offchain challenge statement/evidence bundle.\n    /// @return challengeId Deterministic challenge identifier.\n    function openChallenge(\n        bytes32 proofId,\n        bytes32 reasonHash\n    ) external returns (bytes32 challengeId) {\n        Proof storage proof = proofs[proofId];\n\n        if (proof.createdAt == 0) revert ProofNotFound();\n        if (proof.revoked) revert ProofAlreadyRevoked();\n\n        bytes32 active = activeChallengeByProof[proofId];\n\n        if (\n            active != bytes32(0) &&\n            challenges[active].status == ChallengeStatus.Open\n        ) {\n            revert ActiveChallengeExists();\n        }\n\n        challengeId = keccak256(\n            abi.encode(\n                proofId,\n                msg.sender,\n                reasonHash,\n                block.chainid\n            )\n        );\n\n        Challenge storage existing = challenges[challengeId];\n\n        if (existing.createdAt != 0) {\n            if (existing.status == ChallengeStatus.Open) {\n                revert ActiveChallengeExists();\n            }\n\n            // Same exact challenge identity cannot be reused.\n            revert ChallengeNotOpen();\n        }\n\n        challenges[challengeId] = Challenge({\n            proofId: proofId,\n            challenger: msg.sender,\n            reasonHash: reasonHash,\n            createdAt: uint64(block.timestamp),\n            resolvedAt: 0,\n            status: ChallengeStatus.Open\n        });\n\n        activeChallengeByProof[proofId] = challengeId;\n\n        emit ChallengeOpened(\n            challengeId,\n            proofId,\n            msg.sender,\n            reasonHash\n        );\n    }\n\n    /// @notice Resolve an open challenge.\n    /// @dev MVP resolution is owner-controlled. If upheld, the proof is revoked.\n    function resolveChallenge(\n        bytes32 challengeId,\n        bool uphold\n    ) external onlyOwner {\n        Challenge storage challenge = challenges[challengeId];\n\n        if (challenge.createdAt == 0) {\n            revert ChallengeNotFound();\n        }\n\n        if (challenge.status != ChallengeStatus.Open) {\n            revert ChallengeNotOpen();\n        }\n\n        bytes32 proofId = challenge.proofId;\n        Proof storage proof = proofs[proofId];\n\n        challenge.resolvedAt = uint64(block.timestamp);\n\n        bool proofRevoked = false;\n\n        if (uphold) {\n            challenge.status = ChallengeStatus.Upheld;\n\n            if (!proof.revoked) {\n                proof.revoked = true;\n                proofRevoked = true;\n                emit ProofRevoked(proofId);\n            }\n        } else {\n            challenge.status = ChallengeStatus.Rejected;\n        }\n\n        if (activeChallengeByProof[proofId] == challengeId) {\n            activeChallengeByProof[proofId] = bytes32(0);\n        }\n\n        emit ChallengeResolved(\n            challengeId,\n            proofId,\n            challenge.status,\n            proofRevoked\n        );\n    }\n}\n";

export default function handler(req, res) {
  try {
    const input = {
      language: "Solidity",
      sources: {
        "BaseProofRegistryV2.sol": {
          content: SOURCE
        }
      },
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
        outputSelection: {
          "*": {
            "*": [
              "abi",
              "evm.bytecode.object"
            ]
          }
        }
      }
    };

    const output = JSON.parse(
      solc.compile(JSON.stringify(input))
    );

    const errors = output.errors || [];
    const fatal = errors.filter(
      error => error.severity === "error"
    );

    if (fatal.length) {
      return res.status(500).json({
        ok: false,
        errors: fatal.map(
          error => error.formattedMessage
        )
      });
    }

    const artifact =
      output.contracts[
        "BaseProofRegistryV2.sol"
      ][
        "BaseProofRegistryV2"
      ];

    res.setHeader(
      "Cache-Control",
      "public, max-age=0, s-maxage=86400"
    );

    return res.status(200).json({
      ok: true,
      compiler: solc.version(),
      abi: artifact.abi,
      bytecode:
        "0x" +
        artifact.evm.bytecode.object
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : String(error)
    });
  }
}
