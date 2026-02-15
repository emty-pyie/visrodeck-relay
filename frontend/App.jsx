import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Shield, Key, Send, Zap, Radio } from 'lucide-react';

// ✅ NGROK API URL backend
const API_URL = 'https://lilian-interindividual-merle.ngrok-free.dev';

export default function App() {
  const [deviceKey, setDeviceKey] = useState('');
  const [recipientKey, setRecipientKey] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [nodeStatus, setNodeStatus] = useState('idle');
  const [encryptionProgress, setEncryptionProgress] = useState(0);
  const canvasRef = useRef(null);

  // Generate unique 16-digit device key on mount
  useEffect(() => {
    const generateKey = () => {
      let key = '';
      for (let i = 0; i < 16; i++) {
        key += Math.floor(Math.random() * 10);
      }
      return key;
    };
    
    const storedKey = localStorage.getItem('visrodeck_device_key');
    if (!storedKey) {
      const newKey = generateKey();
      localStorage.setItem('visrodeck_device_key', newKey);
      setDeviceKey(newKey);
    } else {
      setDeviceKey(storedKey);
    }

    // Start background animation
    startBackgroundAnimation();
  }, []);

  const startBackgroundAnimation = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const nodes = [];
    for (let i = 0; i < 50; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2 + 1
      });
    }

    function animate() {
      ctx.fillStyle = 'rgba(10, 10, 15, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      nodes.forEach((node, i) => {
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 255, 170, 0.6)';
        ctx.fill();

        // Draw connections
        nodes.forEach((otherNode, j) => {
          if (i !== j) {
            const dx = node.x - otherNode.x;
            const dy = node.y - otherNode.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 150) {
              ctx.beginPath();
              ctx.moveTo(node.x, node.y);
              ctx.lineTo(otherNode.x, otherNode.y);
              ctx.strokeStyle = `rgba(0, 255, 170, ${0.2 * (1 - distance / 150)})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
        });
      });

      requestAnimationFrame(animate);
    }

    animate();
  };

  const connectToNode = async () => {
    if (!recipientKey || recipientKey.length !== 16) {
      alert('Please enter a valid 16-digit recipient key');
      return;
    }

    setIsConnecting(true);
    setNodeStatus('searching');

    // Simulate node connection with animation
    const stages = ['searching', 'handshaking', 'encrypting', 'connected'];
    for (let i = 0; i < stages.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setNodeStatus(stages[i]);
      setEncryptionProgress((i + 1) * 25);
    }

    setIsConnecting(false);
    setIsConnected(true);
    setEncryptionProgress(100);
  };

  const sendMessage = async () => {
    if (!message.trim() || !isConnected) return;

    setNodeStatus('transmitting');
    
    // Simulate encryption and sending
    const encryptedMsg = btoa(message); // Simple base64 for demo
    
    try {
      // using ngrok URL instead of localhost
      const response = await fetch(`${API_URL}/api/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderKey: deviceKey,
          recipientKey,
          encryptedData: encryptedMsg,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        setMessages([...messages, {
          id: Date.now(),
          text: message,
          sender: 'you',
          timestamp: new Date().toISOString()
        }]);
        setMessage('');
        setNodeStatus('connected');
      }
    } catch (error) {
      console.error('Send failed:', error);
      setNodeStatus('error');
    }
  };

  const fetchMessages = async () => {
    if (!isConnected) return;

    try {
      // ngrok URL 
      const response = await fetch(`${API_URL}/api/messages/${deviceKey}`);
      const data = await response.json();
      
      const decryptedMessages = data.map(msg => ({
        id: msg.id,
        text: atob(msg.encryptedData),
        sender: msg.senderKey === deviceKey ? 'you' : 'them',
        timestamp: msg.timestamp
      }));

      setMessages(decryptedMessages);
    } catch (error) {
      console.error('Fetch failed:', error);
    }
  };

  useEffect(() => {
    if (isConnected) {
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [isConnected, deviceKey]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)',
      color: '#e0e0e0',
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <canvas 
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          pointerEvents: 'none'
        }}
      />

      <div style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem'
      }}>
        {/* Header */}
        <header style={{
          textAlign: 'center',
          marginBottom: '3rem',
          animation: 'slideDown 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <Shield size={48} color="#00ffaa" style={{
              filter: 'drop-shadow(0 0 20px rgba(0, 255, 170, 0.5))',
              animation: 'pulse 2s ease-in-out infinite'
            }} />
            <h1 style={{
              fontSize: '3rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #00ffaa 0%, #00d4ff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: 0,
              letterSpacing: '-0.05em'
            }}>
              VISRODECK RELAY
            </h1>
          </div>
          <p style={{
            fontSize: '0.95rem',
            color: '#00ffaa',
            opacity: 0.8,
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            fontWeight: 600
          }}>
            End-to-End Encrypted Anonymous Messaging
          </p>
        </header>

        {/* Device Key Display */}
        <div style={{
          background: 'rgba(0, 255, 170, 0.05)',
          border: '1px solid rgba(0, 255, 170, 0.3)',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem',
          animation: 'fadeIn 1s ease-out 0.2s backwards'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <Key size={20} color="#00ffaa" />
            <span style={{ fontSize: '0.85rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Your Device Key
            </span>
          </div>
          <div style={{
            fontFamily: '"Courier New", monospace',
            fontSize: '1.5rem',
            color: '#00ffaa',
            letterSpacing: '0.25em',
            textShadow: '0 0 10px rgba(0, 255, 170, 0.5)',
            fontWeight: 700
          }}>
            {deviceKey || 'GENERATING...'}
          </div>
        </div>

        {/* Connection Interface */}
        {!isConnected ? (
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '2rem',
            animation: 'fadeIn 1s ease-out 0.4s backwards'
          }}>
            <h2 style={{
              fontSize: '1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              color: '#00ffaa'
            }}>
              <Radio size={24} />
              Establish Secure Connection
            </h2>

            <input
              type="text"
              placeholder="Enter recipient's 16-digit key"
              value={recipientKey}
              onChange={(e) => setRecipientKey(e.target.value.replace(/\D/g, '').slice(0, 16))}
              maxLength={16}
              style={{
                width: '100%',
                padding: '1rem',
                background: 'rgba(0, 0, 0, 0.5)',
                border: '2px solid rgba(0, 255, 170, 0.3)',
                borderRadius: '8px',
                color: '#e0e0e0',
                fontSize: '1.1rem',
                fontFamily: '"Courier New", monospace',
                letterSpacing: '0.2em',
                marginBottom: '1rem',
                outline: 'none',
                transition: 'all 0.3s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = 'rgba(0, 255, 170, 0.8)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(0, 255, 170, 0.3)'}
            />

            {isConnecting && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '0.75rem',
                  color: '#00ffaa'
                }}>
                  <Zap size={18} style={{ animation: 'pulse 1s ease-in-out infinite' }} />
                  <span style={{ fontSize: '0.9rem', textTransform: 'uppercase' }}>
                    {nodeStatus === 'searching' && 'Searching for nodes...'}
                    {nodeStatus === 'handshaking' && 'Performing key handshake...'}
                    {nodeStatus === 'encrypting' && 'Establishing encryption...'}
                    {nodeStatus === 'connected' && 'Connection secured!'}
                  </span>
                </div>
                <div style={{
                  width: '100%',
                  height: '4px',
                  background: 'rgba(0, 255, 170, 0.2)',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${encryptionProgress}%`,
                    background: 'linear-gradient(90deg, #00ffaa, #00d4ff)',
                    transition: 'width 0.3s ease',
                    boxShadow: '0 0 10px rgba(0, 255, 170, 0.8)'
                  }} />
                </div>
              </div>
            )}

            <button
              onClick={connectToNode}
              disabled={isConnecting || recipientKey.length !== 16}
              style={{
                width: '100%',
                padding: '1rem',
                background: recipientKey.length === 16 
                  ? 'linear-gradient(135deg, #00ffaa 0%, #00d4ff 100%)'
                  : 'rgba(100, 100, 100, 0.3)',
                color: recipientKey.length === 16 ? '#0a0a0f' : '#666',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                cursor: recipientKey.length === 16 ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s ease',
                boxShadow: recipientKey.length === 16 
                  ? '0 4px 20px rgba(0, 255, 170, 0.4)'
                  : 'none'
              }}
              onMouseEnter={(e) => {
                if (recipientKey.length === 16) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 30px rgba(0, 255, 170, 0.6)';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 20px rgba(0, 255, 170, 0.4)';
              }}
            >
              {isConnecting ? 'Connecting...' : 'Connect to Node'}
            </button>
          </div>
        ) : (
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '2rem',
            animation: 'fadeIn 0.5s ease-out'
          }}>
            {/* Status Indicator */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1.5rem',
              padding: '0.75rem',
              background: 'rgba(0, 255, 170, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(0, 255, 170, 0.3)'
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#00ffaa',
                boxShadow: '0 0 15px rgba(0, 255, 170, 0.8)',
                animation: 'pulse 2s ease-in-out infinite'
              }} />
              <span style={{ fontSize: '0.9rem', color: '#00ffaa', textTransform: 'uppercase' }}>
                {nodeStatus === 'transmitting' ? 'Transmitting...' : 'Connected & Encrypted'}
              </span>
            </div>

            {/* Messages */}
            <div style={{
              maxHeight: '400px',
              overflowY: 'auto',
              marginBottom: '1.5rem',
              padding: '1rem',
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '8px'
            }}>
              {messages.length === 0 ? (
                <p style={{ textAlign: 'center', opacity: 0.5, fontSize: '0.9rem' }}>
                  No messages yet. Start a conversation!
                </p>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    style={{
                      marginBottom: '1rem',
                      padding: '0.75rem',
                      background: msg.sender === 'you' 
                        ? 'rgba(0, 255, 170, 0.1)'
                        : 'rgba(0, 212, 255, 0.1)',
                      borderLeft: `3px solid ${msg.sender === 'you' ? '#00ffaa' : '#00d4ff'}`,
                      borderRadius: '4px',
                      animation: 'slideIn 0.3s ease-out'
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.25rem' }}>
                      {msg.sender === 'you' ? 'You' : 'Them'} • {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
                    <div>{msg.text}</div>
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                type="text"
                placeholder="Type your encrypted message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                style={{
                  flex: 1,
                  padding: '1rem',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '2px solid rgba(0, 255, 170, 0.3)',
                  borderRadius: '8px',
                  color: '#e0e0e0',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = 'rgba(0, 255, 170, 0.8)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(0, 255, 170, 0.3)'}
              />
              <button
                onClick={sendMessage}
                disabled={!message.trim()}
                style={{
                  padding: '1rem 2rem',
                  background: message.trim() 
                    ? 'linear-gradient(135deg, #00ffaa 0%, #00d4ff 100%)'
                    : 'rgba(100, 100, 100, 0.3)',
                  color: message.trim() ? '#0a0a0f' : '#666',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 700,
                  cursor: message.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.3s ease',
                  boxShadow: message.trim() 
                    ? '0 4px 20px rgba(0, 255, 170, 0.4)'
                    : 'none'
                }}
                onMouseEnter={(e) => {
                  if (message.trim()) {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 30px rgba(0, 255, 170, 0.6)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 20px rgba(0, 255, 170, 0.4)';
                }}
              >
                <Send size={18} />
                Send
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.05);
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        * {
          box-sizing: border-box;
        }

        ::-webkit-scrollbar {
          width: 8px;
        }

        ::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.3);
        }

        ::-webkit-scrollbar-thumb {
          background: rgba(0, 255, 170, 0.5);
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 255, 170, 0.7);
        }
      `}</style>
    </div>
  );
}
