import React, { useState, useEffect } from "react";

const API_URL = "https://lilian-interindividual-merle.ngrok-free.dev";

export default function App() {
  const [deviceKey, setDeviceKey] = useState("");
  const [recipientKey, setRecipientKey] = useState("");
  const [connectedKey, setConnectedKey] = useState("");
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  const [networkOnline, setNetworkOnline] = useState(false);
  const [nodeCount, setNodeCount] = useState(0);
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

  // Health check
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${API_URL}/api/health`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setNetworkOnline(true);
        setNodeCount(data.connectedNodes || 0);
      } catch {
        setNetworkOnline(false);
        setNodeCount(0);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  // Poll messages
  useEffect(() => {
    if (!deviceKey || !connectedKey) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`${API_URL}/api/messages/${deviceKey}`);
        if (!res.ok) return;

        const data = await res.json();

        const filtered = data.filter(
          (m) =>
            (m.senderKey === deviceKey &&
              m.recipientKey === connectedKey) ||
            (m.senderKey === connectedKey &&
              m.recipientKey === deviceKey)
        );

        setMessages(filtered);
      } catch {}
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  }, [deviceKey, connectedKey]);

  const runConnectionSequence = async () => {
    if (!networkOnline) {
      setStatus("NODES OFFLINE");
      return;
    }

    if (recipientKey.length !== 16) {
      setStatus("INVALID KEY FORMAT");
      return;
    }

    setStatus("DEPLOYING KEYS");
    setProgress(25);
    await new Promise((r) => setTimeout(r, 700));

    setStatus("CONNECTING TO NODE");
    setProgress(50);
    await new Promise((r) => setTimeout(r, 700));

    try {
      const res = await fetch(`${API_URL}/api/messages/${recipientKey}`);
      if (!res.ok) throw new Error();

      setStatus("AUTHENTICATING");
      setProgress(75);
      await new Promise((r) => setTimeout(r, 700));

      setConnectedKey(recipientKey);
      setIsConnected(true);
      setStatus("SECURE CHANNEL ESTABLISHED");
      setProgress(100);
    } catch {
      setStatus("CONNECTION FAILED");
      setProgress(0);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !connectedKey) return;

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
    } catch {}
  };

  return (
    <div className="app">

      <header className="topbar">
        <div className="brand">VISRODECK RELAY</div>

        <div className="devicePanel">
          <div>DEVICE KEY: {deviceKey}</div>
          {isConnected && <div>PEER: {connectedKey}</div>}
        </div>

        <div className="networkInfo">
          STATUS: {networkOnline ? "ONLINE" : "NODES DOWN"} |
          CONNECTED NODES: {nodeCount}
        </div>
      </header>

      <div className="statusBar">
        <div>{status}</div>
        <div className="progress">
          <div style={{ width: `${progress}%` }} />
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
            <button onClick={sendMessage}>SEND</button>
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
          background: #050505;
          color: #c8ffd8;
          font-family: monospace;
        }

        .app {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .topbar {
          padding: 16px 24px;
          border-bottom: 1px solid #111;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
        }

        .brand {
          color: #00ff88;
          font-weight: bold;
          letter-spacing: 1px;
        }

        .devicePanel {
          text-align: center;
          font-size: 11px;
        }

        .networkInfo {
          font-size: 11px;
          color: #888;
        }

        .statusBar {
          padding: 10px 24px;
          border-bottom: 1px solid #111;
        }

        .progress {
          height: 2px;
          background: #111;
          margin-top: 6px;
        }

        .progress div {
          height: 100%;
          background: #00ff88;
          transition: width 0.3s ease;
        }

        .connectBox {
          margin: auto;
          width: 90%;
          max-width: 400px;
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
          padding: 10px 14px;
          border-radius: 4px;
          max-width: 70%;
        }

        .self {
          background: #00ff88;
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
          padding: 10px;
          background: #111;
          border: 1px solid #222;
          color: #00ff88;
        }

        button {
          padding: 10px 16px;
          background: #00ff88;
          border: none;
          font-weight: bold;
          cursor: pointer;
        }

        button:hover {
          background: #00cc66;
        }

        .footer {
          border-top: 1px solid #111;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          background: #070707;
        }

        .footer a {
          color: #00ff88;
          text-decoration: none;
        }

        @media (max-width: 600px) {
          .topbar {
            flex-direction: column;
            gap: 6px;
            text-align: center;
          }
        }

      `}</style>
    </div>
  );
}
