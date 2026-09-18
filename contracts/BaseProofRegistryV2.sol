// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title BaseProofRegistryV2
/// @notice Evidence registry with an explicit challenge / dispute lifecycle.
/// @dev MVP governance remains owner-resolved. Future versions can replace the
///      resolver with multisig, quorum, arbitration, or cryptoeconomic rules.
contract BaseProofRegistryV2 {
    enum ChallengeStatus {
        None,
        Open,
        Upheld,
        Rejected
    }

    struct Proof {
        address subject;
        bytes32 sourceId;
        bytes32 evidenceHash;
        uint64 createdAt;
        bool revoked;
    }

    struct Challenge {
        bytes32 proofId;
        address challenger;
        bytes32 reasonHash;
        uint64 createdAt;
        uint64 resolvedAt;
        ChallengeStatus status;
    }

    address public owner;

    mapping(address => bool) public verifiers;
    mapping(bytes32 => Proof) public proofs;
    mapping(bytes32 => Challenge) public challenges;

    /// @dev At most one unresolved challenge per proof in the MVP.
    mapping(bytes32 => bytes32) public activeChallengeByProof;

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    event VerifierUpdated(
        address indexed verifier,
        bool allowed
    );

    event ProofRegistered(
        bytes32 indexed proofId,
        address indexed subject,
        bytes32 indexed sourceId,
        bytes32 evidenceHash
    );

    event ProofRevoked(
        bytes32 indexed proofId
    );

    event ChallengeOpened(
        bytes32 indexed challengeId,
        bytes32 indexed proofId,
        address indexed challenger,
        bytes32 reasonHash
    );

    event ChallengeResolved(
        bytes32 indexed challengeId,
        bytes32 indexed proofId,
        ChallengeStatus status,
        bool proofRevoked
    );

    error NotOwner();
    error NotVerifier();
    error ZeroAddress();
    error ProofExists();
    error ProofNotFound();
    error ProofAlreadyRevoked();
    error ActiveChallengeExists();
    error ChallengeNotFound();
    error ChallengeNotOpen();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyVerifier() {
        if (!verifiers[msg.sender]) revert NotVerifier();
        _;
    }

    constructor() {
        owner = msg.sender;
        verifiers[msg.sender] = true;

        emit OwnershipTransferred(address(0), msg.sender);
        emit VerifierUpdated(msg.sender, true);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();

        address previousOwner = owner;
        owner = newOwner;

        emit OwnershipTransferred(previousOwner, newOwner);
    }

    function setVerifier(
        address verifier,
        bool allowed
    ) external onlyOwner {
        if (verifier == address(0)) revert ZeroAddress();

        verifiers[verifier] = allowed;
        emit VerifierUpdated(verifier, allowed);
    }

    function computeProofId(
        address subject,
        bytes32 sourceId,
        bytes32 evidenceHash
    ) public view returns (bytes32) {
        return keccak256(
            abi.encode(
                subject,
                sourceId,
                evidenceHash,
                block.chainid
            )
        );
    }

    function registerProof(
        address subject,
        bytes32 sourceId,
        bytes32 evidenceHash
    ) external onlyVerifier returns (bytes32 proofId) {
        if (subject == address(0)) revert ZeroAddress();

        proofId = computeProofId(
            subject,
            sourceId,
            evidenceHash
        );

        if (proofs[proofId].createdAt != 0) {
            revert ProofExists();
        }

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

    function revokeProof(
        bytes32 proofId
    ) external onlyVerifier {
        Proof storage proof = proofs[proofId];

        if (proof.createdAt == 0) revert ProofNotFound();
        if (proof.revoked) revert ProofAlreadyRevoked();

        proof.revoked = true;

        emit ProofRevoked(proofId);
    }

    /// @notice Open a challenge against an existing, active proof.
    /// @param proofId Existing proof identifier.
    /// @param reasonHash Hash of an offchain challenge statement/evidence bundle.
    /// @return challengeId Deterministic challenge identifier.
    function openChallenge(
        bytes32 proofId,
        bytes32 reasonHash
    ) external returns (bytes32 challengeId) {
        Proof storage proof = proofs[proofId];

        if (proof.createdAt == 0) revert ProofNotFound();
        if (proof.revoked) revert ProofAlreadyRevoked();

        bytes32 active = activeChallengeByProof[proofId];

        if (
            active != bytes32(0) &&
            challenges[active].status == ChallengeStatus.Open
        ) {
            revert ActiveChallengeExists();
        }

        challengeId = keccak256(
            abi.encode(
                proofId,
                msg.sender,
                reasonHash,
                block.chainid
            )
        );

        Challenge storage existing = challenges[challengeId];

        if (existing.createdAt != 0) {
            if (existing.status == ChallengeStatus.Open) {
                revert ActiveChallengeExists();
            }

            // Same exact challenge identity cannot be reused.
            revert ChallengeNotOpen();
        }

        challenges[challengeId] = Challenge({
            proofId: proofId,
            challenger: msg.sender,
            reasonHash: reasonHash,
            createdAt: uint64(block.timestamp),
            resolvedAt: 0,
            status: ChallengeStatus.Open
        });

        activeChallengeByProof[proofId] = challengeId;

        emit ChallengeOpened(
            challengeId,
            proofId,
            msg.sender,
            reasonHash
        );
    }

    /// @notice Resolve an open challenge.
    /// @dev MVP resolution is owner-controlled. If upheld, the proof is revoked.
    function resolveChallenge(
        bytes32 challengeId,
        bool uphold
    ) external onlyOwner {
        Challenge storage challenge = challenges[challengeId];

        if (challenge.createdAt == 0) {
            revert ChallengeNotFound();
        }

        if (challenge.status != ChallengeStatus.Open) {
            revert ChallengeNotOpen();
        }

        bytes32 proofId = challenge.proofId;
        Proof storage proof = proofs[proofId];

        challenge.resolvedAt = uint64(block.timestamp);

        bool proofRevoked = false;

        if (uphold) {
            challenge.status = ChallengeStatus.Upheld;

            if (!proof.revoked) {
                proof.revoked = true;
                proofRevoked = true;
                emit ProofRevoked(proofId);
            }
        } else {
            challenge.status = ChallengeStatus.Rejected;
        }

        if (activeChallengeByProof[proofId] == challengeId) {
            activeChallengeByProof[proofId] = bytes32(0);
        }

        emit ChallengeResolved(
            challengeId,
            proofId,
            challenge.status,
            proofRevoked
        );
    }
}
