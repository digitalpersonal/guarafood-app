
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';

const supabaseUrl = SUPABASE_URL;
const supabaseKey = SUPABASE_ANON_KEY;


let supabaseInstance: SupabaseClient;
let supabaseAnonInstance: SupabaseClient;
let initializationError: Error | null = null;


try {
  // Add checks for missing configuration in config.ts.
  if (!supabaseUrl || supabaseUrl.includes('your-project-id')) {
    throw new Error("A variável SUPABASE_URL não foi configurada corretamente no arquivo config.ts. Por favor, adicione o URL do seu projeto Supabase.");
  }
  if (!supabaseKey || supabaseKey.includes('your-public-anon-key')) {
      throw new Error("A variável SUPABASE_ANON_KEY não foi configurada corretamente no arquivo config.ts. Por favor, adicione a chave 'public (anon)' do seu projeto Supabase.");
  }

  // This is the standard client that will manage user sessions for authenticated actions.
  supabaseInstance = createClient(supabaseUrl, supabaseKey);
  
  // This is a completely stateless client for fetching public data anonymously.
  // It's configured to never persist sessions, preventing it from using a logged-in user's token.
  supabaseAnonInstance = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    }
  });
  

} catch (error: any) {
  initializationError = error;
  // This dummy client is a fallback to prevent the app from crashing entirely
  // if initialization fails. It will not be functional.
  if (!supabaseInstance) {
    const dummyClient = {
      from: () => { throw initializationError; },
      auth: {
          getSession: () => Promise.resolve({ data: { session: null }, error: initializationError }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      // Mock other methods as needed to prevent crashes
    } as any;
    supabaseInstance = dummyClient;
    supabaseAnonInstance = dummyClient;
  }
}

export const supabase = supabaseInstance;
export const supabaseAnon = supabaseAnonInstance;

export const getInitializationError = () => initializationError;

// Centralized error handler
export const handleSupabaseError = ({ error, customMessage, tableName }: { error: any, customMessage: string, tableName?: string }) => {
    if (error) {
        console.error(customMessage, error);
        
        // Tenta extrair a mensagem de erro de várias propriedades possíveis
        let errorMessage = '';
        
        if (typeof error === 'string') {
            errorMessage = error;
        } else if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'object') {
            // Tenta pegar message, error_description, ou details. Se não, stringify o objeto.
            errorMessage = error.message || error.error_description || error.details || error.hint || JSON.stringify(error);
        } else {
            errorMessage = String(error);
        }

        // Combine relevant parts of the error for a more robust search
        const fullErrorMessageLower = errorMessage.toLowerCase();
        let enhancedMessage = `${customMessage}: ${errorMessage}`;

        // Check for Infinite Recursion (RLS Policy Loop)
        if (fullErrorMessageLower.includes('infinite recursion')) {
            enhancedMessage = `Erro Crítico de Banco de Dados: Recursão infinita detectada nas políticas de segurança (RLS).\n\nSOLUÇÃO: Vá ao SQL Editor do Supabase e execute o script 'fix_recursion.sql' fornecido para resetar as políticas.`;
        }
        // Check for 'column does not exist' error (PostgreSQL error code 42703 for undefined_column)
        else if (error?.code === '42703') { 
            // Fix for 'promotions' table
            if (tableName === 'promotions' || errorMessage.includes('promotions')) {
                let sqlCommands = '';
                sqlCommands += `ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS startDate TIMESTAMP WITH TIME ZONE;\n`;
                sqlCommands += `ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS endDate TIMESTAMP WITH TIME ZONE;\n`;
                enhancedMessage = `Problema com a Tabela de Promoções: Execute no SQL Editor:\n${sqlCommands}`;
            }
            // Fix for 'restaurants' table missing columns
            else if (errorMessage.includes('delivery_fee')) {
                 enhancedMessage = `Erro de Banco de Dados: A coluna 'delivery_fee' está faltando na tabela 'restaurants'.\nSOLUÇÃO: Execute no SQL Editor:\nALTER TABLE restaurants ADD COLUMN IF NOT EXISTS delivery_fee numeric default 0;`;
            } 
            else if (errorMessage.includes('manual_pix_key')) {
                 enhancedMessage = `Erro de Banco de Dados: A coluna 'manual_pix_key' está faltando na tabela 'restaurants'.\nSOLUÇÃO: Execute no SQL Editor:\nALTER TABLE restaurants ADD COLUMN IF NOT EXISTS manual_pix_key text;`;
            }
        } 
        else if (error?.code === '42701' && tableName === 'promotions' && fullErrorMessageLower.includes('column "') && fullErrorMessageLower.includes('" of relation "promotions" already exists')) {
            console.log(`[GuaraFood Info] Coluna já existe na tabela 'promotions'. Isso não é um erro crítico. Detalhes: ${errorMessage}`, error);
            return; 
        } else if (error?.code === 'PGRST116') { // No rows found for .single()
            console.warn("Supabase warning: .single() query returned no rows.");
            return;
        }
        
        throw new Error(enhancedMessage);
    }
};
