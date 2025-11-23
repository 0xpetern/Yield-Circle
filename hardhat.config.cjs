require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: ".env.local" });

// NOTE: Set WORLD_RPC_URL and WORLD_CHAIN_ID in your .env.local for World Chain.

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337,
    },
    world: {
      url: process.env.WORLD_RPC_URL || "https://worldchain-sepolia.g.alchemy.com/public",
      chainId: Number(process.env.WORLD_CHAIN_ID) || 4801, // World Chain Sepolia Testnet
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

