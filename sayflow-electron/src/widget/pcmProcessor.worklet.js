/**
 * PCM Audio Processor Worklet
 * 
 * Captures raw PCM audio from the microphone and sends it to the main thread
 * for streaming to the realtime transcription API.
 * 
 * Input: Float32 samples at the native sample rate (usually 48kHz)
 * Output: Int16 PCM samples at 24kHz (OpenAI Realtime API requirement)
 */

class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    
    // Buffer to accumulate samples for downsampling
    this.inputBuffer = [];
    
    // Target sample rate for OpenAI (24kHz)
    this.targetSampleRate = 24000;
    
    // Native sample rate (will be detected from first process call)
    this.sourceSampleRate = 48000; // Default, will be updated
    
    // Downsample ratio
    this.downsampleRatio = 2; // 48000 / 24000 = 2
    
    // Chunk size in samples at target rate (100ms of audio)
    this.chunkSizeMs = 100;
    this.chunkSize = (this.targetSampleRate * this.chunkSizeMs) / 1000;
    
    // Output buffer
    this.outputBuffer = new Int16Array(this.chunkSize);
    this.outputIndex = 0;
    
    this.isRecording = true;
    
    // Handle messages from main thread
    this.port.onmessage = (event) => {
      if (event.data.type === 'stop') {
        this.isRecording = false;
        // Flush any remaining samples
        if (this.outputIndex > 0) {
          this.flushBuffer();
        }
      } else if (event.data.type === 'start') {
        this.isRecording = true;
        this.outputIndex = 0;
      }
    };
  }
  
  /**
   * Convert Float32 sample to Int16
   */
  floatTo16Bit(sample) {
    // Clamp to [-1, 1]
    const clamped = Math.max(-1, Math.min(1, sample));
    // Convert to 16-bit signed integer
    return Math.round(clamped * 32767);
  }
  
  /**
   * Simple downsampling by averaging
   */
  downsample(samples) {
    const ratio = this.downsampleRatio;
    const outputLength = Math.floor(samples.length / ratio);
    const output = new Float32Array(outputLength);
    
    for (let i = 0; i < outputLength; i++) {
      let sum = 0;
      for (let j = 0; j < ratio; j++) {
        sum += samples[i * ratio + j];
      }
      output[i] = sum / ratio;
    }
    
    return output;
  }
  
  /**
   * Send accumulated buffer to main thread
   */
  flushBuffer() {
    if (this.outputIndex === 0) return;
    
    // Create a copy of the filled portion
    const chunk = this.outputBuffer.slice(0, this.outputIndex);
    
    // Send to main thread
    this.port.postMessage({
      type: 'audio',
      samples: chunk,
    });
    
    // Reset index
    this.outputIndex = 0;
  }
  
  /**
   * Process audio samples
   */
  process(inputs, outputs, parameters) {
    if (!this.isRecording) {
      return true;
    }
    
    const input = inputs[0];
    if (!input || !input[0]) {
      return true;
    }
    
    // Get mono input (first channel)
    const samples = input[0];
    
    // Downsample from 48kHz to 24kHz
    const downsampled = this.downsample(samples);
    
    // Convert to Int16 and add to output buffer
    for (let i = 0; i < downsampled.length; i++) {
      this.outputBuffer[this.outputIndex++] = this.floatTo16Bit(downsampled[i]);
      
      // Send chunk when buffer is full
      if (this.outputIndex >= this.chunkSize) {
        this.flushBuffer();
      }
    }
    
    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
