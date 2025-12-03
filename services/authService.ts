

import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import type { User, Role } from '../types.ts';
import { supabase, handleSupabaseError } from './api.ts';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  authError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'guara-food-user-profile';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
      try {
          const storedUser = localStorage.getItem(USER_STORAGE_KEY);
          return storedUser ? JSON.parse(storedUser) : null;
      } catch {
          return null;
      }
  });
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const fetchUserProfile = async (authUser: SupabaseUser): Promise<User | null> => {
      const { user_metadata } = authUser;
      if (user_metadata && user_metadata.role && user_metadata.name) {
          console.log("Fetched user profile from JWT user_metadata.");
          return {
              id: authUser.id,
              email: authUser.email!,
              role: user_metadata.role as Role,
              name: user_metadata.name,
              restaurantId: user_metadata.restaurantId,
          };
      }
      
      console.warn("User metadata not found. Falling back to querying 'profiles' table. This may trigger RLS recursion errors.");
      const { data, error } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
      
      if (error) {
        console.error("Failed to fetch user profile from table:", error);
        if (error.message.includes('infinite recursion')) {
            throw new Error("Supabase RLS Error: An 'infinite recursion' was detected in the RLS policy for the 'profiles' table. Please check your policy to ensure it does not call itself. A common cause is a policy that selects from `auth.users` when it should use `auth.uid()`.");
        }
        return null;
      }
      console.log("Fetched user profile from 'profiles' table.");
      return data as User;
  };

  useEffect(() => {
    setLoading(true);
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        try {
            const profile = await fetchUserProfile(session.user);
            if (profile) {
                localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
                setCurrentUser(profile);
            }
        } catch (e: any) {
            setAuthError(e.message);
        }
      }
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
            try {
                const profile = await fetchUserProfile(session.user);
                if (profile) {
                    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
                    setCurrentUser(profile);
                    setAuthError(null); // Clear previous errors on successful login
                }
            } catch (e: any) {
                setAuthError(e.message);
            }
        } else if (event === 'SIGNED_OUT') {
          localStorage.removeItem(USER_STORAGE_KEY);
          setCurrentUser(null);
          setAuthError(null); // Clear errors on logout
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      // onAuthStateChange listener will handle setting the user profile
  }, []);

  const logout = useCallback(async () => {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error logging out:", error);
      }
      // onAuthStateChange listener handles state cleanup
  }, []);

  const value = useMemo(() => ({
    currentUser,
    login,
    logout,
    loading,
    authError,
  }), [currentUser, login, logout, loading, authError]);
  
  return React.createElement(AuthContext.Provider, { value }, children);
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};