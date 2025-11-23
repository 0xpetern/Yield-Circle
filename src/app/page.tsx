"use client";

import { useState } from "react";
import { MiniKit } from "@worldcoin/minikit-js";
import { depositToCircleOnWorldChain } from "../lib/worldPayment";

type Circle = {
  id: number;
  name: string;
  numPeople: number;
  verified: boolean;
  pot: number; // total balance in this circle (local tracking)
  myContribution: number; // how much this user/device has deposited (local tracking)
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
      // HACKATHON WORKAROUND: Use the test verification link from World ID portal
      const verificationLink = "https://worldcoin.org/verify?t=wld&i=8b1aac16-3f48-454f-a757-7bde28c2176d&k=dtrVN0X1nBEQKSUJLKOmrwGwhL%2F65fOovSqriVMLoD0%3D";
      
      // Try to open in new window/tab
      const verifyWindow = window.open(verificationLink, "_blank");
      
      if (verifyWindow) {
        setVerifyStatus("Verification page opened. Complete verification, then click 'I completed verification' below.");
      } else {
        // Popup blocked, redirect in same window
        setVerifyStatus("Opening verification... Complete it and return to mark as verified.");
        window.location.href = verificationLink;
      }
      
      setIsVerifying(false); // Allow manual verify button to work
      
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Verification error. Please try again.";
      setVerifyStatus(errorMessage);
      setIsVerifying(false);
    }
  }

  // Helper function to manually mark as verified (for hackathon demo)
  function handleManualVerify() {
    if (circles.length === 0) return;
    const target = circles[0];
    setCircles((prev) =>
      prev.map((c) =>
        c.id === target.id ? { ...c, verified: true } : c
      )
    );
    setVerifyStatus(
      `✅ Verified! You can now join the circle "${target.name}".`
    );
    setIsVerifying(false);
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

    try {
      // Check if MiniKit is installed before attempting payment
      if (!MiniKit.isInstalled()) {
        setDepositStatus(
          "Please open this mini app inside World App to deposit."
        );
        return;
      }

      // Call the World Chain payment helper
      await depositToCircleOnWorldChain(amount, target.name);

      // If payment succeeds, update local state
      setCircles((prev) =>
        prev.map((c) =>
          c.id === target.id
            ? {
                ...c,
                pot: c.pot + amount,
                myContribution: c.myContribution + amount,
              }
            : c
        )
      );

      setDepositStatus(
        `✅ On-chain deposit successful. Deposited ${amount} into circle "${target.name}".`
      );
      setDepositAmount("");
    } catch (error) {
      // Handle errors from the deposit helper
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown World Chain error";
      setDepositStatus(`Deposit failed: ${errorMessage}`);
    } finally {
      setIsDepositing(false);
    }
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

        {/* Hackathon workaround: Manual verify button */}
        {!firstCircle?.verified && (
          <button
            onClick={handleManualVerify}
            style={{
              marginTop: "8px",
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
              backgroundColor: "#f9fafb",
              color: "#374151",
            }}
          >
            I completed verification (Demo)
          </button>
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

          <div style={{ fontSize: "14px" }}>
            <div>Members (target): {firstCircle.numPeople}</div>
            <div>
              World ID status:{" "}
              {firstCircle.verified
                ? "✅ verified for this device"
                : "Not verified yet"}
            </div>
            <div>Total circle pot: {firstCircle.pot}</div>
            <div>Your contribution: {firstCircle.myContribution}</div>
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





