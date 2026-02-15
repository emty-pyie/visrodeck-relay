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
  const [connectedNodes, setConnectedNodes] = useState(0);
  const [status, setStatus] = useState("IDLE");
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState("");

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

  /* ---------------- HEALTH CHECK ---------------- */

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${API_URL}/api/health`);
        if (!res.ok) throw new Error();
        setBackendOnline(true);
      } catch {
        setBackendOnline(false);
        setIsConnected(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 4000);
    return () => clearInterval(interval);
  }, []);

  /* ---------------- FETCH MESSAGES ---------------- */

  useEffect(() => {
    if (!deviceKey || !connectedKey || !backendOnline) return;

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

        // Unique nodes count
        const uniqueNodes = new Set(
          data.flatMap((m) => [m.senderKey, m.recipientKey])
        );
        setConnectedNodes(uniqueNodes.size);

      } catch (err) {
        setBackendOnline(false);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 2500);
    return () => clearInterval(interval);
  }, [deviceKey, connectedKey, backendOnline]);

  /* ---------------- CONNECT TO PEER ---------------- */

  const connectToPeer = async () => {
    if (recipientKey.length !== 16) return;

    setStatus("VERIFYING NODE");
    setConnectionError("");

    try {
      const res = await fetch(`${API_URL}/api/exists/${recipientKey}`);
      const data = await res.json();

      if (!data.exists) {
        setStatus("CONNECTION FAILED");
        setConnectionError("Key does not exist");
        return;
      }

      setConnectedKey(recipientKey);
      setIsConnected(true);
      setStatus("SECURE CHANNEL ESTABLISHED");

    } catch {
      setStatus("CONNECTION FAILED");
      setConnectionError("Network error");
    }
  };

  /* ---------------- SEND ---------------- */

  const sendMessage = async () => {
    if (!message.trim()) return;

    const msg = {
      senderKey: deviceKey,
      recipientKey: connectedKey,
      encryptedData: message,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, msg]);
    setMessage("");

    try {
      await fetch(`${API_URL}/api/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg),
      });
    } catch {}
  };

  return (
    <div className="app">

      {/* ---------------- HEADER ---------------- */}

      <header className="topbar">
        <div className="brand">
          <Shield size={16} />
          VISRODECK RELAY
        </div>

        <div className="network">
          STATUS: {backendOnline ? "ONLINE" : "NODES DOWN"} |
          CONNECTED NODES: {backendOnline ? connectedNodes : 0}
        </div>
      </header>

      {/* ---------------- STATUS ---------------- */}

      <div className="statusBar">{status}</div>

      {!backendOnline && (
        <div className="offlinePanel">
          NODES OFFLINE — CHECK BACKEND
        </div>
      )}

      {/* ---------------- CONNECT ---------------- */}

      {!isConnected && backendOnline && (
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
          <button onClick={connectToPeer}>
            INITIATE CONNECTION
          </button>

          {connectionError && (
            <div className="error">{connectionError}</div>
          )}
        </div>
      )}

      {/* ---------------- CHAT ---------------- */}

      {isConnected && backendOnline && (
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

      {/* ---------------- FOOTER ---------------- */}

      <footer className="footer">
        <div>Visrodeck Relay</div>
        <div>Powered by Visrodeck Technology</div>
        <div>All rights reserved</div>
        <a href="https://visrodeck.com" target="_blank">
          Visit Visrodeck.com
        </a>
      </footer>

      {/* ---------------- CSS ---------------- */}

      <style>{`

        body {
          margin: 0;
          background: #050505;
          color: #d4ffd4;
          font-family: "Courier New", monospace;
        }

        .app {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }

        .topbar {
          padding: 16px 24px;
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid #111;
          font-size: 13px;
        }

        .brand {
          color: #00ff88;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .network {
          font-size: 12px;
          opacity: 0.7;
        }

        .statusBar {
          padding: 10px 24px;
          border-bottom: 1px solid #111;
          font-size: 12px;
          letter-spacing: 2px;
        }

        .offlinePanel {
          padding: 20px;
          text-align: center;
          color: #ff5555;
        }

        .connectBox {
          margin: auto;
          width: 90%;
          max-width: 420px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        input {
          padding: 12px;
          background: #111;
          border: 1px solid #222;
          color: #00ff88;
        }

        button {
          padding: 12px;
          background: #00ff88;
          border: none;
          font-weight: bold;
          cursor: pointer;
        }

        .error {
          color: #ff4444;
          font-size: 12px;
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
          padding: 12px;
          max-width: 75%;
          border-radius: 4px;
          word-break: break-word;
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

        .inputRow input {
          flex: 1;
        }

        .footer {
          text-align: center;
          padding: 20px;
          border-top: 1px solid #111;
          font-size: 12px;
          opacity: 0.6;
        }

        .footer a {
          color: #00ff88;
          text-decoration: none;
        }

        @media (max-width: 600px) {
          .msg {
            max-width: 85%;
          }
        }

      `}</style>
    </div>
  );
}
