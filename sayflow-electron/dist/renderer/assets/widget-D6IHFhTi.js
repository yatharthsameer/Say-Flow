var T=Object.defineProperty;var L=(i,n,o)=>n in i?T(i,n,{enumerable:!0,configurable:!0,writable:!0,value:o}):i[n]=o;var g=(i,n,o)=>L(i,typeof n!="symbol"?n+"":n,o);import{c as B,j as e,a as O,r as t}from"./client-CkJjbv6o.js";const D=i=>{let n="IDLE",o=null;const a=u=>{o&&(clearTimeout(o),o=null),n=u,i(u)};return{get state(){return n},setState:a,transitionToError:(u=2e3)=>{a("ERROR"),o=setTimeout(()=>{a("IDLE")},u)},transitionToSuccess:(u=1e3)=>{a("SUCCESS"),o=setTimeout(()=>{a("IDLE")},u)}}};class z{constructor(){g(this,"audioContext",null);g(this,"workletNode",null);g(this,"sourceNode",null);g(this,"stream",null);g(this,"onAudioChunk",null);g(this,"isCapturing",!1)}async initialize(n){n?this.stream=n:this.stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,sampleRate:48e3,echoCancellation:!0,noiseSuppression:!0}}),this.audioContext=new AudioContext({sampleRate:48e3});try{const o=`
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
      `,a=new Blob([o],{type:"application/javascript"}),C=URL.createObjectURL(a);await this.audioContext.audioWorklet.addModule(C),URL.revokeObjectURL(C)}catch(o){throw console.error("Failed to load audio worklet:",o),o}this.sourceNode=this.audioContext.createMediaStreamSource(this.stream),this.workletNode=new AudioWorkletNode(this.audioContext,"pcm-processor"),this.workletNode.port.onmessage=o=>{o.data.type==="audio"&&this.onAudioChunk&&this.onAudioChunk(o.data.samples)},this.sourceNode.connect(this.workletNode),console.log("Realtime audio capture initialized")}start(n){if(!this.workletNode)throw new Error("Audio capture not initialized");this.onAudioChunk=n,this.isCapturing=!0,this.workletNode.port.postMessage({type:"start"}),console.log("Realtime audio capture started")}stop(){this.workletNode&&(this.isCapturing=!1,this.workletNode.port.postMessage({type:"stop"}),console.log("Realtime audio capture stopped"))}destroy(){this.stop(),this.workletNode&&(this.workletNode.disconnect(),this.workletNode=null),this.sourceNode&&(this.sourceNode.disconnect(),this.sourceNode=null),this.audioContext&&(this.audioContext.close(),this.audioContext=null),this.stream=null,this.onAudioChunk=null,console.log("Realtime audio capture destroyed")}get capturing(){return this.isCapturing}}const U=()=>e.jsx("svg",{fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"})}),W=()=>e.jsxs("div",{className:"waveform",children:[e.jsx("div",{className:"waveform-bar"}),e.jsx("div",{className:"waveform-bar"}),e.jsx("div",{className:"waveform-bar"}),e.jsx("div",{className:"waveform-bar"}),e.jsx("div",{className:"waveform-bar"})]}),G=()=>e.jsxs("svg",{fill:"none",viewBox:"0 0 24 24",children:[e.jsx("circle",{className:"opacity-25",cx:"12",cy:"12",r:"10",stroke:"currentColor",strokeWidth:"4"}),e.jsx("path",{className:"opacity-75",fill:"currentColor",d:"M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"})]}),F=()=>e.jsx("svg",{fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"})}),H=()=>e.jsx("svg",{fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M5 13l4 4L19 7"})}),K=()=>{const[i,n]=t.useState("IDLE"),[o,a]=t.useState(!1),[C,S]=t.useState(!1),u=t.useRef(null),k=t.useRef([]),x=t.useRef(0),R=t.useRef(null),d=t.useRef(!1),h=t.useRef(null),w=t.useRef(!1),c=t.useRef(D(n));t.useEffect(()=>((async()=>{try{const s=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,sampleRate:48e3,echoCancellation:!0,noiseSuppression:!0}});R.current=s,console.log("Microphone stream initialized");const l=new z;await l.initialize(s),h.current=l,console.log("Realtime audio capture initialized")}catch(s){console.error("Failed to get microphone access:",s),c.current.transitionToError()}})(),()=>{R.current&&R.current.getTracks().forEach(s=>s.stop()),h.current&&h.current.destroy()}),[]),t.useEffect(()=>{var l,f;(async()=>{try{const p=await window.electronAPI.getTranscriptionMode(),m=p==="realtime";S(m),w.current=m,console.log("Transcription mode:",p)}catch{console.log("Using default standard mode")}})();const s=(f=(l=window.electronAPI).onTranscriptionModeChange)==null?void 0:f.call(l,p=>{const m=p==="realtime";S(m),w.current=m,console.log("Transcription mode changed to:",p)});return()=>{s==null||s()}},[]),t.useEffect(()=>{console.log("Setting up hotkey listeners, electronAPI:",window.electronAPI);const r=window.electronAPI.onHotkeyDown(()=>{console.log(">>> HOTKEY DOWN received in widget!"),y()}),s=window.electronAPI.onHotkeyUp(()=>{console.log(">>> HOTKEY UP received in widget!"),v()}),l=window.electronAPI.onRecordingProcessing(()=>{c.current.setState("PROCESSING")}),f=window.electronAPI.onRecordingSuccess(()=>{c.current.transitionToSuccess()}),p=window.electronAPI.onRecordingError(P=>{console.error("Recording error:",P.error),c.current.transitionToError()}),m=window.electronAPI.onRetryAll(()=>{window.electronAPI.retryAllOutbox()});return()=>{r(),s(),l(),f(),p(),m()}},[]);const I=t.useCallback(()=>{if(!h.current){console.error("Realtime capture not initialized");return}try{x.current=Date.now(),window.electronAPI.startRealtimeSession(),h.current.start(r=>{window.electronAPI.sendRealtimeAudioChunk(r.buffer)}),d.current=!0,a(!0),c.current.setState("RECORDING"),console.log("Realtime recording started")}catch(r){console.error("Failed to start realtime recording:",r),c.current.transitionToError()}},[]),E=t.useCallback(()=>{if(!R.current){console.log("Cannot start: no stream");return}try{k.current=[],x.current=Date.now();const r=new MediaRecorder(R.current,{mimeType:"audio/webm;codecs=opus"});r.ondataavailable=s=>{s.data.size>0&&k.current.push(s.data)},r.onstop=async()=>{const s=Date.now()-x.current,l=new Blob(k.current,{type:"audio/webm"});if(l.size>0&&s>200){const f=await l.arrayBuffer();window.electronAPI.saveRecording(f,s)}else console.log("Recording too short, ignoring"),c.current.setState("IDLE")},r.start(100),u.current=r,d.current=!0,a(!0),c.current.setState("RECORDING"),console.log("Standard recording started")}catch(r){console.error("Failed to start recording:",r),c.current.transitionToError()}},[]),y=t.useCallback(()=>{if(d.current){console.log("Cannot start: already recording");return}w.current?I():E()},[I,E]),N=t.useCallback(()=>{try{h.current&&h.current.stop(),window.electronAPI.commitRealtimeSession(),d.current=!1,a(!1),console.log("Realtime recording stopped")}catch(r){console.error("Failed to stop realtime recording:",r),c.current.transitionToError()}},[]),j=t.useCallback(()=>{if(!u.current){console.log("Cannot stop: no recorder");return}try{u.current.stop(),u.current=null,d.current=!1,a(!1),c.current.setState("PROCESSING"),console.log("Standard recording stopped")}catch(r){console.error("Failed to stop recording:",r),c.current.transitionToError()}},[]),v=t.useCallback(()=>{if(console.log("stopRecording called, isRecordingRef:",d.current,"isRealtimeMode:",w.current),!d.current){console.log("Cannot stop: not recording");return}w.current?N():j()},[N,j]),M=()=>{i!=="PROCESSING"&&(d.current?v():y())},b=()=>{switch(i){case"RECORDING":return"widget-recording";case"PROCESSING":return"widget-processing";case"ERROR":return"widget-error";case"SUCCESS":return"widget-success";default:return"widget-idle"}},A=()=>{switch(i){case"RECORDING":return e.jsx(W,{});case"PROCESSING":return e.jsx(G,{});case"ERROR":return e.jsx(F,{});case"SUCCESS":return e.jsx(H,{});default:return e.jsx(U,{})}};return e.jsx("div",{className:"widget-container",children:e.jsx("button",{className:`widget-button ${b()}`,onClick:M,disabled:i==="PROCESSING",children:A()})})};B.createRoot(document.getElementById("widget-root")).render(e.jsx(O.StrictMode,{children:e.jsx(K,{})}));
