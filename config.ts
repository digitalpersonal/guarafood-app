
// =================================================================================================
// 🚀 GUARAFOOD - CONFIGURAÇÃO (PRODUÇÃO) 🚀
// =================================================================================================

// Tenta ler as variáveis de ambiente do Vercel (Segurança Máxima)
// Se não encontrar (ex: rodando local), usa as chaves hardcoded abaixo.

const ENV_SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL;
const ENV_SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

// --- SUAS CREDENCIAIS ---
// Mantenha estas aqui como backup caso não consiga configurar no Vercel agora.
const FALLBACK_URL = 'https://xfousvlrhinlvrpryscy.supabase.co'; 
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhmb3VzdmxyaGlubHZycHJ5c2N5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MTg0NDYsImV4cCI6MjA3ODE5NDQ0Nn0.ah4qi9NtkUAyxrcOMPQi9T6pmgEW6ZMHcjhA9tNI8s0';

// SENIOR MOVE: Validação rigorosa das variáveis de ambiente
const isValidUrl = (url: string | undefined) => url && url.startsWith('https://') && url.includes('.supabase.co');
const isValidKey = (key: string | undefined) => key && key.length > 50;

export const SUPABASE_URL = isValidUrl(ENV_SUPABASE_URL) ? ENV_SUPABASE_URL! : FALLBACK_URL;
export const SUPABASE_ANON_KEY = isValidKey(ENV_SUPABASE_ANON_KEY) ? ENV_SUPABASE_ANON_KEY! : FALLBACK_KEY;

// Validação simples para ajudar no debug
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("GuaraFood: Credenciais do Supabase não encontradas! Verifique o arquivo config.ts ou as variáveis de ambiente do Vercel.");
}
