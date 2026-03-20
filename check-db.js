import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const config = fs.readFileSync('./config.ts', 'utf8');
const urlMatch = config.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/);
const keyMatch = config.match(/SUPABASE_ANON_KEY\s*=\s*['"]([^'"]+)['"]/);

const supabase = createClient('https://xfousvlrhinlvrpryscy.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhmb3VzdmxyaGlubHZycHJ5c2N5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MTg0NDYsImV4cCI6MjA3ODE5NDQ0Nn0.ah4qi9NtkUAyxrcOMPQi9T6pmgEW6ZMHcjhA9tNI8s0');
supabase.from('restaurants').select('*').eq('id', 28).single().then(({ data, error }) => {
  if (error) console.error(error);
  else {
    console.log('payment_gateways type:', typeof data.payment_gateways, Array.isArray(data.payment_gateways));
    console.log('payment_gateways value:', data.payment_gateways);
    console.log('operating_hours type:', typeof data.operating_hours, Array.isArray(data.operating_hours));
    console.log('operating_hours value:', data.operating_hours);
    console.log('mercado_pago_credentials type:', typeof data.mercado_pago_credentials);
    console.log('mercado_pago_credentials value:', data.mercado_pago_credentials);
    console.log('category type:', typeof data.category);
    console.log('category value:', data.category);
  }
});
