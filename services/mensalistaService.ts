import { supabase } from './api';

export interface Mensalista {
  id: string;
  restaurant_id: number;
  name: string;
  phone: string;
  start_date: string;
  next_payment_date: string;
  status: string;
  monthly_fee: number;
  notes?: string;
  created_at: string;
}

export const getMensalistaByPhone = async (phone: string, restaurantId: number): Promise<Mensalista | null> => {
  try {
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length < 10) {
      return null;
    }

    const { data, error } = await supabase
      .from('mensalistas')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'active')
      .ilike('phone', `%${cleanPhone}%`)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data as Mensalista;
  } catch (error) {
    console.error('Error getting mensalista by phone:', error);
    return null;
  }
};

export const verifyMensalistaByPhone = async (restaurantId: number, phone: string): Promise<Mensalista | null> => {
  return getMensalistaByPhone(phone, restaurantId);
};

export const fetchMensalistas = async (restaurantId: number): Promise<Mensalista[]> => {
  try {
    const { data, error } = await supabase
      .from('mensalistas')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching mensalistas:', error);
    return [];
  }
};

