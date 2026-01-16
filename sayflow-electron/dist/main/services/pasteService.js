"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.copyToClipboard = exports.pasteTranscript = void 0;
const electron_1 = require("electron");
const child_process_1 = require("child_process");
const util_1 = require("util");
const logger_1 = require("../util/logger");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
// Delay before sending paste command (let clipboard settle and target app be ready)
const PRE_PASTE_DELAY = 100;
// Delay after paste command before restoring clipboard
// Needs to be long enough for slow apps (browsers, Electron apps) to process the paste
const CLIPBOARD_RESTORE_DELAY = 800;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const pasteTranscript = async (text, options) => {
    const result = { copied: false, pasted: false };
    // Save original clipboard content if we need to restore
    let originalClipboard;
    if (options.restoreClipboard) {
        try {
            originalClipboard = electron_1.clipboard.readText();
        }
        catch (error) {
            logger_1.logger.warn('Could not read original clipboard', error);
        }
    }
    // Copy to clipboard
    try {
        electron_1.clipboard.writeText(text);
        result.copied = true;
        logger_1.logger.info('Text copied to clipboard');
    }
    catch (error) {
        logger_1.logger.error('Failed to copy to clipboard', error);
        return result;
    }
    // Auto-paste if enabled
    if (options.autoPaste) {
        try {
            // Small delay to ensure clipboard is ready for all apps
            await sleep(PRE_PASTE_DELAY);
            // Send Cmd+V keystroke
            await execAsync(`osascript -e 'tell application "System Events" to keystroke "v" using command down'`);
            // Additional delay to let the target app process the paste
            // This is important because osascript returns immediately after sending the keystroke
            await sleep(100);
            result.pasted = true;
            logger_1.logger.info('Text auto-pasted');
        }
        catch (error) {
            logger_1.logger.warn('Auto-paste failed (Accessibility permission may be missing)', error);
        }
    }
    // Restore original clipboard after delay
    if (options.restoreClipboard && originalClipboard !== undefined) {
        setTimeout(() => {
            try {
                electron_1.clipboard.writeText(originalClipboard);
                logger_1.logger.debug('Clipboard restored');
            }
            catch (error) {
                logger_1.logger.warn('Failed to restore clipboard', error);
            }
        }, CLIPBOARD_RESTORE_DELAY);
    }
    return result;
};
exports.pasteTranscript = pasteTranscript;
const copyToClipboard = (text) => {
    try {
        electron_1.clipboard.writeText(text);
        return true;
    }
    catch (error) {
        logger_1.logger.error('Failed to copy to clipboard', error);
        return false;
    }
};
exports.copyToClipboard = copyToClipboard;
