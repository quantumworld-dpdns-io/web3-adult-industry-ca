// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/// @title ReputationScore
/// @notice Tracks reputation scores for DIDs based on verified credentials and reports
contract ReputationScore {
    address public owner;

    struct Score {
        uint256 totalCredentials;
        uint256 verifiedCredentials;
        uint256 reportedInstances;
        uint256 score;
    }

    mapping(string => Score) private scores;
    string[] private creatorList;
    mapping(string => bool) private creatorIndex;

    event ReputationUpdated(string indexed subjectDid, uint256 newScore);

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Update reputation for a subject DID
    /// @param _subjectDid The DID to update
    /// @param _totalCredentials Total credentials issued
    /// @param _verifiedCredentials Verified credentials count
    /// @param _reportedInstances Reported instances count
    function updateReputation(
        string calldata _subjectDid,
        uint256 _totalCredentials,
        uint256 _verifiedCredentials,
        uint256 _reportedInstances
    ) external onlyOwner {
        uint256 newScore;
        uint256 denominator = _totalCredentials + _reportedInstances;
        if (denominator > 0) {
            newScore = (_verifiedCredentials * 100) / denominator;
        }
        scores[_subjectDid] = Score({
            totalCredentials: _totalCredentials,
            verifiedCredentials: _verifiedCredentials,
            reportedInstances: _reportedInstances,
            score: newScore
        });
        if (!creatorIndex[_subjectDid]) {
            creatorList.push(_subjectDid);
            creatorIndex[_subjectDid] = true;
        }
        emit ReputationUpdated(_subjectDid, newScore);
    }

    /// @notice Get reputation for a subject
    /// @param _subjectDid The DID to query
    /// @return totalCredentials verifiedCredentials reportedInstances score
    function getReputation(string calldata _subjectDid) external view returns (uint256, uint256, uint256, uint256) {
        Score memory s = scores[_subjectDid];
        return (s.totalCredentials, s.verifiedCredentials, s.reportedInstances, s.score);
    }

    /// @notice Get top creators by reputation score
    /// @param _limit Number of top creators to return
    /// @return subjects scores
    function getTopCreators(uint256 _limit) external view returns (string[] memory, uint256[] memory) {
        uint256 n = creatorList.length;
        if (_limit > n) _limit = n;
        string[] memory subjects = new string[](_limit);
        uint256[] memory sco = new uint256[](_limit);
        for (uint256 i = 0; i < _limit; i++) {
            subjects[i] = creatorList[i];
            sco[i] = scores[creatorList[i]].score;
        }
        return (subjects, slicesort(subjects, sco));
    }

    function slicesort(string[] memory subjects, uint256[] memory sco) private pure returns (uint256[] memory) {
        for (uint256 i = 0; i < sco.length; i++) {
            for (uint256 j = i + 1; j < sco.length; j++) {
                if (sco[j] > sco[i]) {
                    (sco[i], sco[j]) = (sco[j], sco[i]);
                    (subjects[i], subjects[j]) = (subjects[j], subjects[i]);
                }
            }
        }
        return sco;
    }
}
