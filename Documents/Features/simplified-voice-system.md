# Simplified Voice System for Tasky 2.0

## Voice Provider Configuration

Focusing on two reliable, well-supported options: OpenAI (premium) and Web Speech API (free fallback).

## Provider Comparison

| Feature | OpenAI Realtime API | Web Speech API |
|---------|-------------------|----------------|
| **STT Quality** | Excellent (Whisper) | Good (Browser-dependent) |
| **TTS Quality** | Natural (Multiple voices) | Robotic (System voices) |
| **Latency** | ~200-500ms | ~100-300ms |
| **Cost** | $0.06/min audio | Free |
| **Offline** | No | Partial (some browsers) |
| **Tool Calling** | Native support | Requires custom handling |
| **Languages** | 50+ languages | Browser-dependent |
| **Wake Word** | No (need Picovoice) | No (need Picovoice) |

## Simplified Implementation

### Core Voice Manager

```typescript
// src/core/voice/VoiceManager.ts
export interface VoiceConfig {
  sttProvider: 'openai' | 'webspeech';
  ttsProvider: 'openai' | 'webspeech';
  language: string;
  openaiApiKey?: string;
  openaiModel?: 'whisper-1' | 'gpt-4o-realtime-preview-2024-12-17';
  openaiVoice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  webSpeechVoice?: string; // Browser-specific voice name
  vadEnabled: boolean;
  vadSensitivity: number; // 0-1
}

export class VoiceManager extends EventEmitter {
  private config: VoiceConfig;
  private openaiWs: WebSocket | null = null;
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private isListening = false;
  private isSpeaking = false;
  
  constructor(config: VoiceConfig) {
    super();
    this.config = {
      language: 'en-US',
      vadEnabled: true,
      vadSensitivity: 0.5,
      openaiVoice: 'alloy',
      ...config
    };
  }
  
  async initialize() {
    this.audioContext = new AudioContext();
    
    if (this.config.sttProvider === 'openai') {
      await this.initializeOpenAI();
    } else {
      await this.initializeWebSpeech();
    }
    
    this.emit('ready');
  }
  
  // ============================================
  // OpenAI Implementation
  // ============================================
  
  private async initializeOpenAI() {
    if (!this.config.openaiApiKey) {
      throw new Error('OpenAI API key required for OpenAI provider');
    }
    
    // Connect to OpenAI Realtime API
    const url = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17';
    
    this.openaiWs = new WebSocket(url, {
      headers: {
        'Authorization': `Bearer ${this.config.openaiApiKey}`,
        'OpenAI-Beta': 'realtime=v1'
      }
    });
    
    this.openaiWs.onopen = () => {
      console.log('[Voice] Connected to OpenAI Realtime API');
      this.configureOpenAISession();
    };
    
    this.openaiWs.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleOpenAIEvent(data);
    };
    
    this.openaiWs.onerror = (error) => {
      console.error('[Voice] OpenAI WebSocket error:', error);
      this.emit('error', { provider: 'openai', error });
      
      // Fallback to Web Speech API
      if (this.config.sttProvider === 'openai') {
        console.log('[Voice] Falling back to Web Speech API');
        this.config.sttProvider = 'webspeech';
        this.config.ttsProvider = 'webspeech';
        this.initializeWebSpeech();
      }
    };
    
    // Set up microphone for OpenAI
    await this.setupMicrophone();
  }
  
  private configureOpenAISession() {
    const sessionConfig = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: `You are Tasky, a helpful task management assistant. 
          Be concise and friendly. When users ask to create, update, or manage tasks, 
          use the mcpCall tool with appropriate parameters.`,
        voice: this.config.openaiVoice,
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: this.config.vadEnabled ? {
          type: 'server_vad',
          threshold: this.config.vadSensitivity,
          prefix_padding_ms: 300,
          silence_duration_ms: 500
        } : null,
        tools: [{
          type: 'function',
          name: 'mcpCall',
          description: 'Call MCP tools for task and reminder management',
          parameters: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'The MCP tool name',
                enum: [
                  'tasky_create_task',
                  'tasky_list_tasks',
                  'tasky_update_task',
                  'tasky_delete_task',
                  'tasky_execute_task',
                  'tasky_create_reminder',
                  'tasky_list_reminders',
                  'tasky_update_reminder',
                  'tasky_delete_reminder'
                ]
              },
              args: {
                type: 'object',
                description: 'The tool arguments'
              }
            },
            required: ['name', 'args']
          }
        }]
      }
    };
    
    this.openaiWs?.send(JSON.stringify(sessionConfig));
  }
  
  private async setupMicrophone() {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000
      }
    });
    
    const source = this.audioContext!.createMediaStreamSource(stream);
    const processor = this.audioContext!.createScriptProcessor(4096, 1, 1);
    
    processor.onaudioprocess = (e) => {
      if (this.isListening && !this.isSpeaking && this.config.sttProvider === 'openai') {
        const inputData = e.inputBuffer.getChannelData(0);
        this.sendAudioToOpenAI(inputData);
      }
    };
    
    source.connect(processor);
    processor.connect(this.audioContext!.destination);
  }
  
  private sendAudioToOpenAI(audioData: Float32Array) {
    if (this.openaiWs?.readyState !== WebSocket.OPEN) return;
    
    // Convert Float32 to PCM16
    const pcm16 = new Int16Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
      const s = Math.max(-1, Math.min(1, audioData[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    // Convert to base64
    const base64 = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));
    
    this.openaiWs.send(JSON.stringify({
      type: 'input_audio_buffer.append',
      audio: base64
    }));
  }
  
  private handleOpenAIEvent(event: any) {
    switch (event.type) {
      case 'conversation.item.created':
        if (event.item.role === 'assistant' && event.item.content?.[0]?.text) {
          this.emit('response', {
            text: event.item.content[0].text,
            provider: 'openai'
          });
        }
        break;
        
      case 'response.audio.delta':
        this.handleOpenAIAudio(event.delta);
        break;
        
      case 'response.audio.done':
        this.isSpeaking = false;
        this.emit('speechEnd');
        break;
        
      case 'response.function_call_arguments.done':
        this.handleOpenAIToolCall(event);
        break;
        
      case 'input_audio_buffer.speech_started':
        this.emit('speechStart');
        this.isSpeaking = false;
        break;
        
      case 'input_audio_buffer.speech_stopped':
        this.emit('speechStop');
        break;
        
      case 'conversation.item.input_audio_transcription.completed':
        this.emit('transcription', {
          text: event.transcript,
          provider: 'openai'
        });
        break;
        
      case 'error':
        console.error('[Voice] OpenAI error:', event.error);
        this.emit('error', { provider: 'openai', error: event.error });
        break;
    }
  }
  
  private handleOpenAIAudio(audioBase64: string) {
    // Decode and play audio
    const binaryString = atob(audioBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    this.audioContext?.decodeAudioData(bytes.buffer, (buffer) => {
      this.playAudioBuffer(buffer);
    });
  }
  
  private async handleOpenAIToolCall(event: any) {
    try {
      const { name, arguments: args } = JSON.parse(event.arguments);
      
      this.emit('toolCall', {
        name,
        args,
        provider: 'openai'
      });
      
      // Execute the tool
      const result = await this.executeMcpTool(name, args);
      
      // Send result back to OpenAI
      this.openaiWs?.send(JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: event.call_id,
          output: result
        }
      }));
    } catch (error) {
      console.error('[Voice] Tool call failed:', error);
      
      this.openaiWs?.send(JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: event.call_id,
          output: `Error: ${error.message}`
        }
      }));
    }
  }
  
  // ============================================
  // Web Speech API Implementation
  // ============================================
  
  private async initializeWebSpeech() {
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      throw new Error('Web Speech API not supported in this browser');
    }
    
    // Initialize Speech Recognition (STT)
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.config.language;
    
    this.recognition.onstart = () => {
      console.log('[Voice] Web Speech recognition started');
      this.emit('speechStart');
    };
    
    this.recognition.onresult = (event) => {
      const last = event.results.length - 1;
      const transcript = event.results[last][0].transcript;
      const isFinal = event.results[last].isFinal;
      
      this.emit('transcription', {
        text: transcript,
        isFinal,
        provider: 'webspeech'
      });
      
      if (isFinal) {
        // Process the final transcript
        this.processWebSpeechCommand(transcript);
      }
    };
    
    this.recognition.onerror = (event) => {
      console.error('[Voice] Web Speech error:', event.error);
      this.emit('error', { provider: 'webspeech', error: event.error });
      
      // Auto-restart on recoverable errors
      if (['network', 'no-speech', 'audio-capture'].includes(event.error)) {
        setTimeout(() => {
          if (this.isListening) {
            this.recognition?.start();
          }
        }, 1000);
      }
    };
    
    this.recognition.onend = () => {
      console.log('[Voice] Web Speech recognition ended');
      this.emit('speechEnd');
      
      // Restart if still listening
      if (this.isListening) {
        this.recognition?.start();
      }
    };
    
    // Initialize Speech Synthesis (TTS)
    this.synthesis = window.speechSynthesis;
    
    // Load available voices
    this.loadWebSpeechVoices();
  }
  
  private loadWebSpeechVoices() {
    const loadVoices = () => {
      const voices = this.synthesis?.getVoices() || [];
      
      // Find best voice for language
      const languageVoices = voices.filter(v => v.lang.startsWith(this.config.language.split('-')[0]));
      
      if (languageVoices.length > 0) {
        // Prefer local voices for better quality
        const localVoice = languageVoices.find(v => v.localService);
        this.config.webSpeechVoice = localVoice?.name || languageVoices[0].name;
      }
      
      this.emit('voicesLoaded', voices);
    };
    
    // Voices might load async
    if (this.synthesis?.getVoices().length > 0) {
      loadVoices();
    } else {
      this.synthesis?.addEventListener('voiceschanged', loadVoices);
    }
  }
  
  private async processWebSpeechCommand(transcript: string) {
    // Since Web Speech API doesn't have native tool calling,
    // we need to process commands ourselves
    
    this.emit('processing', { transcript });
    
    // Simple command matching for common tasks
    const command = this.parseCommand(transcript);
    
    if (command) {
      this.emit('toolCall', {
        name: command.tool,
        args: command.args,
        provider: 'webspeech'
      });
      
      // Execute the tool
      const result = await this.executeMcpTool(command.tool, command.args);
      
      // Generate response
      const response = this.generateResponse(command, result);
      
      this.emit('response', {
        text: response,
        provider: 'webspeech'
      });
      
      // Speak the response
      if (this.config.ttsProvider === 'webspeech') {
        this.speakWebSpeech(response);
      }
    } else {
      // Couldn't parse command
      const response = "I didn't understand that. Try saying 'create a task' or 'list my tasks'.";
      
      this.emit('response', {
        text: response,
        provider: 'webspeech'
      });
      
      if (this.config.ttsProvider === 'webspeech') {
        this.speakWebSpeech(response);
      }
    }
  }
  
  private parseCommand(transcript: string): { tool: string; args: any } | null {
    const lower = transcript.toLowerCase();
    
    // Create task patterns
    if (lower.includes('create') && (lower.includes('task') || lower.includes('to do'))) {
      const titleMatch = transcript.match(/(?:called|named|titled)\s+(.+)/i) ||
                         transcript.match(/task\s+(?:to\s+)?(.+)/i);
      
      return {
        tool: 'tasky_create_task',
        args: {
          title: titleMatch?.[1] || transcript,
          description: ''
        }
      };
    }
    
    // List tasks
    if ((lower.includes('list') || lower.includes('show')) && lower.includes('task')) {
      return {
        tool: 'tasky_list_tasks',
        args: {}
      };
    }
    
    // Complete task
    if ((lower.includes('complete') || lower.includes('finish') || lower.includes('done')) && lower.includes('task')) {
      const taskMatch = transcript.match(/(?:task\s+)?(?:called\s+)?(.+)/i);
      
      return {
        tool: 'tasky_update_task',
        args: {
          id: taskMatch?.[1] || '',
          status: 'COMPLETED'
        }
      };
    }
    
    // Create reminder
    if (lower.includes('remind') || lower.includes('reminder')) {
      const messageMatch = transcript.match(/(?:remind\s+me\s+(?:to\s+)?|reminder\s+(?:to\s+)?)(.+?)(?:\s+at\s+|\s+in\s+|$)/i);
      const timeMatch = transcript.match(/(?:at|in)\s+(.+)/i);
      
      return {
        tool: 'tasky_create_reminder',
        args: {
          message: messageMatch?.[1] || transcript,
          time: timeMatch?.[1] || 'in 1 hour',
          oneTime: true,
          days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        }
      };
    }
    
    return null;
  }
  
  private generateResponse(command: { tool: string; args: any }, result: string): string {
    const responses = {
      'tasky_create_task': `I've created the task "${command.args.title}".`,
      'tasky_list_tasks': `Here are your tasks: ${result}`,
      'tasky_update_task': `I've updated the task.`,
      'tasky_create_reminder': `I've set a reminder: "${command.args.message}".`,
    };
    
    return responses[command.tool] || 'Task completed successfully.';
  }
  
  private speakWebSpeech(text: string) {
    if (!this.synthesis) return;
    
    // Cancel any ongoing speech
    this.synthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.config.language;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Set voice if specified
    if (this.config.webSpeechVoice) {
      const voices = this.synthesis.getVoices();
      const voice = voices.find(v => v.name === this.config.webSpeechVoice);
      if (voice) {
        utterance.voice = voice;
      }
    }
    
    utterance.onstart = () => {
      this.isSpeaking = true;
      this.emit('speakingStart');
    };
    
    utterance.onend = () => {
      this.isSpeaking = false;
      this.emit('speakingEnd');
    };
    
    utterance.onerror = (event) => {
      console.error('[Voice] TTS error:', event);
      this.isSpeaking = false;
      this.emit('error', { provider: 'webspeech', error: event.error });
    };
    
    this.synthesis.speak(utterance);
  }
  
  // ============================================
  // Common Methods
  // ============================================
  
  async startListening() {
    this.isListening = true;
    
    if (this.config.sttProvider === 'openai') {
      // OpenAI is always listening when connected
      this.emit('listeningStart');
    } else {
      // Start Web Speech recognition
      this.recognition?.start();
    }
  }
  
  async stopListening() {
    this.isListening = false;
    
    if (this.config.sttProvider === 'openai') {
      // Commit any pending audio
      this.openaiWs?.send(JSON.stringify({
        type: 'input_audio_buffer.commit'
      }));
      this.emit('listeningStop');
    } else {
      // Stop Web Speech recognition
      this.recognition?.stop();
    }
  }
  
  async speak(text: string) {
    if (this.config.ttsProvider === 'openai' && this.openaiWs?.readyState === WebSocket.OPEN) {
      // Use OpenAI TTS
      this.openaiWs.send(JSON.stringify({
        type: 'response.create',
        response: {
          modalities: ['audio'],
          instructions: text
        }
      }));
    } else {
      // Use Web Speech TTS
      this.speakWebSpeech(text);
    }
  }
  
  private async executeMcpTool(name: string, args: any): Promise<string> {
    try {
      const response = await fetch('http://localhost:7844/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: { name, arguments: args }
        })
      });
      
      const result = await response.json();
      return JSON.stringify(result.result);
    } catch (error) {
      console.error('[Voice] MCP tool execution failed:', error);
      throw error;
    }
  }
  
  private playAudioBuffer(buffer: AudioBuffer) {
    const source = this.audioContext!.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext!.destination);
    source.onended = () => {
      this.isSpeaking = false;
      this.emit('speakingEnd');
    };
    this.isSpeaking = true;
    this.emit('speakingStart');
    source.start();
  }
  
  async switchProvider(sttProvider: 'openai' | 'webspeech', ttsProvider: 'openai' | 'webspeech') {
    // Clean up current providers
    this.destroy();
    
    // Update config
    this.config.sttProvider = sttProvider;
    this.config.ttsProvider = ttsProvider;
    
    // Reinitialize
    await this.initialize();
  }
  
  getProviderStatus() {
    return {
      stt: {
        provider: this.config.sttProvider,
        connected: this.config.sttProvider === 'openai' 
          ? this.openaiWs?.readyState === WebSocket.OPEN
          : this.recognition !== null
      },
      tts: {
        provider: this.config.ttsProvider,
        connected: this.config.ttsProvider === 'openai'
          ? this.openaiWs?.readyState === WebSocket.OPEN
          : this.synthesis !== null
      }
    };
  }
  
  destroy() {
    this.stopListening();
    this.openaiWs?.close();
    this.recognition?.stop();
    this.synthesis?.cancel();
    this.audioContext?.close();
  }
}
```

## Usage Example

```typescript
// src/hooks/useVoice.ts
import { useState, useEffect, useRef } from 'react';
import { VoiceManager } from '../core/voice/VoiceManager';

