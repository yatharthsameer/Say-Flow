import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';
import { ipcClient } from './ipcClient';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if Supabase is configured
export const isSupabaseConfigured = (): boolean => {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
};

// Create Supabase client only if configured, otherwise create a dummy client
const createSupabaseClient = (): SupabaseClient => {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file');
    // Return a placeholder client with a dummy URL to prevent crash
    // The isSupabaseConfigured() check should prevent actual API calls
    return createClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }
  
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: false, // We handle persistence via keytar
      detectSessionInUrl: false,
    },
  });
};

export const supabase: SupabaseClient = createSupabaseClient();

// Sync session to main process
export const syncSessionToMain = async (session: Session | null): Promise<void> => {
  if (session) {
    await ipcClient.auth.storeSession({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    });
  } else {
    await ipcClient.auth.clearSession();
  }
};

// Restore session from main process
export const restoreSessionFromMain = async (): Promise<Session | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const result = await ipcClient.auth.getSession();
  
  if (result.success && result.session) {
    // Set the session in Supabase client
    const { data, error } = await supabase.auth.setSession({
      access_token: result.session.accessToken,
      refresh_token: result.session.refreshToken,
    });

    if (error) {
      console.error('Failed to restore session:', error);
      await ipcClient.auth.clearSession();
      return null;
    }

    return data.session;
  }

  return null;
};

// Listen for auth state changes and sync to main (only if configured)
if (isSupabaseConfigured()) {
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth state changed:', event);
    
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      await syncSessionToMain(session);
    } else if (event === 'SIGNED_OUT') {
      await ipcClient.auth.clearSession();
    }
  });
}
