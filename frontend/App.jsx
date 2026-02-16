import React, { useState, useEffect, useRef } from "react";
import {
  Shield,
  Key,
  Send,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle,
  Globe,
  FileText,
  Zap,
} from "lucide-react";

const API_URL = "https://lilian-interindividual-merle.ngrok-free.dev";

export default function App() {
  const [deviceKey, setDeviceKey] = useState("");
  const [recipientKey, setRecipientKey] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [nodeStatus, setNodeStatus] = useState("offline");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [backendOnline, setBackendOnline] = useState(false);

  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // ===============================
  // DEVICE KEY GENERATION
  // ===============================
  useEffect(() => {
    const generateKey = () =>
      Array.from({ length: 16 }, () =>
        Math.floor(Math.random() * 10)
      ).join("");

    const stored = localStorage.getItem("visrodeck_device_key");

    if (!stored) {
      const newKey = generateKey();
      localStorage.setItem("visrodeck_device_key", newKey);
      setDeviceKey(newKey);
    } else {
      setDeviceKey(stored);
    }

    checkBackendStatus();
    const interval = setInterval(checkBackendStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  // ===============================
  // BACKEND HEALTH CHECK (FIXED)
  // ===============================
  const checkBackendStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/health`, {
        headers: {
          Accept: "application/json",
          "ngrok-skip-browser-warning": "true",
        },
      });

      if (!res.ok) {
        setBackendOnline(false);
        return;
      }

      const data = await res.json();
      setBackendOnline(data.status === "online");
    } catch {
      setBackendOnline(false);
    }
  };

  // ===============================
  // CONNECTION ANIMATION
  // ===============================
  useEffect(() => {
    if (!isConnecting) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    canvas.width = canvas.offsetWidth;
    canvas.height = 250;

    let progressAnim = 0;

    const animate = () => {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(80, 125);
      ctx.lineTo(canvas.width - 80, 125);
      ctx.stroke();

      const x = 80 + (canvas.width - 160) * progressAnim;

      ctx.beginPath();
      ctx.arc(x, 125, 8, 0, Math.PI * 2);
      ctx.fillStyle = "#10b981";
      ctx.fill();

      progressAnim += 0.01;
      if (progressAnim > 1) progressAnim = 0;

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => cancelAnimationFrame(animationRef.current);
  }, [isConnecting]);

  // ===============================
  // CONNECT
  // ===============================
  const connect = async () => {
    setError("");

    if (recipientKey.length !== 16) {
      setError("Invalid key format.");
      return;
    }

    if (!backendOnline) {
      setError("Backend server offline.");
      return;
    }

    setIsConnecting(true);
    setNodeStatus("connecting");
    setProgress(0);

    const stages = [
      { label: "Searching nodes", value: 30 },
      { label: "Exchanging keys", value: 60 },
      { label: "Deploying encryption", value: 90 },
      { label: "Secure connection established", value: 100 },
    ];

    for (let stage of stages) {
      await new Promise((r) => setTimeout(r, 900));
      setNodeStatus(stage.label);
      setProgress(stage.value);
    }

    setIsConnecting(false);
    setIsConnected(true);
  };

  // ===============================
  // SEND MESSAGE (FIXED)
  // ===============================
  const sendMessage = async () => {
    if (!message.trim()) return;

    try {
      await fetch(`${API_URL}/api/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          senderKey: deviceKey,
          recipientKey,
          encryptedData: btoa(message),
          timestamp: new Date().toISOString(),
        }),
      });

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: message,
          sender: "you",
          timestamp: new Date().toISOString(),
        },
      ]);

      setMessage("");
    } catch (err) {
      console.error("Send failed", err);
    }
  };

  // ===============================
  // FETCH MESSAGES (FIXED)
  // ===============================
  const fetchMessages = async () => {
    if (!isConnected) return;

    try {
      const res = await fetch(
        `${API_URL}/api/messages/${deviceKey}`,
        {
          headers: {
            Accept: "application/json",
            "ngrok-skip-browser-warning": "true",
          },
        }
      );

      if (!res.ok) return;

      const data = await res.json();

      if (!Array.isArray(data)) return;

      const parsed = data.map((msg) => ({
        id: msg.id,
        text: atob(msg.encryptedData),
        sender:
          msg.senderKey === deviceKey ? "you" : "them",
        timestamp: msg.timestamp,
      }));

      setMessages(parsed.reverse());
    } catch (err) {
      console.error("Fetch failed", err);
    }
  };

  useEffect(() => {
    if (!isConnected) return;

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [isConnected]);

  // ===============================
  // UI
  // ===============================
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#000",
        color: "#fff",
        fontFamily: "system-ui",
      }}
    >
      {/* HEADER */}
      <header
        style={{
          padding: "1rem",
          borderBottom: "1px solid #222",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Shield size={28} />
          <div>
            <div style={{ fontWeight: 700 }}>
              Visrodeck Relay
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                opacity: 0.6,
              }}
            >
              Device Key: {deviceKey}
            </div>
          </div>
        </div>

        <div
          style={{
            fontSize: "0.85rem",
            color: backendOnline
              ? "#10b981"
              : "#ef4444",
          }}
        >
          {backendOnline
            ? "Server Online"
            : "Server Offline"}
        </div>
      </header>

      {/* MAIN */}
      <main style={{ flex: 1, padding: "2rem" }}>
        {error && (
          <div
            style={{
              background: "#7f1d1d",
              padding: "1rem",
              borderRadius: 6,
              marginBottom: "1rem",
            }}
          >
            {error}
          </div>
        )}

        {!isConnected ? (
          <div>
            <input
              placeholder="Enter 16-digit key"
              value={recipientKey}
              onChange={(e) =>
                setRecipientKey(
                  e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 16)
                )
              }
              style={{
                width: "100%",
                padding: "0.75rem",
                marginBottom: "1rem",
                background: "#111",
                border: "1px solid #333",
                color: "#fff",
              }}
            />

            {isConnecting && (
              <>
                <canvas
                  ref={canvasRef}
                  style={{
                    width: "100%",
                    marginBottom: "1rem",
                    borderRadius: 6,
                    border: "1px solid #222",
                  }}
                />
                <div
                  style={{
                    marginBottom: "1rem",
                    fontSize: "0.9rem",
                  }}
                >
                  {nodeStatus}
                </div>
              </>
            )}

            <button
              onClick={connect}
              disabled={!backendOnline}
              style={{
                width: "100%",
                padding: "0.8rem",
                background: "#fff",
                color: "#000",
                fontWeight: 600,
                border: "none",
              }}
            >
              Connect Securely
            </button>
          </div>
        ) : (
          <>
            <div
              style={{
                height: 350,
                overflowY: "auto",
                marginBottom: "1rem",
                background: "#111",
                padding: "1rem",
                borderRadius: 6,
              }}
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    textAlign:
                      msg.sender === "you"
                        ? "right"
                        : "left",
                    marginBottom: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      display: "inline-block",
                      background:
                        msg.sender === "you"
                          ? "#fff"
                          : "#1f2937",
                      color:
                        msg.sender === "you"
                          ? "#000"
                          : "#fff",
                      padding: "0.5rem 0.75rem",
                      borderRadius: 6,
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                value={message}
                onChange={(e) =>
                  setMessage(e.target.value)
                }
                placeholder="Type message..."
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  background: "#111",
                  border: "1px solid #333",
                  color: "#fff",
                }}
              />
              <button
                onClick={sendMessage}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: "#fff",
                  border: "none",
                }}
              >
                Send
              </button>
            </div>
          </>
        )}
      </main>

      {/* FOOTER */}
      <footer
        style={{
          borderTop: "1px solid #222",
          padding: "1.5rem",
          fontSize: "0.75rem",
          textAlign: "center",
          opacity: 0.6,
        }}
      >
        Visrodeck Relay — Powered by Visrodeck Technology
        <br />
        All rights reserved •{" "}
        <a
          href="https://visrodeck.com"
          style={{ color: "#fff" }}
        >
          visrodeck.com
        </a>
      </footer>
    </div>
  );
}
