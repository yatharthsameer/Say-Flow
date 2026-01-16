import { RecordingState } from '../shared/types';

export type WidgetDisplayState = RecordingState | 'SUCCESS';

export interface WidgetStateManager {
  state: WidgetDisplayState;
  setState: (state: WidgetDisplayState) => void;
  transitionToError: (duration?: number) => void;
  transitionToSuccess: (duration?: number) => void;
}

export const createWidgetStateManager = (
  onStateChange: (state: WidgetDisplayState) => void
): WidgetStateManager => {
  let currentState: WidgetDisplayState = 'IDLE';
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const setState = (state: WidgetDisplayState) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    currentState = state;
    onStateChange(state);
  };

  const transitionToError = (duration = 2000) => {
    setState('ERROR');
    timeoutId = setTimeout(() => {
      setState('IDLE');
    }, duration);
  };

  const transitionToSuccess = (duration = 1000) => {
    setState('SUCCESS');
    timeoutId = setTimeout(() => {
      setState('IDLE');
    }, duration);
  };

  return {
    get state() {
      return currentState;
    },
    setState,
    transitionToError,
    transitionToSuccess,
  };
};
