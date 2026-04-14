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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  console.log("AuthProvider rendered - VERSION 1.0.3");
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
              restaurantId: meta.restaurantId ? Number(meta.restaurantId) : undefined,
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
              restaurantId: data.restaurantId ? Number(data.restaurantId) : undefined
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
                      restaurantId: res.id ? Number(res.id) : undefined
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

  const handleSessionExpired = useCallback(async () => {
    console.warn("Session expired or invalid token. Aggressive cleanup triggered.");
    
    // 1. Limpa o perfil do usuário
    localStorage.removeItem(USER_STORAGE_KEY);
    setCurrentUser(null);
    
    try {
        // 2. Tenta deslogar do Supabase (isso limpa os cookies/tokens do SDK)
        await supabase.auth.signOut();
    } catch (e) {
        console.warn("Error during signOut after session expired:", e);
    } finally {
        // 3. Limpa TUDO que possa estar corrompido no localStorage relacionado ao Supabase
        // As chaves do Supabase geralmente começam com 'sb-'
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-')) {
                localStorage.removeItem(key);
            }
        });
        
        console.log("Cleanup finished.");
    }
  }, []);

  useEffect(() => {
    window.addEventListener('auth:session-expired', handleSessionExpired);

    setLoading(true);
    
    // SAFETY TIMEOUT: Se o Supabase demorar mais de 8 segundos para responder, 
    // liberamos o carregamento para não travar o usuário na tela de splash.
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        console.warn("Auth initialization taking too long. Releasing loading state.");
        setLoading(false);
      }
    }, 8000);

    // Inicialização da sessão
    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        clearTimeout(safetyTimeout);

        if (error) {
          console.warn("Session check error:", error.message);
          const msg = error.message.toLowerCase();
          if (msg.includes("refresh token") || msg.includes("invalid_grant") || msg.includes("not found")) {
            await handleSessionExpired();
          }
        } else if (session?.user) {
          const profile = await fetchUserProfile(session.user);
          if (profile) {
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
            setCurrentUser(profile);
          }
        } else {
          // Se não há sessão do Supabase, verifica se temos um usuário "Staff" no localStorage
          const storedUser = localStorage.getItem(USER_STORAGE_KEY);
          if (storedUser) {
            try {
              const user = JSON.parse(storedUser);
              if (user.role === 'waiter' || user.role === 'manager') {
                setCurrentUser(user);
              } else {
                setCurrentUser(null);
              }
            } catch {
              setCurrentUser(null);
            }
          }
        }
      } catch (err: any) {
        console.error("Unexpected auth error during init:", err);
        const msg = err.message?.toLowerCase() || "";
        if (msg.includes("refresh token") || msg.includes("token")) {
          await handleSessionExpired();
        }
        setLoading(false);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`Auth event: ${event}`);
        
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
        } else if (event === 'TOKEN_REFRESHED') {
          console.log("Token refreshed successfully");
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
      window.removeEventListener('auth:session-expired', handleSessionExpired);
    };
  }, [handleSessionExpired]);

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
                      restaurantId: res.id ? Number(res.id) : undefined
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
      console.log("Logout function called - Aggressive mode");
      try {
          // Tenta deslogar do Supabase
          await supabase.auth.signOut();
          console.log("Supabase signOut completed");
      } catch (e) {
          console.warn("Error during signOut:", e);
      } finally {
          // Limpa TUDO do localStorage para garantir que nada persista
          localStorage.clear();
          console.log("LocalStorage cleared completely");
          
          // Limpa o estado local
          setCurrentUser(null);
      }
  }, []);

  const value = useMemo(() => ({
    currentUser,
    login,
    logout,
    loading,
    authError,
  }), [currentUser, login, logout, loading, authError]);
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};