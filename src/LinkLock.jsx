import React, { useState, useEffect, useRef } from 'react';
import {
  Lock, Unlock, Eye, EyeOff, Download, Mail, Copy, Check,
  Trash2, Edit3, AlertCircle, Clock, Shield, BarChart3,
  FileText, Image, Code, File, X, RefreshCw,
} from 'lucide-react';

// ============================================================================
// UTILITIES
// ============================================================================

const generateId = () =>
  Math.random().toString(36).substring(2, 15) +
  Math.random().toString(36).substring(2, 15);

const hashPassword = (password) => {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    hash = (hash << 5) - hash + password.charCodeAt(i);
    hash = hash & hash;
  }
  return hash.toString(36);
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

const detectContentType = (text, fileName) => {
  if (fileName) {
    if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName)) return 'image';
    if (/\.(pdf)$/i.test(fileName)) return 'pdf';
    if (/\.(js|jsx|ts|tsx|py|java|cpp|c|html|css|json|xml)$/i.test(fileName))
      return 'code';
    return 'file';
  }
  if (text && (text.includes('function') || text.includes('const ') || text.includes('=>')))
    return 'code';
  return 'text';
};

const isValidSlug = (slug) => /^[a-zA-Z0-9-_]{3,30}$/.test(slug);

// ============================================================================
// TOAST NOTIFICATION
// ============================================================================

const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const configs = {
    success: {
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      icon: <Check size={16} />,
    },
    error: {
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      icon: <AlertCircle size={16} />,
    },
    info: {
      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      icon: <AlertCircle size={16} />,
    },
  };

  const cfg = configs[type] || configs.success;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 18px',
        borderRadius: '10px',
        background: cfg.background,
        color: '#fff',
        fontSize: '14px',
        fontWeight: 500,
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        maxWidth: '340px',
        marginBottom: '8px',
      }}
    >
      {cfg.icon}
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          padding: 0,
          display: 'flex',
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
};

// ============================================================================
// QR CODE (canvas-based pattern)
// ============================================================================

const QRCode = ({ text, size = 240 }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current && text) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const modules = 29;
      const moduleSize = size / modules;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#000000';

      const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

      for (let row = 0; row < modules; row++) {
        for (let col = 0; col < modules; col++) {
          const seed = (row * modules + col + hash) % 100;
          const isCorner =
            (row < 8 && col < 8) ||
            (row < 8 && col >= modules - 8) ||
            (row >= modules - 8 && col < 8);
          if (seed > 45 || isCorner) {
            ctx.fillRect(col * moduleSize, row * moduleSize, moduleSize - 1, moduleSize - 1);
          }
        }
      }
    }
  }, [text, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="qr-canvas"
      style={{ borderRadius: '8px' }}
    />
  );
};

// ============================================================================
// COUNTDOWN TIMER
// ============================================================================

const CountdownTimer = ({ expiryTime }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = expiryTime - Date.now();
      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      setTimeLeft(
        days > 0
          ? `${days}d ${hours}h`
          : hours > 0
          ? `${hours}h ${minutes}m`
          : `${minutes}m ${seconds}s`,
      );
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiryTime]);

  return <span className="countdown">{timeLeft}</span>;
};

// ============================================================================
// MAIN APP
// ============================================================================

