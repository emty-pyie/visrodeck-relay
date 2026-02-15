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
  const [progress, setProgress] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  const [backendOnline, setBackendOnline] = useState(false);
  const [nodeCount, setNodeCount] = useState(0);

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

  // Check backend health
  const checkBackend = async () => {
    try {
      const res = await fetch(`${API_URL}/api/health`);
      if (!res.ok) throw new Error();
      setBackendOnline(true);
    } catch {
      setBackendOnline(false);
    }
  };

  // Fetch node count
  const fetchNodeCount = async () => {
    try {
      const res = await fetch(`${API_URL}/api/nodes/count`);
      const data = await res.json();
      setNodeCount(data.activeNodes || 0);
    } catch {
      setNodeCount(0);
    }
  };

  useEffect(() => {
    checkBackend();
    fetchNodeCount();
    const interval = setInterval(() => {
      checkBackend();
      fetchNodeCount();
    }, 5000);
    return () => clearInterval(interval);
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
      } catch {}
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  }, [deviceKey, connectedKey]);

  const runConnectionSequence = async () => {
    if (recipientKey.length !== 16) return;

    setStatus("DEPLOYING KEYS");
    setProgress(25);
    await delay(600);

    setStatus("CONNECTING TO NODE");
    setProgress(50);
    await delay(600);

    if (!backendOnline) {
      setStatus("NODES OFFLINE");
      setProgress(0);
      return;
    }

    setStatus("VERIFYING PEER");
    setProgress(75);
    await delay(600);

    try {
      const res = await fetch(`${API_URL}/api/messages/${recipientKey}`);
      if (!res.ok) throw new Error();

      setConnectedKey(recipientKey);
      setIsConnected(true);
      setStatus("READY");
      setProgress(100);
    } catch {
      setStatus("CONNECTION FAILED");
      setProgress(0);
    }
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
    } catch {}
  };

  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  return (
    <div className="app">

      <header className="topbar">
  <div className="brand">
    <Shield size={16} />
    VISRODECK RELAY
  </div>

  <div className="network">
    STATUS: {backendOnline ? "ONLINE" : "NODES DOWN"} |
    CONNECTED NODES: {nodeCount}
  </div>

  {isConnected && (
    <div className="connectionInfo">
      <div>
        DEV: <span className="key">{deviceKey}</span>
      </div>
      <div>
        PEER: <span className="key active">{connectedKey}</span>
      </div>
      <button
        className="disconnectBtn"
        onClick={() => {
          setIsConnected(false);
          setConnectedKey("");
          setMessages([]);
          setStatus("IDLE");
          setProgress(0);
        }}
      >
        DISCONNECT
      </button>
    </div>
  )}
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

      <footer className="footer">
        <div className="footer-inner">
          <div>
            <div className="footer-title">Visrodeck Relay</div>
            <div className="footer-sub">
              Powered by Visrodeck Technology
            </div>
          </div>
          <div className="footer-right">
            <div>All rights reserved</div>
            <a href="https://visrodeck.com" target="_blank" rel="noreferrer">
              Visit Visrodeck.com
            </a>
          </div>
        </div>
      </footer>

      <style>{`

        body {
          margin: 0;
          background: #060606;
          color: #d6ffd6;
          font-family: "Courier New", monospace;
        }

        .app {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .topbar {
          padding: 16px 40px;
          border-bottom: 1px solid #111;
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          letter-spacing: 1px;
        }

        .brand {
          display: flex;
          gap: 8px;
          align-items: center;
          color: #7aff7a;
          font-weight: 600;
        }

        .network {
          opacity: 0.7;
        }

        .statusPanel {
          padding: 16px 40px;
          border-bottom: 1px solid #111;
        }

        .statusText {
          margin-bottom: 8px;
          font-size: 12px;
          letter-spacing: 2px;
          color: #7aff7a;
        }

        .progressBar {
          height: 2px;
          background: #111;
        }

        .progressFill {
          height: 100%;
          background: #4caf50;
          transition: width 0.3s ease;
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
          padding: 12px;
          background: #111;
          border: 1px solid #222;
          color: #d6ffd6;
          font-family: inherit;
        }

        button {
          padding: 12px;
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          color: #7aff7a;
          cursor: pointer;
        }

        button:hover {
          background: #111;
        }

        .messages {
          flex: 1;
          padding: 24px 40px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .msg {
          padding: 12px 14px;
          border-radius: 4px;
          max-width: 70%;
        }

        .self {
          align-self: flex-end;
          background: #0f2a0f;
          border: 1px solid #1d441d;
        }

        .other {
          align-self: flex-start;
          background: #111;
          border: 1px solid #222;
        }

        .inputRow {
          display: flex;
          padding: 16px 40px;
          gap: 10px;
          border-top: 1px solid #111;
        }

        .inputRow input {
          flex: 1;
        }

        .footer {
          border-top: 1px solid #111;
          background: #070707;
          padding: 28px 40px;
          font-size: 12px;
        }

        .footer-inner {
          max-width: 1200px;
          margin: auto;
          display: flex;
          justify-content: space-between;
        }

        .footer-title {
          font-weight: 600;
          color: #7aff7a;
          margin-bottom: 4px;
        }

        .footer-sub {
          opacity: 0.6;
        }

        .footer-right {
          text-align: right;
          opacity: 0.7;
        }

        .footer-right a {
          display: block;
          margin-top: 6px;
          color: #7aff7a;
          text-decoration: none;
        }

        @media (max-width: 700px) {
          .footer-inner {
            flex-direction: column;
            gap: 10px;
          }
        }
        .connectionInfo {
  display: flex;
  align-items: center;
  gap: 18px;
  font-size: 11px;
  opacity: 0.8;
}

.key {
  color: #7aff7a;
  font-weight: 600;
}

.key.active {
  color: #4caf50;
}

.disconnectBtn {
  padding: 6px 10px;
  background: transparent;
  border: 1px solid #333;
  color: #ff5a5a;
  cursor: pointer;
  font-size: 10px;
  letter-spacing: 1px;
}

.disconnectBtn:hover {
  border-color: #ff5a5a;
}


      `}</style>
    </div>
  );
}
