// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ReputationScore {
    /// @notice Emitted when a creator's reputation is updated.
    /// @param subjectDid The DID of the subject being rated
    /// @param totalCredentials Total credentials associated
    /// @param score The computed reputation score
    event ReputationUpdated(
        string indexed subjectDid,
        uint256 totalCredentials,
        int256 score
    );

    struct Reputation {
        string subjectDid;
        uint256 totalCredentials;
        uint256 verifiedCredentials;
        uint256 reportedInstances;
        int256 score;
        uint256 lastUpdated;
        bool exists;
    }

    address public owner;
    mapping(string => Reputation) private _reputations;
    string[] private _creatorList;

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }

    /// @notice Contract constructor sets the contract owner.
    constructor() {
        owner = msg.sender;
    }

    /// @notice Updates the reputation score for a subject.
    /// @param subjectDid The DID of the subject
    /// @param verified Whether the credential was verified
    /// @param reported Whether the subject was reported
    function updateReputation(
        string memory subjectDid,
        bool verified,
        bool reported
    ) external onlyOwner {
        require(bytes(subjectDid).length > 0, "Subject DID cannot be empty");

        Reputation storage rep = _reputations[subjectDid];

        if (!rep.exists) {
            rep.subjectDid = subjectDid;
            rep.exists = true;
            _creatorList.push(subjectDid);
        }

        rep.totalCredentials += 1;

        if (verified) {
            rep.verifiedCredentials += 1;
        }

        if (reported) {
            rep.reportedInstances += 1;
        }

        int256 verifiedWeight = 10;
        int256 reportedPenalty = 20;
        rep.score = (int256(uint256(rep.verifiedCredentials)) * verifiedWeight) -
            (int256(uint256(rep.reportedInstances)) * reportedPenalty);

        rep.lastUpdated = block.timestamp;

        emit ReputationUpdated(subjectDid, rep.totalCredentials, rep.score);
    }

    /// @notice Gets the full reputation record for a subject.
    /// @param subjectDid The DID to query
    /// @return total Total credentials
    /// @return verified Verified credentials
    /// @return reported Reported instances
    /// @return score Computed reputation score
    function getReputation(
        string memory subjectDid
    )
        external
        view
        returns (uint256 total, uint256 verified, uint256 reported, int256 score)
    {
        Reputation storage rep = _reputations[subjectDid];
        require(rep.exists, "Subject does not have a reputation record");

        return (
            rep.totalCredentials,
            rep.verifiedCredentials,
            rep.reportedInstances,
            rep.score
        );
    }

    /// @notice Returns the top N creators by reputation score.
    /// @param limit Maximum number of creators to return
    /// @return creators Array of DIDs
    /// @return scores Array of corresponding reputation scores
    function getTopCreators(
        uint256 limit
    ) external view returns (string[] memory creators, int256[] memory scores) {
        uint256 resultCount = limit < _creatorList.length ? limit : _creatorList.length;

        string[] memory topCreators = new string[](resultCount);
        int256[] memory topScores = new int256[](resultCount);

        uint256[] memory indices = new uint256[](_creatorList.length);
        for (uint256 i = 0; i < _creatorList.length; i++) {
            indices[i] = i;
        }

        for (uint256 i = 0; i < resultCount; i++) {
            int256 bestScore = type(int256).min;
            uint256 bestIdx = 0;

            for (uint256 j = i; j < _creatorList.length; j++) {
                Reputation storage rep = _reputations[_creatorList[indices[j]]];
                if (rep.score > bestScore) {
                    bestScore = rep.score;
                    bestIdx = j;
                }
            }

            (indices[i], indices[bestIdx]) = (indices[bestIdx], indices[i]);

            topCreators[i] = _creatorList[indices[i]];
            topScores[i] = _reputations[_creatorList[indices[i]]].score;
        }

        return (topCreators, topScores);
    }

    /// @notice Returns the total number of tracked creators.
    /// @return The count of creators
    function getCreatorCount() external view returns (uint256) {
        return _creatorList.length;
    }

    /// @notice Transfers contract ownership.
    /// @param newOwner Address of the new owner
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }
}
