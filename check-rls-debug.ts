
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkRLS() {
    const { data, error } = await supabase.rpc('get_rls_policies', { table_name: 'restaurants' });
    if (error) {
        console.error("Error fetching RLS policies:", error);
        // Fallback: try to see if we can read without auth
        const { data: readData, error: readError } = await supabase.from('restaurants').select('count', { count: 'exact', head: true });
        if (readError) {
            console.error("Anonymous read failed:", readError);
        } else {
            console.log("Anonymous read count:", readData);
        }
    } else {
        console.log("RLS Policies:", data);
    }
}

checkRLS();
