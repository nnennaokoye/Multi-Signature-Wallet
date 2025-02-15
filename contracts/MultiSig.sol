// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract Multisig {
    uint256 private ID = 1;
    address[] public validSigners;
    uint256 public totalSigners = 20;

    mapping(address => bool) public isBoardMember;
    mapping(uint256 => address) public beneficiary;
    mapping(uint256 => uint256) public amount;
    mapping(uint256 => uint256) public noOfApproval;
    mapping(uint256 => bool) public approved;
    mapping(address => mapping(uint256 => bool)) public signed;

    event TransactionSubmitted(uint256 indexed id, address indexed beneficiary, uint256 amount);
    event TransactionApproved(uint256 indexed id, address indexed approver);
    event TransactionExecuted(uint256 indexed id, address indexed beneficiary, uint256 amount);

    constructor(address[] memory _validSigners) {
        require(_validSigners.length > 0, "Must have at least one signer");
        
        for (uint256 i = 0; i < _validSigners.length; i++) {
            validSigners.push(_validSigners[i]);
            isBoardMember[_validSigners[i]] = true;
        }
    }

    function isValidOwner() public view returns (bool) {
        return isBoardMember[msg.sender];
    }

    function submitTransaction(address _beneficiary, uint256 _amount) external {
        require(isValidOwner(), "Caller is not a valid owner");
        require(_amount > 0, "Amount must be greater than zero");
        require(_beneficiary != address(0), "Invalid beneficiary");

        beneficiary[ID] = _beneficiary;
        amount[ID] = _amount;
        noOfApproval[ID] = 0;
        approved[ID] = false;

        emit TransactionSubmitted(ID, _beneficiary, _amount);
        
        ID++;
    }

    function approveTransaction(uint256 id) public {
        require(isValidOwner(), "Caller is not a valid owner");
        require(!signed[msg.sender][id], "Already signed");

        signed[msg.sender][id] = true;
        noOfApproval[id]++;

        emit TransactionApproved(id, msg.sender);

        if (noOfApproval[id] >= totalSigners) {
            executeTransaction(id);
        }
    }

    function executeTransaction(uint256 id) public {
        require(noOfApproval[id] >= totalSigners, "Not enough approvals");
        require(!approved[id], "Transaction already executed");
        require(address(this).balance >= amount[id], "Insufficient contract balance");

        approved[id] = true;
        payable(beneficiary[id]).transfer(amount[id]);

        emit TransactionExecuted(id, beneficiary[id], amount[id]);
    }

    function contractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    receive() external payable {}
}
