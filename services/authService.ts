import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import type { User, Role } from '../types';
import { supabase, handleSupabaseError } from './api';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<void>; // Retorna void, não mais o usuário
  logout: () => void;
  loading: boolean;
  authError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'guara-food-user-profile-v3';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const fetchUserProfile = async (authUser: SupabaseUser): Promise<User | null> => {
      // A busca de perfil agora usa EXCLUSIVAMENTE a função RPC segura 'get_my_profile'.
      // Isso elimina a dependência de metadados do token, que podem estar desatualizados,
      // e garante que a fonte da verdade seja sempre o banco de dados, sem causar erros de recursão.
      const { data, error } = await supabase.rpc('get_my_profile').single();
      handleSupabaseError({ error, customMessage: 'Falha ao buscar perfil do usuário via RPC' });

      if (data) {
          const userProfile: User = {
              id: data.id,
              email: authUser.email!,
              role: data.role as Role,
              name: data.name,
              restaurantId: data.restaurant_id
          };

          // CORREÇÃO DE SEGURANÇA CRÍTICA: Se o e-mail for do administrador, 
          // garante que a role seja 'admin' para evitar bloqueio.
          if (authUser.email === 'digitalpersonal@gmail.com') {
              userProfile.role = 'admin';
          }

          return userProfile;
      }

      // FAILSAFE FINAL: Se a consulta RPC não retornar nada para o e-mail do admin,
      // cria um perfil de admin em memória para garantir o acesso.
      if (authUser.email === 'digitalpersonal@gmail.com') {
          return { id: authUser.id, email: authUser.email, role: 'admin', name: 'Administrador', restaurantId: undefined };
      }

      return null;
  };

  const handleSession = useCallback(async (session: import('@supabase/supabase-js').Session | null) => {
      try {
          if (session?.user) {
              const profile = await fetchUserProfile(session.user);
              if (profile) {
                  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
                  setCurrentUser(profile);
              } else {
                  // Perfil não encontrado, um estado inválido. Força o logout.
                  await supabase.auth.signOut();
              }
          } else {
              // Nenhuma sessão, limpa o estado local.
              localStorage.removeItem(USER_STORAGE_KEY);
              setCurrentUser(null);
          }
      } catch (error) {
          console.error("Erro crítico ao processar sessão, limpando estado local:", error);
          // Em caso de erro, apenas limpa o estado local para evitar loops de logout.
          localStorage.removeItem(USER_STORAGE_KEY);
          setCurrentUser(null);
      } finally {
          // Garante que o estado de carregamento seja SEMPRE finalizado.
          setLoading(false);
      }
  }, []);

  useEffect(() => {
    setLoading(true);
    supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (error) {
            console.error("Erro ao obter sessão, limpando estado:", error);
            // Se houver um erro (como token inválido), força o logout
            supabase.auth.signOut();
        } else {
            handleSession(session);
        }
    }).catch(error => {
        console.error("Exceção ao obter sessão, limpando estado:", error);
        supabase.auth.signOut();
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Sempre define como carregando quando o estado de autenticação muda.
        // A lógica robusta em `handleSession` garantirá que `setLoading(false)` seja chamado.
        setLoading(true);
        await handleSession(session);
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
      setAuthError(null);

      const { error } = await supabase.auth.signInWithPassword({
          email: email.toLowerCase().trim(),
          password
      });

      if (error) {
          // O erro será capturado no LoginScreen para exibir a mensagem correta.
          throw error;
      }

      // Sucesso. O listener onAuthStateChange agora é a única fonte da verdade
      // para buscar o perfil e atualizar o estado, eliminando a race condition.
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