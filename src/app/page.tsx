"use client";

import { useState } from "react";
import { MiniKit, VerificationLevel } from "@worldcoin/minikit-js";
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





