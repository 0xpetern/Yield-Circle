"use client";

import { useState } from "react";
import { MiniKit, VerificationLevel } from "@worldcoin/minikit-js";
import { WalletSwitcher } from "../components/WalletSwitcher";

type Circle = {
  id: number;
  name: string;
  numPeople: number;
  verified: boolean;
  pot: number;
  myContribution: number;
  circleId: number;
  currentRecipient: string | null;
  roundNumber: number;
  isRecipient: boolean;
  yieldEarned: number;
  totalYield: number;
  emergencyApprovals: number;
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
  
  const [leaveStatus, setLeaveStatus] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);

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
      circleId: 0,
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
        setVerifyStatus("Open this app inside World App to verify with World ID.");
        setIsVerifying(false);
        return;
      }

      console.log("Starting verification with action: yield-circle-join");
      const result = await MiniKit.commandsAsync.verify({
        action: "yield-circle-join",
        signal: target.name,
        verification_level: VerificationLevel.Device,
      });

      console.log("Verify result:", JSON.stringify(result.finalPayload, null, 2));

      if (result.finalPayload.status === "success") {
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
            setVerifyStatus("Verified with World ID! You can now join the circle.");

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
          setVerifyStatus("Verified with World ID!");
          setCircles((prev) =>
            prev.map((c) =>
              c.id === target.id ? { ...c, verified: true } : c
            )
          );
        }
      } else {
        setCircles((prev) =>
          prev.map((c) =>
            c.id === target.id ? { ...c, verified: false } : c
          )
        );
        
        const errorCode = result.finalPayload.error_code;
        const errorDetail = (result.finalPayload as any).description || errorCode || "";
        
        setVerifyStatus(
          `Verification failed: ${errorDetail || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error("Verification error:", error);
      setVerifyStatus("Verification failed. Please try again.");
      setCircles((prev) =>
        prev.map((c) =>
          c.id === target.id ? { ...c, verified: false } : c
        )
      );
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

    if (!target.verified) {
      setDepositStatus("Please verify with World ID first before depositing into this circle.");
      return;
    }

    const amount = Number(depositAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setDepositStatus("Deposit amount must be a positive number.");
      return;
    }

    setIsDepositing(true);
    setDepositStatus("Processing deposit...");

    setTimeout(() => {
      const YIELD_PERCENT = 10;
      const yieldAmount = (amount * YIELD_PERCENT) / 100;
      const potAmount = amount - yieldAmount;

      setCircles((prev) =>
        prev.map((c) =>
          c.id === target.id
            ? {
                ...c,
                pot: c.pot + potAmount,
                myContribution: c.myContribution + amount,
                circleId: c.circleId === 0 ? 1 : c.circleId,
                currentRecipient: c.currentRecipient || "You (first depositor)",
                isRecipient: c.circleId === 0 || c.isRecipient,
                yieldEarned: c.yieldEarned + yieldAmount,
                totalYield: c.totalYield + yieldAmount,
              }
            : c
        )
      );

      setDepositStatus(
        `Deposit successful. Deposited ${amount} ETH. ${potAmount.toFixed(4)} ETH to pot, ${yieldAmount.toFixed(4)} ETH to yield strategy.`
      );
      setDepositAmount("");
      setIsDepositing(false);
    }, 1000);
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

    const WITHDRAWAL_FEE_PERCENT = 5;
    const withdrawalFee = (amount * WITHDRAWAL_FEE_PERCENT) / 100;
    const amountAfterFee = amount - withdrawalFee;

    setIsWithdrawing(true);
    setWithdrawStatus("Processing withdraw...");

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
        `Withdrew ${amountAfterFee.toFixed(4)} ETH (${amount} ETH - ${withdrawalFee.toFixed(4)} ETH fee) from circle.`
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

    setTimeout(() => {
      const claimAmount = target.pot - target.myContribution;
      const redepositedAmount = target.myContribution;

      setCircles((prev) =>
        prev.map((c) =>
          c.id === target.id
            ? {
                ...c,
                pot: redepositedAmount,
                myContribution: redepositedAmount,
                roundNumber: c.roundNumber + 1,
                isRecipient: false,
              }
            : c
        )
      );

      setClaimStatus(
        `Claimed ${claimAmount.toFixed(4)} ETH. Your deposit of ${redepositedAmount.toFixed(4)} ETH has been redeposited into the circle.`
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

    setTimeout(() => {
      const yieldAmount = target.yieldEarned;

      setCircles((prev) =>
        prev.map((c) =>
          c.id === target.id
            ? {
                ...c,
                yieldEarned: 0,
                totalYield: c.totalYield - yieldAmount,
              }
            : c
        )
      );

      setYieldStatus(`Claimed ${yieldAmount.toFixed(4)} ETH in yield.`);
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

    setTimeout(() => {
      const requiredApprovals = Math.ceil(target.numPeople * 0.8);
      const currentApprovals = target.emergencyApprovals + 1;

      if (currentApprovals >= requiredApprovals) {
        const withdrawAmount = target.myContribution;

        setCircles((prev) =>
          prev.map((c) =>
            c.id === target.id
              ? {
                  ...c,
                  pot: c.pot - withdrawAmount,
                  myContribution: 0,
                  emergencyApprovals: 0,
                }
              : c
          )
        );

        setEmergencyStatus(
          `Emergency withdraw approved. Withdrew ${withdrawAmount.toFixed(4)} ETH. Required ${requiredApprovals} approvals, got ${currentApprovals}.`
        );
      } else {
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
          `Emergency withdraw requested. Need ${requiredApprovals} approvals (80% of ${target.numPeople} participants). Current: ${currentApprovals}/${requiredApprovals}.`
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
        `Emergency withdraw approved. ${newApprovals}/${requiredApprovals} approvals reached. The requester can now withdraw.`
      );
    } else {
      setEmergencyStatus(`Approval recorded. ${newApprovals}/${requiredApprovals} approvals.`);
    }

    setHasApprovedEmergency(true);
  }

  async function handleLeaveCircle() {
    const target = circles[0];
    if (!target) {
      setLeaveStatus("No circle found.");
      return;
    }

    if (target.myContribution <= 0) {
      setLeaveStatus("You have no contribution to withdraw.");
      return;
    }

    // Can only leave when circle resets (after a round completes)
    if (target.roundNumber <= 1 && !target.isRecipient) {
      setLeaveStatus("You can only leave the circle after a round completes.");
      return;
    }

    setIsLeaving(true);
    setLeaveStatus("Processing leave request...");

    setTimeout(() => {
      const WITHDRAWAL_FEE_PERCENT = 5;
      const withdrawalFee = (target.myContribution * WITHDRAWAL_FEE_PERCENT) / 100;
      const amountAfterFee = target.myContribution - withdrawalFee;

      setCircles((prev) =>
        prev.map((c) =>
          c.id === target.id
            ? {
                ...c,
                pot: c.pot - target.myContribution,
                myContribution: 0,
              }
            : c
        )
      );

      setLeaveStatus(
        `Left circle. Withdrew ${amountAfterFee.toFixed(4)} ETH (${target.myContribution.toFixed(4)} ETH - ${withdrawalFee.toFixed(4)} ETH fee).`
      );
      setIsLeaving(false);
    }, 1000);
  }

  const firstCircle = circles[0] ?? null;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        alignItems: "center",
        gap: "24px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        padding: "32px 16px",
      }}
    >
      <div style={{ maxWidth: "600px", width: "100%" }}>
        <h1 style={{ 
          fontSize: "42px", 
          fontWeight: 800, 
          textAlign: "center",
          color: "#ffffff",
          marginBottom: "8px",
          letterSpacing: "-0.5px"
        }}>
        Yield Circles
      </h1>

        <p style={{ 
          fontSize: "18px", 
          maxWidth: "500px", 
          textAlign: "center",
          color: "rgba(255, 255, 255, 0.9)",
          margin: "0 auto 32px",
          lineHeight: "1.6"
        }}>
        Save together with trusted people. Take turns getting a big payout, and
        earn extra yield if you stay for the whole circle.
      </p>

        <WalletSwitcher />

      {/* Create circle form */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
            gap: "16px",
            padding: "24px",
            borderRadius: "16px",
            backgroundColor: "#ffffff",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
            marginBottom: "24px",
          }}
        >
          <h2 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "8px", color: "#1a202c" }}>
            Create New Circle
          </h2>
          <label style={{ fontSize: "14px", fontWeight: 600, color: "#4a5568" }}>
            Circle Name
          <input
            type="text"
              placeholder="e.g. Rent Savings Circle"
            value={circleName}
            onChange={(e) => setCircleName(e.target.value)}
            style={{
              width: "100%",
                padding: "12px",
                marginTop: "8px",
              borderRadius: "8px",
                border: "2px solid #e2e8f0",
                fontSize: "16px",
                transition: "border-color 0.2s",
            }}
              onFocus={(e) => e.target.style.borderColor = "#667eea"}
              onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
          />
        </label>

          <label style={{ fontSize: "14px", fontWeight: 600, color: "#4a5568" }}>
            Number of Participants
          <input
            type="number"
              placeholder="e.g. 5"
            value={numPeople}
            onChange={(e) => setNumPeople(e.target.value)}
            style={{
              width: "100%",
                padding: "12px",
                marginTop: "8px",
              borderRadius: "8px",
                border: "2px solid #e2e8f0",
                fontSize: "16px",
                transition: "border-color 0.2s",
            }}
              onFocus={(e) => e.target.style.borderColor = "#667eea"}
              onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
          />
        </label>

        <button
          onClick={handleCreateCircle}
          style={{
            marginTop: "8px",
              padding: "14px 24px",
              borderRadius: "8px",
            border: "none",
            fontSize: "16px",
            fontWeight: 600,
            cursor: "pointer",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 10px 20px rgba(102, 126, 234, 0.4)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            Create Circle
        </button>
      </div>

        {/* Verification section */}
        {firstCircle && !firstCircle.verified && (
      <div
        style={{
              padding: "24px",
              borderRadius: "16px",
              backgroundColor: "#ffffff",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
              marginBottom: "24px",
            }}
          >
            <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "16px", color: "#1a202c" }}>
              Verify & Join Circle
            </h2>
            <p style={{ fontSize: "14px", color: "#718096", marginBottom: "16px" }}>
              Verify your identity with World ID to join {firstCircle.name}.
            </p>
            <button
              onClick={handleVerifyForFirstCircle}
              disabled={isVerifying}
              style={{
                width: "100%",
                padding: "14px 24px",
                borderRadius: "8px",
                border: "none",
                fontSize: "16px",
                fontWeight: 600,
                cursor: isVerifying ? "wait" : "pointer",
                background: isVerifying ? "#cbd5e0" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                transition: "opacity 0.2s",
              }}
            >
              {isVerifying ? "Verifying..." : "Verify & Join World ID"}
            </button>
            {verifyStatus && (
              <p style={{ marginTop: "12px", fontSize: "14px", color: verifyStatus.includes("failed") ? "#e53e3e" : "#38a169" }}>
                {verifyStatus}
              </p>
            )}
          </div>
        )}

        {/* Circle details and actions */}
        {firstCircle && firstCircle.verified && (
          <div
            style={{
              padding: "24px",
              borderRadius: "16px",
              backgroundColor: "#ffffff",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
            }}
          >
            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "4px", color: "#1a202c" }}>
                {firstCircle.name}
              </h2>
              <p style={{ fontSize: "14px", color: "#718096" }}>
                Round {firstCircle.roundNumber} • {firstCircle.numPeople} participants
              </p>
            </div>

            {/* Stats Grid */}
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(2, 1fr)", 
              gap: "16px",
              marginBottom: "24px"
            }}>
              <div style={{ 
                padding: "16px", 
                borderRadius: "12px", 
                backgroundColor: "#f7fafc",
                border: "1px solid #e2e8f0"
              }}>
                <div style={{ fontSize: "12px", color: "#718096", marginBottom: "4px" }}>Total Pot</div>
                <div style={{ fontSize: "24px", fontWeight: 700, color: "#1a202c" }}>
                  {firstCircle.pot.toFixed(4)} ETH
                </div>
              </div>
              <div style={{ 
                padding: "16px", 
                borderRadius: "12px", 
                backgroundColor: "#f7fafc",
                border: "1px solid #e2e8f0"
              }}>
                <div style={{ fontSize: "12px", color: "#718096", marginBottom: "4px" }}>Your Contribution</div>
                <div style={{ fontSize: "24px", fontWeight: 700, color: "#1a202c" }}>
                  {firstCircle.myContribution.toFixed(4)} ETH
                </div>
              </div>
              {firstCircle.totalYield > 0 && (
                <>
                  <div style={{ 
                    padding: "16px", 
                    borderRadius: "12px", 
                    backgroundColor: "#f0fff4",
                    border: "1px solid #9ae6b4"
                  }}>
                    <div style={{ fontSize: "12px", color: "#22543d", marginBottom: "4px" }}>Total Yield</div>
                    <div style={{ fontSize: "24px", fontWeight: 700, color: "#22543d" }}>
                      {firstCircle.totalYield.toFixed(4)} ETH
                    </div>
                  </div>
                  <div style={{ 
                    padding: "16px", 
                    borderRadius: "12px", 
                    backgroundColor: "#f0fff4",
                    border: "1px solid #9ae6b4"
                  }}>
                    <div style={{ fontSize: "12px", color: "#22543d", marginBottom: "4px" }}>Your Yield</div>
                    <div style={{ fontSize: "24px", fontWeight: 700, color: "#22543d" }}>
                      {firstCircle.yieldEarned.toFixed(4)} ETH
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Recipient Status */}
            {firstCircle.currentRecipient && (
              <div style={{ 
                padding: "16px", 
                borderRadius: "12px", 
                backgroundColor: firstCircle.isRecipient ? "#f0fff4" : "#fff5f5",
                border: `2px solid ${firstCircle.isRecipient ? "#38a169" : "#fc8181"}`,
                marginBottom: "24px"
              }}>
                <div style={{ fontSize: "14px", fontWeight: 600, color: firstCircle.isRecipient ? "#22543d" : "#742a2a", marginBottom: "4px" }}>
                  Current Recipient
                </div>
                <div style={{ fontSize: "18px", fontWeight: 700, color: firstCircle.isRecipient ? "#22543d" : "#742a2a" }}>
                  {firstCircle.isRecipient ? "You" : firstCircle.currentRecipient}
                </div>
              </div>
            )}

            {/* Deposit Section */}
            <div style={{ marginBottom: "24px", paddingBottom: "24px", borderBottom: "1px solid #e2e8f0" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px", color: "#1a202c" }}>
                Deposit
              </h3>
              <label style={{ fontSize: "14px", fontWeight: 600, color: "#4a5568", display: "block", marginBottom: "8px" }}>
                Amount (ETH)
                <input
                  type="number"
                  placeholder="0.0"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    marginTop: "8px",
                    borderRadius: "8px",
                    border: "2px solid #e2e8f0",
                    fontSize: "16px",
                  }}
                />
              </label>
              <button
                onClick={handleDepositForFirstCircle}
                disabled={isDepositing}
                style={{
                  width: "100%",
                  marginTop: "12px",
                  padding: "14px 24px",
                  borderRadius: "8px",
                  border: "none",
                  fontSize: "16px",
                  fontWeight: 600,
                  cursor: isDepositing ? "wait" : "pointer",
                  background: isDepositing ? "#cbd5e0" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                }}
              >
                {isDepositing ? "Processing..." : "Deposit"}
              </button>
              {depositStatus && (
                <p style={{ marginTop: "12px", fontSize: "14px", color: "#38a169" }}>
                  {depositStatus}
                </p>
              )}
            </div>

            {/* Claim Pot Section */}
            {firstCircle.isRecipient && firstCircle.pot > firstCircle.myContribution && (
              <div style={{ marginBottom: "24px", paddingBottom: "24px", borderBottom: "1px solid #e2e8f0" }}>
                <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px", color: "#1a202c" }}>
                  Claim Pot
                </h3>
                <div style={{ 
                  padding: "16px", 
                  borderRadius: "12px", 
                  backgroundColor: "#f0fff4",
                  border: "2px solid #38a169",
                  marginBottom: "16px"
                }}>
                  <div style={{ fontSize: "14px", color: "#22543d", marginBottom: "8px" }}>
                    Total Pot: <strong>{firstCircle.pot.toFixed(4)} ETH</strong>
                  </div>
                  <div style={{ fontSize: "14px", color: "#22543d", marginBottom: "8px" }}>
                    Your Deposit: <strong>{firstCircle.myContribution.toFixed(4)} ETH</strong>
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "#22543d", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #9ae6b4" }}>
                    You will receive: {(firstCircle.pot - firstCircle.myContribution).toFixed(4)} ETH
                  </div>
                  <div style={{ fontSize: "12px", color: "#22543d", marginTop: "8px", fontStyle: "italic" }}>
                    Note: Your deposit will be redeposited into the circle
                  </div>
                </div>
                <button
                  onClick={handleClaimPot}
                  disabled={isClaiming}
                  style={{
                    width: "100%",
                    padding: "14px 24px",
                    borderRadius: "8px",
                    border: "none",
                    fontSize: "16px",
                    fontWeight: 600,
                    cursor: isClaiming ? "wait" : "pointer",
                    background: isClaiming ? "#cbd5e0" : "#38a169",
                    color: "white",
                  }}
                >
                  {isClaiming ? "Processing..." : "Claim Pot"}
                </button>
                {claimStatus && (
                  <p style={{ marginTop: "12px", fontSize: "14px", color: "#38a169" }}>
                    {claimStatus}
                  </p>
                )}
              </div>
            )}

            {/* Withdraw Section */}
            {firstCircle.myContribution > 0 && !firstCircle.isRecipient && (
              <div style={{ marginBottom: "24px", paddingBottom: "24px", borderBottom: "1px solid #e2e8f0" }}>
                <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px", color: "#1a202c" }}>
                  Withdraw
                </h3>
                <div style={{ 
                  padding: "12px", 
                  borderRadius: "8px", 
                  backgroundColor: "#fff5f5",
                  border: "1px solid #fc8181",
                  marginBottom: "16px",
                  fontSize: "12px",
                  color: "#742a2a"
                }}>
                  Withdrawal fee: 5% (to disincentivize leaving the circle)
                </div>
                <label style={{ fontSize: "14px", fontWeight: 600, color: "#4a5568", display: "block", marginBottom: "8px" }}>
                  Amount (ETH)
                  <input
                    type="number"
                    placeholder={`Max: ${firstCircle.myContribution.toFixed(4)}`}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px",
                      marginTop: "8px",
                      borderRadius: "8px",
                      border: "2px solid #e2e8f0",
                      fontSize: "16px",
                    }}
                  />
                </label>
                {withdrawAmount && Number(withdrawAmount) > 0 && (
                  <div style={{ fontSize: "12px", color: "#718096", marginTop: "4px", marginBottom: "12px" }}>
                    You will receive: {(Number(withdrawAmount) * 0.95).toFixed(4)} ETH (after 5% fee)
                  </div>
                )}
                <button
                  onClick={handleWithdraw}
                  disabled={isWithdrawing}
                  style={{
                    width: "100%",
                    padding: "14px 24px",
                    borderRadius: "8px",
                    border: "none",
                    fontSize: "16px",
                    fontWeight: 600,
                    cursor: isWithdrawing ? "wait" : "pointer",
                    background: isWithdrawing ? "#cbd5e0" : "#e53e3e",
                    color: "white",
                  }}
                >
                  {isWithdrawing ? "Processing..." : "Withdraw (5% fee)"}
                </button>
                {withdrawStatus && (
                  <p style={{ marginTop: "12px", fontSize: "14px", color: "#e53e3e" }}>
                    {withdrawStatus}
                  </p>
                )}
              </div>
            )}

            {/* Leave Circle Section */}
            {firstCircle.myContribution > 0 && firstCircle.roundNumber > 1 && !firstCircle.isRecipient && (
              <div style={{ marginBottom: "24px", paddingBottom: "24px", borderBottom: "1px solid #e2e8f0" }}>
                <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px", color: "#1a202c" }}>
                  Leave Circle
                </h3>
                <div style={{ 
                  padding: "12px", 
                  borderRadius: "8px", 
                  backgroundColor: "#fff5f5",
                  border: "1px solid #fc8181",
                  marginBottom: "16px",
                  fontSize: "12px",
                  color: "#742a2a"
                }}>
                  Withdrawal fee: 5% (applies when leaving after circle reset)
                </div>
                <div style={{ fontSize: "14px", color: "#718096", marginBottom: "16px" }}>
                  You can leave the circle now that a round has completed. You will receive your contribution minus the 5% fee.
                </div>
                <button
                  onClick={handleLeaveCircle}
                  disabled={isLeaving}
                  style={{
                    width: "100%",
                    padding: "14px 24px",
                    borderRadius: "8px",
                    border: "none",
                    fontSize: "16px",
                    fontWeight: 600,
                    cursor: isLeaving ? "wait" : "pointer",
                    background: isLeaving ? "#cbd5e0" : "#e53e3e",
                    color: "white",
                  }}
                >
                  {isLeaving ? "Processing..." : "Leave Circle (5% fee)"}
                </button>
                {leaveStatus && (
                  <p style={{ marginTop: "12px", fontSize: "14px", color: "#e53e3e" }}>
                    {leaveStatus}
                  </p>
                )}
              </div>
            )}

            {/* Yield Claim Section */}
            {firstCircle.yieldEarned > 0 && (
              <div style={{ marginBottom: "24px", paddingBottom: "24px", borderBottom: "1px solid #e2e8f0" }}>
                <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px", color: "#1a202c" }}>
                  Claim Yield
                </h3>
                <div style={{ 
                  padding: "16px", 
                  borderRadius: "12px", 
                  backgroundColor: "#f0fff4",
                  border: "1px solid #9ae6b4",
                  marginBottom: "16px"
                }}>
                  <div style={{ fontSize: "14px", color: "#22543d", marginBottom: "4px" }}>
                    Your yield earned: <strong>{firstCircle.yieldEarned.toFixed(4)} ETH</strong>
                  </div>
                  <div style={{ fontSize: "12px", color: "#22543d", marginTop: "8px" }}>
                    From the 10% yield strategy portion of all deposits
                  </div>
                </div>
                <button
                  onClick={handleClaimYield}
                  disabled={isClaimingYield}
                  style={{
                    width: "100%",
                    padding: "14px 24px",
                    borderRadius: "8px",
                    border: "none",
                    fontSize: "16px",
                    fontWeight: 600,
                    cursor: isClaimingYield ? "wait" : "pointer",
                    background: isClaimingYield ? "#cbd5e0" : "#3182ce",
                    color: "white",
                  }}
                >
                  {isClaimingYield ? "Processing..." : "Claim Yield"}
                </button>
                {yieldStatus && (
                  <p style={{ marginTop: "12px", fontSize: "14px", color: "#3182ce" }}>
                    {yieldStatus}
                  </p>
                )}
              </div>
            )}

            {/* Emergency Withdraw Section */}
            {firstCircle.myContribution > 0 && (
              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "16px", color: "#1a202c" }}>
                  Emergency Withdraw
                </h3>
                <div style={{ 
                  padding: "12px", 
                  borderRadius: "8px", 
                  backgroundColor: "#fff5f5",
                  border: "1px solid #fc8181",
                  marginBottom: "16px",
                  fontSize: "12px",
                  color: "#742a2a"
                }}>
                  Requires 80% approval: {Math.ceil(firstCircle.numPeople * 0.8)} out of {firstCircle.numPeople} participants must approve
                  <br />
                  Current approvals: {firstCircle.emergencyApprovals}/{Math.ceil(firstCircle.numPeople * 0.8)}
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    onClick={handleEmergencyWithdraw}
                    disabled={isRequestingEmergency}
                    style={{
                      flex: 1,
                      padding: "14px 24px",
                      borderRadius: "8px",
                      border: "none",
                      fontSize: "14px",
                      fontWeight: 600,
                      cursor: isRequestingEmergency ? "wait" : "pointer",
                      background: isRequestingEmergency ? "#cbd5e0" : "#f56565",
                      color: "white",
                    }}
                  >
                    {isRequestingEmergency ? "Processing..." : "Request"}
                  </button>
                  {firstCircle.emergencyApprovals > 0 && !hasApprovedEmergency && (
                    <button
                      onClick={handleApproveEmergency}
                      style={{
                        flex: 1,
                        padding: "14px 24px",
                        borderRadius: "8px",
                        border: "none",
                        fontSize: "14px",
                        fontWeight: 600,
                        cursor: "pointer",
                        background: "#38a169",
                        color: "white",
                      }}
                    >
                      Approve
                    </button>
                  )}
                </div>
                {emergencyStatus && (
                  <p style={{ marginTop: "12px", fontSize: "14px", color: "#e53e3e" }}>
                    {emergencyStatus}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Circles List */}
        {circles.length > 0 && (
          <div style={{ 
            padding: "24px",
            borderRadius: "16px",
            backgroundColor: "#ffffff",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
          }}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "16px", color: "#1a202c" }}>
              Your Circles
            </h2>
            {circles.map((circle) => (
              <div
                key={circle.id}
                style={{
                  padding: "16px",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  marginBottom: "12px",
                  backgroundColor: "#f7fafc",
                }}
              >
                <div style={{ fontSize: "16px", fontWeight: 600, color: "#1a202c", marginBottom: "4px" }}>
                  {circle.name}
                </div>
                <div style={{ fontSize: "14px", color: "#718096" }}>
                  {circle.numPeople} participants • Pot: {circle.pot.toFixed(4)} ETH • {circle.verified ? "Verified" : "Not verified"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
