import { logger } from '../util/logger';
import { Settings, HotkeyConfig } from '../../shared/types';
import { sendToWidget } from '../windows/widgetWindow';

let isHotkeyDown = false;
let currentHotkey: HotkeyConfig | null = null;
let uiohookInstance: typeof import('uiohook-napi').uIOhook | null = null;

export const initHotkeyService = (settings: Settings): void => {
  currentHotkey = settings.hotkey;
  
  try {
    // Use uiohook-napi - the modern replacement for iohook
    const { uIOhook } = require('uiohook-napi');
    uiohookInstance = uIOhook;

    uIOhook.on('keydown', (event: any) => {
      // Log key events to verify Input Monitoring is working
      // logger.info('Key pressed', { 
      //   keycode: event.keycode, 
      //   altKey: event.altKey,
      //   ctrlKey: event.ctrlKey,
      //   metaKey: event.metaKey,
      //   shiftKey: event.shiftKey,
      //   expectedKeycode: currentHotkey?.keyCode 
      // });
      
      if (!currentHotkey || isHotkeyDown) return;
      
      if (matchesHotkey(event, currentHotkey)) {
        isHotkeyDown = true;
        sendToWidget('hotkey:down');
        logger.info('Hotkey activated');
      }
    });

    uIOhook.on('keyup', (event: any) => {
      if (!currentHotkey || !isHotkeyDown) return;
      
      // Check if the released key matches the hotkey
      // For Shift keys, accept either left or right Shift
      const isMainKeyReleased = event.keycode === currentHotkey.keyCode ||
        (SHIFT_KEYCODES.includes(currentHotkey.keyCode) && SHIFT_KEYCODES.includes(event.keycode));
      
      if (isMainKeyReleased) {
        isHotkeyDown = false;
        sendToWidget('hotkey:up');
        logger.debug('Hotkey released');
      }
    });

    uIOhook.start();
    logger.info('Hotkey service initialized with uiohook-napi');
  } catch (error) {
    logger.error('Failed to initialize uiohook-napi - global hotkey will not work', error);
    logger.info('Users can still use the widget click to record');
  }
};

export const updateHotkey = (hotkey: HotkeyConfig): void => {
  currentHotkey = hotkey;
  logger.info('Hotkey updated', { displayName: hotkey.displayName });
};

export const stopHotkeyService = (): void => {
  if (uiohookInstance) {
    try {
      uiohookInstance.stop();
      uiohookInstance = null;
      logger.info('Hotkey service stopped');
    } catch (error) {
      logger.error('Error stopping hotkey service', error);
    }
  }
};

// Shift keycodes in uiohook-napi
const SHIFT_KEYCODES = [42, 54]; // Left Shift, Right Shift

const matchesHotkey = (event: any, hotkey: HotkeyConfig): boolean => {
  if (event.keycode !== hotkey.keyCode) return false;
  
  const modifiers = hotkey.modifiers;
  const eventAlt = event.altKey || false;
  const eventCtrl = event.ctrlKey || false;
  const eventMeta = event.metaKey || false;
  const eventShift = event.shiftKey || false;

  // Special case: if the main key IS Shift, don't check the shift modifier
  // (pressing Shift will always set shiftKey=true)
  const isShiftMainKey = SHIFT_KEYCODES.includes(hotkey.keyCode);
  
  return (
    modifiers.alt === eventAlt &&
    modifiers.ctrl === eventCtrl &&
    modifiers.meta === eventMeta &&
    (isShiftMainKey || modifiers.shift === eventShift)
  );
};

export const isHotkeyActive = (): boolean => {
  return uiohookInstance !== null;
};
