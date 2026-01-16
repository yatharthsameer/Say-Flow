/**
 * Realtime Audio Capture
 * 
 * Uses AudioWorklet to capture raw PCM audio for streaming transcription.
 * Outputs Int16 PCM at 24kHz as required by OpenAI Realtime API.
 */

export interface AudioChunkHandler {
  (samples: Int16Array): void;
}

export class RealtimeAudioCapture {
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private onAudioChunk: AudioChunkHandler | null = null;
  private isCapturing: boolean = false;
  
  /**
   * Initialize the audio capture system
   * @param existingStream - Optional existing MediaStream to use
   */
  async initialize(existingStream?: MediaStream): Promise<void> {
    // Use existing stream or get a new one
    if (existingStream) {
      this.stream = existingStream;
    } else {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 48000,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
    }
    
    // Create audio context at 48kHz (standard for web audio)
    this.audioContext = new AudioContext({
      sampleRate: 48000,
    });
    
    // Load the PCM processor worklet
    try {
      // In Electron, we need to use a blob URL for the worklet
      const workletCode = `
        class PCMProcessor extends AudioWorkletProcessor {
          constructor() {
            super();
            this.inputBuffer = [];
            this.targetSampleRate = 24000;
            this.sourceSampleRate = 48000;
            this.downsampleRatio = 2;
            this.chunkSizeMs = 100;
            this.chunkSize = (this.targetSampleRate * this.chunkSizeMs) / 1000;
            this.outputBuffer = new Int16Array(this.chunkSize);
            this.outputIndex = 0;
            this.isRecording = false;
            
            this.port.onmessage = (event) => {
              if (event.data.type === 'stop') {
                this.isRecording = false;
                if (this.outputIndex > 0) {
                  this.flushBuffer();
                }
              } else if (event.data.type === 'start') {
                this.isRecording = true;
                this.outputIndex = 0;
              }
            };
          }
          
          floatTo16Bit(sample) {
            const clamped = Math.max(-1, Math.min(1, sample));
            return Math.round(clamped * 32767);
          }
          
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
          
          flushBuffer() {
            if (this.outputIndex === 0) return;
            const chunk = this.outputBuffer.slice(0, this.outputIndex);
            this.port.postMessage({ type: 'audio', samples: chunk });
            this.outputIndex = 0;
          }
          
          process(inputs, outputs, parameters) {
            if (!this.isRecording) return true;
            const input = inputs[0];
            if (!input || !input[0]) return true;
            const samples = input[0];
            const downsampled = this.downsample(samples);
            for (let i = 0; i < downsampled.length; i++) {
              this.outputBuffer[this.outputIndex++] = this.floatTo16Bit(downsampled[i]);
              if (this.outputIndex >= this.chunkSize) {
                this.flushBuffer();
              }
            }
            return true;
          }
        }
        registerProcessor('pcm-processor', PCMProcessor);
      `;
      
      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      
      await this.audioContext.audioWorklet.addModule(workletUrl);
      
      URL.revokeObjectURL(workletUrl);
    } catch (error) {
      console.error('Failed to load audio worklet:', error);
      throw error;
    }
    
    // Create source node from microphone stream
    this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
    
    // Create worklet node
    this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-processor');
    
    // Handle audio chunks from the worklet
    this.workletNode.port.onmessage = (event) => {
      if (event.data.type === 'audio' && this.onAudioChunk) {
        this.onAudioChunk(event.data.samples);
      }
    };
    
    // Connect the nodes (but don't start capturing yet)
    this.sourceNode.connect(this.workletNode);
    // Note: We don't connect to destination to avoid feedback
    
    console.log('Realtime audio capture initialized');
  }
  
  /**
   * Start capturing audio
   * @param handler - Function to call with each audio chunk
   */
  start(handler: AudioChunkHandler): void {
    if (!this.workletNode) {
      throw new Error('Audio capture not initialized');
    }
    
    this.onAudioChunk = handler;
    this.isCapturing = true;
    
    // Tell the worklet to start recording
    this.workletNode.port.postMessage({ type: 'start' });
    
    console.log('Realtime audio capture started');
  }
  
  /**
   * Stop capturing audio
   */
  stop(): void {
    if (!this.workletNode) return;
    
    this.isCapturing = false;
    
    // Tell the worklet to stop and flush
    this.workletNode.port.postMessage({ type: 'stop' });
    
    console.log('Realtime audio capture stopped');
  }
  
  /**
   * Clean up resources
   */
  destroy(): void {
    this.stop();
    
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    // Don't stop the stream if it was passed in externally
    this.stream = null;
    this.onAudioChunk = null;
    
    console.log('Realtime audio capture destroyed');
  }
  
  /**
   * Check if currently capturing
   */
  get capturing(): boolean {
    return this.isCapturing;
  }
}
