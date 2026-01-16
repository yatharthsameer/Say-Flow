import React, { useEffect, useState } from 'react';
import { HashRouter } from 'react-router-dom';
import { AppRoutes } from './routes';
import { AuthPage } from '../pages/Auth/AuthPage';
import { ToastProvider } from '../components';
import { restoreSessionFromMain, supabase, isSupabaseConfigured } from '../services/supabaseClient';

type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

export const App: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>('loading');

  useEffect(() => {
    const checkAuth = async () => {
      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured - showing auth page');
        setAuthState('unauthenticated');
        return;
      }

      // Try to restore session from keytar
      const session = await restoreSessionFromMain();
      if (session) {
        setAuthState('authenticated');
      } else {
        setAuthState('unauthenticated');
      }
    };

    checkAuth();

    // Listen for auth state changes only if Supabase is configured
    if (!isSupabaseConfigured()) {
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        setAuthState('authenticated');
      } else if (event === 'SIGNED_OUT') {
        setAuthState('unauthenticated');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthSuccess = () => {
    setAuthState('authenticated');
  };

  const handleSignOut = () => {
    setAuthState('unauthenticated');
  };

  if (authState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto" />
          <p className="mt-4 text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (authState === 'unauthenticated') {
    return (
      <ToastProvider>
        <AuthPage onAuthSuccess={handleAuthSuccess} />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <HashRouter>
        <AppRoutes onSignOut={handleSignOut} />
      </HashRouter>
    </ToastProvider>
  );
};
