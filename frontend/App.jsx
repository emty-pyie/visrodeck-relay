import React, { useState, useEffect } from "react";
import { Shield, Send } from "lucide-react";

const API_URL = "https://lilian-interindividual-merle.ngrok-free.dev";

export default function App() {
  const [deviceKey, setDeviceKey] = useState("");
  const [recipientKey, setRecipientKey] = useState("");
  const [connectedKey, setConnectedKey] = useState("");
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");

  const [backendOnline, setBackendOnline] = useState(false);
  const [nodeCount, setNodeCount] = useState(0);

  const [status, setStatus] = useState("IDLE");
  const [progress, setProgress] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  // =============================
  // DEVICE KEY INIT
  // =============================
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

  // =============================
  // BACKEND HEALTH CHECK
  // =============================
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch(`${API_URL}/api/health`);
        if (!res.ok) throw new Error();
        setBackendOnline(true);
      } catch {
        setBackendOnline(false);
        setIsConnected(false);
      }
    };

    const fetchNodes = async () => {
      try {
        const res = await fetch(`${API_URL}/api/nodes/count`);
        const data = await res.json();
        setNodeCount(data.activeNodes || 0);
      } catch {
        setNodeCount(0);
      }
    };

    checkBackend();
    fetchNodes();

    const interval = setInterval(() => {
      checkBackend();
      fetchNodes();
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // =============================
  // MESSAGE POLLING
  // =============================
  useEffect(() => {
    if (!isConnected || !deviceKey || !connectedKey) return;

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
  }, [deviceKey, connectedKey, isConnected]);

  // =============================
  // CONNECTION SEQUENCE
  // =============================
  const runConnectionSequence = async () => {
    if (recipientKey.length !== 16) return;

    const phases = [
      "DEPLOYING KEYS",
      "CONNECTING TO NODE",
      "ESTABLISHING CHANNEL",
      "VERIFYING PEER",
    ];

    for (let i = 0; i < phases.length; i++) {
      setStatus(phases[i]);
      setProgress((i + 1) * 25);
      await new Promise((r) => setTimeout(r, 700));
    }

    if (!backendOnline) {
      setStatus("NODES OFFLINE");
      setProgress(0);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/messages/${recipientKey}`);
      if (!res.ok) throw new Error();
      setConnectedKey(recipientKey);
      setIsConnected(true);
      setStatus("SECURE CHANNEL ACTIVE");
      setProgress(100);
    } catch {
      setStatus("KEY CONNECTION FAILED");
      setProgress(0);
    }
  };

  // =============================
  // SEND MESSAGE
  // =============================
  const sendMessage = async () => {
    if (!message.trim()) return;

    const msgObj = {
      senderKey: deviceKey,
      recipientKey: connectedKey,
      encryptedData: message,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, { ...msgObj, id: Date.now() }]);
    setMessage("");

    try {
      await fetch(`${API_URL}/api/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msgObj),
      });
    } catch {}
  };

  // =============================
  // UI
  // =============================
  return (
    <div className="app">

      {/* HEADER */}
      <header className="topbar">
        <div className="brand">
          <Shield size={15} />
          VISRODECK RELAY
        </div>

        <div className="network">
          STATUS: {backendOnline ? "ONLINE" : "NODES DOWN"} |
          CONNECTED NODES: {nodeCount}
        </div>

        {isConnected && (
          <div className="connection">
            DEV: {deviceKey} | PEER: {connectedKey}
          </div>
        )}
      </header>

      {/* STATUS PANEL */}
      <div className="statusPanel">
        <div>{status}</div>
        <div className="progressBar">
          <div
            className="progressFill"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* CONNECT SCREEN */}
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
            {messages.map((m, i) => (
              <div
                key={i}
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

      {/* FOOTER */}
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
          font-family: "Courier New", monospace;
          color: #e8ffe8;
        }

        .app {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .topbar {
          display: flex;
          justify-content: space-between;
          padding: 16px 24px;
          border-bottom: 1px solid #111;
          font-size: 12px;
        }

        .brand {
          display: flex;
          gap: 8px;
          align-items: center;
          color: #00ff66;
          font-weight: bold;
        }

        .network {
          opacity: 0.7;
        }

        .connection {
          font-size: 11px;
          opacity: 0.7;
        }

        .statusPanel {
          padding: 12px 24px;
          border-bottom: 1px solid #111;
        }

        .progressBar {
          height: 2px;
          background: #111;
          margin-top: 6px;
        }

        .progressFill {
          height: 100%;
          background: #00ff66;
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

        input {
          padding: 12px;
          background: #111;
          border: 1px solid #222;
          color: #00ff66;
        }

        button {
          padding: 12px;
          background: #00ff66;
          border: none;
          cursor: pointer;
          font-weight: bold;
        }

        .messages {
          flex: 1;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          overflow-y: auto;
        }

        .msg {
          padding: 10px;
          border-radius: 4px;
          max-width: 75%;
        }

        .self {
          background: #00ff66;
          color: black;
          align-self: flex-end;
        }

        .other {
          background: #111;
          border: 1px solid #222;
        }

        .inputRow {
          display: flex;
          padding: 14px;
          border-top: 1px solid #111;
          gap: 8px;
        }

        .footer {
          text-align: center;
          padding: 20px;
          font-size: 11px;
          border-top: 1px solid #111;
          background: #070707;
        }

        .footer a {
          color: #00ff66;
          text-decoration: none;
        }

        @media (max-width: 600px) {
          .topbar {
            flex-direction: column;
            gap: 6px;
          }
        }

      `}</style>
    </div>
  );
}
