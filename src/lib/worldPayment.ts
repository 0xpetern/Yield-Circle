import { MiniKit } from "@worldcoin/minikit-js";
import YieldCircleVaultArtifact from "../abi/YieldCircleVault.json";

// Extract just the ABI array from the Hardhat artifact
const YieldCircleVaultABI = YieldCircleVaultArtifact.abi;

// Deployed YieldCircleVault contract address on World Chain Mainnet
// Deployed at: 0x740C84837c3D6463f294e6673336282CD0D7E139
// Features: Rotating payout system, withdraw, claim pot
const YIELD_CIRCLE_VAULT_ADDRESS = "0x740C84837c3D6463f294e6673336282CD0D7E139";

/**
 * Converts ETH amount to wei (BigInt)
 * @param ethAmount - Amount in ETH (e.g., 0.1 for 0.1 ETH)
 * @returns Amount in wei as BigInt
 */
function ethToWei(ethAmount: number): bigint {
  return BigInt(Math.floor(ethAmount * 1e18));
}

/**
 * Deposits native ETH to a circle in the YieldCircleVault contract
 * 
 * @param amount - The amount to deposit in ETH units (e.g., 0.1 for 0.1 ETH)
 * @param circleId - The circle ID (0 = create new circle)
 * @param targetAmountPerPerson - Target deposit per person for new circles
 * @throws Error if MiniKit is not installed, transaction fails, or user rejects
 */
export async function depositToCircleOnWorldChain(
  amount: number,
  circleId: number = 0,
  targetAmountPerPerson: number = 0
): Promise<void> {
  if (!MiniKit.isInstalled()) {
    throw new Error("Please open this mini app inside World App to deposit.");
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Deposit amount must be a positive number.");
  }

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
    const amountInWei = ethToWei(amount);
    const valueHex = "0x" + amountInWei.toString(16);
    
    if (valueHex === "0x0" || amountInWei === BigInt(0)) {
      throw new Error("Deposit amount is too small. Minimum is 1 wei.");
    }

    const targetAmountWei = targetAmountPerPerson > 0 ? ethToWei(targetAmountPerPerson) : BigInt(0);

    console.log("Initiating deposit transaction:", {
      to: YIELD_CIRCLE_VAULT_ADDRESS,
      circleId,
      amount: amount,
      amountInWei: amountInWei.toString(),
      valueHex: valueHex,
      targetAmountPerPerson,
    });

    const result = await MiniKit.commandsAsync.sendTransaction({
      transaction: [
        {
          address: YIELD_CIRCLE_VAULT_ADDRESS,
          abi: YieldCircleVaultABI,
          functionName: "deposit",
          args: [circleId, targetAmountWei],
          value: valueHex,
        },
      ],
    });

    console.log("Transaction result:", JSON.stringify(result.finalPayload, null, 2));

    if (result.finalPayload.status !== "success") {
      const errorCode = result.finalPayload.error_code;
      const errorCodeStr = errorCode?.toString() || "";
      const payload = result.finalPayload as { description?: string; error?: { message?: string } };
      const errorDetail = payload.error?.message || payload.description || "";
      
      console.error("Transaction failed:", {
        errorCode,
        errorDetail,
        fullPayload: result.finalPayload,
      });
      
      if (errorCodeStr.toLowerCase().includes("reject") || errorCodeStr.toLowerCase().includes("user")) {
        throw new Error("Transaction rejected by user");
      }
      
      if (errorCodeStr.toLowerCase().includes("simulation") || errorDetail.toLowerCase().includes("simulation")) {
        throw new Error(
          `Transaction simulation failed. Please add this EXACT address to World ID Developer Portal:\n\n${YIELD_CIRCLE_VAULT_ADDRESS}\n\nSteps:\n1. Go to developer.worldcoin.org\n2. Your app > Configuration > Advanced\n3. Add to "Contract Entrypoints"\n4. Wait 1-2 minutes, then try again.`
        );
      }
      
      throw new Error(
        errorDetail || errorCodeStr
          ? `Transaction failed: ${errorDetail || errorCodeStr}`
          : "Transaction failed. Please try again."
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Deposit failed. Please ensure you're in World App and try again.");
  }
}

/**
 * Withdraws ETH from a circle (only if not the current recipient)
 */
export async function withdrawFromCircle(
  circleId: number,
  amount: number
): Promise<void> {
  if (!MiniKit.isInstalled()) {
    throw new Error("Please open this mini app inside World App to withdraw.");
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Withdraw amount must be a positive number.");
  }

  try {
    const amountInWei = ethToWei(amount);

    console.log("Initiating withdraw transaction:", {
      circleId,
      amount: amount,
      amountInWei: amountInWei.toString(),
    });

    const result = await MiniKit.commandsAsync.sendTransaction({
      transaction: [
        {
          address: YIELD_CIRCLE_VAULT_ADDRESS,
          abi: YieldCircleVaultABI,
          functionName: "withdraw",
          args: [circleId, amountInWei],
        },
      ],
    });

    console.log("Transaction result:", JSON.stringify(result.finalPayload, null, 2));

    if (result.finalPayload.status !== "success") {
      const errorCode = result.finalPayload.error_code;
      const payload = result.finalPayload as { description?: string };
      const errorDetail = payload.description || "";
      
      if (errorCode?.toString().toLowerCase().includes("reject")) {
        throw new Error("Transaction rejected by user");
      }
      
      throw new Error(errorDetail || "Withdraw failed. Please try again.");
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Withdraw failed. Please ensure you're in World App and try again.");
  }
}

/**
 * Claims the pot (only for current recipient)
 */
export async function claimPot(circleId: number): Promise<void> {
  if (!MiniKit.isInstalled()) {
    throw new Error("Please open this mini app inside World App to claim.");
  }

  try {
    console.log("Initiating claim pot transaction:", { circleId });

    const result = await MiniKit.commandsAsync.sendTransaction({
      transaction: [
        {
          address: YIELD_CIRCLE_VAULT_ADDRESS,
          abi: YieldCircleVaultABI,
          functionName: "claimPot",
          args: [circleId],
        },
      ],
    });

    console.log("Transaction result:", JSON.stringify(result.finalPayload, null, 2));

    if (result.finalPayload.status !== "success") {
      const errorCode = result.finalPayload.error_code;
      const payload = result.finalPayload as { description?: string };
      const errorDetail = payload.description || "";
      
      if (errorCode?.toString().toLowerCase().includes("reject")) {
        throw new Error("Transaction rejected by user");
      }
      
      throw new Error(errorDetail || "Claim failed. Please try again.");
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Claim failed. Please ensure you're in World App and try again.");
  }
}

/**
 * Gets circle information from the contract (read-only, no transaction needed)
 * Note: This would require a read call to the contract, which we'll implement
 * using a public RPC endpoint or a backend API
 */
export interface CircleInfo {
  targetAmount: number;
  numParticipants: number;
  currentPot: number;
  currentRecipient: string;
  isActive: boolean;
  roundNumber: number;
}

// Export the contract address for use in other components
export { YIELD_CIRCLE_VAULT_ADDRESS };
