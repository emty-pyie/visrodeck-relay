import React, { useState, useEffect } from "react";
import { Shield, Send } from "lucide-react";

const API_URL = "https://lilian-interindividual-merle.ngrok-free.dev";

export default function App() {
  const [deviceKey, setDeviceKey] = useState("");
  const [recipientKey, setRecipientKey] = useState("");
  const [connectedKey, setConnectedKey] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState("IDLE");
  const [progress, setProgress] = useState(0);

  // Generate device key
  useEffect(() => {
    const stored = localStorage.getItem("visrodeck_device_key");
    if (stored) {
      setDeviceKey(stored);
    } else {
      const key = Array.from({ length: 16 }, () =>
        Math.floor(Math.random() * 10)
      ).join("");
      localStorage.setItem("visrodeck_device_key", key);
      setDeviceKey(key);
    }
  }, []);

  // Poll messages
  useEffect(() => {
    if (!deviceKey || !connectedKey) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`${API_URL}/api/messages/${deviceKey}`);
        const data = await res.json();

        const filtered = data.filter(
          (m) =>
            (m.senderKey === deviceKey &&
              m.recipientKey === connectedKey) ||
            (m.senderKey === connectedKey &&
              m.recipientKey === deviceKey)
        );

        setMessages(filtered);
      } catch (err) {
        console.error("Fetch failed", err);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  }, [deviceKey, connectedKey]);

  const runConnectionSequence = async () => {
    if (recipientKey.length !== 16) return;

    const phases = [
      "DEPLOYING KEYS",
      "CONNECTING TO NODE",
      "ESTABLISHING SECURE CHANNEL",
      "AUTH VERIFIED",
    ];

    for (let i = 0; i < phases.length; i++) {
      setStatus(phases[i]);
      setProgress((i + 1) * 25);
      await new Promise((r) => setTimeout(r, 800));
    }

    setConnectedKey(recipientKey);
    setIsConnected(true);
    setStatus("READY");
    setProgress(100);
  };

  const sendMessage = async () => {
    if (!message.trim()) return;

    const msgObj = {
      id: Date.now(),
      senderKey: deviceKey,
      recipientKey: connectedKey,
      encryptedData: message,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, msgObj]);
    setMessage("");

    try {
      await fetch(`${API_URL}/api/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msgObj),
      });
    } catch (err) {
      console.error("Send failed", err);
    }
  };

  return (
    <div className="app">

      <header className="topbar">
        <div className="brand">
          <Shield size={16} />
          VISRODECK RELAY
        </div>
        <div className="keys">
          DEV: {deviceKey}
          {isConnected && <> | PEER: {connectedKey}</>}
        </div>
      </header>

      <div className="statusPanel">
        <div className="statusText">{status}</div>
        <div className="progressBar">
          <div
            className="progressFill"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {!isConnected ? (
        <div className="connectBox">
          <input
            placeholder="ENTER 16-DIGIT PEER KEY"
            value={recipientKey}
            onChange={(e) =>
              setRecipientKey(
                e.target.value.replace(/\D/g, "").slice(0, 16)
              )
            }
          />
          <button onClick={runConnectionSequence}>
            INITIATE CONNECTION
          </button>
        </div>
      ) : (
        <>
          <div className="messages">
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.senderKey === deviceKey
                    ? "msg self"
                    : "msg other"
                }
              >
                {m.encryptedData}
              </div>
            ))}
          </div>

          <div className="inputRow">
            <input
              placeholder="TYPE SECURE MESSAGE..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button onClick={sendMessage}>
              <Send size={16} />
            </button>
          </div>
        </>
      )}

      <style>{`

        body {
          margin: 0;
          background: #050505;
          color: #e6ffe6;
          font-family: "Courier New", monospace;
        }

        .app {
          height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .topbar {
          padding: 16px 24px;
          border-bottom: 1px solid #111;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          letter-spacing: 1px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          color: #00ff00;
        }

        .keys {
          opacity: 0.6;
          font-size: 11px;
        }

        .statusPanel {
          padding: 14px 24px;
          border-bottom: 1px solid #111;
        }

        .statusText {
          font-size: 12px;
          letter-spacing: 2px;
          margin-bottom: 6px;
          color: #00ff00;
        }

        .progressBar {
          height: 2px;
          background: #111;
        }

        .progressFill {
          height: 100%;
          background: #00ff00;
          transition: width 0.3s ease;
        }

        .connectBox {
          margin: auto;
          width: 90%;
          max-width: 420px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .messages {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .msg {
          padding: 12px 14px;
          border-radius: 4px;
          font-size: 14px;
          max-width: 75%;
          word-break: break-word;
        }

        .self {
          background: #00ff00;
          color: #000;
          align-self: flex-end;
        }

        .other {
          background: #111;
          border: 1px solid #222;
          align-self: flex-start;
        }

        .inputRow {
          display: flex;
          padding: 16px;
          border-top: 1px solid #111;
          gap: 10px;
        }

        input {
          flex: 1;
          padding: 12px;
          background: #111;
          border: 1px solid #222;
          color: #00ff00;
          font-family: inherit;
          font-size: 14px;
        }

        button {
          padding: 12px 18px;
          background: #00ff00;
          border: none;
          cursor: pointer;
          font-weight: bold;
        }

        button:hover {
          background: #00cc00;
        }

        /* Mobile */
        @media (max-width: 600px) {
          .topbar {
            flex-direction: column;
            align-items: flex-start;
            gap: 6px;
          }

          .msg {
            max-width: 85%;
          }
        }

      `}</style>
    </div>
  );
}
