
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
    }
});

async function checkAnon() {
    const { data, error } = await supabaseAnon.from('restaurants').select('id, name, active');
    if (error) {
        console.error("Error fetching restaurants (anon):", error);
    } else {
        console.log("Restaurants in DB (anon):", data);
    }
}

checkAnon();
