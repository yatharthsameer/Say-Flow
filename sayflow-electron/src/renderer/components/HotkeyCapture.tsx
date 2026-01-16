import React, { useState, useCallback } from 'react';
import { HotkeyConfig } from '../../shared/types';

interface HotkeyCaptureProps {
  value: HotkeyConfig;
  onChange: (hotkey: HotkeyConfig) => void;
}

const getDisplayName = (e: KeyboardEvent): string => {
  const parts: string[] = [];
  
  if (e.ctrlKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Option');
  if (e.metaKey) parts.push('Cmd');
  if (e.shiftKey) parts.push('Shift');

  // Get key name
  let keyName = e.key;
  if (keyName === ' ') keyName = 'Space';
  else if (keyName.length === 1) keyName = keyName.toUpperCase();
  
  if (!['Control', 'Alt', 'Meta', 'Shift'].includes(e.key)) {
    parts.push(keyName);
  }

  return parts.join(' + ') || 'Press a key...';
};

export const HotkeyCapture: React.FC<HotkeyCaptureProps> = ({ value, onChange }) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [tempDisplay, setTempDisplay] = useState('');

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Don't capture if only modifier is pressed
      if (['Control', 'Alt', 'Meta', 'Shift'].includes(e.key)) {
        setTempDisplay(getDisplayName(e));
        return;
      }

      const newHotkey: HotkeyConfig = {
        keyCode: e.keyCode,
        modifiers: {
          alt: e.altKey,
          ctrl: e.ctrlKey,
          meta: e.metaKey,
          shift: e.shiftKey,
        },
        displayName: getDisplayName(e),
      };

      onChange(newHotkey);
      setIsCapturing(false);
      setTempDisplay('');
    },
    [onChange]
  );

  const handleKeyUp = useCallback(() => {
    setTempDisplay('');
  }, []);

  const startCapture = () => {
    setIsCapturing(true);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
  };

  const stopCapture = () => {
    setIsCapturing(false);
    setTempDisplay('');
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('keyup', handleKeyUp);
  };

  React.useEffect(() => {
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Global Hotkey
      </label>
      <div className="flex gap-2">
        <div
          className={`flex-1 px-3 py-2 border rounded-lg text-sm ${
            isCapturing
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
              : 'border-gray-300 bg-gray-50'
          }`}
        >
          {isCapturing ? tempDisplay || 'Press a key combination...' : value.displayName}
        </div>
        <button
          type="button"
          onClick={isCapturing ? stopCapture : startCapture}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            isCapturing
              ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {isCapturing ? 'Cancel' : 'Change'}
        </button>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Hold this key combination to record. Default: Option + Space
      </p>
    </div>
  );
};
