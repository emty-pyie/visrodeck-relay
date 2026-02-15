import React, { useState, useEffect } from "react";
import { Shield, Send } from "lucide-react";

const API_URL = "https://lilian-interindividual-merle.ngrok-free.dev";

export default function App() {
  const [deviceKey, setDeviceKey] = useState("");
  const [recipientKey, setRecipientKey] = useState("");
  const [connectedKey, setConnectedKey] = useState("");
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");

  const [status, setStatus] = useState("IDLE");
  const [isConnected, setIsConnected] = useState(false);

  /* ---------------- DEVICE KEY ---------------- */

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

  /* ---------------- MESSAGE POLLING ---------------- */

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
        console.error("Polling failed");
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  }, [deviceKey, connectedKey]);

  /* ---------------- CONNECT LOGIC ---------------- */

  const runConnection = async () => {
    if (recipientKey.length !== 16) return;

    setStatus("DEPLOYING KEYS");
    await wait(700);

    setStatus("CONNECTING TO NODE");
    await wait(700);

    // 1️⃣ Check backend health
    try {
      const health = await fetch(`${API_URL}/api/health`);
      if (!health.ok) throw new Error();

      const healthData = await health.json();
      if (healthData.status !== "online") throw new Error();
    } catch {
      setStatus("NODES OFFLINE");
      return;
    }

    setStatus("VERIFYING PEER KEY");
    await wait(700);

    // 2️⃣ Verify peer key
    try {
      const res = await fetch(`${API_URL}/api/exists/${recipientKey}`);
      const data = await res.json();

      if (!data.exists) {
        setStatus("KEY CONNECTION FAILED");
        return;
      }
    } catch {
      setStatus("KEY CONNECTION FAILED");
      return;
    }

    setStatus("SECURE CHANNEL ESTABLISHED");
    await wait(700);

    setConnectedKey(recipientKey);
    setIsConnected(true);
    setStatus("READY");
  };

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------------- SEND MESSAGE ---------------- */

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
    } catch {
      console.error("Send failed");
    }
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="app">

      <header className="header">
        <div className="brand">
          <Shield size={18} />
          VISRODECK RELAY
        </div>
        <div className="keys">
          DEVICE: {deviceKey}
          {isConnected && <> | PEER: {connectedKey}</>}
        </div>
      </header>

      <div className="statusBar">{status}</div>

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
          <button onClick={runConnection}>
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

      <footer className="footer">
        <div>Visrodeck Relay</div>
        <div>Powered by Visrodeck Technology</div>
        <div>All rights reserved</div>
        <a href="https://visrodeck.com" target="_blank">
          Visit Visrodeck.com
        </a>
      </footer>

      <style>{`
        body {
          margin: 0;
          background: #0a0f14;
          color: #e0e6ed;
          font-family: system-ui, sans-serif;
        }

        .app {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .header {
          padding: 18px 28px;
          border-bottom: 1px solid #1c252e;
          display: flex;
          justify-content: space-between;
        }

        .brand {
          font-weight: 600;
          color: #4df3a3;
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .keys {
          font-size: 12px;
          opacity: 0.6;
        }

        .statusBar {
          padding: 14px 28px;
          font-size: 13px;
          letter-spacing: 1px;
          border-bottom: 1px solid #1c252e;
          color: #4df3a3;
        }

        .connectBox {
          margin: auto;
          width: 90%;
          max-width: 420px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        input {
          padding: 14px;
          background: #141b22;
          border: 1px solid #1f2a33;
          color: #fff;
          font-size: 14px;
        }

        button {
          padding: 14px;
          background: #4df3a3;
          border: none;
          font-weight: 600;
          cursor: pointer;
        }

        button:hover {
          background: #37c983;
        }

        .messages {
          flex: 1;
          padding: 24px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .msg {
          padding: 12px 16px;
          border-radius: 6px;
          max-width: 70%;
        }

        .self {
          background: #4df3a3;
          color: #000;
          align-self: flex-end;
        }

        .other {
          background: #1c252e;
          border: 1px solid #26333d;
        }

        .inputRow {
          display: flex;
          padding: 16px 24px;
          gap: 12px;
          border-top: 1px solid #1c252e;
        }

        .footer {
          margin-top: auto;
          padding: 24px;
          text-align: center;
          font-size: 13px;
          border-top: 1px solid #1c252e;
          background: #0d1319;
          color: #8fa3b0;
        }

        .footer a {
          color: #4df3a3;
          text-decoration: none;
        }

      `}</style>
    </div>
  );
}
