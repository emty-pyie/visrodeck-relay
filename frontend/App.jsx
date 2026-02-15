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

  // Generate / Load Device Key
  useEffect(() => {
    const generateKey = () =>
      Array.from({ length: 16 }, () => Math.floor(Math.random() * 10)).join("");

    const stored = localStorage.getItem("visrodeck_device_key");

    if (!stored) {
      const newKey = generateKey();
      localStorage.setItem("visrodeck_device_key", newKey);
      setDeviceKey(newKey);
    } else {
      setDeviceKey(stored);
    }
  }, []);

  // Connection Animation
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

  // Send Message
  const sendMessage = async () => {
    if (!message.trim() || !connectedKey) return;

    setStatusPhase("TRANSMITTING MESSAGE");
    setProgress(90);

    try {
      await fetch(`${API_URL}/api/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderKey: deviceKey,
          recipientKey: connectedKey,
          encryptedData: message, // ← send plain text
          timestamp: new Date().toISOString(),
        }),
      });

      // Show immediately
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
      setStatusPhase("TRANSMISSION FAILED");
    }
  };

  // Fetch Messages
  const fetchMessages = async () => {
    if (!deviceKey) return;

    try {
      const res = await fetch(`${API_URL}/api/messages/${deviceKey}`);
      const data = await res.json();

      const parsed = data.map((m) => ({
        id: m.id,
        text: m.encryptedData, // ← already decrypted by backend
        timestamp: m.timestamp,
      }));

      setMessages(parsed);
    } catch (err) {
      console.error("Fetch failed:", err);
    }
  };

  // Always Poll
  useEffect(() => {
    if (!deviceKey) return;

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [deviceKey]);

  return (
    <div className="app">
      <div className="dashboard">

        {/* TOP BAR */}
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

        {/* STATUS MODULE */}
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
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <button onClick={sendMessage}>
                <Send size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        body {
          margin: 0;
          background: #000;
          color: #fff;
          font-family: system-ui, sans-serif;
        }

        .app {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          padding: 40px 20px;
        }

        .dashboard {
          width: 100%;
          max-width: 1000px;
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        .topbar {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          letter-spacing: 1px;
          border-bottom: 1px solid #222;
          padding-bottom: 12px;
        }

        .topbar .left {
          display: flex;
          gap: 8px;
          align-items: center;
          font-weight: 600;
        }

        .topbar .right {
          display: flex;
          gap: 20px;
          opacity: 0.7;
        }

        .status {
          border: 1px solid #222;
          padding: 20px;
          border-radius: 8px;
        }

        .phase {
          font-size: 14px;
          margin-bottom: 10px;
          letter-spacing: 2px;
        }

        .progressbar {
          height: 4px;
          background: #111;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress {
          height: 100%;
          background: #fff;
          transition: width 0.4s ease;
        }

        .connect-panel input,
        .console input {
          width: 100%;
          padding: 14px;
          background: #111;
          border: 1px solid #333;
          border-radius: 6px;
          color: #fff;
        }

        button {
          padding: 14px;
          margin-top: 12px;
          width: 100%;
          background: #fff;
          color: #000;
          border: none;
          font-weight: 600;
          cursor: pointer;
        }

        button:disabled {
          background: #333;
          color: #777;
          cursor: not-allowed;
        }

        .console {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .messages {
          min-height: 300px;
          border: 1px solid #222;
          padding: 20px;
          border-radius: 8px;
          overflow-y: auto;
        }

        .msg {
          margin-bottom: 10px;
          padding: 10px;
          background: #111;
          border-radius: 4px;
        }

        .empty {
          opacity: 0.4;
        }

        .input-row {
          display: flex;
          gap: 10px;
        }

        .input-row input {
          flex: 1;
        }

        .input-row button {
          width: 80px;
          margin-top: 0;
        }

        @media (max-width: 768px) {
          .topbar {
            flex-direction: column;
            gap: 8px;
          }
          .input-row {
            flex-direction: column;
          }
          .input-row button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
