import { supabase } from './api';
import { Mensalista } from '../types';

export const fetchMensalistas = async (restaurantId: number): Promise<Mensalista[]> => {
  const { data, error } = await supabase
    .from('mensalistas')
    .select('*')
    .eq('restaurant_id', restaurantId);

  if (error) throw error;
  return data.map(m => ({
    ...m,
    restaurantId: m.restaurant_id,
    startDate: m.start_date,
    nextPaymentDate: m.next_payment_date,
    monthlyFee: Number(m.monthly_fee),
    balance: Number(m.balance || 0)
  }));
};

export const createMensalista = async (mensalista: Omit<Mensalista, 'id'>) => {
  const { data, error } = await supabase
    .from('mensalistas')
    .insert({
      restaurant_id: mensalista.restaurantId,
      name: mensalista.name,
      phone: mensalista.phone,
      start_date: mensalista.startDate,
      next_payment_date: mensalista.nextPaymentDate,
      status: mensalista.status,
      monthly_fee: mensalista.monthlyFee,
      notes: mensalista.notes
    })
    .select();

  if (error) throw error;
  return data;
};

export const updateMensalista = async (id: string, updates: Partial<Mensalista>) => {
  const { data, error } = await supabase
    .from('mensalistas')
    .update({
      name: updates.name,
      phone: updates.phone,
      next_payment_date: updates.nextPaymentDate,
      status: updates.status,
      monthly_fee: updates.monthlyFee,
      balance: updates.balance,
      notes: updates.notes
    })
    .eq('id', id)
    .select();

  if (error) throw error;
  return data;
};

export const deleteMensalista = async (id: string) => {
  const { error } = await supabase
    .from('mensalistas')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const checkIfMensalista = async (phone: string, restaurantId: number): Promise<boolean> => {
  const { data, error } = await supabase
    .from('mensalistas')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .eq('phone', phone)
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw error;
  return !!data;
};