export default function LinkLock() {
  const [mode, setMode] = useState('upload');
  const [currentId, setCurrentId] = useState('');

  // Upload state
  const [textContent, setTextContent] = useState('');
  const [fileData, setFileData] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Rules state
  const [maxViews, setMaxViews] = useState('unlimited');
  const [expiryHours, setExpiryHours] = useState('24');
  const [downloadAllowed, setDownloadAllowed] = useState(true);
  const [passwordProtected, setPasswordProtected] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [customSlug, setCustomSlug] = useState('');
  const [useCustomSlug, setUseCustomSlug] = useState(false);

  // View state
  const [shareUrl, setShareUrl] = useState('');
  const [contentData, setContentData] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [denyReason, setDenyReason] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Dashboard state
  const [allShares, setAllShares] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, expired: 0, totalViews: 0 });

  // Toasts
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // Route on mount
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#view/')) {
      const id = hash.replace('#view/', '');
      setCurrentId(id);
      setMode('view');
      loadContent(id);
    } else if (hash === '#dashboard') {
      setMode('dashboard');
      loadDashboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- File upload ----
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('File must be under 5MB', 'error');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      setFileData({ name: file.name, type: file.type, size: file.size, data: event.target.result });
      setIsUploading(false);
      showToast('File uploaded successfully');
    };
    reader.onerror = () => {
      showToast('Failed to upload file', 'error');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  // ---- Create share ----
  const handleCreate = async () => {
    if (!textContent && !fileData) {
      showToast('Add some content to share', 'error');
      return;
    }

    if (passwordProtected && (!password || password.length < 4)) {
      showToast('Password must be at least 4 characters', 'error');
      return;
    }

    setIsLoading(true);

    try {
      let id;
      if (useCustomSlug && customSlug) {
        if (!isValidSlug(customSlug)) {
          showToast('Invalid slug. Use 3-30 chars: letters, numbers, -, _', 'error');
          setIsLoading(false);
          return;
        }
        const existing = await window.storage.get(customSlug);
        if (existing?.value) {
          showToast('Slug already taken', 'error');
          setIsLoading(false);
          return;
        }
        id = customSlug;
      } else {
        id = generateId();
      }

      const now = Date.now();
      const contentObj = {
        id,
        content: { text: textContent, file: fileData },
        rules: {
          maxViews: maxViews === 'unlimited' ? -1 : parseInt(maxViews, 10),
          expiryTime: expiryHours === 'never' ? null : now + parseInt(expiryHours, 10) * 3600000,
          downloadAllowed,
          passwordProtected,
          passwordHash: passwordProtected ? hashPassword(password) : null,
        },
        stats: { viewCount: 0, createdAt: now, lastAccessed: null },
      };

      await window.storage.set(id, JSON.stringify(contentObj));

      const ownerList = JSON.parse((await window.storage.get('owner_list'))?.value || '[]');
      ownerList.push(id);
      await window.storage.set('owner_list', JSON.stringify(ownerList));

      setShareUrl(`${window.location.origin}${window.location.pathname}#view/${id}`);
      setCurrentId(id);
      setMode('share');
      showToast('Share link created!');
    } catch {
      showToast('Failed to create link', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ---- Load content (view mode) ----
  const loadContent = async (id, providedPassword = null) => {
    setIsLoading(true);

    try {
      const result = await window.storage.get(id);

      if (!result?.value) {
        setAccessDenied(true);
        setDenyReason('Content not found or deleted');
        setIsLoading(false);
        return;
      }

      const data = JSON.parse(result.value);

      if (data.rules.passwordProtected) {
        if (!providedPassword) {
          setNeedsPassword(true);
          setIsLoading(false);
          return;
        }
        if (hashPassword(providedPassword) !== data.rules.passwordHash) {
          showToast('Incorrect password', 'error');
          setPasswordInput('');
          setIsLoading(false);
          return;
        }
        setNeedsPassword(false);
      }

      if (data.rules.expiryTime && Date.now() > data.rules.expiryTime) {
        await window.storage.delete(id);
        setAccessDenied(true);
        setDenyReason('Content has expired');
        setIsLoading(false);
        return;
      }

      if (data.rules.maxViews !== -1 && data.stats.viewCount >= data.rules.maxViews) {
        await window.storage.delete(id);
        setAccessDenied(true);
        setDenyReason('View limit exceeded');
        setIsLoading(false);
        return;
      }

      data.stats.viewCount++;
      data.stats.lastAccessed = Date.now();

      if (data.rules.maxViews !== -1 && data.stats.viewCount >= data.rules.maxViews) {
        setTimeout(() => window.storage.delete(id), 1000);
      } else {
        await window.storage.set(id, JSON.stringify(data));
      }

      setContentData(data);
    } catch {
      setAccessDenied(true);
      setDenyReason('Error loading content');
    } finally {
      setIsLoading(false);
    }
  };

  // ---- Dashboard ----
  const loadDashboard = async () => {
    try {
      const ownerList = JSON.parse((await window.storage.get('owner_list'))?.value || '[]');
      const shares = [];

      for (const id of ownerList) {
        const result = await window.storage.get(id);
        if (result?.value) shares.push(JSON.parse(result.value));
      }

      shares.sort((a, b) => b.stats.createdAt - a.stats.createdAt);

      const now = Date.now();
      const active = shares.filter((s) => !s.rules.expiryTime || s.rules.expiryTime > now);
      const expired = shares.filter((s) => s.rules.expiryTime && s.rules.expiryTime <= now);
      const totalViews = shares.reduce((sum, s) => sum + s.stats.viewCount, 0);

      setAllShares(shares);
      setStats({ total: shares.length, active: active.length, expired: expired.length, totalViews });
    } catch {
      setAllShares([]);
    }
  };

  const deleteShare = async (id) => {
    if (!confirm('Delete this share?')) return;
    try {
      await window.storage.delete(id);
      const ownerList = JSON.parse((await window.storage.get('owner_list'))?.value || '[]');
      await window.storage.set('owner_list', JSON.stringify(ownerList.filter((sid) => sid !== id)));
      loadDashboard();
      showToast('Share deleted');
    } catch {
      showToast('Failed to delete', 'error');
    }
  };

  const copyUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copied!');
    } catch {
      showToast('Failed to copy', 'error');
    }
  };

  const downloadQR = () => {
    const canvas = document.querySelector('.qr-canvas');
    if (canvas) {
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `linklock-${currentId}.png`;
      a.click();
      showToast('QR code downloaded');
    }
  };

  const shareEmail = () => {
    const subject = encodeURIComponent('Shared via LinkLock');
    const body = encodeURIComponent(
      `I've shared something with you:\n\n${shareUrl}\n\nThis link has controlled access and may expire.`,
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const reset = () => {
    setMode('upload');
    setTextContent('');
    setFileData(null);
    setPassword('');
    setCustomSlug('');
    setPasswordProtected(false);
    setUseCustomSlug(false);
    setContentData(null);
    setAccessDenied(false);
    setNeedsPassword(false);
    window.location.hash = '';
  };

  const getContentIcon = (type) => {
    const icons = {
      image: <Image size={20} />,
      code: <Code size={20} />,
      pdf: <FileText size={20} />,
      text: <FileText size={20} />,
      file: <File size={20} />,
    };
    return icons[type] || icons.file;
  };

  // ============================================================================
  // STYLES
  // ============================================================================

  const S = {
    // Layout
    app: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      color: '#e2e8f0',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 24px',
      background: 'rgba(255,255,255,0.03)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    },
    logo: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontSize: '20px',
      fontWeight: 700,
      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    nav: { display: 'flex', gap: '8px' },
    navBtn: (active) => ({
      padding: '8px 16px',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: 500,
      transition: 'all 0.2s',
      background: active ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'rgba(255,255,255,0.06)',
      color: active ? '#fff' : '#94a3b8',
    }),
    main: {
      maxWidth: '720px',
      margin: '0 auto',
      padding: '40px 20px',
    },
    card: {
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '16px',
      padding: '28px',
      marginBottom: '16px',
      backdropFilter: 'blur(10px)',
    },
    sectionTitle: {
      fontSize: '13px',
      fontWeight: 600,
      color: '#6366f1',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    label: {
      display: 'block',
      fontSize: '13px',
      color: '#94a3b8',
      marginBottom: '6px',
      fontWeight: 500,
    },
    input: {
      width: '100%',
      padding: '10px 14px',
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '8px',
      color: '#e2e8f0',
      fontSize: '14px',
      outline: 'none',
      boxSizing: 'border-box',
    },
    textarea: {
      width: '100%',
      padding: '12px 14px',
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '10px',
      color: '#e2e8f0',
      fontSize: '14px',
      outline: 'none',
      resize: 'vertical',
      minHeight: '140px',
      boxSizing: 'border-box',
      lineHeight: 1.6,
    },
    select: {
      padding: '10px 14px',
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '8px',
      color: '#e2e8f0',
      fontSize: '14px',
      outline: 'none',
      cursor: 'pointer',
    },
    primaryBtn: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      padding: '12px 24px',
      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      color: '#fff',
      border: 'none',
      borderRadius: '10px',
      fontSize: '15px',
      fontWeight: 600,
      cursor: 'pointer',
      width: '100%',
      transition: 'all 0.2s',
      boxShadow: '0 4px 15px rgba(99,102,241,0.3)',
    },
    secondaryBtn: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      padding: '10px 18px',
      background: 'rgba(255,255,255,0.07)',
      color: '#cbd5e1',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    dangerBtn: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      padding: '8px 14px',
      background: 'rgba(239,68,68,0.15)',
      color: '#f87171',
      border: '1px solid rgba(239,68,68,0.2)',
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: 500,
      cursor: 'pointer',
    },
    toggle: (on) => ({
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 14px',
      background: on ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)',
      border: on ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.1)',
      borderRadius: '8px',
      color: on ? '#818cf8' : '#64748b',
      fontSize: '13px',
      fontWeight: 500,
      cursor: 'pointer',
    }),
    row: { display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' },
    shareUrlBox: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '12px 14px',
      background: 'rgba(99,102,241,0.08)',
      border: '1px solid rgba(99,102,241,0.3)',
      borderRadius: '10px',
      marginBottom: '16px',
    },
    shareUrlText: {
      flex: 1,
      fontSize: '13px',
      color: '#a5b4fc',
      wordBreak: 'break-all',
      overflow: 'hidden',
    },
    badge: (color) => ({
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '3px 10px',
      borderRadius: '99px',
      fontSize: '12px',
      fontWeight: 600,
      background:
        color === 'green'
          ? 'rgba(16,185,129,0.15)'
          : color === 'red'
          ? 'rgba(239,68,68,0.15)'
          : 'rgba(99,102,241,0.15)',
      color:
        color === 'green' ? '#34d399' : color === 'red' ? '#f87171' : '#818cf8',
    }),
    statCard: {
      flex: '1 1 140px',
      padding: '20px',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      textAlign: 'center',
    },
    statNum: {
      fontSize: '28px',
      fontWeight: 700,
      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    statLabel: { fontSize: '12px', color: '#64748b', marginTop: '4px' },
    shareItem: {
      padding: '16px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '12px',
      marginBottom: '10px',
    },
    fileDropArea: {
      border: '2px dashed rgba(99,102,241,0.3)',
      borderRadius: '10px',
      padding: '28px',
      textAlign: 'center',
      cursor: 'pointer',
      background: 'rgba(99,102,241,0.04)',
      transition: 'all 0.2s',
    },
    contentBox: {
      background: 'rgba(0,0,0,0.3)',
      borderRadius: '10px',
      padding: '20px',
      overflowX: 'auto',
    },
    passwordInputWrap: {
      display: 'flex',
      alignItems: 'center',
      position: 'relative',
    },
    toastContainer: {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
    },
    divider: {
      height: '1px',
      background: 'rgba(255,255,255,0.07)',
      margin: '20px 0',
    },
  };

  // ============================================================================
  // RENDER MODES
  // ============================================================================

  const renderUpload = () => (
    <>
      {/* Content */}
      <div style={S.card}>
        <div style={S.sectionTitle}>
          <Edit3 size={14} /> Content
        </div>

        <label style={S.label}>Text / Message</label>
        <textarea
          style={S.textarea}
          placeholder="Paste your text, notes, code, or any content here…"
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
        />

        <div style={S.divider} />

        <label style={S.label}>Attach File (max 5 MB)</label>
        {fileData ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: '8px',
            }}
          >
            {getContentIcon(detectContentType(null, fileData.name))}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 500 }}>{fileData.name}</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>{formatFileSize(fileData.size)}</div>
            </div>
            <button style={S.dangerBtn} onClick={() => setFileData(null)}>
              <X size={14} />
            </button>
          </div>
        ) : (
          <label style={S.fileDropArea}>
            <input type="file" style={{ display: 'none' }} onChange={handleFileUpload} />
            {isUploading ? (
              <span style={{ color: '#6366f1' }}>Uploading…</span>
            ) : (
              <>
                <File size={28} style={{ color: '#334155', marginBottom: '8px' }} />
                <div style={{ fontSize: '14px', color: '#64748b' }}>
                  Click to browse or drag & drop
                </div>
              </>
            )}
          </label>
        )}
      </div>

      {/* Access Rules */}
      <div style={S.card}>
        <div style={S.sectionTitle}>
          <Shield size={14} /> Access Rules
        </div>

        <div style={S.row}>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Max views</label>
            <select
              style={S.select}
              value={maxViews}
              onChange={(e) => setMaxViews(e.target.value)}
            >
              <option value="unlimited">Unlimited</option>
              <option value="1">1 view</option>
              <option value="3">3 views</option>
              <option value="5">5 views</option>
              <option value="10">10 views</option>
              <option value="25">25 views</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Expires after</label>
            <select
              style={S.select}
              value={expiryHours}
              onChange={(e) => setExpiryHours(e.target.value)}
            >
              <option value="1">1 hour</option>
              <option value="6">6 hours</option>
              <option value="24">24 hours</option>
              <option value="72">3 days</option>
              <option value="168">1 week</option>
              <option value="never">Never</option>
            </select>
          </div>
        </div>

        <div style={{ ...S.row, gap: '8px' }}>
          <button style={S.toggle(downloadAllowed)} onClick={() => setDownloadAllowed(!downloadAllowed)}>
            <Download size={14} />
            {downloadAllowed ? 'Downloads on' : 'Downloads off'}
          </button>
          <button
            style={S.toggle(passwordProtected)}
            onClick={() => setPasswordProtected(!passwordProtected)}
          >
            <Lock size={14} />
            {passwordProtected ? 'Password on' : 'Add password'}
          </button>
          <button style={S.toggle(useCustomSlug)} onClick={() => setUseCustomSlug(!useCustomSlug)}>
            <Edit3 size={14} />
            Custom slug
          </button>
        </div>

        {passwordProtected && (
          <div style={{ marginTop: '12px' }}>
            <label style={S.label}>Password</label>
            <div style={S.passwordInputWrap}>
              <input
                style={{ ...S.input, paddingRight: '40px' }}
                type={showPassword ? 'text' : 'password'}
                placeholder="Min 4 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: 0,
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        )}

        {useCustomSlug && (
          <div style={{ marginTop: '12px' }}>
            <label style={S.label}>Custom slug (3–30 chars, letters/numbers/-/_)</label>
            <input
              style={S.input}
              placeholder="my-secret-link"
              value={customSlug}
              onChange={(e) => setCustomSlug(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Create button */}
      <button
        style={{ ...S.primaryBtn, opacity: isLoading ? 0.7 : 1 }}
        onClick={handleCreate}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
            Creating…
          </>
        ) : (
          <>
            <Lock size={16} />
            Create Secure Link
          </>
        )}
      </button>
    </>
  );

  const renderShare = () => (
    <div style={S.card}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            marginBottom: '12px',
          }}
        >
          <Check size={24} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>Link Created!</h2>
        <p style={{ fontSize: '14px', color: '#64748b' }}>Share this link with anyone</p>
      </div>

      <div style={S.shareUrlBox}>
        <span style={S.shareUrlText}>{shareUrl}</span>
        <button style={S.secondaryBtn} onClick={() => copyUrl(shareUrl)}>
          <Copy size={14} /> Copy
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        <QRCode text={shareUrl} size={200} />
      </div>

      <div style={{ ...S.row, justifyContent: 'center', marginBottom: '20px' }}>
        <button style={S.secondaryBtn} onClick={downloadQR}>
          <Download size={14} /> Download QR
        </button>
        <button style={S.secondaryBtn} onClick={shareEmail}>
          <Mail size={14} /> Email Link
        </button>
      </div>

      <div style={S.divider} />

      <div style={{ ...S.row, justifyContent: 'space-between' }}>
        <button style={S.secondaryBtn} onClick={reset}>
          <RefreshCw size={14} /> Create Another
        </button>
        <button
          style={S.secondaryBtn}
          onClick={() => {
            window.location.hash = `#view/${currentId}`;
            setMode('view');
            loadContent(currentId);
          }}
        >
          <Eye size={14} /> Preview
        </button>
      </div>
    </div>
  );

  const renderView = () => {
    if (isLoading) {
      return (
        <div style={{ ...S.card, textAlign: 'center', padding: '60px' }}>
          <RefreshCw
            size={32}
            style={{ color: '#6366f1', animation: 'spin 1s linear infinite', marginBottom: '12px' }}
          />
          <p style={{ color: '#64748b' }}>Loading content…</p>
        </div>
      );
    }

    if (accessDenied) {
      return (
        <div style={{ ...S.card, textAlign: 'center', padding: '60px' }}>
          <AlertCircle size={40} style={{ color: '#ef4444', marginBottom: '16px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Access Denied</h2>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>{denyReason}</p>
          <button style={S.secondaryBtn} onClick={reset}>
            <RefreshCw size={14} /> Go Home
          </button>
        </div>
      );
    }

    if (needsPassword) {
      return (
        <div style={{ ...S.card, maxWidth: '400px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <Lock size={36} style={{ color: '#6366f1', marginBottom: '12px' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Password Required</h2>
            <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
              This content is password protected
            </p>
          </div>
          <label style={S.label}>Enter password</label>
          <div style={{ ...S.passwordInputWrap, marginBottom: '16px' }}>
            <input
              style={{ ...S.input, paddingRight: '40px' }}
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadContent(currentId, passwordInput)}
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b',
                padding: 0,
              }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <button
            style={S.primaryBtn}
            onClick={() => loadContent(currentId, passwordInput)}
          >
            <Unlock size={16} /> Unlock Content
          </button>
        </div>
      );
    }

    if (!contentData) return null;

    const { content, rules, stats: cStats } = contentData;
    const contentType = detectContentType(content.text, content.file?.name);

    return (
      <div style={S.card}>
        {/* Meta bar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <span style={S.badge('indigo')}>
            <Eye size={11} />
            {cStats.viewCount} view{cStats.viewCount !== 1 ? 's' : ''}
          </span>
          {rules.maxViews !== -1 && (
            <span style={S.badge('red')}>
              <AlertCircle size={11} />
              {rules.maxViews - cStats.viewCount} left
            </span>
          )}
          {rules.expiryTime && (
            <span style={S.badge('indigo')}>
              <Clock size={11} />
              <CountdownTimer expiryTime={rules.expiryTime} />
            </span>
          )}
          {rules.passwordProtected && (
            <span style={S.badge('green')}>
              <Lock size={11} /> Protected
            </span>
          )}
        </div>

        {/* Text content */}
        {content.text && (
          <>
            <div style={S.sectionTitle}>
              {getContentIcon(contentType)} Content
            </div>
            <div
              style={{
                ...S.contentBox,
                fontFamily: contentType === 'code' ? 'monospace' : 'inherit',
                fontSize: contentType === 'code' ? '13px' : '14px',
                whiteSpace: 'pre-wrap',
                color: '#cbd5e1',
                lineHeight: 1.7,
                marginBottom: '16px',
              }}
            >
              {content.text}
            </div>
          </>
        )}

        {/* File content */}
        {content.file && (
          <>
            <div style={S.sectionTitle}>
              {getContentIcon(detectContentType(null, content.file.name))} Attached File
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px',
                marginBottom: '16px',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>{content.file.name}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  {formatFileSize(content.file.size)}
                </div>
              </div>
              {rules.downloadAllowed && (
                <a
                  href={content.file.data}
                  download={content.file.name}
                  style={{ ...S.secondaryBtn, textDecoration: 'none' }}
                >
                  <Download size={14} /> Download
                </a>
              )}
            </div>

            {/* Image preview */}
            {detectContentType(null, content.file.name) === 'image' &&
              content.file.data?.startsWith('data:image') && (
                <img
                  src={content.file.data}
                  alt={content.file.name}
                  style={{
                    maxWidth: '100%',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                />
              )}
          </>
        )}

        <div style={S.divider} />
        <div style={{ fontSize: '12px', color: '#475569' }}>
          Created {formatDate(cStats.createdAt)}
          {cStats.lastAccessed && ` · Last accessed ${formatDate(cStats.lastAccessed)}`}
        </div>
      </div>
    );
  };

  const renderDashboard = () => (
    <>
      {/* Stats row */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {[
          { label: 'Total', value: stats.total, Icon: BarChart3 },
          { label: 'Active', value: stats.active, Icon: Shield },
          { label: 'Expired', value: stats.expired, Icon: Clock },
          { label: 'Total Views', value: stats.totalViews, Icon: Eye },
        ].map(({ label, value, Icon }) => (
          <div key={label} style={S.statCard}>
            <Icon size={16} style={{ color: '#6366f1', marginBottom: '8px' }} />
            <div style={S.statNum}>{value}</div>
            <div style={S.statLabel}>{label}</div>
          </div>
        ))}
      </div>

      {/* Shares list */}
      <div style={S.card}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <div style={S.sectionTitle}>
            <FileText size={14} /> Your Shares
          </div>
          <button style={S.secondaryBtn} onClick={loadDashboard}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {allShares.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#475569' }}>
            <File size={36} style={{ marginBottom: '12px', opacity: 0.4 }} />
            <p>No shares yet. Create your first one!</p>
          </div>
        ) : (
          allShares.map((share) => {
            const now = Date.now();
            const isExpired = share.rules.expiryTime && share.rules.expiryTime <= now;
            const url = `${window.location.origin}${window.location.pathname}#view/${share.id}`;

            return (
              <div key={share.id} style={S.shareItem}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    marginBottom: '10px',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontFamily: 'monospace',
                        color: '#94a3b8',
                        marginBottom: '4px',
                        wordBreak: 'break-all',
                      }}
                    >
                      {url}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={S.badge(isExpired ? 'red' : 'green')}>
                        {isExpired ? 'Expired' : 'Active'}
                      </span>
                      <span style={S.badge('indigo')}>
                        <Eye size={10} /> {share.stats.viewCount} views
                      </span>
                      {share.rules.maxViews !== -1 && (
                        <span style={S.badge('indigo')}>
                          max {share.rules.maxViews}
                        </span>
                      )}
                      {share.rules.passwordProtected && (
                        <span style={S.badge('green')}>
                          <Lock size={10} /> Protected
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#475569', flex: 1 }}>
                    {formatDate(share.stats.createdAt)}
                    {share.rules.expiryTime && !isExpired && (
                      <>
                        {' · '}
                        <CountdownTimer expiryTime={share.rules.expiryTime} />
                        {' left'}
                      </>
                    )}
                  </span>
                  <button style={S.secondaryBtn} onClick={() => copyUrl(url)}>
                    <Copy size={13} />
                  </button>
                  <button style={S.dangerBtn} onClick={() => deleteShare(share.id)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );

  // ============================================================================
  // ROOT RENDER
  // ============================================================================

  return (
    <div style={S.app}>
      {/* Header */}
      <header style={S.header}>
        <div style={S.logo}>
          <Lock size={22} />
          LinkLock
        </div>
        <nav style={S.nav}>
          <button
            style={S.navBtn(mode === 'upload' || mode === 'share')}
            onClick={() => {
              reset();
              setMode('upload');
            }}
          >
            + New Share
          </button>
          <button
            style={S.navBtn(mode === 'dashboard')}
            onClick={() => {
              window.location.hash = '#dashboard';
              setMode('dashboard');
              loadDashboard();
            }}
          >
            Dashboard
          </button>
        </nav>
      </header>

      {/* Main */}
      <main style={S.main}>
        {mode === 'upload' && renderUpload()}
        {mode === 'share' && renderShare()}
        {mode === 'view' && renderView()}
        {mode === 'dashboard' && renderDashboard()}
      </main>

      {/* Toast container */}
      <div style={S.toastContainer}>
        {toasts.map((t) => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
        ))}
      </div>

      {/* Spin keyframe */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        body { margin: 0; }
        select option { background: #1e1e2e; color: #e2e8f0; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius: 3px; }
      `}</style>
    </div>
  );
}
