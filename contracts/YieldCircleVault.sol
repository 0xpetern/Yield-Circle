// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// TODO: For production, consider adding circle IDs, yield logic, and access controls.

/**
 * @title YieldCircleVault
 * @dev A simple vault contract for Yield Circles hackathon demo
 * Allows users to deposit and withdraw native ETH
 */
contract YieldCircleVault {
    // Mapping to track each user's balance
    mapping(address => uint256) public balances;

    // Events
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    /**
     * @dev Deposit native ETH into the vault
     * The function is payable to receive ETH
     */
    function deposit() external payable {
        require(msg.value > 0, "Deposit amount must be greater than 0");
        
        balances[msg.sender] += msg.value;
        
        emit Deposited(msg.sender, msg.value);
    }

    /**
     * @dev Withdraw ETH from the vault
     * @param amount The amount to withdraw in wei
     */
    function withdraw(uint256 amount) external {
        require(amount > 0, "Withdraw amount must be greater than 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        balances[msg.sender] -= amount;
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @dev Get the balance of a specific user
     * @param user The address to check
     * @return The user's balance in wei
     */
    function getBalance(address user) external view returns (uint256) {
        return balances[user];
    }
}

