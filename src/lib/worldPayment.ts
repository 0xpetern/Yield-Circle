import { MiniKit } from "@worldcoin/minikit-js";
import YieldCircleVaultABI from "../abi/YieldCircleVault.json";

// Deployed YieldCircleVault contract address on World Chain Sepolia Testnet
// Deployed at: 0xE759c051dF3620F393246521Bbf8c11e65b9A558
const YIELD_CIRCLE_VAULT_ADDRESS = "0xE759c051dF3620F393246521Bbf8c11e65b9A558";

/**
 * Converts ETH amount to wei (BigInt)
 * @param ethAmount - Amount in ETH (e.g., 0.1 for 0.1 ETH)
 * @returns Amount in wei as BigInt
 */
function ethToWei(ethAmount: number): bigint {
  return BigInt(Math.floor(ethAmount * 1e18));
}

/**
 * Deposits native ETH to the YieldCircleVault contract on World Chain using MiniKit.
 * 
 * @param amount - The amount to deposit in ETH units (e.g., 0.1 for 0.1 ETH)
 * @param circleName - The name of the circle (used for logging/description)
 * @throws Error if MiniKit is not installed, transaction fails, or user rejects
 */
export async function depositToCircleOnWorldChain(
  amount: number,
  circleName: string
): Promise<void> {
  // Check if MiniKit is installed (must be running in World App)
  if (!MiniKit.isInstalled()) {
    throw new Error(
      "Please open this mini app inside World App to deposit."
    );
  }

  // Validate amount
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Deposit amount must be a positive number.");
  }

  // Validate vault address format
  if (
    !YIELD_CIRCLE_VAULT_ADDRESS ||
    !YIELD_CIRCLE_VAULT_ADDRESS.startsWith("0x") ||
    YIELD_CIRCLE_VAULT_ADDRESS.length !== 42
  ) {
    throw new Error(
      "Vault address not configured. Please deploy the contract and set YIELD_CIRCLE_VAULT_ADDRESS in worldPayment.ts"
    );
  }

  try {
    // Convert ETH amount to wei
    const amountInWei = ethToWei(amount);
    // Convert to hex string (required format for MiniKit)
    // Ensure it's a proper hex string (no padding needed for BigInt.toString(16))
    const valueHex = "0x" + amountInWei.toString(16);
    
    // Ensure value is not "0x0" (which would be invalid)
    if (valueHex === "0x0" || amountInWei === BigInt(0)) {
      throw new Error("Deposit amount is too small. Minimum is 1 wei.");
    }

    console.log("Initiating deposit transaction:", {
      to: YIELD_CIRCLE_VAULT_ADDRESS,
      amount: amount,
      amountInWei: amountInWei.toString(),
      valueHex: valueHex,
      circleName,
    });

    // Call the deposit() function on YieldCircleVault contract
    // This will show a popup in World App for user confirmation
    // Note: Make sure the contract address is added to World ID Developer Portal > Configuration > Advanced > Contract Entrypoints
    const result = await MiniKit.commandsAsync.sendTransaction({
      transaction: [
        {
          address: YIELD_CIRCLE_VAULT_ADDRESS,
          abi: YieldCircleVaultABI,
          functionName: "deposit",
          args: [],
          value: valueHex, // Send native ETH with the transaction (must be hex string like "0x...")
        },
      ],
    });

    console.log("Transaction result:", JSON.stringify(result.finalPayload, null, 2));

    // Check if transaction was successful
    if (result.finalPayload.status !== "success") {
      const errorCode = result.finalPayload.error_code;
      const errorCodeStr = errorCode?.toString() || "";
      // Get error details from the payload (avoiding any type)
      const payload = result.finalPayload as { description?: string; error?: { message?: string } };
      const errorDetail = payload.error?.message || payload.description || "";
      
      console.error("Transaction failed:", {
        errorCode,
        errorDetail,
        fullPayload: result.finalPayload,
      });
      
      // Handle user rejection
      if (errorCodeStr.toLowerCase().includes("reject") || errorCodeStr.toLowerCase().includes("user")) {
        throw new Error("Transaction rejected by user");
      }
      
      // Handle simulation failure
      if (errorCodeStr.toLowerCase().includes("simulation") || errorDetail.toLowerCase().includes("simulation")) {
        throw new Error(
          `Transaction simulation failed. Make sure the contract address ${YIELD_CIRCLE_VAULT_ADDRESS} is added to your World ID Developer Portal under Configuration > Advanced > Contract Entrypoints.`
        );
      }
      
      throw new Error(
        errorDetail || errorCodeStr
          ? `Transaction failed: ${errorDetail || errorCodeStr}`
          : "Transaction failed. Please try again."
      );
    }

    // Transaction successful - it's now on World Chain
    // In production, you should verify the transaction on-chain using the transaction_id
    // See: https://docs.world.org/mini-apps/commands/send-transaction
  } catch (error) {
    // Re-throw with a friendly error message
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(
      "Deposit failed. Please ensure you're in World App and try again."
    );
  }
}
