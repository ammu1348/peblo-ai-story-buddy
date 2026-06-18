import React, { useState, useEffect, useRef } from "react";
import { 
  Volume2, 
  Sparkles, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  VolumeX, 
  HelpCircle,
  Wand2,
  Bookmark,
  Wifi,
  Battery,
  Signal,
  RotateCcw
} from "lucide-react";
import { StoryData, PipRobotState, TTSMode } from "./types";

// Dynamic preset themes for kids
const PRESET_STORIES: { name: string; icon: string; theme: string }[] = [
  { name: "Pip's Blue Gear", icon: "⚙️", theme: "robot" },
  { name: "The Cosmic Star", icon: "⭐", theme: "a sparkling star in outer space" },
  { name: "Deep Sea Reef", icon: "🐠", theme: "a curious orange fish in a coral reef" },
  { name: "Magic Train Ride", icon: "🚂", theme: "a friendly train that climbs up a rainbow" },
  { name: "Chef Pip's Cupcake", icon: "🧁", theme: "a funny robot search for missing strawberries" },
];

export default function App() {
  // Current Story & Quiz State
  const [storyData, setStoryData] = useState<StoryData>({
    story: "Once upon a time, a clever little robot named Pip lost his shiny blue gear in the Whispering Woods...",
    quiz: {
      question: "What colour was Pip the Robot's lost gear?",
      options: ["Red", "Green", "Blue", "Yellow"],
      answer: "Blue"
    }
  });

  // State managers
  const [robotState, setRobotState] = useState<PipRobotState>("idle");
  const [ttsMode, setTtsMode] = useState<TTSMode>("native");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("Ready to learn!");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio play managers
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speechRate, setSpeechRate] = useState<number>(0.9); // Slow & reassuring for kids
  const [audioProgress, setAudioProgress] = useState<number>(0);
  
  // Quiz states
  const [quizRevealed, setQuizRevealed] = useState<boolean>(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [wrongAttempts, setWrongAttempts] = useState<number>(0);

  // Custom prompt builder
  const [customTheme, setCustomTheme] = useState<string>("");
  const [activePreset, setActivePreset] = useState<number>(0);
  const [showMagicBuilder, setShowMagicBuilder] = useState<boolean>(false);

  // Device context time
  const [deviceTime, setDeviceTime] = useState<string>("10:00");

  // Audio references
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const confettiAnimationRef = useRef<number | null>(null);

  // Keep device preview time synchronized
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      setDeviceTime(`${hours}:${minutes} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 15000);
    return () => clearInterval(interval);
  }, []);

  // Ensure any playing audio is cleaned up on unmount
  useEffect(() => {
    return () => {
      stopPlaying();
      if (confettiAnimationRef.current) {
        cancelAnimationFrame(confettiAnimationRef.current);
      }
    };
  }, []);

  // Soft shake animation triggers
  const triggerShake = () => {
    setIsShaking(true);
    setRobotState("dizzy");
    
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    setTimeout(() => {
      setIsShaking(false);
    }, 600);

    setTimeout(() => {
      setRobotState("idle");
    }, 2000);
  };

  // Canvas confetti effect
  const startConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
    canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;

    const colors = ["#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF", "#FF9F43", "#9B5DE5"];
    interface Particle {
      x: number;
      y: number;
      size: number;
      color: string;
      speedX: number;
      speedY: number;
      rotation: number;
      rotationSpeed: number;
    }

    const particles: Particle[] = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height - 20,
      size: Math.random() * 8 + 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedX: Math.random() * 4 - 2,
      speedY: Math.random() * 3 + 4,
      rotation: Math.random() * 360,
      rotationSpeed: Math.random() * 4 - 2,
    }));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let active = false;

      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX;
        p.rotation += p.rotationSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        if (p.size % 2 === 0) {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        if (p.y < canvas.height) {
          active = true;
        }
      });

      if (active) {
        confettiAnimationRef.current = requestAnimationFrame(animate);
      }
    };

    animate();
  };

  // Stop current audio feeds
  const stopPlaying = () => {
    setIsPlaying(false);
    setAudioProgress(0);
    setRobotState("idle");

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch (e) {}
      audioSourceRef.current = null;
    }
  };

  // Browser Standard voice synthesizer
  const playNativeTTS = (text: string) => {
    if (!window.speechSynthesis) {
      setErrorMessage("Standard voice is not configured on this device.");
      return;
    }

    window.speechSynthesis.cancel();
    setIsPlaying(true);
    setRobotState("speaking");
    setErrorMessage(null);

    const utterance = new SpeechSynthesisUtterance(text);
    speechUtteranceRef.current = utterance;
    utterance.rate = speechRate;
    
    const voices = window.speechSynthesis.getVoices();
    const kidFriendlyVoice = voices.find(
      v => v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Samantha") || v.name.includes("Natural"))
    ) || voices.find(v => v.lang.startsWith("en"));
    
    if (kidFriendlyVoice) {
      utterance.voice = kidFriendlyVoice;
    }

    const textLength = text.length;
    let timer: NodeJS.Timeout;

    const intervalTime = (textLength * 55) / 100;
    timer = setInterval(() => {
      setAudioProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + 5;
      });
    }, intervalTime);

    utterance.onend = () => {
      clearInterval(timer);
      setAudioProgress(100);
      setIsPlaying(false);
      setRobotState("idle");
      setQuizRevealed(true);
    };

    utterance.onerror = (e) => {
      clearInterval(timer);
      console.error("speechSynthesis.speak error:", e);
      
      // Routine canceled or interrupted speech triggers should be handled silently
      if (e.error === "interrupted" || e.error === "canceled") {
        setIsPlaying(false);
        setRobotState("idle");
        return;
      }

      setIsPlaying(false);
      setRobotState("idle");
      setErrorMessage("Device audio had a little yawn. Let's play it again!");
    };

    window.speechSynthesis.speak(utterance);
  };

  // Premium Server-Side voice synthesis
  const playGeminiTTS = async (text: string) => {
    setIsLoading(true);
    setStatusMessage("Calling Pip's friendly audio buddy...");
    setErrorMessage(null);
    setAudioProgress(0);

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        throw new Error("Could not construct premium voice.");
      }

      const data = await response.json();
      const audioBase64 = data.audio;
      
      const binaryString = window.atob(audioBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;

      const audioBuffer = await audioCtx.decodeAudioData(bytes.buffer);
      
      setIsLoading(false);
      setIsPlaying(true);
      setRobotState("speaking");

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      audioSourceRef.current = source;

      const duration = audioBuffer.duration;
      const startPlayTime = audioCtx.currentTime;

      const progressInterval = setInterval(() => {
        if (!isPlaying || !audioSourceRef.current) {
          clearInterval(progressInterval);
          return;
        }
        const elapsedTime = audioCtx.currentTime - startPlayTime;
        const percent = Math.min((elapsedTime / duration) * 100, 100);
        setAudioProgress(percent);

        if (percent >= 100) {
          clearInterval(progressInterval);
        }
      }, 100);

      source.onended = () => {
        clearInterval(progressInterval);
        setIsPlaying(false);
        setAudioProgress(100);
        setRobotState("idle");
        setQuizRevealed(true);
      };

      source.start(0);

    } catch (err: any) {
      console.error(err);
      setIsLoading(false);
      setErrorMessage("Premium Voice is resting. Switching over to standard voice!");
      setTtsMode("native");
      setTimeout(() => {
        playNativeTTS(text);
      }, 1200);
    }
  };

  const triggerStoryNarration = () => {
    stopPlaying();
    if (ttsMode === "gemini") {
      playGeminiTTS(storyData.story);
    } else {
      playNativeTTS(storyData.story);
    }
  };

  // Generate customized story & quiz components matching current target schemas
  const fetchNewGeneratedStory = async (themeToGenerate: string) => {
    setIsLoading(true);
    setStatusMessage("Cooking up a shiny new adventure snippet... 🪄");
    setErrorMessage(null);
    stopPlaying();
    
    setQuizRevealed(false);
    setSelectedOption(null);
    setIsAnswerCorrect(null);
    setWrongAttempts(0);

    try {
      const response = await fetch("/api/story/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: themeToGenerate })
      });

      if (!response.ok) {
        throw new Error("Story magic was interrupted. Tap below to refresh!");
      }

      const generated: StoryData = await response.json();
      
      if (!generated.story || !generated.quiz || !generated.quiz.question) {
        throw new Error("Story buddy got lost in the Whispering Woods!");
      }

      setStoryData(generated);
      setIsLoading(false);
      
      setTimeout(() => {
        if (ttsMode === "gemini") {
          playGeminiTTS(generated.story);
        } else {
          playNativeTTS(generated.story);
        }
      }, 400);

    } catch (err: any) {
      console.error(err);
      setIsLoading(false);
      setErrorMessage(err.message || "Couldn't connect to world generator. Let's play the offline backup module!");
    }
  };

  // Validate choice & trigger delightful haptics/success animations
  const handleOptionSelect = (option: string) => {
    if (isAnswerCorrect === true) return;
    
    setSelectedOption(option);
    const isCorrect = option.trim().toLowerCase() === storyData.quiz.answer.trim().toLowerCase();

    if (isCorrect) {
      setIsAnswerCorrect(true);
      setRobotState("success");
      
      setTimeout(() => {
        startConfetti();
        try {
          const osc = new AudioContext().createOscillator();
          const gain = new AudioContext().createGain();
          osc.connect(gain);
          gain.connect(new AudioContext().destination);
          osc.frequency.setValueAtTime(523.25, 0); 
          osc.frequency.setValueAtTime(659.25, 0.1); 
          osc.frequency.setValueAtTime(783.99, 0.2); 
          osc.frequency.setValueAtTime(1046.50, 0.3); 
          gain.gain.setValueAtTime(0.08, 0);
          osc.start();
          osc.stop(0.4);
        } catch (e) {}
      }, 30);
    } else {
      setIsAnswerCorrect(false);
      setWrongAttempts((prev) => prev + 1);
      triggerShake();
    }
  };

  const resetQuizAttempt = () => {
    setSelectedOption(null);
    setIsAnswerCorrect(null);
    setRobotState("idle");
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-[#FFF9E6] via-[#FFFDF5] to-[#FFEBEB] text-[#3A3528] font-sans antialiased flex flex-col items-center justify-center p-0 md:p-6 select-none overflow-x-hidden relative">
      
      {/* Absolute Backdrop ambient layers */}
      <div className="absolute top-0 left-0 w-80 h-80 rounded-full bg-[#FFE180]/20 blur-[100px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-0 w-96 h-96 rounded-full bg-[#FFB3B3]/10 blur-[120px] pointer-events-none -z-10" />
      
      {/* THE DEVICE SIMULATOR CORE WRAPPER - Perfect mobile viewport frame on wider screens */}
      <div className="w-full h-[100dvh] md:h-[860px] md:max-w-[420px] md:rounded-[48px] md:border-[10px] md:border-[#382E1C] bg-[#FFFDF9] md:shadow-2xl overflow-hidden relative flex flex-col md:ring-12 md:ring-[#F1EAD3]">
        
        {/* Dynamic Canvas overlay restricted to device borders */}
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 pointer-events-none z-50 w-full h-full"
        />

        {/* NATIVE PHONE MOCKUP STATUS BAR (only showing beautiful kid-friendly stats) */}
        <div className="w-full bg-[#FBF7EC] px-6 py-2.5 flex items-center justify-between text-xs font-bold text-[#83785F] border-b border-[#F0E9D5] select-none shrink-0 z-40">
          <span className="font-extrabold tracking-tight">{deviceTime}</span>
          
          {/* Audio Speaker notch mockup inside phone frame */}
          <div className="hidden md:block w-20 h-4 bg-[#382E1C] rounded-full absolute left-1/2 transform -translate-x-1/2 top-1 shadow-inner" />
          
          <div className="flex items-center gap-1.5 text-[#83785F]">
            <Signal className="w-3.5 h-3.5" />
            <Wifi className="w-3.5 h-3.5" />
            <Battery className="w-4 h-4 fill-current" />
          </div>
        </div>

        {/* COMPONENT CONTENT BODY - SCROLLABLE COMPANION ROOM */}
        <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col justify-between">
          
          {/* Inner Header brand header */}
          <div className="px-5 pt-4 pb-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-[#FF6B6B] text-white p-2 rounded-xl shadow-xs">
                  <Bookmark className="w-5 h-5 fill-white" />
                </div>
                <div>
                  <h1 className="text-lg font-black text-[#5C5441] tracking-tight flex items-center gap-1">
                    Peblo Story Buddy
                  </h1>
                  <span className="text-[10px] uppercase tracking-widest font-black text-[#B0A58C]">Interactive Room</span>
                </div>
              </div>

              {/* Offline backup fallback flag */}
              <div className="flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-[9px] font-black">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
                Indian Edu v1.0
              </div>
            </div>

            {/* Premium Voice Settings Switcher */}
            <div className="bg-white/80 border border-[#EBE5D3] p-1.5 rounded-2xl flex items-center justify-between gap-1 mt-3">
              <span className="text-[11px] font-extrabold text-[#786E58] pl-2">Pip's Voice Mode:</span>
              <div className="flex bg-[#F2EDE0] p-0.5 rounded-xl shrink-0">
                <button
                  id="standard-voice-toggle"
                  onClick={() => { setTtsMode("native"); stopPlaying(); }}
                  className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all ${
                    ttsMode === "native" 
                      ? "bg-white text-[#FF6B6B] shadow-xs" 
                      : "text-[#5C5441] opacity-70"
                  }`}
                >
                  🧒 Standard
                </button>
                <button
                  id="premium-voice-toggle"
                  onClick={() => { setTtsMode("gemini"); stopPlaying(); }}
                  className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all flex items-center gap-1 ${
                    ttsMode === "gemini" 
                      ? "bg-[#FF6B6B] text-white shadow-xs" 
                      : "text-[#5C5441] opacity-70"
                  }`}
                >
                  <Sparkles className="w-3 h-3 fill-current" /> Premium
                </button>
              </div>
            </div>
          </div>

          {/* CHAMELEON INTERACTIVE ROBOT CHARCTER SCREEN DOCK */}
          <section className="px-5 py-2 flex flex-col items-center shrink-0">
            <div className="relative p-2">
              {/* Visual halo glow */}
              <div className={`absolute inset-0 rounded-full blur-2xl opacity-40 transition-all duration-700 ${
                robotState === "speaking" ? "bg-cyan-300 scale-110" :
                robotState === "thinking" ? "bg-amber-300 animate-pulse" :
                robotState === "success" ? "bg-emerald-300 scale-125 duration-300" :
                robotState === "dizzy" ? "bg-red-300 scale-95" : "bg-[#FFD93D]/60"
              }`} />

              {/* PIP THE ROBOT VECTOR ILLUSTRATION */}
              <svg
                id="pip-robot"
                viewBox="0 0 200 200"
                className={`w-36 h-36 relative z-10 transition-transform duration-500 transform ${
                  robotState === "speaking" ? "animate-bounce" :
                  robotState === "thinking" ? "animate-pulse" :
                  robotState === "success" ? "scale-110 rotate-[4deg]" :
                  robotState === "dizzy" ? "animate-spin" : "hover:scale-105"
                }`}
              >
                {/* Antenna */}
                <rect x="96" y="15" width="8" height="25" fill="#4A4A4A" rx="4" />
                <circle
                  cx="100"
                  cy="15"
                  r="10"
                  fill={
                    robotState === "speaking" ? "#00F0FF" :
                    robotState === "thinking" ? "#FF9F43" :
                    robotState === "success" ? "#2ECC71" :
                    robotState === "dizzy" ? "#E74C3C" : "#FFD93D"
                  }
                  className={robotState === "speaking" ? "animate-ping origin-center" : ""}
                />

                {/* Ears */}
                <rect x="35" y="65" width="12" height="30" fill="#7F8C8D" rx="6" stroke="#4A4A4A" strokeWidth="2" />
                <rect x="153" y="65" width="12" height="30" fill="#7F8C8D" rx="6" stroke="#4A4A4A" strokeWidth="2" />

                {/* Head Base */}
                <rect x="42" y="40" width="116" height="80" fill="#BDC3C7" rx="24" stroke="#4A4A4A" strokeWidth="5" />
                <rect x="52" y="50" width="96" height="50" fill="#3D405B" rx="14" />

                {/* Eyes */}
                {robotState === "success" ? (
                  <>
                    <path d="M 64,68 Q 72,55 80,68" stroke="#2ECC71" strokeWidth="6" fill="none" strokeLinecap="round" />
                    <path d="M 120,68 Q 128,55 136,68" stroke="#2ECC71" strokeWidth="6" fill="none" strokeLinecap="round" />
                  </>
                ) : robotState === "dizzy" ? (
                  <>
                    <path d="M 66,62 L 78,74 M 78,62 L 66,74" stroke="#E74C3C" strokeWidth="5" strokeLinecap="round" />
                    <path d="M 122,62 L 134,74 M 134,62 L 122,74" stroke="#E74C3C" strokeWidth="5" strokeLinecap="round" />
                  </>
                ) : robotState === "thinking" ? (
                  <>
                    <ellipse cx="74" cy="68" rx="8" ry="12" fill="#FF9F43" />
                    <ellipse cx="126" cy="68" rx="8" ry="12" fill="#FF9F43" />
                    <circle cx="76" cy="68" r="3" fill="#ffffff" />
                    <circle cx="128" cy="68" r="3" fill="#ffffff" />
                  </>
                ) : (
                  <>
                    <ellipse cx="74" cy="68" rx="9" ry="13" fill="#00D2FC" />
                    <ellipse cx="126" cy="68" rx="9" ry="13" fill="#00D2FC" />
                    <circle cx="76" cy="66" r="3" fill="#ffffff" />
                    <circle cx="128" cy="66" r="3" fill="#ffffff" />
                  </>
                )}

                {/* Blushes */}
                <circle cx="58" cy="85" r="5" fill="#FF8D9D" opacity="0.6" />
                <circle cx="142" cy="85" r="5" fill="#FF8D9D" opacity="0.6" />

                {/* Mouth */}
                {robotState === "speaking" ? (
                  <rect x="88" y="85" width="24" height="12" fill="#FF4757" rx="6" />
                ) : robotState === "success" ? (
                  <path d="M 86,84 Q 100,102 114,84" stroke="#ffffff" strokeWidth="6" fill="none" strokeLinecap="round" />
                ) : robotState === "dizzy" ? (
                  <path d="M 86,88 Q 93,80 100,88 T 114,88" stroke="#E74C3C" strokeWidth="5" fill="none" />
                ) : (
                  <path d="M 88,86 Q 100,98 112,86" stroke="#ffffff" strokeWidth="5" fill="none" strokeLinecap="round" />
                )}

                {/* Controller body and arms */}
                <ellipse cx="100" cy="130" rx="36" ry="16" fill="#7F8C8D" />
                <rect x="84" y="115" width="32" height="15" fill="#7F8C8D" rx="4" />
                <path d="M 64,130 Q 50,150 40,140" stroke="#BDC3C7" strokeWidth="10" strokeLinecap="round" fill="none" />
                <path d="M 136,130 Q 150,150 160,140" stroke="#BDC3C7" strokeWidth="10" strokeLinecap="round" fill="none" />
              </svg>
            </div>

            {/* Kid status message balloon */}
            <div className="mt-1 flex flex-col items-center">
              {robotState === "speaking" && (
                <div className="bg-[#EFFFEC] text-[#2E7D32] border border-[#6BCB77]/30 text-[10px] font-black px-4.5 py-1.5 rounded-full shadow-xs flex items-center gap-1.5 animate-bounce">
                  <span className="w-2.5 h-2.5 bg-[#6BCB77] rounded-full animate-ping" />
                  Buddy Voice Playing...
                </div>
              )}
              {robotState === "thinking" && (
                <div className="bg-[#FFEADA] text-[#B85C00] border border-[#FFCCD5] text-[10px] font-black px-4.5 py-1.5 rounded-full shadow-xs flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-[#FF9F43] rounded-full animate-bounce" />
                  Mapping custom universe...
                </div>
              )}
              {robotState === "success" && (
                <div className="bg-emerald-500 text-white text-[10px] font-black px-4.5 py-1.5 rounded-full shadow-md">
                  🌟 BINGO! Perfect choice!
                </div>
              )}
              {robotState === "dizzy" && (
                <div className="bg-rose-500 text-white text-[10px] font-black px-4.5 py-1.5 rounded-full shadow-md animate-bounce">
                  😵 Try a different color!
                </div>
              )}
              {robotState === "idle" && (
                <div className="text-[#8B7E66] text-[10px] font-black uppercase tracking-wider">
                  Listening mode active
                </div>
              )}
            </div>
          </section>

          {/* DYNAMIC STORY & COMPREHENSION WORKSPACE PANEL */}
          <div className="px-4 py-2 flex-1 flex flex-col gap-4">
            
            {/* OPTIONAL INLINE STATUS MESSAGE OR BANNER FOR TRANSPARENT USER feedback */}
            {errorMessage && (
              <div className="bg-[#FFF5F5] border-2 border-[#FFD5D8] rounded-[20px] p-4 flex flex-col gap-2.5 animate-fadeIn shrink-0">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-[#FF6B6B] shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-[11px] font-black text-[#A53838] leading-tight">{errorMessage}</p>
                    <p className="text-[9px] font-bold text-[#C56C6C] mt-0.5">Let's continue reading or play our default mission instead!</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setErrorMessage(null)}
                    className="text-[#C56C6C] hover:text-[#A53838] font-black text-xs px-1.5 py-0.5 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    id="banner-retry-speech-btn"
                    onClick={() => {
                      setErrorMessage(null);
                      triggerStoryNarration();
                    }}
                    className="bg-[#FF6B6B] hover:bg-[#FF5555] text-white text-[9px] font-black px-3.5 py-2 rounded-xl transition-all active:scale-95 cursor-pointer"
                  >
                    🔊 Listen Again
                  </button>
                  <button
                    id="banner-load-backup-btn"
                    onClick={() => {
                      setErrorMessage(null);
                      setStoryData({
                        story: "Once upon a time, a clever little robot named Pip lost his shiny blue gear in the Whispering Woods...",
                        quiz: {
                          question: "What colour was Pip the Robot's lost gear?",
                          options: ["Red", "Green", "Blue", "Yellow"],
                          answer: "Blue"
                        }
                      });
                    }}
                    className="bg-[#FFFDFB] border border-[#E9E3D3] text-[#71644B] text-[9px] font-black px-3.5 py-2 rounded-xl hover:bg-[#F8F4E9] transition-all active:scale-95 cursor-pointer"
                  >
                    ⚙️ Default Mission
                  </button>
                </div>
              </div>
            )}
            
            {isLoading ? (
              /* Sparkly loading panel */
              <div className="bg-white rounded-[24px] p-6 border-3 border-[#FFE69A] shadow-xs flex flex-col items-center justify-center text-center gap-3 min-h-[180px]">
                <div className="w-10 h-10 rounded-full border-4 border-[#FF6B6B] border-t-transparent animate-spin" />
                <h3 className="text-sm font-extrabold text-[#5C5441]">{statusMessage}</h3>
                <span className="text-[10px] font-semibold text-[#A79D87]">Safe sandbox logic preparing...</span>
              </div>
            ) : (
              /* Active dynamic mission content */
              <div className={`transition-all duration-350 ${isShaking ? "translate-y-1 animate-pulse" : ""}`}>
                
                {/* STORY CARD */}
                <div className="bg-white rounded-[24px] p-5 border-3 border-[#FFE69A] shadow-sm relative">
                  
                  <span className="absolute -top-2 px-3 py-0.5 bg-[#FFD93D] text-[#333333] text-[9px] font-black rounded-full uppercase tracking-wider shadow-xs">
                    Narrative Text Snippet
                  </span>

                  <p className="text-sm md:text-base font-bold text-[#4A473D] leading-relaxed mt-1 text-justify">
                    "{storyData.story}"
                  </p>

                  {/* Character progress slider bar */}
                  {isPlaying && (
                    <div className="w-full bg-[#EFECE3] h-2.5 rounded-full mt-3.5 overflow-hidden border border-[#E6E2D5]">
                      <div 
                        className="bg-[#6BCB77] h-full transition-all duration-300"
                        style={{ width: `${audioProgress}%` }}
                      />
                    </div>
                  )}

                  {/* Narration control buttons with 44px minimum target heights for small fingers */}
                  <div className="flex items-center justify-between mt-4 pt-1 border-t border-[#F2EDE0]">
                    <span className="text-[10px] text-[#A69B82] font-semibold flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-[#FFD93D] fill-[#FFD93D]/30" />
                      Listen carefully to unlock!
                    </span>

                    {isPlaying ? (
                      <button
                        id="audio-stop-control-btn"
                        onClick={stopPlaying}
                        className="bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-[11px] px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer h-11"
                        style={{ minHeight: "44px" }}
                      >
                        <VolumeX className="w-4 h-4 fill-white animate-pulse" /> Stop Voice
                      </button>
                    ) : (
                      <button
                        id="audio-play-control-btn"
                        onClick={triggerStoryNarration}
                        className="bg-[#FF6B6B] hover:bg-[#FF5555] text-white text-[12px] font-black px-5 py-2.5 rounded-xl shadow-md flex items-center gap-1.5 transition-all transform active:scale-95 duration-100 h-11"
                        style={{ minHeight: "44px" }}
                      >
                        <Volume2 className="w-4 h-4 fill-white" /> Speak Story 🔊
                      </button>
                    )}
                  </div>

                </div>

                {/* DATA-DRIVEN QUIZ (Auto-unlocked after speech play-ends or skipped manually) */}
                <div className="mt-4">
                  {!quizRevealed ? (
                    <div className="bg-[#FAF6EC] border-2 border-dashed border-[#E3DDC9] rounded-[24px] p-4 text-center">
                      <p className="text-[#84785F] font-extrabold text-[11px] leading-tight">
                        🔒 Interactive Quest unlocks immediately after narration completes!
                      </p>
                      <button
                        id="skip-narration-force-quiz-btn"
                        onClick={() => setQuizRevealed(true)}
                        className="mt-2 text-[10px] text-[#FF6B6B] font-black underline hover:text-[#FF5050] h-11 flex items-center justify-center mx-auto"
                        style={{ minHeight: "44px" }}
                      >
                        ⚡ Skip Voice & Check Quiz
                      </button>
                    </div>
                  ) : (
                    /* Beautiful interactive renderer for data-driven JSON quiz schema */
                    <div className="bg-white rounded-[24px] p-5 border-3 border-[#3F51B5]/25 shadow-xs">
                      
                      <div className="flex items-center justify-between mb-3">
                        <span className="bg-[#3F51B5] text-white text-[9px] font-black px-2 py-0.5 rounded-sm">COMPREHENSION CHECK 🎒</span>
                        
                        {wrongAttempts > 0 && (
                          <span className="text-[10px] text-rose-500 font-extrabold flex items-center gap-1">
                            <RotateCcw className="w-3 h-3" /> Tries: {wrongAttempts}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-extrabold text-[#3F51B5] leading-snug mb-3">
                        {storyData.quiz.question}
                      </h3>

                      {/* DATA-DRIVEN OPTIONS RENDERER (Cleanly handles 3, 4, or 5 custom items) */}
                      <div className="flex flex-col gap-2">
                        {storyData.quiz.options.map((option, idx) => {
                          const isSelected = selectedOption === option;
                          let btnLayout = "border border-[#ECE7D8] bg-[#FFFDFA] hover:bg-[#FFEAEA] text-[#4A4A4A] hover:border-[#3F51B5]";
                          
                          if (isSelected) {
                            if (isAnswerCorrect === true) {
                              btnLayout = "border-3 border-emerald-500 bg-emerald-50 text-emerald-800 font-black shadow-xs";
                            } else if (isAnswerCorrect === false) {
                              btnLayout = "border-3 border-rose-500 bg-rose-50 text-rose-800 font-black";
                            } else {
                              btnLayout = "border-3 border-[#3F51B5] bg-blue-50 text-blue-900 font-black";
                            }
                          }

                          return (
                            <button
                              id={`option-button-${idx}`}
                              key={option}
                              onClick={() => handleOptionSelect(option)}
                              className={`w-full p-3 rounded-xl text-left text-xs font-bold transition-all duration-150 transform active:scale-95 flex items-center justify-between h-11 ${btnLayout}`}
                              style={{ minHeight: "44px" }}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${
                                  isSelected ? "bg-slate-500 text-white" : "bg-[#EDEBE3] text-[#5C5441]"
                                }`}>
                                  {String.fromCharCode(65 + idx)}
                                </span>
                                <span>{option}</span>
                              </div>

                              {isSelected && isAnswerCorrect === true && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-100 shrink-0" />
                              )}
                              {isSelected && isAnswerCorrect === false && (
                                <span className="text-[10px] text-rose-500 font-extrabold shrink-0">Try again! ❌</span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Success block displaying action vectors */}
                      {isAnswerCorrect === true && (
                        <div className="mt-4 bg-[#ECFFE9] p-3 rounded-xl border border-[#A1F099] flex flex-col gap-2 text-center">
                          <p className="text-emerald-800 text-[11px] font-black leading-tight">
                            🏆 You have amazing listening powers explorer!
                          </p>
                          <div className="flex gap-2 justify-center">
                            <button
                              id="reset-current-quiz-btn"
                              onClick={resetQuizAttempt}
                              className="bg-[#ECE9DB] text-[#464032] text-[10px] font-black px-3 py-1.5 rounded-lg hover:bg-[#DDD9CA] h-11"
                              style={{ minHeight: "44px" }}
                            >
                              Reset Try
                            </button>
                            <button
                              id="next-preset-story-btn"
                              onClick={() => {
                                const nextIndex = (activePreset + 1) % PRESET_STORIES.length;
                                setActivePreset(nextIndex);
                                fetchNewGeneratedStory(PRESET_STORIES[nextIndex].theme);
                              }}
                              className="bg-emerald-500 text-white text-[10px] font-black px-3.5 py-1.5 rounded-lg hover:bg-emerald-600 flex items-center gap-1 shadow-xs h-11"
                              style={{ minHeight: "44px" }}
                            >
                              Next Preset <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}

                    </div>
                  )}
                </div>

              </div>
            )}

            {/* CUSTOM IMAGINATION MAKER */}
            <section className="bg-white rounded-[24px] border-3 border-[#FFCCD5] shadow-xs shrink-0 mt-2 overflow-hidden transition-all duration-350">
              <button
                type="button"
                id="toggle-magic-builder-btn"
                onClick={() => setShowMagicBuilder(!showMagicBuilder)}
                className="w-full flex items-center justify-between p-4 bg-[#FFFDFA] hover:bg-[#FFF5F6] transition-colors focus:outline-none"
                style={{ minHeight: "44px" }}
              >
                <div className="flex items-center gap-2">
                  <div className="bg-[#FFE5E9] p-1.5 rounded-lg">
                    <Wand2 className="text-[#FF6B6B] w-4.5 h-4.5" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xs font-black text-[#5C5441]">Peblo Magic Story Generator</h3>
                    <p className="text-[9px] text-[#A29780] font-extrabold">Tap to design a custom fantasy world!</p>
                  </div>
                </div>
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg transition-all shrink-0 ${showMagicBuilder ? "bg-[#FF6B6B] text-white" : "bg-[#FFE8EC] text-[#FF6B6B]"}`}>
                  {showMagicBuilder ? "Hide ✕" : "Open 🪄"}
                </span>
              </button>

              {showMagicBuilder && (
                <div className="p-4 pt-2 border-t border-[#FFE2E6] bg-white animate-fadeIn">
                  {/* Tap list presets */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {PRESET_STORIES.map((preset, idx) => (
                      <button
                        id={`active-preset-tab-${idx}`}
                        key={preset.name}
                        onClick={() => {
                          setActivePreset(idx);
                          fetchNewGeneratedStory(preset.theme);
                        }}
                        className={`px-2.5 py-1.5 text-[9px] font-black rounded-lg transition-all border flex items-center gap-1 cursor-pointer ${
                          activePreset === idx 
                            ? "bg-[#FF6B6B] text-white border-transparent shadow-xs" 
                            : "bg-[#FFF9F9] hover:bg-[#FFEAEB] text-[#5C5441] border-[#FFD9DB]"
                        }`}
                        style={{ minHeight: "36px" }}
                      >
                        <span>{preset.icon}</span>
                        <span>{preset.name}</span>
                      </button>
                    ))}
                  </div>

                  {/* Submit interface */}
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (customTheme.trim()) {
                        fetchNewGeneratedStory(customTheme.trim());
                        setCustomTheme("");
                      }
                    }}
                    className="flex gap-1.5"
                  >
                    <input
                      id="child-theme-input"
                      type="text"
                      maxLength={40}
                      value={customTheme}
                      onChange={(e) => setCustomTheme(e.target.value)}
                      placeholder="Give Pip a fun theme like 'rainbow dolphin'..."
                      className="flex-1 bg-[#FFFDFE] border-2 border-[#FFCCD2] focus:border-[#FF6B6B] rounded-xl px-3 py-2 text-[10px] text-[#5C5441] placeholder-[#CBBFAD] font-bold outline-hidden"
                    />
                    <button
                      id="generate-button"
                      type="submit"
                      disabled={!customTheme.trim() || isLoading}
                      className="bg-[#FF6B6B] hover:bg-[#FF5050] disabled:bg-[#ECE6DF] disabled:text-[#C1B2A1] text-white text-[10px] font-extrabold px-3.5 py-2 rounded-xl transition-all h-11"
                      style={{ minHeight: "44px" }}
                    >
                      Create ✨
                    </button>
                  </form>
                </div>
              )}
            </section>

          </div>

          {/* SIMULATED DEVICE FOOTER AREA (Home indicator block) */}
          <footer className="w-full bg-[#FAF5E6] py-3.5 px-4 text-center border-t border-[#EDE7CE] shrink-0 z-40">
            <p className="text-[10px] font-black text-[#8B7E66]">Peblo Edutainment Studio</p>
            {/* Native Home bar iOS/Android mockup */}
            <div className="w-24 h-1 bg-[#3A3528]/85 rounded-full mx-auto mt-2.5 hidden md:block" />
          </footer>

        </div>

      </div>

    </div>
  );
}

