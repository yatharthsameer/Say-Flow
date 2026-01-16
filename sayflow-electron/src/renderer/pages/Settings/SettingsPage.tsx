import React, { useEffect, useState } from 'react';
import { ipcClient } from '../../services/ipcClient';
import { 
  Settings, 
  DEFAULT_SETTINGS, 
  TranscriptionProvider, 
  TranscriptionMode,
  PROVIDER_MODELS, 
  REALTIME_MODELS,
  TRANSCRIPTION_MODES,
} from '../../../shared/types';
import { Button, Card, CardContent, Toggle, Select, HotkeyCapture, useToast } from '../../components';
import { supabase } from '../../services/supabaseClient';

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'nl', label: 'Dutch' },
  { value: 'pl', label: 'Polish' },
  { value: 'ru', label: 'Russian' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'zh', label: 'Chinese' },
];

const PROVIDER_OPTIONS = [
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'openai', label: 'OpenAI' },
];

const MODE_OPTIONS = TRANSCRIPTION_MODES.map(m => ({ value: m.value, label: m.label }));

interface SettingsPageProps {
  onSignOut: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onSignOut }) => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const loadSettings = async () => {
      const result = await ipcClient.settings.get();
      if (result.success && result.settings) {
        setSettings(result.settings);
      }
      setIsLoading(false);
    };
    loadSettings();
  }, []);

  const handleUpdate = async (updates: Partial<Settings>) => {
    setIsSaving(true);
    const result = await ipcClient.settings.update(updates);
    if (result.success && result.settings) {
      setSettings(result.settings);
      showToast('Settings saved', 'success');
    } else {
      showToast('Failed to save settings', 'error');
    }
    setIsSaving(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    await ipcClient.auth.clearSession();
    onSignOut();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Settings</h1>

      {/* Transcription Settings */}
      <Card>
        <CardContent>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Transcription</h2>
          <div className="space-y-4">
            {/* Mode Selection */}
            <div>
              <Select
                label="Mode"
                value={settings.transcription?.mode || 'standard'}
                onChange={(value) => {
                  const mode = value as TranscriptionMode;
                  // If switching to realtime, force OpenAI provider
                  if (mode === 'realtime') {
                    handleUpdate({
                      transcription: {
                        ...settings.transcription,
                        provider: 'openai',
                        model: REALTIME_MODELS[0].value,
                        mode,
                      },
                    });
                  } else {
                    handleUpdate({
                      transcription: {
                        ...settings.transcription,
                        mode,
                      },
                    });
                  }
                }}
                options={MODE_OPTIONS}
              />
              <p className="mt-1 text-xs text-gray-500">
                {TRANSCRIPTION_MODES.find(m => m.value === (settings.transcription?.mode || 'standard'))?.description}
              </p>
            </div>
            
            {/* Provider - only shown in standard mode */}
            {settings.transcription?.mode !== 'realtime' && (
              <Select
                label="Provider"
                value={settings.transcription?.provider || 'gemini'}
                onChange={(value) => {
                  const provider = value as TranscriptionProvider;
                  const defaultModel = PROVIDER_MODELS[provider][0].value;
                  handleUpdate({
                    transcription: { 
                      ...settings.transcription,
                      provider, 
                      model: defaultModel,
                    },
                  });
                }}
                options={PROVIDER_OPTIONS}
              />
            )}
            
            {/* Model - different options based on mode */}
            <Select
              label="Model"
              value={settings.transcription?.model || (settings.transcription?.mode === 'realtime' 
                ? REALTIME_MODELS[0].value 
                : PROVIDER_MODELS[settings.transcription?.provider || 'gemini'][0].value)}
              onChange={(value) =>
                handleUpdate({
                  transcription: {
                    ...settings.transcription,
                    model: value,
                  },
                })
              }
              options={settings.transcription?.mode === 'realtime' 
                ? REALTIME_MODELS 
                : PROVIDER_MODELS[settings.transcription?.provider || 'gemini']}
            />
            
            {/* Realtime mode info banner */}
            {settings.transcription?.mode === 'realtime' && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-sm text-blue-800">
                  <strong>Realtime Mode:</strong> Audio is streamed to OpenAI as you speak. 
                  Transcription appears instantly when you release the hotkey.
                </p>
              </div>
            )}
            
            <Select
              label="Language"
              value={settings.language}
              onChange={(value) => handleUpdate({ language: value })}
              options={LANGUAGE_OPTIONS}
            />
          </div>
        </CardContent>
      </Card>

      {/* Hotkey Settings */}
      <Card>
        <CardContent>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Hotkey</h2>
          <HotkeyCapture
            value={settings.hotkey}
            onChange={(hotkey) => handleUpdate({ hotkey })}
          />
        </CardContent>
      </Card>

      {/* Behavior Settings */}
      <Card>
        <CardContent className="space-y-4">
          <h2 className="text-lg font-medium text-gray-900">Behavior</h2>
          <Toggle
            label="Auto-paste"
            description="Automatically paste transcript into the active field"
            checked={settings.autoPaste}
            onChange={(checked) => handleUpdate({ autoPaste: checked })}
          />
          <Toggle
            label="Restore clipboard"
            description="Restore previous clipboard content after pasting"
            checked={settings.restoreClipboard}
            onChange={(checked) => handleUpdate({ restoreClipboard: checked })}
          />
        </CardContent>
      </Card>

      {/* Permissions */}
      <Card>
        <CardContent>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Permissions</h2>
          <p className="text-sm text-gray-600 mb-4">
            sayFlow requires the following macOS permissions to work properly:
          </p>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <span className="font-medium text-gray-900">Microphone</span>
                <p className="text-gray-500">Required for audio recording</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01" />
                </svg>
              </div>
              <div>
                <span className="font-medium text-gray-900">Accessibility</span>
                <p className="text-gray-500">Required for auto-paste functionality</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01" />
                </svg>
              </div>
              <div>
                <span className="font-medium text-gray-900">Input Monitoring</span>
                <p className="text-gray-500">Required for global hotkey detection</p>
              </div>
            </li>
          </ul>
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">
              To grant permissions, go to <strong>System Settings → Privacy & Security</strong> and enable sayFlow under each category.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardContent>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Account</h2>
          <Button variant="danger" onClick={handleSignOut}>
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
