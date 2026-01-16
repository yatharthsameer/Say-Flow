import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { WidgetDisplayState, createWidgetStateManager } from './widgetState';
import { RealtimeAudioCapture } from './realtimeAudioCapture';

// Icons
const MicIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
    />
  </svg>
);

const Waveform = () => (
  <div className="waveform">
    <div className="waveform-bar" />
    <div className="waveform-bar" />
    <div className="waveform-bar" />
    <div className="waveform-bar" />
    <div className="waveform-bar" />
  </div>
);

const SpinnerIcon = () => (
  <svg fill="none" viewBox="0 0 24 24">
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

const WarningIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);

const CheckIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 13l4 4L19 7"
    />
  </svg>
);

const Widget: React.FC = () => {
  const [displayState, setDisplayState] = useState<WidgetDisplayState>('IDLE');
  const [isRecording, setIsRecording] = useState(false);
  const [isRealtimeMode, setIsRealtimeMode] = useState(false);
  
  // Standard recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const isRecordingRef = useRef(false); // Use ref to avoid stale closure
  
  // Realtime recording refs
  const realtimeCaptureRef = useRef<RealtimeAudioCapture | null>(null);
  const isRealtimeModeRef = useRef(false);
  
  const stateManager = useRef(createWidgetStateManager(setDisplayState));

  // Initialize media stream once
  useEffect(() => {
    const initStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            channelCount: 1,
            sampleRate: 48000,
            echoCancellation: true,
            noiseSuppression: true,
          } 
        });
        streamRef.current = stream;
        console.log('Microphone stream initialized');
        
        // Initialize realtime capture with the same stream
        const realtimeCapture = new RealtimeAudioCapture();
        await realtimeCapture.initialize(stream);
        realtimeCaptureRef.current = realtimeCapture;
        console.log('Realtime audio capture initialized');
      } catch (error) {
        console.error('Failed to get microphone access:', error);
        stateManager.current.transitionToError();
      }
    };

    initStream();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (realtimeCaptureRef.current) {
        realtimeCaptureRef.current.destroy();
      }
    };
  }, []);
  
  // Get transcription mode from settings
  useEffect(() => {
    const getMode = async () => {
      try {
        const mode = await window.electronAPI.getTranscriptionMode();
        const isRealtime = mode === 'realtime';
        setIsRealtimeMode(isRealtime);
        isRealtimeModeRef.current = isRealtime;
        console.log('Transcription mode:', mode);
      } catch (error) {
        console.log('Using default standard mode');
      }
    };
    getMode();
    
    // Listen for mode changes
    const unsubModeChange = window.electronAPI.onTranscriptionModeChange?.((mode: string) => {
      const isRealtime = mode === 'realtime';
      setIsRealtimeMode(isRealtime);
      isRealtimeModeRef.current = isRealtime;
      console.log('Transcription mode changed to:', mode);
    });
    
    return () => {
      unsubModeChange?.();
    };
  }, []);

  // Set up IPC event listeners
  useEffect(() => {
    console.log('Setting up hotkey listeners, electronAPI:', window.electronAPI);
    
    const unsubDown = window.electronAPI.onHotkeyDown(() => {
      console.log('>>> HOTKEY DOWN received in widget!');
      startRecording();
    });

    const unsubUp = window.electronAPI.onHotkeyUp(() => {
      console.log('>>> HOTKEY UP received in widget!');
      stopRecording();
    });

    const unsubProcessing = window.electronAPI.onRecordingProcessing(() => {
      stateManager.current.setState('PROCESSING');
    });

    const unsubSuccess = window.electronAPI.onRecordingSuccess(() => {
      stateManager.current.transitionToSuccess();
    });

    const unsubError = window.electronAPI.onRecordingError((data) => {
      console.error('Recording error:', data.error);
      stateManager.current.transitionToError();
    });

    const unsubRetryAll = window.electronAPI.onRetryAll(() => {
      window.electronAPI.retryAllOutbox();
    });

    return () => {
      unsubDown();
      unsubUp();
      unsubProcessing();
      unsubSuccess();
      unsubError();
      unsubRetryAll();
    };
  }, []);

  const startRealtimeRecording = useCallback(() => {
    if (!realtimeCaptureRef.current) {
      console.error('Realtime capture not initialized');
      return;
    }
    
    try {
      startTimeRef.current = Date.now();
      
      // Start the realtime session in the main process
      window.electronAPI.startRealtimeSession();
      
      // Start capturing PCM audio and send to main process
      realtimeCaptureRef.current.start((samples: Int16Array) => {
        // Send each PCM chunk to main process for streaming
        window.electronAPI.sendRealtimeAudioChunk(samples.buffer);
      });
      
      isRecordingRef.current = true;
      setIsRecording(true);
      stateManager.current.setState('RECORDING');
      console.log('Realtime recording started');
    } catch (error) {
      console.error('Failed to start realtime recording:', error);
      stateManager.current.transitionToError();
    }
  }, []);
  
  const startStandardRecording = useCallback(() => {
    if (!streamRef.current) {
      console.log('Cannot start: no stream');
      return;
    }

    try {
      audioChunksRef.current = [];
      startTimeRef.current = Date.now();

      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const durationMs = Date.now() - startTimeRef.current;
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        if (audioBlob.size > 0 && durationMs > 200) {
          // Minimum 200ms recording
          const arrayBuffer = await audioBlob.arrayBuffer();
          window.electronAPI.saveRecording(arrayBuffer, durationMs);
        } else {
          console.log('Recording too short, ignoring');
          stateManager.current.setState('IDLE');
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms
      mediaRecorderRef.current = mediaRecorder;
      isRecordingRef.current = true;
      setIsRecording(true);
      stateManager.current.setState('RECORDING');
      console.log('Standard recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      stateManager.current.transitionToError();
    }
  }, []);
  
  const startRecording = useCallback(() => {
    if (isRecordingRef.current) {
      console.log('Cannot start: already recording');
      return;
    }

    if (isRealtimeModeRef.current) {
      startRealtimeRecording();
    } else {
      startStandardRecording();
    }
  }, [startRealtimeRecording, startStandardRecording]);

  const stopRealtimeRecording = useCallback(() => {
    try {
      // Stop PCM capture
      if (realtimeCaptureRef.current) {
        realtimeCaptureRef.current.stop();
      }
      
      // Tell main process to commit and finalize
      window.electronAPI.commitRealtimeSession();
      
      isRecordingRef.current = false;
      setIsRecording(false);
      // Don't set PROCESSING for realtime - transcript should be ready immediately
      console.log('Realtime recording stopped');
    } catch (error) {
      console.error('Failed to stop realtime recording:', error);
      stateManager.current.transitionToError();
    }
  }, []);
  
  const stopStandardRecording = useCallback(() => {
    if (!mediaRecorderRef.current) {
      console.log('Cannot stop: no recorder');
      return;
    }

    try {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      isRecordingRef.current = false;
      setIsRecording(false);
      stateManager.current.setState('PROCESSING');
      console.log('Standard recording stopped');
    } catch (error) {
      console.error('Failed to stop recording:', error);
      stateManager.current.transitionToError();
    }
  }, []);
  
  const stopRecording = useCallback(() => {
    console.log('stopRecording called, isRecordingRef:', isRecordingRef.current, 'isRealtimeMode:', isRealtimeModeRef.current);
    
    if (!isRecordingRef.current) {
      console.log('Cannot stop: not recording');
      return;
    }

    if (isRealtimeModeRef.current) {
      stopRealtimeRecording();
    } else {
      stopStandardRecording();
    }
  }, [stopRealtimeRecording, stopStandardRecording]);

  const handleClick = () => {
    if (displayState === 'PROCESSING') return;

    if (isRecordingRef.current) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const getStateClass = () => {
    switch (displayState) {
      case 'RECORDING':
        return 'widget-recording';
      case 'PROCESSING':
        return 'widget-processing';
      case 'ERROR':
        return 'widget-error';
      case 'SUCCESS':
        return 'widget-success';
      default:
        return 'widget-idle';
    }
  };

  const getIcon = () => {
    switch (displayState) {
      case 'RECORDING':
        return <Waveform />;
      case 'PROCESSING':
        return <SpinnerIcon />;
      case 'ERROR':
        return <WarningIcon />;
      case 'SUCCESS':
        return <CheckIcon />;
      default:
        return <MicIcon />;
    }
  };

  return (
    <div className="widget-container">
      <button
        className={`widget-button ${getStateClass()}`}
        onClick={handleClick}
        disabled={displayState === 'PROCESSING'}
      >
        {getIcon()}
      </button>
    </div>
  );
};

// Render
ReactDOM.createRoot(document.getElementById('widget-root')!).render(
  <React.StrictMode>
    <Widget />
  </React.StrictMode>
);

// Type declarations for electronAPI
declare global {
  interface Window {
    electronAPI: {
      // Hotkey events
      onHotkeyDown: (callback: () => void) => () => void;
      onHotkeyUp: (callback: () => void) => () => void;
      
      // Standard recording events
      onRecordingProcessing: (callback: (data: { id: string }) => void) => () => void;
      onRecordingSuccess: (callback: (data: { id: string; text: string }) => void) => () => void;
      onRecordingError: (callback: (data: { id?: string; error: string }) => void) => () => void;
      onRetryAll: (callback: () => void) => () => void;
      saveRecording: (audioData: ArrayBuffer, durationMs: number) => Promise<unknown>;
      retryAllOutbox: () => Promise<unknown>;
      
      // Realtime transcription
      getTranscriptionMode: () => Promise<string>;
      onTranscriptionModeChange?: (callback: (mode: string) => void) => () => void;
      startRealtimeSession: () => Promise<unknown>;
      sendRealtimeAudioChunk: (audioData: ArrayBuffer) => void;
      commitRealtimeSession: () => Promise<unknown>;
    };
  }
}