export const useVoice = () => {
  const [isReady, setIsReady] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [provider, setProvider] = useState<'openai' | 'webspeech'>('webspeech');
  const voiceManager = useRef<VoiceManager>();
  
  useEffect(() => {
    initializeVoice();
    
    return () => {
      voiceManager.current?.destroy();
    };
  }, [provider]);
  
  const initializeVoice = async () => {
    // Get config from settings
    const settings = localStorage.getItem('voiceSettings');
    const config = settings ? JSON.parse(settings) : {};
    
    // Default to Web Speech if no OpenAI key
    const hasOpenAIKey = !!config.openaiApiKey;
    
    voiceManager.current = new VoiceManager({
      sttProvider: hasOpenAIKey ? 'openai' : 'webspeech',
      ttsProvider: hasOpenAIKey ? 'openai' : 'webspeech',
      language: 'en-US',
      openaiApiKey: config.openaiApiKey,
      openaiVoice: config.openaiVoice || 'alloy',
      vadEnabled: true,
      vadSensitivity: 0.5
    });
    
    // Set up event listeners
    voiceManager.current.on('ready', () => {
      setIsReady(true);
      console.log('[Voice] Ready to use');
    });
    
    voiceManager.current.on('error', ({ provider, error }) => {
      console.error(`[Voice] ${provider} error:`, error);
      
      // Auto-fallback to Web Speech on OpenAI errors
      if (provider === 'openai') {
        setProvider('webspeech');
      }
    });
    
    voiceManager.current.on('transcription', ({ text, isFinal }) => {
      setTranscript(text);
    });
    
    voiceManager.current.on('response', ({ text }) => {
      setResponse(text);
    });
    
    voiceManager.current.on('toolCall', ({ name, args }) => {
      console.log('[Voice] Tool called:', name, args);
    });
    
    try {
      await voiceManager.current.initialize();
    } catch (error) {
      console.error('[Voice] Initialization failed:', error);
      
      // Fallback to Web Speech
      if (provider === 'openai') {
        setProvider('webspeech');
      }
    }
  };
  
  const startListening = () => {
    if (!voiceManager.current || !isReady) return;
    
    voiceManager.current.startListening();
    setIsListening(true);
  };
  
  const stopListening = () => {
    if (!voiceManager.current) return;
    
    voiceManager.current.stopListening();
    setIsListening(false);
  };
  
  const speak = (text: string) => {
    if (!voiceManager.current || !isReady) return;
    
    voiceManager.current.speak(text);
  };
  
  const switchProvider = async (newProvider: 'openai' | 'webspeech') => {
    if (!voiceManager.current) return;
    
    await voiceManager.current.switchProvider(newProvider, newProvider);
    setProvider(newProvider);
  };
  
  return {
    isReady,
    isListening,
    transcript,
    response,
    provider,
    startListening,
    stopListening,
    speak,
    switchProvider
  };
};
```

## Voice Settings UI

```typescript
// src/components/settings/VoiceSettings.tsx
import React, { useState, useEffect } from 'react';

