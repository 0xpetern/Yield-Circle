// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title YieldCircleVault
 * @dev A rotating savings circle contract for Yield Circles hackathon demo
 * Users deposit together, take turns getting the pot, and earn yield for staying
 */
contract YieldCircleVault {
    // Circle structure
    struct Circle {
        uint256 targetAmount;        // Target deposit per person (e.g., 10 ETH)
        uint256 numParticipants;    // Number of people in the circle
        uint256 currentPot;          // Total amount in the pot
        address currentRecipient;     // Who gets the pot this round (first depositor)
        bool isActive;               // Is the circle active?
        uint256 roundNumber;         // Current round number
    }

    // User balances per circle
    mapping(uint256 => mapping(address => uint256)) public userDeposits; // circleId => user => amount
    mapping(uint256 => address[]) public circleParticipants; // circleId => list of participants
    mapping(uint256 => mapping(address => bool)) public hasClaimed; // circleId => user => has claimed this round
    
    // Circle data
    mapping(uint256 => Circle) public circles;
    uint256 public nextCircleId = 1;
    
    // Events
    event Deposited(uint256 indexed circleId, address indexed user, uint256 amount);
    event Withdrawn(uint256 indexed circleId, address indexed user, uint256 amount);
    event PotClaimed(uint256 indexed circleId, address indexed recipient, uint256 claimedAmount, uint256 redepositedAmount);
    event CircleCompleted(uint256 indexed circleId, address indexed recipient);
    event NewRoundStarted(uint256 indexed circleId, uint256 roundNumber);

    /**
     * @dev Deposit into a circle (creates circle if it doesn't exist)
     * @param circleId The circle ID (0 = create new circle)
     * @param targetAmountPerPerson Target deposit amount per person in ETH (used for new circles)
     */
    function deposit(uint256 circleId, uint256 targetAmountPerPerson) external payable {
        require(msg.value > 0, "Deposit amount must be greater than 0");
        
        // If circleId is 0 or doesn't exist, create a new circle
        if (circleId == 0 || !circles[circleId].isActive) {
            circleId = nextCircleId++;
            circles[circleId] = Circle({
                targetAmount: targetAmountPerPerson > 0 ? targetAmountPerPerson : msg.value,
                numParticipants: 0,
                currentPot: 0,
                currentRecipient: address(0),
                isActive: true,
                roundNumber: 1
            });
        }
        
        Circle storage circle = circles[circleId];
        require(circle.isActive, "Circle is not active");
        
        // Add user deposit
        userDeposits[circleId][msg.sender] += msg.value;
        circle.currentPot += msg.value;
        
        // If this is the first deposit, set as recipient
        if (circle.currentRecipient == address(0)) {
            circle.currentRecipient = msg.sender;
        }
        
        // Track participants (only once per user)
        bool isNewParticipant = true;
        for (uint256 i = 0; i < circleParticipants[circleId].length; i++) {
            if (circleParticipants[circleId][i] == msg.sender) {
                isNewParticipant = false;
                break;
            }
        }
        if (isNewParticipant) {
            circleParticipants[circleId].push(msg.sender);
            circle.numParticipants++;
        }
        
        emit Deposited(circleId, msg.sender, msg.value);
    }

    /**
     * @dev Withdraw your own deposits (only if you're not the current recipient)
     * @param circleId The circle ID
     * @param amount The amount to withdraw in wei
     */
    function withdraw(uint256 circleId, uint256 amount) external {
        require(amount > 0, "Withdraw amount must be greater than 0");
        Circle storage circle = circles[circleId];
        require(circle.isActive, "Circle is not active");
        require(msg.sender != circle.currentRecipient, "Recipient must claim pot, not withdraw");
        require(userDeposits[circleId][msg.sender] >= amount, "Insufficient balance");
        
        userDeposits[circleId][msg.sender] -= amount;
        circle.currentPot -= amount;
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawn(circleId, msg.sender, amount);
    }

    /**
     * @dev Claim the pot (only for current recipient)
     * Recipient gets (pot - their deposit), their deposit stays in the circle
     * @param circleId The circle ID
     */
    function claimPot(uint256 circleId) external {
        Circle storage circle = circles[circleId];
        require(circle.isActive, "Circle is not active");
        require(msg.sender == circle.currentRecipient, "Only current recipient can claim");
        require(!hasClaimed[circleId][msg.sender], "Already claimed this round");
        require(circle.currentPot > 0, "Pot is empty");
        
        uint256 recipientDeposit = userDeposits[circleId][msg.sender];
        require(recipientDeposit > 0, "Recipient must have deposited");
        
        // Recipient gets: pot - their deposit
        // Their deposit stays in the circle (redeposited)
        uint256 claimAmount = circle.currentPot - recipientDeposit;
        require(claimAmount > 0, "No amount to claim after redeposit");
        
        // Mark as claimed
        hasClaimed[circleId][msg.sender] = true;
        
        // Reset pot to just the recipient's deposit (redeposited)
        circle.currentPot = recipientDeposit;
        
        // Move to next recipient (round robin: next participant in list)
        address[] memory participants = circleParticipants[circleId];
        uint256 currentIndex = 0;
        for (uint256 i = 0; i < participants.length; i++) {
            if (participants[i] == msg.sender) {
                currentIndex = i;
                break;
            }
        }
        uint256 nextIndex = (currentIndex + 1) % participants.length;
        circle.currentRecipient = participants[nextIndex];
        
        // Reset claim status for all participants for next round
        for (uint256 i = 0; i < participants.length; i++) {
            hasClaimed[circleId][participants[i]] = false;
        }
        
        circle.roundNumber++;
        
        emit PotClaimed(circleId, msg.sender, claimAmount, recipientDeposit);
        emit CircleCompleted(circleId, msg.sender);
        emit NewRoundStarted(circleId, circle.roundNumber);
        
        // Transfer the claim amount
        (bool success, ) = payable(msg.sender).call{value: claimAmount}("");
        require(success, "Transfer failed");
    }

    /**
     * @dev Get circle information
     * @param circleId The circle ID
     */
    function getCircle(uint256 circleId) external view returns (
        uint256 targetAmount,
        uint256 numParticipants,
        uint256 currentPot,
        address currentRecipient,
        bool isActive,
        uint256 roundNumber
    ) {
        Circle memory circle = circles[circleId];
        return (
            circle.targetAmount,
            circle.numParticipants,
            circle.currentPot,
            circle.currentRecipient,
            circle.isActive,
            circle.roundNumber
        );
    }

    /**
     * @dev Get user's deposit in a circle
     * @param circleId The circle ID
     * @param user The user address
     */
    function getUserDeposit(uint256 circleId, address user) external view returns (uint256) {
        return userDeposits[circleId][user];
    }

    /**
     * @dev Get all participants in a circle
     * @param circleId The circle ID
     */
    function getCircleParticipants(uint256 circleId) external view returns (address[] memory) {
        return circleParticipants[circleId];
    }
}
