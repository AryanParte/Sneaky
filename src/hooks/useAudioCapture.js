import { useEffect, useRef, useState } from 'react';
import RecordRTC from 'recordrtc';

export default function useAudioCapture(active) {
  const recorder = useRef(null);
  const stream = useRef(null);
  const hasStarted = useRef(false);
  const chunksRef = useRef([]);
  const headerBlobRef = useRef(null);
  const [isCapturing, setIsCapturing] = useState(false);
  
  // Constants for the sliding window
  const WINDOW_SEC = 15;
  const SLICE_MS = 1000;
  const MAX_CHUNKS = Math.ceil(WINDOW_SEC * 1000 / SLICE_MS);

  useEffect(() => {
    if (!active) {
      // Clean up when deactivated
      if (recorder.current) {
        recorder.current.stopRecording(() => {
          recorder.current = null;
        });
      }
      if (stream.current) {
        stream.current.getTracks().forEach(track => track.stop());
        stream.current = null;
      }
      hasStarted.current = false;
      chunksRef.current = []; // Clear the chunks buffer
      headerBlobRef.current = null; // Clear the header blob
      setIsCapturing(false);
      console.log('Audio capture stopped');
      return;
    }

    // Don't restart if already started
    if (hasStarted.current) return;

    // Start recording
    (async () => {
      try {
        // Find BlackHole or Mixed Output device
        const devices = await navigator.mediaDevices.enumerateDevices();
        const loopbackDevice = devices.find(d => 
          d.kind === 'audioinput' && 
          /blackhole|mixed/i.test(d.label)
        ) || { deviceId: undefined };

        // Get audio stream
        stream.current = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: loopbackDevice.deviceId }
        });

        // Clear the chunks buffer and header blob before starting
        chunksRef.current = [];
        headerBlobRef.current = null;

        // Set up recorder using the top-level RecordRTC constructor
        recorder.current = new RecordRTC(stream.current, {
          type: 'audio',
          mimeType: 'audio/webm;codecs=opus',
          timeSlice: SLICE_MS,
          ondataavailable: (blob) => {
            // Store the first chunk as the header (contains EBML headers)
            if (!headerBlobRef.current) {
              headerBlobRef.current = blob;
              console.log('Stored WebM header chunk');
              return; // Header alone is not used for transcription
            }
            
            // Add the new blob to our sliding window
            chunksRef.current.push(blob);
            
            // Keep only the last WINDOW_SEC seconds of audio
            if (chunksRef.current.length > MAX_CHUNKS) {
              chunksRef.current.shift(); // Remove the oldest chunk
            }
            
            console.log(`Audio chunk captured (${chunksRef.current.length}/${MAX_CHUNKS})`);
          }
        });
        
        recorder.current.startRecording();
        hasStarted.current = true;
        setIsCapturing(true);
        console.log('Audio capture started');
      } catch (error) {
        console.error('Failed to start audio capture:', error);
        setIsCapturing(false);
      }
    })();

    return () => {
      if (recorder.current) {
        recorder.current.stopRecording(() => {
          recorder.current = null;
        });
      }
      if (stream.current) {
        stream.current.getTracks().forEach(track => track.stop());
        stream.current = null;
      }
      hasStarted.current = false;
      chunksRef.current = []; // Clear the chunks buffer
      headerBlobRef.current = null; // Clear the header blob
      setIsCapturing(false);
      console.log('Audio capture stopped');
    };
  }, [active]);

  const clipAndTranscribe = async () => {
    if (!recorder.current || !headerBlobRef.current || chunksRef.current.length === 0) {
      console.log('No audio data available');
      return null;
    }
    
    console.log(`Transcribing last ${chunksRef.current.length} seconds of audio...`);
    
    try {
      // Pause recording while we process the audio
      recorder.current.pauseRecording();
      
      // Create a new blob from the header and all chunks in our sliding window
      const windowBlob = new Blob(
        [headerBlobRef.current, ...chunksRef.current],
        { type: 'audio/webm' }
      );
      
      // Resume recording
      recorder.current.resumeRecording();
      
      if (windowBlob.size === 0) {
        console.log('Audio blob is empty');
        return null;
      }
      
      console.log(`Sending ${(windowBlob.size / 1024).toFixed(2)} KB audio for transcription`);
      return await window.electron.transcribeAudio(windowBlob);
    } catch (error) {
      console.error('clipAndTranscribe failed:', error);
      return null;
    }
  };

  return { 
    isCapturing,
    clipAndTranscribe
  };
} 