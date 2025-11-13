
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
        let enhancedMessage = `${customMessage} (Supabase: ${error.message || String(error)})`;

        // Combine relevant parts of the error for a more robust search
        const fullErrorMessageLower = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`.toLowerCase();

        // Check for 'column does not exist' error (PostgreSQL error code 42703 for undefined_column)
        // If it's the promotions table, we proactively list all common missing columns.
        if (error.code === '42703' && tableName === 'promotions') {
            let columnFixMessage = `Erro de Banco de Dados: Algumas colunas essenciais estão faltando na sua tabela 'promotions'. Para que as promoções funcionem corretamente, por favor, execute os seguintes comandos SQL no seu Supabase:\n\n`;
            let sqlCommands = '';

            // Assume these are always needed if a 42703 error occurs on 'promotions'
            sqlCommands += `ALTER TABLE public.promotions ADD COLUMN startDate TIMESTAMP WITH TIME ZONE;\n`;
            sqlCommands += `ALTER TABLE public.promotions ADD COLUMN endDate TIMESTAMP WITH TIME ZONE;\n`;
            
            if (sqlCommands) { // Only append if there are actual commands
                columnFixMessage += sqlCommands;
                columnFixMessage += `\nCaso algumas colunas já existam, você pode ignorar os erros 'column already exists'.`;
                enhancedMessage = `Problema com a Tabela de Promoções: ${columnFixMessage}`; // Simplified message, remove redundant customMessage
            }
        } else if (error.code === '42701' && tableName === 'promotions' && fullErrorMessageLower.includes('column "') && fullErrorMessageLower.includes('" of relation "promotions" already exists')) {
            // This specifically addresses any "column already exists" error for the `promotions` table.
            // Log a message and return, indicating that this specific issue is not critical and the operation should proceed.
            console.log(`[GuaraFood Info] Coluna já existe na tabela 'promotions'. Isso não é um erro crítico. Detalhes: ${error.message}`, error);
            return; // Important: return here to not throw an error from handleSupabaseError
        } else if (error.code === 'PGRST116') { // No rows found for .single()
            // This is often not a "real" error, so we might not want to throw
            console.warn("Supabase warning: .single() query returned no rows.");
            return; // Important: return here to not throw for PGRST116
        }
        
        throw new Error(enhancedMessage);
    }
};
