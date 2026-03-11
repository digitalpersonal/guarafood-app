import React, { useState, useEffect } from 'react';
import { useAuth } from '../services/authService';
import { updateRestaurant, fetchRestaurantByIdSecure } from '../services/databaseService';
import { useNotification } from '../hooks/useNotification';
import type { StaffMember, Restaurant } from '../types';

const StaffManagement: React.FC = () => {
    const { currentUser } = useAuth();
    const { addToast, confirm, prompt } = useNotification();
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<StaffMember | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [pin, setPin] = useState('');
    const [role, setRole] = useState<'waiter' | 'manager'>('waiter');

    useEffect(() => {
        loadStaff();
    }, [currentUser?.restaurantId]);

    const loadStaff = async () => {
        if (!currentUser?.restaurantId) return;
        setLoading(true);
        try {
            const restaurant = await fetchRestaurantByIdSecure(currentUser.restaurantId);
            if (restaurant && restaurant.staff) {
                setStaff(restaurant.staff);
            } else {
                setStaff([]);
            }
        } catch (error) {
            console.error("Error loading staff:", error);
            addToast({ message: 'Erro ao carregar equipe.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (member?: StaffMember) => {
        if (member) {
            setEditingMember(member);
            setName(member.name);
            setEmail(member.email);
            setPassword(member.password || '');
            setPin(member.pin || '');
            setRole(member.role);
        } else {
            setEditingMember(null);
            setName('');
            setEmail('');
            setPassword('');
            setPin('');
            setRole('waiter');
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!name.trim() || !email.trim() || !password.trim()) {
            addToast({ message: 'Nome, Email e Senha são obrigatórios.', type: 'error' });
            return;
        }

        if (!email.includes('@')) {
            addToast({ message: 'Email inválido.', type: 'error' });
            return;
        }

        if (pin && pin.length !== 4) {
            addToast({ message: 'O PIN deve ter 4 dígitos.', type: 'error' });
            return;
        }

        if (!currentUser?.restaurantId) return;

        let updatedStaff = [...staff];

        if (editingMember) {
            // Update existing
            updatedStaff = updatedStaff.map(s => 
                s.id === editingMember.id ? { ...s, name, email, password, pin, role } : s
            );
        } else {
            // Create new
            const newMember: StaffMember = {
                id: crypto.randomUUID(),
                name,
                email: email.toLowerCase().trim(),
                password,
                pin,
                role,
                active: true
            };
            updatedStaff.push(newMember);
        }

        try {
            await updateRestaurant(currentUser.restaurantId, { staff: updatedStaff });
            setStaff(updatedStaff);
            setIsModalOpen(false);
            addToast({ message: editingMember ? 'Atendente atualizado!' : 'Atendente cadastrado!', type: 'success' });
        } catch (error) {
            console.error("Error saving staff:", error);
            addToast({ message: 'Erro ao salvar dados.', type: 'error' });
        }
    };

    const handleToggleActive = async (member: StaffMember) => {
        if (!currentUser?.restaurantId) return;

        const updatedStaff = staff.map(s => 
            s.id === member.id ? { ...s, active: !s.active } : s
        );

        try {
            await updateRestaurant(currentUser.restaurantId, { staff: updatedStaff });
            setStaff(updatedStaff);
            addToast({ message: `Status de ${member.name} atualizado.`, type: 'success' });
        } catch (error) {
            addToast({ message: 'Erro ao atualizar status.', type: 'error' });
        }
    };

    const handleDelete = async (member: StaffMember) => {
        if (!currentUser?.restaurantId) return;

        const confirmed = await confirm({
            title: 'Remover Atendente',
            message: `Tem certeza que deseja remover ${member.name}?`,
            confirmText: 'Remover',
            isDestructive: true
        });

        if (confirmed) {
            const updatedStaff = staff.filter(s => s.id !== member.id);
            try {
                await updateRestaurant(currentUser.restaurantId, { staff: updatedStaff });
                setStaff(updatedStaff);
                addToast({ message: 'Atendente removido.', type: 'success' });
            } catch (error) {
                addToast({ message: 'Erro ao remover atendente.', type: 'error' });
            }
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Carregando equipe...</div>;
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-gray-800">Equipe de Atendimento</h2>
                    <p className="text-gray-500 text-sm">Gerencie garçons e gerentes que acessam o sistema.</p>
                </div>
                <button 
                    onClick={() => handleOpenModal()}
                    className="bg-orange-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-orange-700 transition-colors flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Novo Atendente
                </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {staff.map(member => (
                    <div key={member.id} className={`bg-white p-4 rounded-2xl shadow-sm border-2 transition-all ${member.active ? 'border-gray-100' : 'border-gray-100 opacity-60 bg-gray-50'}`}>
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white ${member.role === 'manager' ? 'bg-purple-600' : 'bg-orange-500'}`}>
                                    {member.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800">{member.name}</h3>
                                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                        {member.role === 'manager' ? 'Gerente' : 'Garçom'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <button 
                                    onClick={() => handleOpenModal(member)}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                    </svg>
                                </button>
                                <button 
                                    onClick={() => handleDelete(member)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.134H8.09a2.09 2.09 0 00-2.09 2.134v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                            <div className="text-[10px] font-mono text-gray-400 truncate max-w-[150px]">
                                {member.email}
                            </div>
                            <button 
                                onClick={() => handleToggleActive(member)}
                                className={`text-xs font-bold px-3 py-1 rounded-full transition-colors ${member.active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
                            >
                                {member.active ? 'ATIVO' : 'INATIVO'}
                            </button>
                        </div>
                    </div>
                ))}

                {staff.length === 0 && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-200 rounded-2xl">
                        <p className="text-gray-400 font-bold">Nenhum membro na equipe ainda.</p>
                        <button onClick={() => handleOpenModal()} className="text-orange-600 font-bold mt-2 hover:underline">Cadastrar o primeiro</button>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-slideUp max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-black text-gray-800 mb-6">
                            {editingMember ? 'Editar Atendente' : 'Novo Atendente'}
                        </h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome</label>
                                <input 
                                    type="text" 
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-orange-500 outline-none font-medium"
                                    placeholder="Ex: João Silva"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email de Acesso</label>
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-orange-500 outline-none font-medium"
                                    placeholder="email@exemplo.com"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Senha de Acesso</label>
                                <input 
                                    type="text" 
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-orange-500 outline-none font-medium"
                                    placeholder="Defina uma senha"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">O acesso será liberado imediatamente com este email e senha.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">PIN de Acesso Rápido (Opcional - 4 dígitos)</label>
                                <input 
                                    type="text" 
                                    maxLength={4}
                                    value={pin}
                                    onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-orange-500 outline-none font-mono text-center tracking-[0.5em] text-lg"
                                    placeholder="0000"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">Usado apenas para desbloquear o painel em dispositivos compartilhados.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Função</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button 
                                        onClick={() => setRole('waiter')}
                                        className={`p-3 rounded-xl font-bold text-sm transition-all ${role === 'waiter' ? 'bg-orange-100 text-orange-700 border-2 border-orange-200' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}
                                    >
                                        Garçom
                                    </button>
                                    <button 
                                        onClick={() => setRole('manager')}
                                        className={`p-3 rounded-xl font-bold text-sm transition-all ${role === 'manager' ? 'bg-purple-100 text-purple-700 border-2 border-purple-200' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}
                                    >
                                        Gerente
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleSave}
                                className="flex-1 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 shadow-lg shadow-orange-200 transition-all active:scale-95"
                            >
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffManagement;
