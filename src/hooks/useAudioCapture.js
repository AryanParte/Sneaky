import { useEffect, useRef, useState } from 'react';
import RecordRTC from 'recordrtc';

export default function useAudioCapture(active) {
  const recorder = useRef(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!active || busy) return;
    setBusy(true);

    (async () => {
      try {
        // Find BlackHole or Mixed Output device
        const devices = await navigator.mediaDevices.enumerateDevices();
        const loopbackDevice = devices.find(d => 
          d.kind === 'audioinput' && 
          /blackhole|mixed/i.test(d.label)
        ) || { deviceId: undefined };

        // Get audio stream
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: loopbackDevice.deviceId }
        });

        // Set up recorder
        recorder.current = new RecordRTC.MediaStreamRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus',
          timeSlice: 1000, // 1-second chunks
          ondataavailable: async (blob) => {
            try {
              // Send audio to main process for transcription
              const transcript = await window.electron.transcribeAudio(blob);
              
              // Only send non-empty transcripts
              if (transcript && transcript.trim()) {
                window.electron.sendSuggestions([{ text: transcript }]);
              }
            } catch (error) {
              console.error('Transcription error:', error);
            }
          }
        });
        
        recorder.current.start();
        console.log('Audio capture started');
      } catch (error) {
        console.error('Failed to start audio capture:', error);
        setBusy(false);
      }
    })();

    return () => {
      if (recorder.current) {
        recorder.current.stop();
        recorder.current = null;
        console.log('Audio capture stopped');
      }
      setBusy(false);
    };
  }, [active, busy]);

  return { isCapturing: active && !busy };
} 