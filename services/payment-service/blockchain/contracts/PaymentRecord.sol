// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title PaymentRecord
 * @dev Smart contract to store immutable payment records for Smart Parking System
 * @notice This contract provides an audit trail for all payment transactions
 */
contract PaymentRecord {
    // Payment record structure
    struct Payment {
        string paymentId;      // UUID from payment-service
        string oderId;         // User ID (UUID from auth-service)
        uint256 amount;        // Amount in cents (to avoid decimals)
        string currency;       // USD or KHR
        uint256 timestamp;     // Block timestamp when recorded
        bool exists;           // Flag to check if record exists
    }

    // Owner of the contract (payment-service wallet)
    address public owner;

    // Mapping from paymentId hash to Payment record
    mapping(bytes32 => Payment) private payments;

    // Array to track all payment IDs for enumeration
    bytes32[] private paymentIds;

    // Events
    event PaymentRecorded(
        bytes32 indexed paymentIdHash,
        string paymentId,
        string orderId,
        uint256 amount,
        string currency,
        uint256 timestamp
    );

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    /**
     * @dev Constructor sets the deployer as the owner
     */
    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    /**
     * @dev Record a new payment on the blockchain
     * @param _paymentId Unique payment identifier from payment-service
     * @param _orderId User identifier from auth-service
     * @param _amount Payment amount in cents
     * @param _currency Currency code (USD or KHR)
     * @return paymentIdHash The hash used as the key for this payment
     */
    function recordPayment(
        string calldata _paymentId,
        string calldata _orderId,
        uint256 _amount,
        string calldata _currency
    ) external onlyOwner returns (bytes32 paymentIdHash) {
        // Generate hash from paymentId
        paymentIdHash = keccak256(abi.encodePacked(_paymentId));

        // Ensure payment doesn't already exist
        require(!payments[paymentIdHash].exists, "Payment already recorded");

        // Create and store the payment record
        payments[paymentIdHash] = Payment({
            paymentId: _paymentId,
            oderId: _orderId,
            amount: _amount,
            currency: _currency,
            timestamp: block.timestamp,
            exists: true
        });

        // Track payment ID for enumeration
        paymentIds.push(paymentIdHash);

        // Emit event for off-chain indexing
        emit PaymentRecorded(
            paymentIdHash,
            _paymentId,
            _orderId,
            _amount,
            _currency,
            block.timestamp
        );

        return paymentIdHash;
    }

    /**
     * @dev Retrieve a payment record by its ID
     * @param _paymentId The payment ID to look up
     * @return paymentId The payment identifier
     * @return orderId The order/user identifier
     * @return amount The payment amount in cents
     * @return currency The currency code
     * @return timestamp The block timestamp when recorded
     * @return exists Whether the payment exists
     */
    function getPayment(string calldata _paymentId) 
        external 
        view 
        returns (
            string memory paymentId,
            string memory orderId,
            uint256 amount,
            string memory currency,
            uint256 timestamp,
            bool exists
        ) 
    {
        bytes32 paymentIdHash = keccak256(abi.encodePacked(_paymentId));
        Payment storage payment = payments[paymentIdHash];
        
        return (
            payment.paymentId,
            payment.oderId,
            payment.amount,
            payment.currency,
            payment.timestamp,
            payment.exists
        );
    }

    /**
     * @dev Check if a payment exists on-chain
     * @param _paymentId The payment ID to verify
     * @return exists True if the payment is recorded
     */
    function verifyPayment(string calldata _paymentId) external view returns (bool exists) {
        bytes32 paymentIdHash = keccak256(abi.encodePacked(_paymentId));
        return payments[paymentIdHash].exists;
    }

    /**
     * @dev Get the total number of recorded payments
     * @return count Total number of payments
     */
    function getPaymentCount() external view returns (uint256 count) {
        return paymentIds.length;
    }

    /**
     * @dev Transfer ownership to a new address
     * @param newOwner Address of the new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
