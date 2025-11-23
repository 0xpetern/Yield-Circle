import hre from "hardhat";

async function main() {
  console.log("Deploying YieldCircleVault to World Chain...");

  // Get the contract factory
  const YieldCircleVault = await hre.ethers.getContractFactory("YieldCircleVault");

  // Deploy the contract
  const vault = await YieldCircleVault.deploy();

  // Wait for deployment
  await vault.waitForDeployment();

  const vaultAddress = await vault.getAddress();

  console.log("\n✅ YieldCircleVault deployed successfully!");
  console.log("📍 Contract address:", vaultAddress);
  console.log("\n📋 Next steps:");
  console.log("1. Copy the address above");
  console.log("2. Paste it into src/lib/worldPayment.ts as YIELD_CIRCLE_VAULT_ADDRESS");
  console.log("3. Update the contract address in your front-end code\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
