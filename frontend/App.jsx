import React, { useState, useEffect } from "react";
import { Shield, Send } from "lucide-react";

const API_URL = "https://lilian-interindividual-merle.ngrok-free.dev";

export default function App() {
  const [deviceKey, setDeviceKey] = useState("");
  const [recipientKey, setRecipientKey] = useState("");
  const [connectedKey, setConnectedKey] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [statusPhase, setStatusPhase] = useState("IDLE");
  const [progress, setProgress] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  // ==============================
  // Generate / Load Device Key
  // ==============================
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
  }, []);

  // ==============================
  // Connection Animation
  // ==============================
  const runConnectionSequence = async () => {
    if (recipientKey.length !== 16) return;

    const phases = [
      "DEPLOYING KEYS",
      "CONNECTING TO NODE",
      "ESTABLISHING SECURE CHANNEL",
      "AUTHENTICATION VERIFIED",
    ];

    for (let i = 0; i < phases.length; i++) {
      setStatusPhase(phases[i]);
      setProgress((i + 1) * 25);
      await new Promise((r) => setTimeout(r, 800));
    }

    setConnectedKey(recipientKey);
    setIsConnected(true);
    setStatusPhase("READY");
    setProgress(100);
  };

  // ==============================
  // Send Message
  // ==============================
  const sendMessage = async () => {
    if (!message.trim() || !connectedKey) return;

    setStatusPhase("TRANSMITTING MESSAGE");
    setProgress(90);

    try {
      await fetch(`${API_URL}/api/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true", // 🔥 CRITICAL FIX
        },
        body: JSON.stringify({
          senderKey: deviceKey,
          recipientKey: connectedKey,
          encryptedData: message,
          timestamp: new Date().toISOString(),
        }),
      });

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: message,
          timestamp: new Date().toISOString(),
        },
      ]);

      setMessage("");
      setProgress(100);

      setTimeout(() => {
        setStatusPhase("READY");
      }, 600);
    } catch (err) {
      console.error(err);
      setStatusPhase("TRANSMISSION FAILED");
    }
  };

  // ==============================
  // Fetch Messages
  // ==============================
  const fetchMessages = async () => {
    if (!deviceKey) return;

    try {
      const res = await fetch(
        `${API_URL}/api/messages/${deviceKey}`,
        {
          headers: {
            "ngrok-skip-browser-warning": "true", // 🔥 CRITICAL FIX
          },
        }
      );

      const data = await res.json();

      const parsed = data.map((m) => ({
        id: m.id,
        text: m.encryptedData,
        timestamp: m.timestamp,
      }));

      setMessages(parsed);
    } catch (err) {
      console.error("Fetch failed:", err);
    }
  };

  // ==============================
  // Poll Messages Every 3s
  // ==============================
  useEffect(() => {
    if (!deviceKey) return;

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [deviceKey]);

  return (
    <div className="app">
      <div className="dashboard">

        <div className="topbar">
          <div className="left">
            <Shield size={18} />
            <span>VISRODECK RELAY</span>
          </div>
          <div className="right">
            <span>DEVICE: {deviceKey}</span>
            {isConnected && (
              <span className="peer">PEER: {connectedKey}</span>
            )}
          </div>
        </div>

        <div className="status">
          <div className="phase">{statusPhase}</div>
          <div className="progressbar">
            <div
              className="progress"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {!isConnected ? (
          <div className="connect-panel">
            <input
              type="text"
              placeholder="ENTER 16-DIGIT PEER KEY"
              value={recipientKey}
              onChange={(e) =>
                setRecipientKey(
                  e.target.value.replace(/\D/g, "").slice(0, 16)
                )
              }
            />
            <button
              disabled={recipientKey.length !== 16}
              onClick={runConnectionSequence}
            >
              INITIATE CONNECTION
            </button>
          </div>
        ) : (
          <div className="console">
            <div className="messages">
              {messages.length === 0 ? (
                <div className="empty">NO ACTIVE TRANSMISSIONS</div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className="msg">
                    {m.text}
                  </div>
                ))
              )}
            </div>

            <div className="input-row">
              <input
                type="text"
                placeholder="TYPE SECURE MESSAGE..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && sendMessage()
                }
              />
              <button onClick={sendMessage}>
                <Send size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
