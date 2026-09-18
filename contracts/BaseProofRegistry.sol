// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract BaseProofRegistry {
    struct Proof {
        address subject;
        bytes32 sourceId;
        bytes32 evidenceHash;
        uint64 createdAt;
        bool revoked;
    }

    address public owner;
    mapping(address => bool) public verifiers;
    mapping(bytes32 => Proof) public proofs;

    event VerifierUpdated(address indexed verifier, bool allowed);
    event ProofRegistered(
        bytes32 indexed proofId,
        address indexed subject,
        bytes32 indexed sourceId,
        bytes32 evidenceHash
    );
    event ProofRevoked(bytes32 indexed proofId);

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    modifier onlyVerifier() {
        require(verifiers[msg.sender], "NOT_VERIFIER");
        _;
    }

    constructor() {
        owner = msg.sender;
        verifiers[msg.sender] = true;
    }

    function setVerifier(address verifier, bool allowed) external onlyOwner {
        verifiers[verifier] = allowed;
        emit VerifierUpdated(verifier, allowed);
    }

    function registerProof(
        address subject,
        bytes32 sourceId,
        bytes32 evidenceHash
    ) external onlyVerifier returns (bytes32 proofId) {
        proofId = keccak256(
            abi.encode(subject, sourceId, evidenceHash, block.chainid)
        );

        require(proofs[proofId].createdAt == 0, "PROOF_EXISTS");

        proofs[proofId] = Proof({
            subject: subject,
            sourceId: sourceId,
            evidenceHash: evidenceHash,
            createdAt: uint64(block.timestamp),
            revoked: false
        });

        emit ProofRegistered(
            proofId,
            subject,
            sourceId,
            evidenceHash
        );
    }

    function revokeProof(bytes32 proofId) external onlyVerifier {
        require(proofs[proofId].createdAt != 0, "NOT_FOUND");
        require(!proofs[proofId].revoked, "ALREADY_REVOKED");

        proofs[proofId].revoked = true;
        emit ProofRevoked(proofId);
    }
}
