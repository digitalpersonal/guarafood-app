import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import type { User, Role } from '../types';
import { supabase, handleSupabaseError } from './api';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  authError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'guara-food-user-profile-v3';

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
      // SENIOR MOVE: Confia primeiro nos metadados do Token (JWT)
      // Se o usuário logou, o Supabase já nos deu quem ele é nos metadados.
      const meta = authUser.user_metadata;
      
      if (meta && meta.role && meta.name) {
          return {
              id: authUser.id,
              email: authUser.email!,
              role: meta.role as Role,
              name: meta.name,
              restaurantId: meta.restaurantId,
          };
      }
      
      // Fallback para tabela profiles apenas se necessário
      const { data, error } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
      
      if (data) {
          return {
              id: data.id,
              email: authUser.email!,
              role: data.role as Role,
              name: data.name,
              restaurantId: data.restaurantId
          };
      }

      // Se nada funcionar, mas o cara está autenticado, monta um perfil básico para não travar
      if (authUser.email === 'admin@guarafood.com.br') {
          return { id: authUser.id, email: authUser.email, role: 'admin', name: 'Administrador' };
      }

      return null;
  };

  useEffect(() => {
    setLoading(true);
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.warn("Session check error:", error.message);
        if (error.message.includes("Refresh Token") || error.message.includes("refresh_token")) {
            localStorage.removeItem(USER_STORAGE_KEY);
            setCurrentUser(null);
            await supabase.auth.signOut();
        }
      } else if (session?.user) {
        const profile = await fetchUserProfile(session.user);
        if (profile) {
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
            setCurrentUser(profile);
        }
      }
      setLoading(false);
    }).catch(async (err) => {
        console.error("Unexpected auth error:", err);
        localStorage.removeItem(USER_STORAGE_KEY);
        setCurrentUser(null);
        setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
            const profile = await fetchUserProfile(session.user);
            if (profile) {
                localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
                setCurrentUser(profile);
                setAuthError(null);
            }
        } else if (event === 'SIGNED_OUT') {
          localStorage.removeItem(USER_STORAGE_KEY);
          setCurrentUser(null);
          setAuthError(null);
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
      setAuthError(null);
      const { error } = await supabase.auth.signInWithPassword({ 
          email: email.toLowerCase().trim(), 
          password 
      });
      if (error) throw new Error(error.message);
  }, []);

  const logout = useCallback(async () => {
      await supabase.auth.signOut();
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