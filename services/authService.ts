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
          const profile: User = {
              id: authUser.id,
              email: authUser.email!,
              role: meta.role as Role,
              name: meta.name,
              restaurantId: meta.restaurantId,
          };

          // VERIFICAÇÃO DE INTEGRIDADE: O restaurante ainda existe?
          // Se o ID mudou (por causa de um seed), o metadado está obsoleto.
          if (profile.restaurantId) {
              const { data: resExists, error: resError } = await supabase
                  .from('restaurants')
                  .select('id')
                  .eq('id', profile.restaurantId)
                  .maybeSingle();
              
              if (resExists && !resError) return profile;
              
              // Se não existe, vamos tentar achar o novo ID pelo staff
              console.warn(`Restaurant ID ${profile.restaurantId} not found. Searching for new ID...`);
          } else {
              return profile;
          }
      }
      
      // Fallback para tabela profiles apenas se necessário
      const { data, error } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
      
      if (data) {
          const profile: User = {
              id: data.id,
              email: authUser.email!,
              role: data.role as Role,
              name: data.name,
              restaurantId: data.restaurantId
          };

          // Verifica se o restaurante do profile ainda existe
          if (profile.restaurantId) {
              const { data: resExists } = await supabase
                  .from('restaurants')
                  .select('id')
                  .eq('id', profile.restaurantId)
                  .maybeSingle();
              
              if (resExists) return profile;
          } else {
              return profile;
          }
      }

      // 3. SENIOR MOVE: Busca na lista de staff de todos os restaurantes
      // Se o usuário não é um merchant dono, ele pode ser um funcionário convidado
      const { data: staffData } = await supabase
          .from('restaurants')
          .select('id, name, staff')
          .not('staff', 'is', null);

      if (staffData) {
          for (const res of staffData) {
              const staffList = res.staff as any[];
              const member = staffList.find(s => s.email?.toLowerCase() === authUser.email?.toLowerCase() && s.active);
              if (member) {
                  const newProfile: User = {
                      id: authUser.id,
                      email: authUser.email!,
                      role: member.role as Role,
                      name: member.name,
                      restaurantId: res.id
                  };
                  
                  // SENIOR MOVE: Atualiza os metadados para o novo ID correto
                  // Isso evita que o erro se repita no próximo login
                  await supabase.auth.updateUser({
                      data: { restaurantId: res.id }
                  });

                  return newProfile;
              }
          }
      }

      // Se nada funcionar, mas o cara está autenticado, monta um perfil básico para não travar
      if (authUser.email === 'admin@guarafood.com.br' || authUser.email === 'digitalpersonal@gmail.com') {
          return { id: authUser.id, email: authUser.email!, role: 'admin', name: 'Administrador' };
      }

      return null;
  };

  useEffect(() => {
    const handleSessionExpired = async () => {
        console.warn("Session expired event received. Logging out.");
        localStorage.removeItem(USER_STORAGE_KEY);
        setCurrentUser(null);
        try {
            await supabase.auth.signOut();
        } catch (e) {
            console.warn("Error during signOut after session expired:", e);
        }
    };
    window.addEventListener('auth:session-expired', handleSessionExpired);

    setLoading(true);
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.warn("Session check error:", error.message);
        if (error.message.includes("Refresh Token") || error.message.includes("refresh_token")) {
            handleSessionExpired();
        }
      } else if (session?.user) {
        const profile = await fetchUserProfile(session.user);
        if (profile) {
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
            setCurrentUser(profile);
        }
      } else {
        // SENIOR MOVE: Se não há sessão do Supabase, verifica se temos um usuário "Staff" no localStorage
        // Isso permite que garçons/gerentes fiquem logados sem conta real no Supabase
        const storedUser = localStorage.getItem(USER_STORAGE_KEY);
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                if (user.role === 'waiter' || user.role === 'manager') {
                    // É um staff, mantemos logado
                    setCurrentUser(user);
                } else {
                    // Era um merchant/admin mas a sessão expirou
                    setCurrentUser(null);
                }
            } catch {
                setCurrentUser(null);
            }
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
      window.removeEventListener('auth:session-expired', handleSessionExpired);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
      setAuthError(null);
      
      const cleanEmail = email.toLowerCase().trim();

      // 1. Tenta login real no Supabase primeiro
      const { data, error } = await supabase.auth.signInWithPassword({ 
          email: cleanEmail, 
          password 
      });

      if (error) {
          // 2. SENIOR MOVE: Se falhar no Supabase, busca na lista de staff dos restaurantes
          // Isso permite acesso imediato para garçons cadastrados pelo admin
          const { data: staffData } = await supabase
              .from('restaurants')
              .select('id, name, staff')
              .not('staff', 'is', null);

          if (staffData) {
              for (const res of staffData) {
                  const staffList = res.staff as any[];
                  const member = staffList.find(s => 
                      s.email?.toLowerCase() === cleanEmail && 
                      s.password === password && 
                      s.active
                  );
                  
                  if (member) {
                      const profile: User = {
                          id: member.id,
                          email: member.email,
                          role: member.role as Role,
                          name: member.name,
                          restaurantId: res.id
                      };
                      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
                      setCurrentUser(profile);
                      return;
                  }
              }
          }
          
          throw new Error(error.message);
      }
  }, []);

  const logout = useCallback(async () => {
      await supabase.auth.signOut();
      localStorage.removeItem(USER_STORAGE_KEY);
      setCurrentUser(null);
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