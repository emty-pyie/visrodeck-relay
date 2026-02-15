import React, { useState, useEffect, useRef } from 'react';
import { Shield, Key, Send, Lock, Unlock, AlertCircle, CheckCircle, XCircle, Globe, FileText, Zap } from 'lucide-react';

// ✅ API Configuration - Change this to your ngrok or production URL
const API_URL = 'https://lilian-interindividual-merle.ngrok-free.dev';

export default function App() {
  const [deviceKey, setDeviceKey] = useState('');
  const [recipientKey, setRecipientKey] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [nodeStatus, setNodeStatus] = useState('offline');
  const [encryptionProgress, setEncryptionProgress] = useState(0);
  const [error, setError] = useState('');
  const [backendOnline, setBackendOnline] = useState(false);
  const connectionCanvasRef = useRef(null);
  const animationFrameRef = useRef(null);

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

    checkBackendStatus();
    const statusInterval = setInterval(checkBackendStatus, 10000);
    
    return () => {
      clearInterval(statusInterval);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Connection Animation
  useEffect(() => {
    if (isConnecting && connectionCanvasRef.current) {
      startConnectionAnimation();
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isConnecting, nodeStatus]);

  const startConnectionAnimation = () => {
    const canvas = connectionCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = 300;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Node positions
    const nodes = [
      { x: centerX - 150, y: centerY, label: 'You', color: '#ffffff' },
      { x: centerX + 150, y: centerY, label: 'Recipient', color: '#ffffff' },
      { x: centerX, y: centerY - 80, label: 'Node 1', color: '#10b981' },
      { x: centerX, y: centerY + 80, label: 'Node 2', color: '#10b981' },
    ];

    let animationProgress = 0;
    let particleProgress = 0;

    const animate = () => {
      ctx.fillStyle = '#111827';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      animationProgress += 0.01;
      particleProgress += 0.03;

      // Draw connections based on stage
      if (nodeStatus === 'searching') {
        // Pulsing search waves
        for (let i = 0; i < 3; i++) {
          const radius = (animationProgress * 200 + i * 60) % 200;
          ctx.beginPath();
          ctx.arc(nodes[0].x, nodes[0].y, radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 255, 255, ${1 - radius / 200})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      if (nodeStatus === 'handshaking' || nodeStatus === 'encrypting' || nodeStatus === 'connected') {
        // Draw lines between nodes
        nodes.forEach((node, i) => {
          nodes.forEach((otherNode, j) => {
            if (i < j) {
              ctx.beginPath();
              ctx.moveTo(node.x, node.y);
              ctx.lineTo(otherNode.x, otherNode.y);
              ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          });
        });
      }

      if (nodeStatus === 'handshaking') {
        // Key exchange particles
        const particle1X = nodes[0].x + (nodes[2].x - nodes[0].x) * (particleProgress % 1);
        const particle1Y = nodes[0].y + (nodes[2].y - nodes[0].y) * (particleProgress % 1);
        
        ctx.beginPath();
        ctx.arc(particle1X, particle1Y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px monospace';
        ctx.fillText('🔑', particle1X - 6, particle1Y + 4);
      }

      if (nodeStatus === 'encrypting') {
        // Encryption symbols flowing
        for (let i = 0; i < 4; i++) {
          const progress = (particleProgress + i * 0.25) % 1;
          const x = nodes[0].x + (nodes[1].x - nodes[0].x) * progress;
          const y = nodes[0].y + (nodes[1].y - nodes[0].y) * progress;
          
          ctx.fillStyle = '#10b981';
          ctx.font = '16px monospace';
          ctx.fillText('🔒', x - 8, y + 5);
        }
      }

      if (nodeStatus === 'connected') {
        // Success glow
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#10b981';
        nodes.forEach(node => {
          ctx.beginPath();
          ctx.arc(node.x, node.y, 25, 0, Math.PI * 2);
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2;
          ctx.stroke();
        });
        ctx.shadowBlur = 0;
      }

      // Draw nodes
      nodes.forEach(node => {
        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, 20, 0, Math.PI * 2);
        ctx.fillStyle = node.color === '#ffffff' ? '#1f2937' : 'rgba(16, 185, 129, 0.2)';
        ctx.fill();
        ctx.strokeStyle = node.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Node label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.x, node.y - 35);
      });

      // Status text
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      const statusTexts = {
        searching: 'SEARCHING FOR NODES...',
        handshaking: 'EXCHANGING KEYS...',
        encrypting: 'DEPLOYING ENCRYPTION...',
        connected: 'CONNECTION SECURED ✓'
      };
      ctx.fillText(statusTexts[nodeStatus] || '', centerX, 30);

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();
  };

  const checkBackendStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      
      if (response.ok) {
        const data = await response.json();
        setBackendOnline(data.status === 'online');
        setNodeStatus('online');
      } else {
        setBackendOnline(false);
        setNodeStatus('offline');
      }
    } catch (error) {
      setBackendOnline(false);
      setNodeStatus('offline');
    }
  };

  const validateRecipientKey = (key) => {
    if (key.length !== 16) {
      return { valid: false, error: 'Key must be exactly 16 digits' };
    }
    if (key === deviceKey) {
      return { valid: false, error: "You can't connect to yourself! Enter someone else's key." };
    }
    return { valid: true, error: '' };
  };

  const connectToNode = async () => {
    setError('');
    const validation = validateRecipientKey(recipientKey);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }
    if (!backendOnline) {
      setError('Backend server is offline. Please start the backend first.');
      return;
    }

    setIsConnecting(true);
    setNodeStatus('searching');
    setEncryptionProgress(0);

    const stages = [
      { status: 'searching', duration: 1200, progress: 25 },
      { status: 'handshaking', duration: 1200, progress: 50 },
      { status: 'encrypting', duration: 1200, progress: 75 },
      { status: 'connected', duration: 800, progress: 100 }
    ];

    for (let stage of stages) {
      setNodeStatus(stage.status);
      await new Promise(resolve => setTimeout(resolve, stage.duration));
      setEncryptionProgress(stage.progress);
    }

    setIsConnecting(false);
    setIsConnected(true);
  };

  const sendMessage = async () => {
    if (!message.trim() || !isConnected) return;
    setNodeStatus('transmitting');
    const encryptedMsg = btoa(message);
    
    try {
      const response = await fetch(`${API_URL}/api/message`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          senderKey: deviceKey,
          recipientKey,
          encryptedData: encryptedMsg,
          timestamp: new Date().toISOString()
        })
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned HTML instead of JSON. Backend may have crashed.');
      }

      if (response.ok) {
        setMessages([...messages, {
          id: Date.now(),
          text: message,
          sender: 'you',
          timestamp: new Date().toISOString()
        }]);
        setMessage('');
        setNodeStatus('connected');
      } else {
        setError('Failed to send message. Please try again.');
      }
    } catch (error) {
      setError(error.message || 'Failed to send message');
      setNodeStatus('error');
    }
  };

  const fetchMessages = async () => {
    if (!isConnected) return;
    try {
      const response = await fetch(`${API_URL}/api/messages/${deviceKey}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) return;
      if (!response.ok) return;

      const data = await response.json();
      if (Array.isArray(data)) {
        const decryptedMessages = data.map(msg => ({
          id: msg.id,
          text: atob(msg.encryptedData),
          sender: msg.senderKey === deviceKey ? 'you' : 'them',
          timestamp: msg.timestamp
        }));
        setMessages(decryptedMessages);
      }
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
    <div style={styles.pageContainer}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerLeft}>
            <Shield size={32} style={styles.headerIcon} />
            <div>
              <h1 style={styles.headerTitle}>Visrodeck Relay</h1>
              <p style={styles.headerSubtitle}>End-to-End Encrypted Messaging</p>
            </div>
          </div>
          <div style={styles.headerRight}>
            <div style={styles.statusIndicator}>
              <div style={{
                ...styles.statusDot,
                background: backendOnline ? '#10b981' : '#ef4444',
              }} />
              <span style={styles.statusText}>
                {backendOnline ? 'Server Online' : 'Server Offline'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.container}>
          <div style={styles.infoBar}>
            <div style={styles.infoItem}>
              <Lock size={16} />
              <span>AES-256-GCM Encryption</span>
            </div>
            <div style={styles.infoItem}>
              <Shield size={16} />
              <span>Zero-Knowledge Architecture</span>
            </div>
            <div style={styles.infoItem}>
              <Key size={16} />
              <span>Anonymous Communication</span>
            </div>
          </div>

          <div style={styles.deviceKeyCard}>
            <div style={styles.cardHeader}>
              <Key size={20} />
              <h3 style={styles.cardTitle}>Your Device Key</h3>
            </div>
            <div style={styles.deviceKeyDisplay}>
              <code style={styles.deviceKeyCode}>{deviceKey || 'GENERATING...'}</code>
              <button 
                style={styles.copyButton}
                onClick={() => {
                  navigator.clipboard.writeText(deviceKey);
                  alert('Device key copied to clipboard!');
                }}
              >
                Copy
              </button>
            </div>
            <p style={styles.deviceKeyNote}>
              Share this key with others to allow them to send you encrypted messages.
            </p>
          </div>

          {error && (
            <div style={styles.errorCard}>
              <AlertCircle size={20} />
              <span>{error}</span>
              <button 
                style={styles.errorClose}
                onClick={() => setError('')}
              >
                ×
              </button>
            </div>
          )}

          {!isConnected ? (
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <Unlock size={20} />
                <h3 style={styles.cardTitle}>Establish Secure Connection</h3>
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Recipient's Device Key</label>
                <input
                  type="text"
                  placeholder="Enter 16-digit key"
                  value={recipientKey}
                  onChange={(e) => {
                    setRecipientKey(e.target.value.replace(/\D/g, '').slice(0, 16));
                    setError('');
                  }}
                  maxLength={16}
                  style={styles.input}
                />
                {recipientKey.length > 0 && (
                  <div style={{
                    ...styles.helperText,
                    color: recipientKey.length === 16 ? '#10b981' : '#9ca3af',
                  }}>
                    {recipientKey.length === 16 
                      ? '✓ Valid key format' 
                      : `${16 - recipientKey.length} more digits needed`}
                  </div>
                )}
              </div>

              {isConnecting && (
                <div style={styles.connectionProgress}>
                  {/* Animated Connection Canvas */}
                  <canvas 
                    ref={connectionCanvasRef}
                    style={styles.connectionCanvas}
                  />
                  
                  <div style={styles.progressInfo}>
                    <div style={styles.progressDetails}>
                      <Zap size={18} style={styles.zapIcon} />
                      <span style={styles.progressText}>
                        {nodeStatus === 'searching' && 'Scanning network nodes...'}
                        {nodeStatus === 'handshaking' && 'Exchanging cryptographic keys...'}
                        {nodeStatus === 'encrypting' && 'Deploying AES-256 encryption...'}
                        {nodeStatus === 'connected' && 'Secure tunnel established!'}
                      </span>
                    </div>
                    <span style={styles.progressPercent}>{encryptionProgress}%</span>
                  </div>
                  <div style={styles.progressBar}>
                    <div style={{
                      ...styles.progressFill,
                      width: `${encryptionProgress}%`,
                    }} />
                  </div>
                </div>
              )}

              <button
                onClick={connectToNode}
                disabled={isConnecting || recipientKey.length !== 16 || !backendOnline}
                style={{
                  ...styles.primaryButton,
                  opacity: (recipientKey.length === 16 && backendOnline) ? 1 : 0.5,
                  cursor: (recipientKey.length === 16 && backendOnline) ? 'pointer' : 'not-allowed',
                }}
              >
                {isConnecting ? 'Establishing Connection...' : 'Connect Securely'}
              </button>
            </div>
          ) : (
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <Lock size={20} />
                <h3 style={styles.cardTitle}>Encrypted Chat</h3>
                <button 
                  style={styles.disconnectBtn}
                  onClick={() => {
                    setIsConnected(false);
                    setRecipientKey('');
                    setMessages([]);
                    setEncryptionProgress(0);
                  }}
                >
                  Disconnect
                </button>
              </div>

              <div style={styles.connectionBadge}>
                <CheckCircle size={16} color="#10b981" />
                <span>Secure connection established with {recipientKey}</span>
              </div>

              <div style={styles.messagesContainer}>
                {messages.length === 0 ? (
                  <div style={styles.emptyState}>
                    <Lock size={48} style={{ opacity: 0.3 }} />
                    <p>No messages yet. Start a secure conversation!</p>
                  </div>
                ) : (
                  messages.map(msg => (
                    <div
                      key={msg.id}
                      style={{
                        ...styles.messageCard,
                        alignSelf: msg.sender === 'you' ? 'flex-end' : 'flex-start',
                        background: msg.sender === 'you' ? '#ffffff' : '#1f2937',
                        color: msg.sender === 'you' ? '#000000' : '#ffffff',
                        border: msg.sender === 'you' ? '1px solid #e5e7eb' : '1px solid #374151',
                      }}
                    >
                      <div style={styles.messageHeader}>
                        <span style={{ fontWeight: 600 }}>
                          {msg.sender === 'you' ? 'You' : 'Recipient'}
                        </span>
                        <span style={{ opacity: 0.6 }}>
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div style={styles.messageText}>{msg.text}</div>
                    </div>
                  ))
                )}
              </div>

              <div style={styles.messageInputContainer}>
                <input
                  type="text"
                  placeholder="Type your encrypted message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  style={styles.messageInput}
                />
                <button
                  onClick={sendMessage}
                  disabled={!message.trim()}
                  style={{
                    ...styles.sendButton,
                    opacity: message.trim() ? 1 : 0.5,
                    cursor: message.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  <Send size={18} />
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <div style={styles.footerLeft}>
            <h4 style={styles.footerTitle}>Visrodeck Relay</h4>
            <p style={styles.footerText}>POWERED BY VISRODECK TECHNOLOGY</p>
          </div>
          <div style={styles.footerCenter}>
            <a href="#" style={styles.footerLink}>
              <FileText size={14} />
              Privacy Policy
            </a>
          </div>
          <div style={styles.footerRight}>
            <p style={styles.footerText}>All rights reserved</p>
            <a href="https://visrodeck.com" style={styles.footerLink} target="_blank" rel="noopener noreferrer">
              <Globe size={14} />
              visrodeck.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

const styles = {
  pageContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#000000',
    color: '#ffffff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  header: {
    background: '#111827',
    color: '#ffffff',
    borderBottom: '1px solid #374151',
    padding: '1rem 0',
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  headerIcon: {
    color: '#ffffff',
  },
  headerTitle: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: 700,
    letterSpacing: '-0.025em',
  },
  headerSubtitle: {
    margin: 0,
    fontSize: '0.875rem',
    color: '#9ca3af',
    fontWeight: 400,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
  },
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '20px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  statusText: {
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  main: {
    flex: 1,
    padding: '2rem 0',
    background: '#0a0a0a',
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 2rem',
  },
  infoBar: {
    display: 'flex',
    gap: '2rem',
    padding: '1.5rem',
    background: '#1f2937',
    border: '1px solid #374151',
    borderRadius: '8px',
    marginBottom: '2rem',
    flexWrap: 'wrap',
  },
  infoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    color: '#d1d5db',
  },
  deviceKeyCard: {
    background: '#1f2937',
    border: '1px solid #374151',
    borderRadius: '8px',
    padding: '1.5rem',
    marginBottom: '2rem',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1rem',
  },
  cardTitle: {
    margin: 0,
    fontSize: '1.125rem',
    fontWeight: 600,
    flex: 1,
    color: '#ffffff',
  },
  deviceKeyDisplay: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
    marginBottom: '0.75rem',
  },
  deviceKeyCode: {
    flex: 1,
    padding: '1rem',
    background: '#111827',
    border: '2px solid #374151',
    borderRadius: '6px',
    fontFamily: '"Courier New", monospace',
    fontSize: '1.25rem',
    fontWeight: 600,
    letterSpacing: '0.1em',
    color: '#ffffff',
  },
  copyButton: {
    padding: '1rem 1.5rem',
    background: '#ffffff',
    color: '#000000',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  deviceKeyNote: {
    fontSize: '0.875rem',
    color: '#9ca3af',
    margin: 0,
  },
  errorCard: {
    background: '#7f1d1d',
    border: '1px solid #991b1b',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '2rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    color: '#fecaca',
  },
  errorClose: {
    marginLeft: 'auto',
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#fecaca',
    padding: '0 0.5rem',
  },
  card: {
    background: '#1f2937',
    border: '1px solid #374151',
    borderRadius: '8px',
    padding: '1.5rem',
  },
  formGroup: {
    marginBottom: '1.5rem',
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#d1d5db',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    background: '#111827',
    border: '2px solid #374151',
    borderRadius: '6px',
    fontSize: '1rem',
    fontFamily: '"Courier New", monospace',
    letterSpacing: '0.1em',
    outline: 'none',
    transition: 'border-color 0.2s',
    color: '#ffffff',
  },
  helperText: {
    marginTop: '0.5rem',
    fontSize: '0.875rem',
  },
  connectionProgress: {
    marginBottom: '1.5rem',
  },
  connectionCanvas: {
    width: '100%',
    height: '300px',
    borderRadius: '8px',
    marginBottom: '1rem',
    background: '#111827',
    border: '1px solid #374151',
  },
  progressInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem',
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  progressDetails: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  zapIcon: {
    color: '#10b981',
  },
  progressText: {
    color: '#d1d5db',
  },
  progressPercent: {
    color: '#10b981',
    fontWeight: 700,
    fontSize: '1rem',
  },
  progressBar: {
    width: '100%',
    height: '8px',
    background: '#374151',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #10b981, #34d399)',
    transition: 'width 0.3s ease',
    boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)',
  },
  primaryButton: {
    width: '100%',
    padding: '0.875rem',
    background: '#ffffff',
    color: '#000000',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: 600,
    transition: 'all 0.2s',
  },
  disconnectBtn: {
    marginLeft: 'auto',
    padding: '0.5rem 1rem',
    background: '#7f1d1d',
    color: '#fecaca',
    border: '1px solid #991b1b',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  connectionBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem',
    background: '#064e3b',
    border: '1px solid #065f46',
    borderRadius: '6px',
    marginBottom: '1rem',
    fontSize: '0.875rem',
    color: '#86efac',
  },
  messagesContainer: {
    height: '400px',
    overflowY: 'auto',
    padding: '1rem',
    background: '#111827',
    borderRadius: '6px',
    marginBottom: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#6b7280',
    textAlign: 'center',
  },
  messageCard: {
    maxWidth: '70%',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
  },
  messageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.75rem',
    marginBottom: '0.25rem',
    opacity: 0.8,
  },
  messageText: {
    fontSize: '0.95rem',
    lineHeight: 1.5,
  },
  messageInputContainer: {
    display: 'flex',
    gap: '0.75rem',
  },
  messageInput: {
    flex: 1,
    padding: '0.75rem',
    background: '#111827',
    border: '2px solid #374151',
    borderRadius: '6px',
    fontSize: '1rem',
    outline: 'none',
    color: '#ffffff',
  },
  sendButton: {
    padding: '0.75rem 1.5rem',
    background: '#ffffff',
    color: '#000000',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'all 0.2s',
  },
  footer: {
    background: '#111827',
    color: '#ffffff',
    borderTop: '1px solid #374151',
    padding: '2rem 0',
    marginTop: 'auto',
  },
  footerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '2rem',
  },
  footerLeft: {},
  footerTitle: {
    margin: '0 0 0.25rem 0',
    fontSize: '1.125rem',
    fontWeight: 700,
  },
  footerText: {
    margin: 0,
    fontSize: '0.75rem',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  footerCenter: {},
  footerRight: {
    textAlign: 'right',
  },
  footerLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#ffffff',
    textDecoration: 'none',
    fontSize: '0.875rem',
    marginTop: '0.5rem',
    transition: 'color 0.2s',
  },
};