export const VoiceSettings: React.FC = () => {
  const [settings, setSettings] = useState({
    sttProvider: 'webspeech' as 'openai' | 'webspeech',
    ttsProvider: 'webspeech' as 'openai' | 'webspeech',
    openaiApiKey: '',
    openaiVoice: 'alloy',
    language: 'en-US',
    vadEnabled: true,
    vadSensitivity: 0.5
  });
  
  const [testStatus, setTestStatus] = useState('');
  
  useEffect(() => {
    // Load saved settings
    const saved = localStorage.getItem('voiceSettings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);
  
  const saveSettings = () => {
    localStorage.setItem('voiceSettings', JSON.stringify(settings));
    setTestStatus('Settings saved!');
    
    // Reload voice manager with new settings
    window.dispatchEvent(new CustomEvent('voice:settings:changed', { detail: settings }));
  };
  
  const testVoice = async () => {
    setTestStatus('Testing...');
    
    try {
      // Test the selected provider
      const manager = new VoiceManager(settings);
      await manager.initialize();
      
      if (settings.ttsProvider === 'openai') {
        await manager.speak('Hello! OpenAI voice is working correctly.');
      } else {
        await manager.speak('Hello! Web Speech voice is working correctly.');
      }
      
      setTestStatus('✅ Voice test successful!');
      
      setTimeout(() => {
        manager.destroy();
      }, 5000);
    } catch (error) {
      setTestStatus(`❌ Test failed: ${error.message}`);
    }
  };
  
  return (
    <div className="voice-settings">
      <h3>Voice Settings</h3>
      
      {/* Provider Selection */}
      <div className="setting-group">
        <label>Voice Provider</label>
        <select
          value={settings.sttProvider}
          onChange={(e) => {
            const provider = e.target.value as 'openai' | 'webspeech';
            setSettings({
              ...settings,
              sttProvider: provider,
              ttsProvider: provider // Keep STT and TTS in sync
            });
          }}
        >
          <option value="webspeech">Web Speech API (Free)</option>
          <option value="openai">OpenAI Realtime (Premium)</option>
        </select>
        
        {settings.sttProvider === 'webspeech' && (
          <p className="info">
            ✅ Free, works offline in some browsers
            ⚠️ Quality varies by browser
          </p>
        )}
        
        {settings.sttProvider === 'openai' && (
          <p className="info">
            ✅ Best quality, natural voices
            💰 $0.06/minute audio
          </p>
        )}
      </div>
      
      {/* OpenAI Settings */}
      {settings.sttProvider === 'openai' && (
        <>
          <div className="setting-group">
            <label>OpenAI API Key</label>
            <input
              type="password"
              value={settings.openaiApiKey}
              onChange={(e) => setSettings({ ...settings, openaiApiKey: e.target.value })}
              placeholder="sk-..."
            />
          </div>
          
          <div className="setting-group">
            <label>Voice</label>
            <select
              value={settings.openaiVoice}
              onChange={(e) => setSettings({ ...settings, openaiVoice: e.target.value })}
            >
              <option value="alloy">Alloy (Neutral)</option>
              <option value="echo">Echo (Male)</option>
              <option value="fable">Fable (British)</option>
              <option value="onyx">Onyx (Deep Male)</option>
              <option value="nova">Nova (Female)</option>
              <option value="shimmer">Shimmer (Soft Female)</option>
            </select>
          </div>
        </>
      )}
      
      {/* Common Settings */}
      <div className="setting-group">
        <label>Language</label>
        <select
          value={settings.language}
          onChange={(e) => setSettings({ ...settings, language: e.target.value })}
        >
          <option value="en-US">English (US)</option>
          <option value="en-GB">English (UK)</option>
          <option value="es-ES">Spanish</option>
          <option value="fr-FR">French</option>
          <option value="de-DE">German</option>
          <option value="ja-JP">Japanese</option>
          <option value="zh-CN">Chinese (Simplified)</option>
        </select>
      </div>
      
      <div className="setting-group">
        <label>
          <input
            type="checkbox"
            checked={settings.vadEnabled}
            onChange={(e) => setSettings({ ...settings, vadEnabled: e.target.checked })}
          />
          Enable Voice Activity Detection
        </label>
        
        {settings.vadEnabled && (
          <div>
            <label>Sensitivity</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.vadSensitivity}
              onChange={(e) => setSettings({ ...settings, vadSensitivity: parseFloat(e.target.value) })}
            />
            <span>{settings.vadSensitivity}</span>
          </div>
        )}
      </div>
      
      {/* Actions */}
      <div className="actions">
        <button onClick={saveSettings}>Save Settings</button>
        <button onClick={testVoice}>Test Voice</button>
      </div>
      
      {testStatus && (
        <div className="test-status">
          {testStatus}
        </div>
      )}
    </div>
  );
};
```

## Implementation Checklist

### Phase 1: Core Implementation
- [ ] Implement VoiceManager base class
- [ ] Add OpenAI Realtime API support
- [ ] Add Web Speech API support
- [ ] Create audio processing utilities
- [ ] Implement tool calling for both providers

### Phase 2: Fallback & Error Handling
- [ ] Auto-fallback from OpenAI to Web Speech
- [ ] Network error recovery
- [ ] Quota limit handling
- [ ] Browser compatibility checks

### Phase 3: UI Integration
- [ ] Voice settings component
- [ ] Provider status indicator
- [ ] Voice test functionality
- [ ] Language selection

### Phase 4: Testing
- [ ] Test OpenAI STT/TTS
- [ ] Test Web Speech STT/TTS
- [ ] Test provider switching
- [ ] Test error recovery
- [ ] Test tool calling accuracy
