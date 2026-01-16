"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isHotkeyActive = exports.stopHotkeyService = exports.updateHotkey = exports.initHotkeyService = void 0;
const logger_1 = require("../util/logger");
const widgetWindow_1 = require("../windows/widgetWindow");
let isHotkeyDown = false;
let currentHotkey = null;
let uiohookInstance = null;
const initHotkeyService = (settings) => {
    currentHotkey = settings.hotkey;
    try {
        // Use uiohook-napi - the modern replacement for iohook
        const { uIOhook } = require('uiohook-napi');
        uiohookInstance = uIOhook;
        uIOhook.on('keydown', (event) => {
            // Log key events to verify Input Monitoring is working
            // logger.info('Key pressed', { 
            //   keycode: event.keycode, 
            //   altKey: event.altKey,
            //   ctrlKey: event.ctrlKey,
            //   metaKey: event.metaKey,
            //   shiftKey: event.shiftKey,
            //   expectedKeycode: currentHotkey?.keyCode 
            // });
            if (!currentHotkey || isHotkeyDown)
                return;
            if (matchesHotkey(event, currentHotkey)) {
                isHotkeyDown = true;
                (0, widgetWindow_1.sendToWidget)('hotkey:down');
                logger_1.logger.info('Hotkey activated');
            }
        });
        uIOhook.on('keyup', (event) => {
            if (!currentHotkey || !isHotkeyDown)
                return;
            // Check if the released key matches the hotkey
            // For Shift keys, accept either left or right Shift
            const isMainKeyReleased = event.keycode === currentHotkey.keyCode ||
                (SHIFT_KEYCODES.includes(currentHotkey.keyCode) && SHIFT_KEYCODES.includes(event.keycode));
            if (isMainKeyReleased) {
                isHotkeyDown = false;
                (0, widgetWindow_1.sendToWidget)('hotkey:up');
                logger_1.logger.debug('Hotkey released');
            }
        });
        uIOhook.start();
        logger_1.logger.info('Hotkey service initialized with uiohook-napi');
    }
    catch (error) {
        logger_1.logger.error('Failed to initialize uiohook-napi - global hotkey will not work', error);
        logger_1.logger.info('Users can still use the widget click to record');
    }
};
exports.initHotkeyService = initHotkeyService;
const updateHotkey = (hotkey) => {
    currentHotkey = hotkey;
    logger_1.logger.info('Hotkey updated', { displayName: hotkey.displayName });
};
exports.updateHotkey = updateHotkey;
const stopHotkeyService = () => {
    if (uiohookInstance) {
        try {
            uiohookInstance.stop();
            uiohookInstance = null;
            logger_1.logger.info('Hotkey service stopped');
        }
        catch (error) {
            logger_1.logger.error('Error stopping hotkey service', error);
        }
    }
};
exports.stopHotkeyService = stopHotkeyService;
// Shift keycodes in uiohook-napi
const SHIFT_KEYCODES = [42, 54]; // Left Shift, Right Shift
const matchesHotkey = (event, hotkey) => {
    if (event.keycode !== hotkey.keyCode)
        return false;
    const modifiers = hotkey.modifiers;
    const eventAlt = event.altKey || false;
    const eventCtrl = event.ctrlKey || false;
    const eventMeta = event.metaKey || false;
    const eventShift = event.shiftKey || false;
    // Special case: if the main key IS Shift, don't check the shift modifier
    // (pressing Shift will always set shiftKey=true)
    const isShiftMainKey = SHIFT_KEYCODES.includes(hotkey.keyCode);
    return (modifiers.alt === eventAlt &&
        modifiers.ctrl === eventCtrl &&
        modifiers.meta === eventMeta &&
        (isShiftMainKey || modifiers.shift === eventShift));
};
const isHotkeyActive = () => {
    return uiohookInstance !== null;
};
exports.isHotkeyActive = isHotkeyActive;
