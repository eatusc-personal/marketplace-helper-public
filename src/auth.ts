import { supabase } from './supabase';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { debugLog } from './shared/debug';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

export interface SignUpData {
  email: string;
  password: string;
}

export interface SignInData {
  email: string;
  password: string;
}

// Sign up with email and password
export async function signUp({ email, password }: SignUpData): Promise<{ user: User | null; error: AuthError | null }> {
  try {
    const emailRedirectTo = import.meta.env.VITE_EMAIL_REDIRECT_URL as string | undefined;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: emailRedirectTo ? { emailRedirectTo } : undefined
    });

    debugLog('🔍 DEBUG: Supabase signup response:', {
      hasUser: Boolean(data.user),
      session: !!data.session,
      error: error?.message,
      errorCode: error?.status
    });

    return {
      user: data.user,
      error: error
    };
  } catch (error) {
    console.error('Sign up error:', error);
    return {
      user: null,
      error: error as AuthError
    };
  }
}

// Sign in with email and password
export async function signIn({ email, password }: SignInData): Promise<{ user: User | null; error: AuthError | null }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (data.session) {
      // Ensure the session is set in the client
      await supabase.auth.setSession(data.session);
      debugLog('Session set successfully');
    }

    return {
      user: data.user,
      error: error
    };
  } catch (error) {
    console.error('Sign in error:', error);
    return {
      user: null,
      error: error as AuthError
    };
  }
}

// Sign out
export async function signOut(): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (error) {
    console.error('Sign out error:', error);
    return { error: error as AuthError };
  }
}

// Get current user
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

// Get current session
export async function getCurrentSession(): Promise<Session | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    debugLog('Current session:', session?.user?.email);
    debugLog('Session error:', error);

    if (error) {
      console.error('Session error:', error);
      return null;
    }

    return session;
  } catch (error) {
    console.error('Get current session error:', error);
    return null;
  }
}

// Reset password
export async function resetPassword(email: string): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: chrome.runtime.getURL('popup.html')
    });
    return { error };
  } catch (error) {
    console.error('Reset password error:', error);
    return { error: error as AuthError };
  }
}

// Update password
export async function updatePassword(password: string): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: password
    });
    return { error };
  } catch (error) {
    console.error('Update password error:', error);
    return { error: error as AuthError };
  }
}

// Listen to auth state changes
export function onAuthStateChange(callback: (event: string, session: Session | null) => void) {
  return supabase.auth.onAuthStateChange(callback);
}

// Refresh session
export async function refreshSession(): Promise<{ session: Session | null; error: AuthError | null }> {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    return {
      session: data.session,
      error: error
    };
  } catch (error) {
    console.error('Refresh session error:', error);
    return {
      session: null,
      error: error as AuthError
    };
  }
}
