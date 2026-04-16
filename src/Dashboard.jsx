import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js';
import { Radar, Bar } from 'react-chartjs-2';
import Lottie from 'lottie-react';
import { useFaceDetector } from './useFaceDetector';
import { useSpeechAnalyzer } from './useSpeechAnalyzer';

function normalizeSession(session) {
  if (!session || typeof session !== 'object') return null;
  const toPercent = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, Math.round(n)));
  };

  return {
    confidence: toPercent(session.confidence),
    fluency: toPercent(session.fluency),
    eye: toPercent(session.eye),
    clarity: toPercent(session.clarity),
    transcript: typeof session.transcript === 'string' ? session.transcript : '',
    timestamp: Number.isFinite(Number(session.timestamp)) ? Number(session.timestamp) : null,
  };
}

function loadHistoryFromStorage() {
  try {
    const raw = JSON.parse(localStorage.getItem('speakai_history') || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizeSession).filter(Boolean).slice(0, 50);
  } catch {
    return [];
  }
}

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

// ─── Meter Card ────────────────────────────────────────────────────────────────
function MeterCard({ label, value, color, icon }) {
  const radius = 40;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (value / 100) * circ;
  return (
    <div className="metric-card">
      <svg width="100" height="100" style={{ display: 'block', margin: '0 auto 8px' }}>
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={radius}
          fill="none" stroke={color}
          strokeWidth="8"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
        <text x="50" y="55" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="700">
          {value}%
        </text>
      </svg>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
        <div style={{ color: '#a0aec0', fontSize: 13 }}>{label}</div>
      </div>
    </div>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ active, setActive }) {
  const items = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'practice', icon: '🎙️', label: 'Practice' },
    { id: 'history', icon: '📜', label: 'History' },
    { id: 'tips', icon: '💡', label: 'Tips' },
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span style={{ fontSize: 28 }}>🚀</span>
        <span className="sidebar-brand">SpeakAI</span>
      </div>
      <nav>
        {items.map((item) => (
          <button
            key={item.id}
            className={`sidebar-item ${active === item.id ? 'active' : ''}`}
            onClick={() => setActive(item.id)}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div style={{ fontSize: 11, color: '#4a5568' }}>AI INTERVIEW COACH</div>
        <div style={{ fontSize: 11, color: '#4a5568' }}>v2.0 PRO</div>
      </div>
    </aside>
  );
}

// ─── History Tab ───────────────────────────────────────────────────────────────
function HistoryTab({ history }) {
  if (!history.length)
    return (
      <div style={{ textAlign: 'center', color: '#718096', marginTop: 80, fontSize: 16 }}>
        No sessions recorded yet. Complete a practice session to see results here.
      </div>
    );
  return (
    <div>
      <h2 className="section-title">Session History</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {history.map((s, i) => (
          <div key={i} className="glass-card" style={{ padding: '16px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: '#a0aec0', fontSize: 13 }}>
                {s.timestamp ? new Date(s.timestamp).toLocaleString() : 'Unknown date'}
              </div>
              <div style={{ display: 'flex', gap: 24 }}>
                {[
                  { l: 'Confidence', v: s.confidence, c: '#6366f1' },
                  { l: 'Fluency', v: s.fluency, c: '#10b981' },
                  { l: 'Eye Contact', v: s.eye, c: '#f59e0b' },
                  { l: 'Clarity', v: s.clarity, c: '#ec4899' },
                ].map(({ l, v, c }) => (
                  <div key={l} style={{ textAlign: 'center' }}>
                    <div style={{ color: c, fontWeight: 700 }}>{v}%</div>
                    <div style={{ color: '#718096', fontSize: 11 }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
            {s.transcript && (
              <div style={{ marginTop: 8, color: '#718096', fontSize: 13, fontStyle: 'italic' }}>
                "{s.transcript.slice(0, 120)}{s.transcript.length > 120 ? '…' : ''}"
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tips Tab ─────────────────────────────────────────────────────────────────
function TipsTab() {
  const tips = [
    { icon: '👁️', title: 'Eye Contact', body: 'Look directly into the camera. Treat it as the interviewer\'s eyes. Aim for 70–90% of the session.' },
    { icon: '🔇', title: 'Avoid Filler Words', body: '"Um", "uh", "like" — replace them with a confident pause. Silence is professional.' },
    { icon: '🗣️', title: 'Speaking Pace', body: 'Target 120–150 words per minute. Too fast sounds nervous; too slow loses attention.' },
    { icon: '🧘', title: 'Posture & Breathing', body: 'Sit upright, take a breath before answering. Calm body language projects confidence.' },
    { icon: '✂️', title: 'Structure Answers', body: 'Use STAR (Situation, Task, Action, Result) to keep answers focused and impactful.' },
    { icon: '🔄', title: 'Practice Daily', body: 'Even 5-minute daily sessions dramatically improve fluency and reduce anxiety.' },
  ];
  return (
    <div>
      <h2 className="section-title">Pro Interview Tips</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
        {tips.map((t) => (
          <div key={t.title} className="glass-card tip-card">
            <div style={{ fontSize: 32, marginBottom: 10 }}>{t.icon}</div>
            <div style={{ fontWeight: 700, marginBottom: 6, color: '#e2e8f0' }}>{t.title}</div>
            <div style={{ color: '#718096', fontSize: 14, lineHeight: 1.6 }}>{t.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Practice / Dashboard Tabs ─────────────────────────────────────────────────
function PracticeTab({ face, speech, onSessionSave }) {
  const { videoRef, modelsReady, cameraActive, eyeScore, faceDetected, loadError, startCamera, stopCamera } = face;
  const { supported, listening, transcript, interimText, analysis, startListening, stopListening, reset } = speech;

  const handleSave = () => {
    if (analysis) {
      onSessionSave({
        confidence: analysis.confidence,
        fluency: analysis.fluency,
        eye: eyeScore,
        clarity: analysis.clarity,
        transcript,
        timestamp: Date.now(),
      });
    }
  };

  return (
    <div>
      <h2 className="section-title">Live Practice Session</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Camera Panel */}
        <div className="glass-card">
          <div style={{ fontWeight: 600, marginBottom: 12, color: '#e2e8f0' }}>📷 Live Camera Feed</div>
          <div style={{ position: 'relative', background: '#000', borderRadius: 12, overflow: 'hidden', aspectRatio: '4/3' }}>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: cameraActive ? 'block' : 'none' }}
            />
            {!cameraActive && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#4a5568' }}>
                <span style={{ fontSize: 48 }}>📷</span>
                <span style={{ marginTop: 8, fontSize: 14 }}>Camera off</span>
              </div>
            )}
            {cameraActive && (
              <div style={{ position: 'absolute', top: 10, right: 10 }}>
                <span className={`face-badge ${faceDetected ? 'detected' : 'missing'}`}>
                  {faceDetected ? '✅ Face' : '❌ No Face'}
                </span>
              </div>
            )}
          </div>
          {loadError && (
            <div style={{ color: '#fc8181', fontSize: 13, marginTop: 8 }}>⚠️ {loadError}</div>
          )}
          <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
            {!cameraActive ? (
              <button className="btn-primary" onClick={startCamera} disabled={!!loadError}>
                Start Camera
              </button>
            ) : (
              <button className="btn-danger" onClick={stopCamera}>Stop Camera</button>
            )}
            <div style={{ fontSize: 12, color: '#718096', alignSelf: 'center' }}>
              {modelsReady ? '🟢 Models ready' : '🟡 Loading models…'}
            </div>
          </div>
        </div>

        {/* Voice Panel */}
        <div className="glass-card">
          <div style={{ fontWeight: 600, marginBottom: 12, color: '#e2e8f0' }}>🎙️ Voice Recording</div>
          {!supported && (
            <div style={{ color: '#fc8181', fontSize: 13, marginBottom: 8 }}>
              ⚠️ Speech recognition not supported in this browser. Try Chrome or Edge.
            </div>
          )}
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 14, minHeight: 120, marginBottom: 12, fontSize: 14, color: '#e2e8f0', lineHeight: 1.7 }}>
            {transcript || interimText ? (
              <>
                <span>{transcript}</span>
                <span style={{ color: '#718096' }}>{interimText}</span>
              </>
            ) : (
              <span style={{ color: '#4a5568' }}>Transcript will appear here as you speak…</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {!listening ? (
              <button className="btn-primary btn-glow" onClick={startListening} disabled={!supported}>
                🎙️ Start Speaking
              </button>
            ) : (
              <button className="btn-danger" onClick={stopListening}>
                ⏹️ Stop
              </button>
            )}
            <button className="btn-secondary" onClick={reset}>↺ Reset</button>
            {analysis && (
              <button className="btn-success" onClick={handleSave}>💾 Save Session</button>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      {analysis && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ color: '#a0aec0', marginBottom: 16, fontWeight: 600 }}>📊 Session Results</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <MeterCard label="Confidence" value={analysis.confidence} color="#6366f1" icon="💪" />
            <MeterCard label="Fluency" value={analysis.fluency} color="#10b981" icon="🗣️" />
            <MeterCard label="Eye Contact" value={eyeScore} color="#f59e0b" icon="👁️" />
            <MeterCard label="Clarity" value={analysis.clarity} color="#ec4899" icon="✨" />
          </div>
          <div className="glass-card" style={{ marginTop: 20, display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            <div>
              <span style={{ color: '#718096', fontSize: 13 }}>Words spoken</span>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#e2e8f0' }}>{analysis.wordCount}</div>
            </div>
            <div>
              <span style={{ color: '#718096', fontSize: 13 }}>Filler words</span>
              <div style={{ fontSize: 28, fontWeight: 700, color: analysis.fillerCount > 5 ? '#fc8181' : '#68d391' }}>
                {analysis.fillerCount}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ color: '#718096', fontSize: 13 }}>Feedback</span>
              <div style={{ fontSize: 14, color: '#e2e8f0', marginTop: 4, lineHeight: 1.6 }}>
                {analysis.confidence >= 80 ? '🔥 Excellent confidence!' : analysis.confidence >= 60 ? '👍 Good — reduce filler words' : '📈 Keep practising — minimize "um", "uh"'}
                {' · '}
                {eyeScore >= 70 ? '👁️ Great eye contact' : '👁️ Look at the camera more'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Dashboard Overview Tab ────────────────────────────────────────────────────
function DashboardOverview({ history, lottieData }) {
  const avgOf = (key) =>
    history.length
      ? Math.round(history.reduce((s, h) => s + h[key], 0) / history.length)
      : 0;

  const radarData = {
    labels: ['Confidence', 'Fluency', 'Eye Contact', 'Clarity'],
    datasets: [
      {
        label: 'Average Score',
        data: [avgOf('confidence'), avgOf('fluency'), avgOf('eye'), avgOf('clarity')],
        backgroundColor: 'rgba(99,102,241,0.2)',
        borderColor: '#6366f1',
        pointBackgroundColor: '#6366f1',
        borderWidth: 2,
      },
    ],
  };

  const barData = {
    labels: history.slice(-6).map((_, i) => `S${i + 1}`),
    datasets: [
      {
        label: 'Confidence',
        data: history.slice(-6).map((h) => h.confidence),
        backgroundColor: 'rgba(99,102,241,0.7)',
        borderRadius: 6,
      },
      {
        label: 'Fluency',
        data: history.slice(-6).map((h) => h.fluency),
        backgroundColor: 'rgba(16,185,129,0.7)',
        borderRadius: 6,
      },
      {
        label: 'Eye Contact',
        data: history.slice(-6).map((h) => h.eye),
        backgroundColor: 'rgba(245,158,11,0.7)',
        borderRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: { legend: { labels: { color: '#a0aec0', font: { size: 12 } } } },
    scales: {
      r: { ticks: { color: '#4a5568', backdropColor: 'transparent' }, grid: { color: 'rgba(255,255,255,0.06)' }, pointLabels: { color: '#a0aec0' } },
      x: { ticks: { color: '#a0aec0' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { ticks: { color: '#a0aec0' }, grid: { color: 'rgba(255,255,255,0.05)' }, min: 0, max: 100 },
    },
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 className="section-title" style={{ margin: 0 }}>Dashboard Overview</h2>
        {lottieData && (
          <div style={{ width: 80, height: 80 }}>
            <Lottie animationData={lottieData} loop autoplay style={{ width: '100%', height: '100%' }} />
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Sessions', value: history.length, icon: '📋', color: '#6366f1' },
          { label: 'Avg Confidence', value: `${avgOf('confidence')}%`, icon: '💪', color: '#10b981' },
          { label: 'Avg Fluency', value: `${avgOf('fluency')}%`, icon: '🗣️', color: '#f59e0b' },
          { label: 'Avg Eye Contact', value: `${avgOf('eye')}%`, icon: '👁️', color: '#ec4899' },
        ].map((s) => (
          <div key={s.label} className="glass-card stat-card">
            <div style={{ fontSize: 28 }}>{s.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ color: '#718096', fontSize: 13 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {history.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px 0', color: '#718096' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎙️</div>
          <div style={{ fontSize: 18, color: '#a0aec0', marginBottom: 8 }}>No sessions yet</div>
          <div>Go to <strong style={{ color: '#6366f1' }}>Practice</strong> to record your first session</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div className="glass-card">
            <div style={{ fontWeight: 600, marginBottom: 16, color: '#e2e8f0' }}>Skills Radar</div>
            <Radar data={radarData} options={chartOptions} />
          </div>
          <div className="glass-card">
            <div style={{ fontWeight: 600, marginBottom: 16, color: '#e2e8f0' }}>Session Progress</div>
            <Bar data={barData} options={chartOptions} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Root Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [history, setHistory] = useState(loadHistoryFromStorage);
  const [lottieData, setLottieData] = useState(null);

  // Load a free Lottie animation (rocket / success)
  useEffect(() => {
    fetch('https://assets9.lottiefiles.com/packages/lf20_touohxv0.json')
      .then((r) => r.json())
      .then(setLottieData)
      .catch(() => {});
  }, []);

  const face = useFaceDetector();
  const speech = useSpeechAnalyzer();

  const saveSession = (session) => {
    const normalizedSession = normalizeSession(session);
    if (!normalizedSession) return;

    setHistory((prevHistory) => {
      const safeHistory = Array.isArray(prevHistory) ? prevHistory : [];
      const updated = [normalizedSession, ...safeHistory].slice(0, 50);
      localStorage.setItem('speakai_history', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <div className="app-layout">
      <Sidebar active={activeTab} setActive={setActiveTab} />
      <main className="main-content">
        <header className="top-bar">
          <div>
            <h1 className="top-bar-title">
              {activeTab === 'dashboard' && '📊 Dashboard'}
              {activeTab === 'practice' && '🎙️ Practice'}
              {activeTab === 'history' && '📜 History'}
              {activeTab === 'tips' && '💡 Tips'}
            </h1>
            <p className="top-bar-sub">AI-powered interview coach</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="pro-badge">PRO</span>
            <div className="avatar">M</div>
          </div>
        </header>

        <div className="content-area">
          {activeTab === 'dashboard' && (
            <DashboardOverview history={history} lottieData={lottieData} />
          )}
          {activeTab === 'practice' && (
            <PracticeTab face={face} speech={speech} onSessionSave={saveSession} />
          )}
          {activeTab === 'history' && <HistoryTab history={history} />}
          {activeTab === 'tips' && <TipsTab />}
        </div>
      </main>
    </div>
  );
}
