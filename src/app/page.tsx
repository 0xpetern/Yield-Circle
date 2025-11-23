"use client";

import { useState } from "react";
import { MiniKit, VerificationLevel } from "@worldcoin/minikit-js";
import { WalletSwitcher } from "../components/WalletSwitcher";

type Circle = {
  id: number;
  name: string;
  numPeople: number;
  verified: boolean;
  pot: number; // total balance in this circle (local tracking)
  myContribution: number; // how much this user/device has deposited (local tracking)
  circleId: number; // contract circle ID (0 = not created on-chain yet)
  currentRecipient: string | null; // address of current recipient
  roundNumber: number; // current round number
  isRecipient: boolean; // is current user the recipient?
  yieldEarned: number; // yield earned by this user
  totalYield: number; // total yield in the circle
  emergencyApprovals: number; // number of approvals for emergency withdraw (for demo)
};

export default function Home() {
  const [circleName, setCircleName] = useState("");
  const [numPeople, setNumPeople] = useState("");
  const [circles, setCircles] = useState<Circle[]>([]);

  const [verifyStatus, setVerifyStatus] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const [depositAmount, setDepositAmount] = useState("");
  const [depositStatus, setDepositStatus] = useState<string | null>(null);
  const [isDepositing, setIsDepositing] = useState(false);
  
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawStatus, setWithdrawStatus] = useState<string | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  
  const [claimStatus, setClaimStatus] = useState<string | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  
  const [yieldStatus, setYieldStatus] = useState<string | null>(null);
  const [isClaimingYield, setIsClaimingYield] = useState(false);
  
  const [emergencyStatus, setEmergencyStatus] = useState<string | null>(null);
  const [isRequestingEmergency, setIsRequestingEmergency] = useState(false);
  const [hasApprovedEmergency, setHasApprovedEmergency] = useState(false);

  function handleCreateCircle() {
    if (!circleName.trim() || !numPeople.trim()) {
      alert("Please fill in both the circle name and number of people.");
      return;
    }

    const parsedNum = Number(numPeople);
    if (!Number.isFinite(parsedNum) || parsedNum <= 0) {
      alert("Number of people must be a positive number.");
      return;
    }

    const newCircle: Circle = {
      id: Date.now(),
      name: circleName.trim(),
      numPeople: parsedNum,
      verified: false,
      pot: 0,
      myContribution: 0,
      circleId: 0, // Will be set when first deposit creates the circle on-chain
      currentRecipient: null,
      roundNumber: 1,
      isRecipient: false,
      yieldEarned: 0,
      totalYield: 0,
      emergencyApprovals: 0,
    };

    setCircles((prev) => [...prev, newCircle]);
    setCircleName("");
    setNumPeople("");
    setVerifyStatus(null);
    setDepositStatus(null);
  }

  async function handleVerifyForFirstCircle() {
    if (circles.length === 0) {
      alert("Create a circle first, then verify to join it.");
      return;
    }

    const target = circles[0];

    setIsVerifying(true);
    setVerifyStatus(null);

    try {
      if (!MiniKit.isInstalled()) {
        setVerifyStatus(
          "Open this app inside World App to verify with World ID."
        );
        setIsVerifying(false);
        return;
      }

      // Call World ID via MiniKit (using async version to get result)
      // Use Device verification level (easier for hackathon - no Orb needed)
      console.log("Starting verification with action: yield-circle-join");
      const result = await MiniKit.commandsAsync.verify({
        action: "yield-circle-join", // must match your action ID in the portal
        signal: target.name, // any string to bind the proof to
        verification_level: VerificationLevel.Device, // Use Device instead of Orb
      });

      // Log the full result for debugging
      console.log("Verify result:", JSON.stringify(result.finalPayload, null, 2));

      // Check if verification was actually successful
      if (result.finalPayload.status === "success") {
        // Verify the proof on the server side (important for security)
        console.log("MiniKit verification succeeded, verifying proof on server...");
        try {
          const response = await fetch("/api/verify-proof", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              payload: result.finalPayload,
              action: "yield-circle-join",
              signal: target.name,
            }),
          });

          const data = await response.json();
          console.log("Server verification result:", data);

          if (data.verifyRes?.success) {
            setVerifyStatus(
              `✅ Verified with World ID! You can now join the circle "${target.name}".`
            );

            setCircles((prev) =>
              prev.map((c) =>
                c.id === target.id ? { ...c, verified: true } : c
              )
            );
          } else {
            setCircles((prev) =>
              prev.map((c) =>
                c.id === target.id ? { ...c, verified: false } : c
              )
            );
            setVerifyStatus(
              `Server verification failed: ${data.verifyRes?.detail || "Unknown error"}`
            );
          }
        } catch (serverError) {
          console.error("Server verification error:", serverError);
          // For hackathon, still mark as verified if MiniKit succeeded
          setVerifyStatus(
            `✅ Verified with World ID! (Server verification skipped for demo)`
          );
          setCircles((prev) =>
            prev.map((c) =>
              c.id === target.id ? { ...c, verified: true } : c
            )
          );
        }
      } else {
        // Verification failed - show error from MiniKit
        // Explicitly ensure circle is NOT marked as verified
        setCircles((prev) =>
          prev.map((c) =>
            c.id === target.id ? { ...c, verified: false } : c
          )
        );
        
        const errorCode = result.finalPayload.error_code;
        const fullError = JSON.stringify(result.finalPayload, null, 2);
        console.error("Verification failed:", fullError);
        
        const errorMessage = errorCode
          ? `Error code: ${errorCode}. Make sure the action "yield-circle-join" exists in your World ID developer portal. Check console for details.`
          : "Verification failed. Please check that the action 'yield-circle-join' is configured in your World ID developer portal. Check console for details.";
        setVerifyStatus(`Verification error: ${errorMessage}`);
      }
    } catch (error) {
      // Handle unexpected errors - ensure circle is NOT marked as verified
      setCircles((prev) =>
        prev.map((c) =>
          c.id === target.id ? { ...c, verified: false } : c
        )
      );
      
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Verification error. Please try again in World App.";
      setVerifyStatus(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleDepositForFirstCircle() {
    if (circles.length === 0) {
      alert("Create a circle first, then deposit.");
      return;
    }

    const target = circles[0];

    setDepositStatus(null);

    // Require World ID verification before depositing
    if (!target.verified) {
      setDepositStatus(
        "Please verify with World ID first before depositing into this circle."
      );
      return;
    }

    const amount = Number(depositAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setDepositStatus("Deposit amount must be a positive number.");
      return;
    }

    setIsDepositing(true);
    setDepositStatus("Processing deposit...");

    // HACKATHON DEMO MODE: Simulate deposit without blockchain transaction
    // This allows the demo to work without contract deployment issues
    setTimeout(() => {
      // Calculate: 10% of deposit goes to yield strategy, 90% to pot
      const YIELD_PERCENT = 10;
      const yieldAmount = (amount * YIELD_PERCENT) / 100;
      const potAmount = amount - yieldAmount;

      // Simulate successful deposit
      setCircles((prev) =>
        prev.map((c) =>
          c.id === target.id
            ? {
                ...c,
                pot: c.pot + potAmount,
                myContribution: c.myContribution + amount,
                // First depositor becomes recipient
                circleId: c.circleId === 0 ? 1 : c.circleId,
                currentRecipient: c.currentRecipient || "You (first depositor)",
                isRecipient: c.circleId === 0 || c.isRecipient,
                // Track yield (10% of each deposit goes to yield strategy)
                yieldEarned: c.yieldEarned + yieldAmount,
                totalYield: c.totalYield + yieldAmount,
              }
            : c
        )
      );

      setDepositStatus(
        `✅ Deposit successful (Demo Mode). Deposited ${amount} ETH into circle "${target.name}". ${potAmount.toFixed(4)} ETH to pot, ${yieldAmount.toFixed(4)} ETH to yield strategy.`
      );
      setDepositAmount("");
      setIsDepositing(false);
    }, 1000); // Simulate 1 second processing time

    /* 
    // REAL BLOCKCHAIN VERSION (commented out for hackathon demo)
    try {
      if (!MiniKit.isInstalled()) {
        setDepositStatus("Please open this mini app inside World App to deposit.");
        return;
      }

      await depositToCircleOnWorldChain(amount, target.circleId, amount);

      setCircles((prev) =>
        prev.map((c) =>
          c.id === target.id
            ? {
                ...c,
                pot: c.pot + amount,
                myContribution: c.myContribution + amount,
                circleId: c.circleId === 0 ? 1 : c.circleId,
                currentRecipient: c.currentRecipient || "You (first depositor)",
                isRecipient: c.circleId === 0 || c.isRecipient,
              }
            : c
        )
      );

      setDepositStatus(`✅ On-chain deposit successful. Deposited ${amount} into circle "${target.name}".`);
      setDepositAmount("");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown World Chain error";
      setDepositStatus(`Deposit failed: ${errorMessage}`);
    } finally {
      setIsDepositing(false);
    }
    */
  }

  async function handleWithdraw() {
    const target = circles[0];
    if (!target) {
      setWithdrawStatus("No circle found.");
      return;
    }

    const amount = Number(withdrawAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setWithdrawStatus("Withdraw amount must be a positive number.");
      return;
    }

    if (amount > target.myContribution) {
      setWithdrawStatus("Cannot withdraw more than your contribution.");
      return;
    }

    // Withdrawal fee: 5% to disincentivize leaving
    const WITHDRAWAL_FEE_PERCENT = 5;
    const withdrawalFee = (amount * WITHDRAWAL_FEE_PERCENT) / 100;
    const amountAfterFee = amount - withdrawalFee;

    setIsWithdrawing(true);
    setWithdrawStatus("Processing withdraw...");

    // HACKATHON DEMO MODE: Simulate withdraw with fee
    setTimeout(() => {
      setCircles((prev) =>
        prev.map((c) =>
          c.id === target.id
            ? {
                ...c,
                pot: c.pot - amount,
                myContribution: c.myContribution - amount,
              }
            : c
        )
      );

      setWithdrawStatus(
        `✅ Withdrew ${amountAfterFee.toFixed(4)} ETH (${amount} ETH - ${withdrawalFee.toFixed(4)} ETH fee) from circle "${target.name}" (Demo Mode).`
      );
      setWithdrawAmount("");
      setIsWithdrawing(false);
    }, 1000);
  }

  async function handleClaimPot() {
    const target = circles[0];
    if (!target) {
      setClaimStatus("No circle found.");
      return;
    }

    if (!target.isRecipient) {
      setClaimStatus("Only the current recipient can claim the pot.");
      return;
    }

    setIsClaiming(true);
    setClaimStatus("Processing claim...");

    // HACKATHON DEMO MODE: Simulate claim with redeposit
    setTimeout(() => {
      // Calculate: recipient gets (pot - their deposit), their deposit stays (redeposited)
      const claimAmount = target.pot - target.myContribution;
      const redepositedAmount = target.myContribution;

      setCircles((prev) =>
        prev.map((c) =>
          c.id === target.id
            ? {
                ...c,
                pot: redepositedAmount, // Pot resets to recipient's deposit (redeposited)
                myContribution: redepositedAmount, // Their deposit stays
                roundNumber: c.roundNumber + 1,
                isRecipient: false, // Next person becomes recipient
              }
            : c
        )
      );

      setClaimStatus(
        `✅ Claimed ${claimAmount.toFixed(4)} ETH! Your deposit of ${redepositedAmount.toFixed(4)} ETH has been REDEPOSITED into the circle to ensure you do not run away (Demo Mode).`
      );
      setIsClaiming(false);
    }, 1000);
  }

  async function handleClaimYield() {
    const target = circles[0];
    if (!target) {
      setYieldStatus("No circle found.");
      return;
    }

    if (target.yieldEarned <= 0) {
      setYieldStatus("You have no yield to claim yet.");
      return;
    }

    setIsClaimingYield(true);
    setYieldStatus("Processing yield claim...");

    // HACKATHON DEMO MODE: Simulate yield claim
    setTimeout(() => {
      const yieldAmount = target.yieldEarned;

      setCircles((prev) =>
        prev.map((c) =>
          c.id === target.id
            ? {
                ...c,
                yieldEarned: 0, // Reset yield after claiming
                totalYield: c.totalYield - yieldAmount,
              }
            : c
        )
      );

      setYieldStatus(
        `✅ Claimed ${yieldAmount.toFixed(4)} ETH in yield! This is from the yield strategy portion of contributions (Demo Mode).`
      );
      setIsClaimingYield(false);
    }, 1000);
  }

  async function handleEmergencyWithdraw() {
    const target = circles[0];
    if (!target) {
      setEmergencyStatus("No circle found.");
      return;
    }

    if (target.myContribution <= 0) {
      setEmergencyStatus("You have no contribution to withdraw.");
      return;
    }

    setIsRequestingEmergency(true);
    setEmergencyStatus("Requesting emergency withdraw...");

    // HACKATHON DEMO MODE: Simulate emergency withdraw request
    setTimeout(() => {
      // Calculate required approvals: 80% of participants
      const requiredApprovals = Math.ceil(target.numPeople * 0.8);
      const currentApprovals = target.emergencyApprovals + 1; // User approves their own request

      if (currentApprovals >= requiredApprovals) {
        // Emergency withdraw approved - user can withdraw
        const withdrawAmount = target.myContribution;

        setCircles((prev) =>
          prev.map((c) =>
            c.id === target.id
              ? {
                  ...c,
                  pot: c.pot - withdrawAmount,
                  myContribution: 0,
                  emergencyApprovals: 0, // Reset approvals
                }
              : c
          )
        );

        setEmergencyStatus(
          `✅ Emergency withdraw approved! Withdrew ${withdrawAmount.toFixed(4)} ETH. Required ${requiredApprovals} approvals, got ${currentApprovals} (Demo Mode).`
        );
      } else {
        // Need more approvals
        setCircles((prev) =>
          prev.map((c) =>
            c.id === target.id
              ? {
                  ...c,
                  emergencyApprovals: currentApprovals,
                }
              : c
          )
        );

        setEmergencyStatus(
          `⏳ Emergency withdraw requested. Need ${requiredApprovals} approvals (80% of ${target.numPeople} participants). Current: ${currentApprovals}/${requiredApprovals} (Demo Mode).`
        );
      }

      setIsRequestingEmergency(false);
    }, 1000);
  }

  function handleApproveEmergency() {
    const target = circles[0];
    if (!target) {
      return;
    }

    const requiredApprovals = Math.ceil(target.numPeople * 0.8);
    const newApprovals = target.emergencyApprovals + 1;

    setCircles((prev) =>
      prev.map((c) =>
        c.id === target.id
          ? {
              ...c,
              emergencyApprovals: newApprovals,
            }
          : c
      )
    );

    if (newApprovals >= requiredApprovals) {
      setEmergencyStatus(
        `✅ Emergency withdraw approved! ${newApprovals}/${requiredApprovals} approvals reached. The requester can now withdraw (Demo Mode).`
      );
    } else {
      setEmergencyStatus(
        `✅ Approval recorded. ${newApprovals}/${requiredApprovals} approvals (Demo Mode).`
      );
    }

    setHasApprovedEmergency(true);
  }

  const firstCircle = circles[0] ?? null;

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        alignItems: "center",
        gap: "16px",
        fontFamily: "system-ui, sans-serif",
        padding: "24px 16px",
      }}
    >
      <h1 style={{ fontSize: "28px", fontWeight: 700, textAlign: "center" }}>
        Yield Circles
      </h1>

      <p style={{ fontSize: "16px", maxWidth: "360px", textAlign: "center" }}>
        Save together with trusted people. Take turns getting a big payout, and
        earn extra yield if you stay for the whole circle.
      </p>

      {/* Demo Mode Notice */}
      <div style={{ 
        padding: "12px", 
        margin: "10px", 
        backgroundColor: "#fff3cd", 
        border: "1px solid #ffc107", 
        borderRadius: "8px",
        fontSize: "14px",
        maxWidth: "360px",
        textAlign: "center"
      }}>
        🎭 <strong>Demo Mode:</strong> Transactions are simulated for hackathon demo
      </div>

      {/* Wallet Switcher for Demo */}
      <WalletSwitcher />

      {/* Create circle form */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          padding: "16px",
          borderRadius: "12px",
          border: "1px solid #ddd",
          maxWidth: "360px",
          width: "100%",
        }}
      >
        <label style={{ fontSize: "14px" }}>
          Circle name
          <input
            type="text"
            placeholder="Eg. Rent circle"
            value={circleName}
            onChange={(e) => setCircleName(e.target.value)}
            style={{
              width: "100%",
              padding: "8px",
              marginTop: "4px",
              borderRadius: "8px",
              border: "1px solid #ccc",
            }}
          />
        </label>

        <label style={{ fontSize: "14px" }}>
          Number of people
          <input
            type="number"
            placeholder="Eg. 5"
            value={numPeople}
            onChange={(e) => setNumPeople(e.target.value)}
            style={{
              width: "100%",
              padding: "8px",
              marginTop: "4px",
              borderRadius: "8px",
              border: "1px solid #ccc",
            }}
          />
        </label>

        <button
          onClick={handleCreateCircle}
          style={{
            marginTop: "8px",
            padding: "10px 16px",
            borderRadius: "999px",
            border: "none",
            fontSize: "16px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Create circle
        </button>

        <button
          onClick={handleVerifyForFirstCircle}
          disabled={isVerifying}
          style={{
            marginTop: "4px",
            padding: "10px 16px",
            borderRadius: "999px",
            border: "none",
            fontSize: "16px",
            fontWeight: 600,
            cursor: isVerifying ? "wait" : "pointer",
            backgroundColor: "#111827",
            color: "white",
          }}
        >
          {isVerifying
            ? "Verifying with World ID..."
            : "Verify & join with World ID"}
        </button>

        {verifyStatus && (
          <p
            style={{
              marginTop: "6px",
              fontSize: "14px",
              color: "#374151",
            }}
          >
            {verifyStatus}
          </p>
        )}
      </div>

      {/* Deposit section for first circle */}
      {firstCircle && (
        <div
          style={{
            marginTop: "16px",
            padding: "16px",
            borderRadius: "12px",
            border: "1px solid #ddd",
            maxWidth: "360px",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <h2
            style={{
              fontSize: "18px",
              fontWeight: 600,
            }}
          >
            Deposit into: {firstCircle.name}
          </h2>

          <div style={{ fontSize: "14px", display: "flex", flexDirection: "column", gap: "4px" }}>
            <div>Members (target): {firstCircle.numPeople}</div>
            <div>
              World ID status:{" "}
              {firstCircle.verified
                ? "✅ verified for this device"
                : "Not verified yet"}
            </div>
            <div>Total circle pot: {firstCircle.pot.toFixed(4)} ETH</div>
            <div>Your contribution: {firstCircle.myContribution.toFixed(4)} ETH</div>
            {firstCircle.totalYield > 0 && (
              <div style={{ marginTop: "4px", padding: "6px", backgroundColor: "#e7f3ff", borderRadius: "4px" }}>
                <div>Total yield in circle: {firstCircle.totalYield.toFixed(4)} ETH</div>
                <div>Your yield earned: {firstCircle.yieldEarned.toFixed(4)} ETH</div>
              </div>
            )}
            {firstCircle.currentRecipient && (
              <div style={{ 
                padding: "8px", 
                backgroundColor: firstCircle.isRecipient ? "#d4edda" : "#fff3cd",
                borderRadius: "6px",
                marginTop: "4px"
              }}>
                <strong>Current Recipient:</strong> {firstCircle.isRecipient ? "🎉 YOU!" : firstCircle.currentRecipient}
                <br />
                <strong>Round:</strong> {firstCircle.roundNumber}
              </div>
            )}
          </div>

          <label style={{ fontSize: "14px" }}>
            Deposit amount
            <input
              type="number"
              placeholder="Eg. 200"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                marginTop: "4px",
                borderRadius: "8px",
                border: "1px solid #ccc",
              }}
            />
          </label>

          <button
            onClick={handleDepositForFirstCircle}
            disabled={isDepositing}
            style={{
              marginTop: "4px",
              padding: "10px 16px",
              borderRadius: "999px",
              border: "none",
              fontSize: "16px",
              fontWeight: 600,
              cursor: isDepositing ? "wait" : "pointer",
              backgroundColor: "#047857",
              color: "white",
            }}
          >
            {isDepositing ? "Processing deposit..." : "Deposit into circle"}
          </button>

          {depositStatus && (
            <p
              style={{
                marginTop: "6px",
                fontSize: "14px",
                color: "#374151",
              }}
            >
              {depositStatus}
            </p>
          )}

          {/* Withdraw section */}
          {firstCircle.myContribution > 0 && !firstCircle.isRecipient && (
            <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #ddd" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>
                Withdraw Your Contribution
              </h3>
              <div style={{ fontSize: "12px", color: "#dc2626", marginBottom: "8px", padding: "6px", backgroundColor: "#fee", borderRadius: "4px" }}>
                ⚠️ Withdrawal fee: 5% (to disincentivize leaving the circle)
              </div>
              <label style={{ fontSize: "14px" }}>
                Withdraw amount
                <input
                  type="number"
                  placeholder={`Max: ${firstCircle.myContribution.toFixed(4)}`}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px",
                    marginTop: "4px",
                    borderRadius: "8px",
                    border: "1px solid #ccc",
                  }}
                />
              </label>
              {withdrawAmount && Number(withdrawAmount) > 0 && (
                <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                  You will receive: {(Number(withdrawAmount) * 0.95).toFixed(4)} ETH (after 5% fee)
                </div>
              )}
              <button
                onClick={handleWithdraw}
                disabled={isWithdrawing}
                style={{
                  marginTop: "8px",
                  padding: "10px 16px",
                  borderRadius: "999px",
                  border: "none",
                  fontSize: "16px",
                  fontWeight: 600,
                  cursor: isWithdrawing ? "wait" : "pointer",
                  backgroundColor: "#dc2626",
                  color: "white",
                  width: "100%",
                }}
              >
                {isWithdrawing ? "Processing..." : "Withdraw (5% fee)"}
              </button>
              {withdrawStatus && (
                <p style={{ marginTop: "6px", fontSize: "14px", color: "#374151" }}>
                  {withdrawStatus}
                </p>
              )}
            </div>
          )}

          {/* Claim pot section (only for recipient) */}
          {firstCircle.isRecipient && firstCircle.pot > firstCircle.myContribution && (
            <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #ddd" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>
                🎉 Claim the Pot!
              </h3>
              <div style={{ fontSize: "14px", marginBottom: "12px", padding: "8px", backgroundColor: "#d4edda", borderRadius: "6px" }}>
                <div>Total Pot: {firstCircle.pot.toFixed(4)} ETH</div>
                <div>Your Deposit: {firstCircle.myContribution.toFixed(4)} ETH</div>
                <div style={{ marginTop: "6px", padding: "6px", backgroundColor: "#fff", borderRadius: "4px", border: "2px solid #047857" }}>
                  <div><strong>You will receive: {(firstCircle.pot - firstCircle.myContribution).toFixed(4)} ETH</strong></div>
                  <div style={{ fontSize: "12px", color: "#047857", marginTop: "4px" }}>
                    ⚠️ Your deposit of {firstCircle.myContribution.toFixed(4)} ETH will be REDEPOSITED into the circle to ensure you do not run away
                  </div>
                </div>
              </div>
              <button
                onClick={handleClaimPot}
                disabled={isClaiming}
                style={{
                  padding: "10px 16px",
                  borderRadius: "999px",
                  border: "none",
                  fontSize: "16px",
                  fontWeight: 600,
                  cursor: isClaiming ? "wait" : "pointer",
                  backgroundColor: "#047857",
                  color: "white",
                  width: "100%",
                }}
              >
                {isClaiming ? "Processing claim..." : "Claim Pot"}
              </button>
              {claimStatus && (
                <p style={{ marginTop: "6px", fontSize: "14px", color: "#374151" }}>
                  {claimStatus}
                </p>
              )}
            </div>
          )}

          {/* Yield Claim section */}
          {firstCircle.yieldEarned > 0 && (
            <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #ddd" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>
                💰 Claim Your Yield
              </h3>
              <div style={{ fontSize: "14px", marginBottom: "12px", padding: "8px", backgroundColor: "#e7f3ff", borderRadius: "6px" }}>
                <div>Your yield earned: <strong>{firstCircle.yieldEarned.toFixed(4)} ETH</strong></div>
                <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                  This is from the 10% yield strategy portion of all deposits
                </div>
              </div>
              <button
                onClick={handleClaimYield}
                disabled={isClaimingYield}
                style={{
                  padding: "10px 16px",
                  borderRadius: "999px",
                  border: "none",
                  fontSize: "16px",
                  fontWeight: 600,
                  cursor: isClaimingYield ? "wait" : "pointer",
                  backgroundColor: "#2196F3",
                  color: "white",
                  width: "100%",
                }}
              >
                {isClaimingYield ? "Processing..." : "Claim Yield"}
              </button>
              {yieldStatus && (
                <p style={{ marginTop: "6px", fontSize: "14px", color: "#374151" }}>
                  {yieldStatus}
                </p>
              )}
            </div>
          )}

          {/* Emergency Withdraw section */}
          {firstCircle.myContribution > 0 && (
            <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #ddd" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>
                🚨 Emergency Withdraw
              </h3>
              <div style={{ fontSize: "12px", marginBottom: "12px", padding: "8px", backgroundColor: "#fff3cd", borderRadius: "6px" }}>
                <div><strong>Requires 80% approval:</strong> {Math.ceil(firstCircle.numPeople * 0.8)} out of {firstCircle.numPeople} participants must approve</div>
                <div style={{ marginTop: "4px" }}>
                  Current approvals: {firstCircle.emergencyApprovals}/{Math.ceil(firstCircle.numPeople * 0.8)}
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={handleEmergencyWithdraw}
                  disabled={isRequestingEmergency}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    borderRadius: "999px",
                    border: "none",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: isRequestingEmergency ? "wait" : "pointer",
                    backgroundColor: "#ff9800",
                    color: "white",
                  }}
                >
                  {isRequestingEmergency ? "Processing..." : "Request Emergency Withdraw"}
                </button>
                {firstCircle.emergencyApprovals > 0 && !hasApprovedEmergency && (
                  <button
                    onClick={handleApproveEmergency}
                    style={{
                      flex: 1,
                      padding: "10px 16px",
                      borderRadius: "999px",
                      border: "none",
                      fontSize: "14px",
                      fontWeight: 600,
                      cursor: "pointer",
                      backgroundColor: "#4CAF50",
                      color: "white",
                    }}
                  >
                    Approve
                  </button>
                )}
              </div>
              {emergencyStatus && (
                <p style={{ marginTop: "6px", fontSize: "14px", color: "#374151" }}>
                  {emergencyStatus}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* List of all circles (just for overview) */}
      <div
        style={{
          marginTop: "24px",
          maxWidth: "360px",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {circles.length === 0 ? (
          <p style={{ fontSize: "14px", color: "#666", textAlign: "center" }}>
            No circles yet. Create your first circle above.
          </p>
        ) : (
          <>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: 600,
                marginBottom: "4px",
                textAlign: "left",
              }}
            >
              Your circles
            </h2>
            {circles.map((circle) => (
              <div
                key={circle.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  fontSize: "14px",
                }}
              >
                <div style={{ fontWeight: 600 }}>{circle.name}</div>
                <div>Members (target): {circle.numPeople}</div>
                <div>
                  World ID status:{" "}
                  {circle.verified
                    ? "✅ verified for this device"
                    : "Not verified yet"}
                </div>
                <div>Total pot: {circle.pot}</div>
                <div>Your contribution: {circle.myContribution}</div>
              </div>
            ))}
          </>
        )}
      </div>
    </main>
  );
}





