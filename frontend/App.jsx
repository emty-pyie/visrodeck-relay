import React, { useState, useEffect } from 'react';
import { Shield, Key, Send, Radio } from 'lucide-react';

const API_URL = 'https://lilian-interindividual-merle.ngrok-free.dev';

export default function App() {
  const [deviceKey, setDeviceKey] = useState('');
  const [recipientKey, setRecipientKey] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const generateKey = () =>
      Array.from({ length: 16 }, () => Math.floor(Math.random() * 10)).join('');

    const storedKey = localStorage.getItem('visrodeck_device_key');
    if (!storedKey) {
      const newKey = generateKey();
      localStorage.setItem('visrodeck_device_key', newKey);
      setDeviceKey(newKey);
    } else {
      setDeviceKey(storedKey);
    }
  }, []);

  const connectToNode = async () => {
    if (recipientKey.length !== 16) return;
    setIsConnecting(true);
    await new Promise(r => setTimeout(r, 1200));
    setIsConnecting(false);
    setIsConnected(true);
  };

  const sendMessage = async () => {
    if (!message.trim()) return;

    const encryptedMsg = btoa(message);

    try {
      await fetch(`${API_URL}/api/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderKey: deviceKey,
          recipientKey,
          encryptedData: encryptedMsg,
          timestamp: new Date().toISOString()
        })
      });

      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          text: message,
          sender: 'you',
          timestamp: new Date().toISOString()
        }
      ]);

      setMessage('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="app">
      <div className="container">

        <header className="header">
          <Shield size={36} />
          <h1>VISRODECK RELAY</h1>
        </header>

        <div className="device-box">
          <div className="label">
            <Key size={16} /> YOUR DEVICE KEY
          </div>
          <div className="key">{deviceKey}</div>
        </div>

        {!isConnected ? (
          <div className="card">
            <h2><Radio size={18}/> Secure Connection</h2>

            <input
              type="text"
              placeholder="Recipient 16-digit key"
              value={recipientKey}
              onChange={(e) =>
                setRecipientKey(e.target.value.replace(/\D/g, '').slice(0, 16))
              }
            />

            <button
              onClick={connectToNode}
              disabled={recipientKey.length !== 16 || isConnecting}
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        ) : (
          <div className="card">
            <div className="messages">
              {messages.length === 0 ? (
                <p className="empty">No messages yet</p>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`msg ${msg.sender === 'you' ? 'you' : 'them'}`}
                  >
                    {msg.text}
                  </div>
                ))
              )}
            </div>

            <div className="input-row">
              <input
                type="text"
                placeholder="Type message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              />
              <button onClick={sendMessage}>
                <Send size={16}/>
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
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .app {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          padding: 20px;
        }

        .container {
          width: 100%;
          max-width: 500px;
        }

        .header {
          text-align: center;
          margin-bottom: 24px;
        }

        .header h1 {
          margin: 10px 0 0;
          font-size: 20px;
          font-weight: 600;
          letter-spacing: 2px;
        }

        .device-box {
          border: 1px solid #222;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          background: #0a0a0a;
        }

        .label {
          font-size: 12px;
          opacity: 0.6;
          margin-bottom: 8px;
        }

        .key {
          font-size: 16px;
          letter-spacing: 2px;
        }

        .card {
          border: 1px solid #222;
          padding: 20px;
          border-radius: 12px;
          background: #0a0a0a;
        }

        input {
          width: 100%;
          padding: 12px;
          background: #111;
          border: 1px solid #333;
          border-radius: 6px;
          color: #fff;
          margin-bottom: 12px;
        }

        input:focus {
          outline: none;
          border-color: #666;
        }

        button {
          width: 100%;
          padding: 12px;
          background: #fff;
          color: #000;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
        }

        button:disabled {
          background: #333;
          color: #777;
          cursor: not-allowed;
        }

        .messages {
          max-height: 300px;
          overflow-y: auto;
          margin-bottom: 12px;
        }

        .msg {
          padding: 10px;
          margin-bottom: 8px;
          border-radius: 6px;
          font-size: 14px;
        }

        .msg.you {
          background: #111;
          text-align: right;
        }

        .msg.them {
          background: #1a1a1a;
          text-align: left;
        }

        .input-row {
          display: flex;
          gap: 8px;
        }

        .input-row input {
          margin-bottom: 0;
        }

        .input-row button {
          width: 60px;
        }

        @media (max-width: 480px) {
          .container {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
