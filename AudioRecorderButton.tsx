import React, { useState, useRef } from 'react';
import { Mic, Square, Loader2, AlertCircle } from 'lucide-react';

export interface AudioRecorderButtonProps {
  onTranscriptionComplete: (transcript: string) => void;
  label?: string;
  compact?: boolean;
  className?: string;
}

interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  start: () => void;
  stop: () => void;
}

export const AudioRecorderButton: React.FC<AudioRecorderButtonProps> = ({
  onTranscriptionComplete,
  label = 'Dictate voice note',
  compact = false,
  className = '',
}) => {
  const [status, setStatus] = useState<'idle' | 'recording' | 'transcribing'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speechRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const browserTranscriptRef = useRef<string>('');
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const startRecording = async () => {
    setErrorMsg(null);
    browserTranscriptRef.current = '';

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      // Start parallel browser SpeechRecognition as a free-tier fallback
      const SpeechRecognitionCtor =
        (window as unknown as { SpeechRecognition?: new () => BrowserSpeechRecognition }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: new () => BrowserSpeechRecognition }).webkitSpeechRecognition;

      if (SpeechRecognitionCtor) {
        try {
          const recognition = new SpeechRecognitionCtor();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';
          recognition.onresult = (event) => {
            let combined = '';
            for (let i = 0; i < event.results.length; i++) {
              combined += event.results[i][0].transcript + ' ';
            }
            browserTranscriptRef.current = combined.trim();
          };
          recognition.onerror = () => {
            // Ignore browser speech errors; server /api/transcribe is primary
          };
          recognition.start();
          speechRecognitionRef.current = recognition;
        } catch {
          speechRecognitionRef.current = null;
        }
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (speechRecognitionRef.current) {
          try {
            speechRecognitionRef.current.stop();
          } catch {
            // Ignore
          }
          speechRecognitionRef.current = null;
        }
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }

        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        if (audioBlob.size === 0) {
          setStatus('idle');
          return;
        }

        setStatus('transcribing');
        try {
          const base64Audio = await blobToBase64(audioBlob);
          const response = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioBase64: base64Audio,
              mimeType: mimeType.split(';')[0],
              browserTranscript: browserTranscriptRef.current,
            }),
          });

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'Failed to transcribe audio.');
          }

          const finalTranscript = (data.transcript || browserTranscriptRef.current || '').trim();
          if (finalTranscript) {
            onTranscriptionComplete(finalTranscript);
          } else {
            setErrorMsg('No speech detected in recording.');
          }
        } catch (err) {
          if (browserTranscriptRef.current) {
            onTranscriptionComplete(browserTranscriptRef.current);
          } else {
            setErrorMsg(err instanceof Error ? err.message : 'Transcription error.');
          }
        } finally {
          setStatus('idle');
          setRecordingSeconds(0);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setStatus('recording');
      setRecordingSeconds(0);

      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Microphone access denied. Please allow microphone permissions.'
      );
      setStatus('idle');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  return (
    <div className={`inline-flex flex-col items-start gap-1 ${className}`}>
      {status === 'idle' && (
        <button
          type="button"
          onClick={startRecording}
          title="Transcribe audio with gemini-3.5-transcribe"
          className={`inline-flex items-center gap-1.5 font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
            compact
              ? 'px-2.5 py-2 text-xs text-slate-700 bg-white border-slate-200 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200'
              : 'px-3.5 py-2 text-xs text-teal-700 bg-teal-50/70 border-teal-200/80 hover:bg-teal-100/70'
          }`}
        >
          <Mic className="w-3.5 h-3.5 text-teal-600 shrink-0" />
          {!compact && <span>{label}</span>}
        </button>
      )}

      {status === 'recording' && (
        <button
          type="button"
          onClick={stopRecording}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors cursor-pointer whitespace-nowrap"
        >
          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
          <Square className="w-3 h-3 fill-current" />
          <span>Stop ({formatTimer(recordingSeconds)})</span>
        </button>
      )}

      {status === 'transcribing' && (
        <div className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-teal-700 bg-teal-50/80 border border-teal-200 rounded-lg whitespace-nowrap">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
          <span>Transcribing audio...</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-1 text-[11px] text-red-600">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
