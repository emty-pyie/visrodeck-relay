import React, { useState, useEffect } from "react";
import { Shield } from "lucide-react";

const API_URL = "https://lilian-interindividual-merle.ngrok-free.dev";

export default function App() {

  const [deviceKey, setDeviceKey] = useState("");
  const [recipientKey, setRecipientKey] = useState("");
  const [connectedKey, setConnectedKey] = useState("");
  const [networkOnline, setNetworkOnline] = useState(false);
  const [nodeCount, setNodeCount] = useState(0);
  const [status, setStatus] = useState("IDLE");

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
    const interval = setInterval(checkHealth, 4000);
    return () => clearInterval(interval);
  }, []);

  const runConnectionSequence = async () => {
    if (!networkOnline) {
      setStatus("NODES OFFLINE");
      return;
    }

    if (recipientKey.length !== 16) {
      setStatus("INVALID KEY");
      return;
    }

    setStatus("CONNECTING TO NODE...");
    await new Promise(r => setTimeout(r, 800));

    try {
      const res = await fetch(`${API_URL}/api/messages/${recipientKey}`);
      if (!res.ok) throw new Error();

      setConnectedKey(recipientKey);
      setStatus("SECURE CHANNEL ESTABLISHED");
    } catch {
      setStatus("CONNECTION FAILED");
    }
  };

  return (
    <div className="wrapper">

      {/* HEADER */}
      <header className="header">

        <div className="brand">
          <Shield size={20} />
          <span>VISRODECK RELAY</span>
        </div>

        <div className="deviceBlock">
          <div className="label">DEVICE KEY</div>
          <div className="deviceKey">{deviceKey}</div>
        </div>

        <div className="networkBlock">
          <div>
            STATUS: {networkOnline ? "ONLINE" : "NODES DOWN"}
          </div>
          <div>
            CONNECTED NODES: {nodeCount}
          </div>
        </div>

      </header>

      {/* MAIN CONTENT */}
      <main className="main">

        <div className="statusLine">{status}</div>

        <div className="connectCard">
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

      </main>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footerContent">
          <div className="footerTitle">Visrodeck Relay</div>
          <div>Powered by Visrodeck Technology</div>
          <div>All rights reserved</div>
          <a href="https://visrodeck.com" target="_blank">
            Visit Visrodeck.com
          </a>
        </div>
      </footer>

      <style>{`

        body {
          margin: 0;
          background: #050505;
          color: #d6ffe6;
          font-family: monospace;
        }

        .wrapper {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        /* HEADER */

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 40px;
          border-bottom: 1px solid #111;
          background: #0a0a0a;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: bold;
          color: #00ff88;
          font-size: 16px;
        }

        .deviceBlock {
          text-align: center;
        }

        .label {
          font-size: 11px;
          opacity: 0.6;
        }

        .deviceKey {
          font-size: 18px;
          letter-spacing: 2px;
          color: #00ff88;
          font-weight: bold;
        }

        .networkBlock {
          text-align: right;
          font-size: 12px;
          opacity: 0.7;
        }

        /* MAIN */

        .main {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 40px;
        }

        .statusLine {
          margin-bottom: 20px;
          font-size: 14px;
          letter-spacing: 2px;
          color: #00ff88;
        }

        .connectCard {
          width: 100%;
          max-width: 420px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        input {
          padding: 14px;
          background: #111;
          border: 1px solid #222;
          color: #00ff88;
          font-size: 14px;
        }

        button {
          padding: 14px;
          background: #00ff88;
          border: none;
          font-weight: bold;
          cursor: pointer;
          font-size: 14px;
        }

        button:hover {
          background: #00cc66;
        }

        /* FOOTER */

        .footer {
          background: #0a0a0a;
          border-top: 1px solid #111;
          padding: 30px 20px;
          text-align: center;
        }

        .footerTitle {
          font-weight: bold;
          margin-bottom: 8px;
          color: #00ff88;
        }

        .footer a {
          display: inline-block;
          margin-top: 6px;
          color: #00ff88;
          text-decoration: none;
        }

        /* MOBILE */

        @media (max-width: 768px) {
          .header {
            flex-direction: column;
            gap: 14px;
            text-align: center;
          }

          .networkBlock {
            text-align: center;
          }

          .deviceKey {
            font-size: 16px;
          }
        }

      `}</style>
    </div>
  );
}
