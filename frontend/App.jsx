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

  // Fetch messages (polling)
  useEffect(() => {
    if (!deviceKey || !connectedKey) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`${API_URL}/api/messages/${deviceKey}`);

        const contentType = res.headers.get("content-type");

        if (!contentType || !contentType.includes("application/json")) {
          console.error("Backend returned HTML instead of JSON");
          return;
        }

        const data = await res.json();

        // Filter only conversation between these two keys
        const filtered = data.filter(
          (m) =>
            (m.senderKey === deviceKey &&
              m.recipientKey === connectedKey) ||
            (m.senderKey === connectedKey &&
              m.recipientKey === deviceKey)
        );

        setMessages(filtered);
      } catch (err) {
        console.error("Fetch failed:", err);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  }, [deviceKey, connectedKey]);

  const connect = () => {
    if (recipientKey.length === 16) {
      setConnectedKey(recipientKey);
      setIsConnected(true);
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

    // Show instantly
    setMessages((prev) => [...prev, msgObj]);

    setMessage("");

    try {
      await fetch(`${API_URL}/api/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msgObj),
      });
    } catch (err) {
      console.error("Send failed:", err);
    }
  };

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <Shield size={18} />
          VISRODECK RELAY
        </div>
        <div className="keys">
          DEVICE: {deviceKey}
          {isConnected && <> | PEER: {connectedKey}</>}
        </div>
      </div>

      {!isConnected ? (
        <div className="connect">
          <input
            placeholder="ENTER 16-DIGIT PEER KEY"
            value={recipientKey}
            onChange={(e) =>
              setRecipientKey(
                e.target.value.replace(/\D/g, "").slice(0, 16)
              )
            }
          />
          <button onClick={connect}>CONNECT</button>
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
              value={message}
              placeholder="TYPE SECURE MESSAGE..."
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
          background: #000;
          color: #fff;
          font-family: system-ui;
        }

        .app {
          height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .topbar {
          padding: 20px;
          border-bottom: 1px solid #222;
          display: flex;
          justify-content: space-between;
        }

        .brand {
          display: flex;
          gap: 10px;
          font-weight: 600;
        }

        .keys {
          font-size: 12px;
          opacity: 0.7;
        }

        .connect {
          margin: auto;
          width: 400px;
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .messages {
          flex: 1;
          padding: 30px;
          overflow-y: auto;
        }

        .msg {
          padding: 12px;
          margin-bottom: 10px;
          border-radius: 6px;
          max-width: 500px;
        }

        .self {
          background: #0f0;
          color: #000;
          margin-left: auto;
        }

        .other {
          background: #111;
        }

        .inputRow {
          padding: 20px;
          border-top: 1px solid #222;
          display: flex;
          gap: 10px;
        }

        input {
          flex: 1;
          padding: 12px;
          background: #111;
          border: 1px solid #333;
          color: #fff;
        }

        button {
          padding: 12px 20px;
          background: #0f0;
          border: none;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
