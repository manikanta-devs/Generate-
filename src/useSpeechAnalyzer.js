// Speech recording and analysis using Web Speech API
import { useState, useRef, useCallback } from 'react';

const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'basically', 'literally', 'actually', 'right'];

export function useSpeechAnalyzer() {
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [supported] = useState(() => 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  const analyze = useCallback((text) => {
    const words = text.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    if (wordCount === 0) return null;

    const fillerCount = words.filter((w) =>
      FILLER_WORDS.includes(w.toLowerCase())
    ).length;

    const confidence = Math.max(0, Math.min(100, 100 - fillerCount * 8));
    const fluency = Math.min(100, Math.round((wordCount / 150) * 100)); // 150 wpm target
    const clarity = Math.max(
      0,
      Math.min(100, Math.round(((wordCount - fillerCount) / wordCount) * 100))
    );

    return { confidence, fluency, clarity, wordCount, fillerCount, words };
  }, []);

  const startListening = useCallback(() => {
    if (!supported) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    let finalTranscript = '';

    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          finalTranscript += t + ' ';
          setTranscript(finalTranscript);
        } else {
          interim = t;
        }
      }
      setInterimText(interim);
    };

    rec.onend = () => {
      setListening(false);
      setInterimText('');
      setAnalysis(analyze(finalTranscript));
    };

    rec.onerror = () => {
      setListening(false);
    };

    rec.start();
    recognitionRef.current = rec;
    setListening(true);
    setTranscript('');
    setAnalysis(null);
    setInterimText('');
  }, [supported, analyze]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stopListening();
    setTranscript('');
    setInterimText('');
    setAnalysis(null);
  }, [stopListening]);

  return {
    supported,
    listening,
    transcript,
    interimText,
    analysis,
    startListening,
    stopListening,
    reset,
  };
}
