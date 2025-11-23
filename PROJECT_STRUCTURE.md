# Project Structure

This document outlines the organization of the Yield Circles project.

## Directory Structure

```
yield-circles/
├── README.md                 # Main project documentation
├── PROJECT_STRUCTURE.md      # This file
│
├── src/                      # Frontend source code
│   ├── app/                  # Next.js app router
│   │   ├── page.tsx          # Main Yield Circles UI
│   │   └── api/              # API routes (auth, verify-proof)
│   ├── components/           # React components
│   │   └── WalletSwitcher/   # Multi-wallet demo support
│   ├── lib/                  # Utilities
│   │   └── worldPayment.ts   # Blockchain interaction
│   └── abi/                  # Contract ABIs
│
├── contracts/                # Solidity smart contracts
│   └── YieldCircleVault.sol
│
└── scripts/                  # Deployment scripts
    └── deploy-yield-circle-vault.js
```

## Component Breakdown

### Frontend (`src/`)

**Main Application** (`src/app/page.tsx`)
- Circle creation and management
- World ID verification
- Deposit, withdraw, claim flows
- Yield tracking and claiming
- Emergency withdrawal UI

**Components** (`src/components/`)
- `WalletSwitcher/`: Multi-wallet demo support
- `AuthButton/`: World ID authentication
- Other template components

**Utilities** (`src/lib/`)
- `worldPayment.ts`: Blockchain transaction helpers
  - Deposit to circle
  - Withdraw from circle
  - Claim pot
  - Claim yield
  - Emergency withdraw

**API Routes** (`src/app/api/`)
- `auth/[...nextauth]/`: NextAuth configuration
- `verify-proof/`: World ID proof verification
- `initiate-payment/`: Payment initiation

### Smart Contracts (`contracts/`)

**YieldCircleVault.sol**
- Main contract managing savings circles
- Functions:
  - `deposit()`: Join/create circle and deposit
  - `withdraw()`: Withdraw own deposits
  - `claimPot()`: Claim pot as recipient
  - `getCircle()`: Read circle state
  - `getUserDeposit()`: Read user balance

### Deployment (`scripts/`)

**deploy-yield-circle-vault.js**
- Hardhat deployment script
- Deploys to World Chain
- Outputs contract address

## File Organization Principles

1. **Separation of Concerns**: Frontend and contracts are clearly separated
2. **Feature-Based**: Components organized by feature
3. **Reusability**: Shared utilities in `lib/`
4. **Documentation**: README at root and in frontend

## Development Workflow

1. **Frontend Development**: Work in `src/`
2. **Contract Development**: Work in `contracts/`
3. **Deployment**: Use scripts in `scripts/`
4. **Testing**: Test in World App environment
