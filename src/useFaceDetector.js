// Face detection hook using face-api.js loaded via CDN (window.faceapi)
import { useRef, useState, useCallback, useEffect } from 'react';

const MODELS_URL =
  'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js-models@master';

const ROLLING_WINDOW_SIZE = 20;
const ROLLING_DECAY = (ROLLING_WINDOW_SIZE - 1) / ROLLING_WINDOW_SIZE;

export function useFaceDetector() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);
  const streamRef = useRef(null);

  const [modelsReady, setModelsReady] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [eyeScore, setEyeScore] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Load models once face-api is available on window
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        // Wait for CDN script to define window.faceapi (up to 10s)
        let tries = 0;
        while (!window.faceapi && tries < 100) {
          await new Promise((r) => setTimeout(r, 100));
          tries++;
        }
        if (!window.faceapi) throw new Error('face-api.js not loaded');
        await window.faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL);
        if (!cancelled) setModelsReady(true);
      } catch (err) {
        if (!cancelled) setLoadError(err.message);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setLoadError('Camera access denied');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
    setFaceDetected(false);
    setEyeScore(0);
  }, []);

  // Run detection loop when camera is active and models ready
  useEffect(() => {
    if (!cameraActive || !modelsReady) return;

    let detected = 0;
    let total = 0;

    intervalRef.current = setInterval(async () => {
      if (!videoRef.current || !window.faceapi) return;
      total++;
      try {
        const detection = await window.faceapi.detectSingleFace(
          videoRef.current,
          new window.faceapi.TinyFaceDetectorOptions()
        );
        const has = Boolean(detection);
        setFaceDetected(has);
        if (has) detected++;
        // rolling accuracy over last ROLLING_WINDOW_SIZE frames → eye-contact percentage
        setEyeScore(Math.round((detected / Math.min(total, ROLLING_WINDOW_SIZE)) * 100));
        if (total > ROLLING_WINDOW_SIZE) { total = ROLLING_WINDOW_SIZE; detected = Math.round(detected * ROLLING_DECAY); }
      } catch {
        // detection error — skip frame
      }
    }, 500);

    return () => clearInterval(intervalRef.current);
  }, [cameraActive, modelsReady]);

  return {
    videoRef,
    canvasRef,
    modelsReady,
    cameraActive,
    eyeScore,
    faceDetected,
    loadError,
    startCamera,
    stopCamera,
  };
}
