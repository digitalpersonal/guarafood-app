import React, { useState, useEffect } from 'react';
import { supabase } from '../services/api';
import type { Restaurant } from '../types';
import type { Mensalista } from '../services/mensalistaService';
import { useNotification } from '../hooks/useNotification';

interface MensalistasManagerProps {
  restaurant: Restaurant;
}

const MensalistasManager: React.FC<MensalistasManagerProps> = ({ restaurant }) => {
  const [mensalistas, setMensalistas] = useState<Mensalista[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const { addToast } = useNotification();

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [monthlyFee, setMonthlyFee] = useState('');
  const [startDate, setStartDate] = useState('');
  const [nextPaymentDate, setNextPaymentDate] = useState('');

  useEffect(() => {
    fetchMensalistas();
  }, [restaurant.id]);

  const fetchMensalistas = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('mensalistas')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('name');

      if (error) throw error;
      setMensalistas(data || []);
    } catch (error) {
      console.error('Error fetching mensalistas:', error);
      addToast({ message: 'Erro ao carregar mensalistas', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMensalista = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      
      const newMensalista = {
        restaurant_id: restaurant.id,
        name,
        phone: cleanPhone,
        monthly_fee: parseFloat(monthlyFee),
        start_date: startDate,
        next_payment_date: nextPaymentDate,
        status: 'active'
      };

      const { error } = await supabase.from('mensalistas').insert(newMensalista);
      if (error) throw error;

      addToast({ message: 'Mensalista adicionado com sucesso', type: 'success' });
      setIsAdding(false);
      resetForm();
      fetchMensalistas();
    } catch (error) {
      console.error('Error adding mensalista:', error);
      addToast({ message: 'Erro ao adicionar mensalista', type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este mensalista?')) return;
    
    try {
      const { error } = await supabase.from('mensalistas').delete().eq('id', id);
      if (error) throw error;
      
      addToast({ message: 'Mensalista removido', type: 'success' });
      fetchMensalistas();
    } catch (error) {
      console.error('Error deleting mensalista:', error);
      addToast({ message: 'Erro ao remover mensalista', type: 'error' });
    }
  };

  const resetForm = () => {
    setName('');
    setPhone('');
    setMonthlyFee('');
    setStartDate('');
    setNextPaymentDate('');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Gerenciar Mensalistas</h2>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
        >
          {isAdding ? 'Cancelar' : 'Adicionar Mensalista'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAddMensalista} className="mb-8 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp (apenas números)</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: 35999999999"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor Mensal (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                value={monthlyFee}
                onChange={(e) => setMonthlyFee(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de Início</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Próximo Vencimento</label>
              <input
                type="date"
                required
                value={nextPaymentDate}
                onChange={(e) => setNextPaymentDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              Salvar Mensalista
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Carregando...</div>
      ) : mensalistas.length === 0 ? (
        <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
          Nenhum mensalista cadastrado.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">WhatsApp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vencimento</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mensalistas.map((mensalista) => (
                <tr key={mensalista.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{mensalista.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{mensalista.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">R$ {mensalista.monthly_fee.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(mensalista.next_payment_date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDelete(mensalista.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MensalistasManager;
