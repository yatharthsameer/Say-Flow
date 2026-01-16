import { clipboard } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../util/logger';

const execAsync = promisify(exec);

// Delay before sending paste command (let clipboard settle and target app be ready)
const PRE_PASTE_DELAY = 100;
// Delay after paste command before restoring clipboard
// Needs to be long enough for slow apps (browsers, Electron apps) to process the paste
const CLIPBOARD_RESTORE_DELAY = 800;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface PasteOptions {
  autoPaste: boolean;
  restoreClipboard: boolean;
}

export const pasteTranscript = async (
  text: string,
  options: PasteOptions
): Promise<{ copied: boolean; pasted: boolean }> => {
  const result = { copied: false, pasted: false };

  // Save original clipboard content if we need to restore
  let originalClipboard: string | undefined;
  if (options.restoreClipboard) {
    try {
      originalClipboard = clipboard.readText();
    } catch (error) {
      logger.warn('Could not read original clipboard', error);
    }
  }

  // Copy to clipboard
  try {
    clipboard.writeText(text);
    result.copied = true;
    logger.info('Text copied to clipboard');
  } catch (error) {
    logger.error('Failed to copy to clipboard', error);
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
      logger.info('Text auto-pasted');
    } catch (error) {
      logger.warn('Auto-paste failed (Accessibility permission may be missing)', error);
    }
  }

  // Restore original clipboard after delay
  if (options.restoreClipboard && originalClipboard !== undefined) {
    setTimeout(() => {
      try {
        clipboard.writeText(originalClipboard!);
        logger.debug('Clipboard restored');
      } catch (error) {
        logger.warn('Failed to restore clipboard', error);
      }
    }, CLIPBOARD_RESTORE_DELAY);
  }

  return result;
};

export const copyToClipboard = (text: string): boolean => {
  try {
    clipboard.writeText(text);
    return true;
  } catch (error) {
    logger.error('Failed to copy to clipboard', error);
    return false;
  }
};
