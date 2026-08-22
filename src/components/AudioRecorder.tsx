import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

interface AudioRecorderProps {
  onAudioRecorded: (audioDataUrl: string, durationSeconds: number) => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onAudioRecorded }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioElemRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    setPermissionError(null);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          setAudioUrl(base64Audio);
          onAudioRecorded(base64Audio, recordingTime);
        };

        // Stop media tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone access error:', err);
      setPermissionError('Microphone permission required for audio updates. Please check browser permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const togglePlayback = () => {
    if (!audioElemRef.current && audioUrl) {
      const audio = new Audio(audioUrl);
      audioElemRef.current = audio;
      audio.onended = () => setIsPlaying(false);
    }

    if (audioElemRef.current) {
      if (isPlaying) {
        audioElemRef.current.pause();
        setIsPlaying(false);
      } else {
        audioElemRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const resetRecording = () => {
    if (audioElemRef.current) {
      audioElemRef.current.pause();
      audioElemRef.current = null;
    }
    setAudioUrl(null);
    setIsPlaying(false);
    setRecordingTime(0);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  return (
    <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
          <Mic className="w-3.5 h-3.5 text-amber-600" />
          Voice Update Record
        </span>
        <span className="text-xs font-mono font-medium text-amber-800">
          {formatTime(recordingTime)}
        </span>
      </div>

      {permissionError && (
        <div className="text-xs text-rose-600 flex items-center gap-1.5 bg-rose-50 p-2 rounded-lg border border-rose-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {permissionError}
        </div>
      )}

      {!audioUrl ? (
        <div className="flex items-center gap-3">
          {!isRecording ? (
            <button
              type="button"
              onClick={startRecording}
              className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              <Mic className="w-4 h-4" />
              Start Recording Voice Note
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 animate-pulse shadow-xs"
            >
              <Square className="w-4 h-4" />
              Stop Recording ({formatTime(recordingTime)})
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between bg-white border border-amber-200 p-2.5 rounded-lg">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlayback}
              className="w-8 h-8 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-800 flex items-center justify-center transition-all"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <span className="text-xs font-medium text-slate-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Voice Note Recorded ({formatTime(recordingTime)})
            </span>
          </div>

          <button
            type="button"
            onClick={resetRecording}
            className="text-xs text-slate-500 hover:text-rose-600 flex items-center gap-1 p-1 hover:bg-slate-100 rounded"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Re-record
          </button>
        </div>
      )}
    </div>
  );
};
