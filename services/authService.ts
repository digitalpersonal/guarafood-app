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
  // DESIGN OPTIMIZATION: Se já temos o perfil do usuário no cache local (localStorage),
  // iniciamos 'loading' como FALSE para fazer com que a pintura do painel do restaurante/cliente
  // seja Instantânea (Optimistic Loading/UI) ao apertar F5, sem travar na tela de carregamento.
  const [loading, setLoading] = useState(() => {
      try {
          return !localStorage.getItem(USER_STORAGE_KEY);
      } catch {
          return true;
      }
  });
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
              restaurantId: meta.restaurantId ?? meta.restaurant_id,
          };

          // VERIFICAÇÃO DE INTEGRIDADE: O restaurante ainda existe?
          // Se o ID mudou (por causa de um seed), o metadado está obsoleto.
          if (profile.restaurantId) {
              try {
                  const { data: resExists, error: resError } = await supabase
                      .from('restaurants')
                      .select('id')
                      .eq('id', profile.restaurantId)
                      .maybeSingle();
                  
                  if (resExists && !resError) return profile;
              } catch (err) {
                  console.warn("[GuaraFood Auth] Erro ao validar se restaurante existe na tabela, usando profile do metadado resiliente:", err);
                  return profile;
              }
              
              // Se não existe, vamos tentar achar o novo ID pelo staff
              console.warn(`Restaurant ID ${profile.restaurantId} not found. Searching for new ID...`);
          } else {
              return profile;
          }
      }
      
      // Fallback para tabela profiles apenas se necessário
      try {
          const { data, error } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
          
          if (data && !error) {
              const profile: User = {
                  id: data.id,
                  email: authUser.email!,
                  role: data.role as Role,
                  name: data.name,
                  restaurantId: data.restaurantId ?? data.restaurant_id
              };

              // Verifica se o restaurante do profile ainda existe
              if (profile.restaurantId) {
                  try {
                      const { data: resExists } = await supabase
                          .from('restaurants')
                          .select('id')
                          .eq('id', profile.restaurantId)
                          .maybeSingle();
                      
                      if (resExists) return profile;
                  } catch (e) {
                      return profile;
                  }
              } else {
                  return profile;
              }
          }
      } catch (err) {
          console.warn("[GuaraFood Auth] Erro ao buscar dados na tabela profiles:", err);
      }

      // 3. SENIOR MOVE: Busca na lista de staff de todos os restaurantes
      // Se o usuário não é um merchant dono, ele pode ser um funcionário convidado
      try {
          const { data: staffData } = await supabase
              .from('restaurants')
              .select('id, name, staff')
              .not('staff', 'is', null);

          if (staffData) {
              for (const res of staffData) {
                  const staffList = Array.isArray(res.staff) ? (res.staff as any[]) : [];
                  const member = staffList.find(s => s?.email?.toLowerCase() === authUser.email?.toLowerCase() && s?.active);
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
                      }).catch(() => {});

                      return newProfile;
                  }
              }
          }
      } catch (err) {
          console.warn("[GuaraFood Auth] Erro ao buscar lista de staff dos restaurantes:", err);
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

    // Executa a validação da sessão em segundo plano se o usuário já estiver cacheado,
    // garantindo zero bloqueios visuais ao usuário final.
    const hasLocalUser = (() => {
        try {
            return !!localStorage.getItem(USER_STORAGE_KEY);
        } catch {
            return false;
        }
    })();
    
    if (!hasLocalUser) {
        setLoading(true);
    }

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
        // SENIOR MOVE (Offline & Resilience First): Se o Supabase retornou sessão vazia ou nula
        // (comum em oscilações de rede, ambientes de iFrame restritos ou recarregamento rápido F5),
        // NÃO vamos deslogar o comerciante ou administrador de forma agressiva. 
        // Se já temos as credenciais e perfil armazenados localmente e válidos, nós o mantemos 
        // conectado para permitir operar o painel com as informações cacheadas (modo offline/resiliente).
        // A sessão só deve ser limpa de fato se o usuário realizar logout explícito (SIGNED_OUT).
        const storedUser = localStorage.getItem(USER_STORAGE_KEY);
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                if (user) {
                    console.log("Restaurando usuário em modo offline de sobrevivência:", user.role, user.name);
                    setCurrentUser(user);
                } else {
                    setCurrentUser(null);
                }
            } catch {
                setCurrentUser(null);
            }
        } else {
            setCurrentUser(null);
        }
      }
      setLoading(false);
    }).catch(async (err) => {
        console.error("Unexpected auth error during session check:", err);
        
        // CORREÇÃO CRÍTICA CONTRA QUEDA DE CONEXÃO (OFFLINE):
        // Se a chamada falhou puramente por erro de rede ("failed to fetch" ou "network error"),
        // NÃO podemos remover o usuário local nem forçar logout. Deixamos ele trabalhar offline
        // com o que já tem no painel. Apenas deslogamos se for um erro de credencial real.
        const errorMsg = err?.message || String(err);
        const isNetworkError = errorMsg.toLowerCase().includes('failed to fetch') || 
                               errorMsg.toLowerCase().includes('network') || 
                               errorMsg.toLowerCase().includes('load failed') ||
                               errorMsg.toLowerCase().includes('cors');
                               
        if (!isNetworkError) {
            console.warn("Real auth error detected, purging session cache.");
            localStorage.removeItem(USER_STORAGE_KEY);
            setCurrentUser(null);
        } else {
            console.log("Network glitch detected during auth check. Preserving offline user shell.");
        }
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
          // Evita limpar se for apenas o evento de inicialização sem sessão no Supabase (F5/Hot-reload)
          // Se o usuário já estava autenticado localmente, mantemos suas credenciais de sobrevivência offline até logout explícito.
          if (!localStorage.getItem(USER_STORAGE_KEY)) {
              setCurrentUser(null);
              setAuthError(null);
          }
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
      const cleanPassword = password.trim();

      // 1. Tenta login real no Supabase primeiro
      const { data, error } = await supabase.auth.signInWithPassword({ 
          email: cleanEmail, 
          password: cleanPassword 
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
                  const staffList = Array.isArray(res.staff) ? (res.staff as any[]) : [];
                  const member = staffList.find(s => 
                      s?.email?.toLowerCase() === cleanEmail && 
                      (s?.password === cleanPassword || s?.password === password) && 
                      s?.active
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
      } else if (data?.user) {
          // 3. SE LOGIN NO SUPABASE DER CERTO: Já buscamos o perfil imediatamente e atualizamos os dados locais.
          // Isso garante que no retorno do 'login' (que é esperado síncrono com a transição), o currentUser esteja preenchido.
          const profile = await fetchUserProfile(data.user);
          if (profile) {
              localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
              setCurrentUser(profile);
          } else {
              throw new Error("Perfil não encontrado para o usuário autenticado.");
          }
      }
  }, []);

  const logout = useCallback(async () => {
      try {
          // Clear local cache immediately so the UI reacts instantly to provide premium offline-first resilience
          localStorage.removeItem(USER_STORAGE_KEY);
          setCurrentUser(null);
          
          // Fire-and-forget Supabase signOut in the background so slow or offline networks cannot freeze the UI
          supabase.auth.signOut().catch(err => {
              console.warn("Async signOut warning during logout:", err);
          });
      } catch (err) {
          console.error("Critical error in logout:", err);
          // Fallback force clean
          localStorage.removeItem(USER_STORAGE_KEY);
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
  
  return React.createElement(AuthContext.Provider, { value }, children);
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};