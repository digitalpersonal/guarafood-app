import React, { useState, useEffect, useMemo } from 'react';
import type { PlatformUser, StaffMember } from '../types';
import { 
    fetchPlatformUsers, 
    savePlatformUsers, 
    fetchAllStaffAcrossRestaurants,
    updateRestaurant 
} from '../services/databaseService';
import { useAuth } from '../services/authService';
import { useNotification } from '../hooks/useNotification';
import Spinner from './Spinner';

// Icons
const ShieldCheckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
);

const LockClosedIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
);

const BanknotesIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6H2.25m0 0v10.5m0-10.5h10.5a.75.75 0 01.75.75v.75m0 0H21m0 0a.75.75 0 01.75.75v10.5a.75.75 0 01-.75.75H13.5m0 0h-7.5m7.5 0v.75a.75.75 0 01-.75.75H3.75m0 0v-6m0 0H21" />
    </svg>
);

const UserPlusIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.375 21c-2.33 0-4.512-.645-6.374-1.765z" />
    </svg>
);

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.134H8.09a2.09 2.09 0 00-2.09 2.134v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);

const PencilIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
);

const EyeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const EyeSlashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
);

const MASTER_EMAILS = ['digitalpersonal@gmail.com', 'admin@guarafood.com.br'];

export const PlatformUsersManagement: React.FC = () => {
    const { currentUser } = useAuth();
    const { addToast, confirm } = useNotification();

    const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([]);
    const [restaurantStaffGroups, setRestaurantStaffGroups] = useState<{ restaurantId: number; restaurantName: string; staff: StaffMember[] }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeSubTab, setActiveSubTab] = useState<'platform' | 'restaurants'>('platform');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterFinancial, setFilterFinancial] = useState<'all' | 'with_financial' | 'without_financial'>('all');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<PlatformUser | null>(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [role, setRole] = useState<'admin' | 'operator'>('operator');
    const [canAccessFinancial, setCanAccessFinancial] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Selected restaurant filter in second tab
    const [selectedRestaurantFilter, setSelectedRestaurantFilter] = useState<string>('all');

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [platUsers, restStaff] = await Promise.all([
                fetchPlatformUsers(),
                fetchAllStaffAcrossRestaurants()
            ]);
            setPlatformUsers(platUsers);
            setRestaurantStaffGroups(restStaff);
        } catch (err) {
            console.error("Erro ao carregar usuários:", err);
            addToast({ message: 'Erro ao carregar dados dos usuários.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Filtered platform users
    const filteredPlatformUsers = useMemo(() => {
        return platformUsers.filter(u => {
            const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  u.email.toLowerCase().includes(searchQuery.toLowerCase());
            if (!matchesSearch) return false;

            if (filterFinancial === 'with_financial') return u.canAccessFinancial === true;
            if (filterFinancial === 'without_financial') return u.canAccessFinancial === false;
            return true;
        });
    }, [platformUsers, searchQuery, filterFinancial]);

    // Summary counts
    const stats = useMemo(() => {
        const total = platformUsers.length;
        const withFinancial = platformUsers.filter(u => u.canAccessFinancial).length;
        const withoutFinancial = platformUsers.filter(u => !u.canAccessFinancial).length;
        return { total, withFinancial, withoutFinancial };
    }, [platformUsers]);

    const handleOpenModal = (user?: PlatformUser) => {
        if (user) {
            setEditingUser(user);
            setName(user.name);
            setEmail(user.email);
            setPassword(user.password || '');
            setRole(user.role);
            setCanAccessFinancial(user.canAccessFinancial);
        } else {
            setEditingUser(null);
            setName('');
            setEmail('');
            setPassword('');
            setRole('operator');
            // Por padrão: novo usuário SEM acesso financeiro
            setCanAccessFinancial(false);
        }
        setShowPassword(false);
        setIsModalOpen(true);
    };

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanName = name.trim();
        const cleanEmail = email.toLowerCase().trim();
        const cleanPassword = password.trim();

        if (!cleanName || !cleanEmail) {
            addToast({ message: 'Nome e e-mail são obrigatórios.', type: 'error' });
            return;
        }

        if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
            addToast({ message: 'Por favor, informe um e-mail válido.', type: 'error' });
            return;
        }

        if (!editingUser && cleanPassword.length < 6) {
            addToast({ message: 'A senha provisória deve ter no mínimo 6 caracteres.', type: 'error' });
            return;
        }

        const isMaster = MASTER_EMAILS.includes(cleanEmail);

        // Se for admin mestre, não pode remover acesso financeiro
        const finalFinancial = isMaster ? true : canAccessFinancial;

        setIsSaving(true);
        try {
            let updatedList = [...platformUsers];

            if (editingUser) {
                // Atualizar existente
                updatedList = updatedList.map(u => {
                    if (u.id === editingUser.id) {
                        return {
                            ...u,
                            name: cleanName,
                            email: cleanEmail,
                            password: cleanPassword || u.password,
                            role,
                            canAccessFinancial: finalFinancial
                        };
                    }
                    return u;
                });
            } else {
                // Verificar se já existe email duplicado
                if (updatedList.some(u => u.email.toLowerCase() === cleanEmail)) {
                    addToast({ message: 'Já existe um usuário cadastrado com este e-mail.', type: 'error' });
                    setIsSaving(false);
                    return;
                }

                const newUser: PlatformUser = {
                    id: crypto.randomUUID(),
                    name: cleanName,
                    email: cleanEmail,
                    password: cleanPassword,
                    role,
                    active: true,
                    canAccessFinancial: finalFinancial,
                    createdAt: new Date().toISOString()
                };
                updatedList.push(newUser);
            }

            await savePlatformUsers(updatedList);
            setPlatformUsers(updatedList);
            setIsModalOpen(false);
            addToast({ 
                message: editingUser ? 'Usuário atualizado com sucesso!' : 'Novo usuário GuaráFood cadastrado com sucesso!', 
                type: 'success' 
            });
        } catch (err: any) {
            console.error("Erro ao salvar usuário:", err);
            addToast({ message: `Erro ao salvar: ${err.message || 'Falha no servidor'}`, type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    // Toggle rápido de permissão financeira para usuário da plataforma
    const handleToggleFinancialAccess = async (user: PlatformUser) => {
        if (MASTER_EMAILS.includes(user.email.toLowerCase())) {
            addToast({ message: 'Os administradores mestres sempre possuem acesso financeiro irrestrito.', type: 'info' });
            return;
        }

        const newFinancialValue = !user.canAccessFinancial;
        const updatedList = platformUsers.map(u => 
            u.id === user.id ? { ...u, canAccessFinancial: newFinancialValue } : u
        );

        try {
            await savePlatformUsers(updatedList);
            setPlatformUsers(updatedList);
            addToast({ 
                message: newFinancialValue 
                    ? `Acesso financeiro concedido para ${user.name}!` 
                    : `Acesso financeiro bloqueado para ${user.name}!`, 
                type: newFinancialValue ? 'success' : 'warning' 
            });
        } catch (err) {
            console.error("Erro ao alternar permissão financeira:", err);
            addToast({ message: 'Falha ao atualizar permissão no banco.', type: 'error' });
        }
    };

    // Alternar ativo/inativo
    const handleToggleActive = async (user: PlatformUser) => {
        if (MASTER_EMAILS.includes(user.email.toLowerCase())) {
            addToast({ message: 'O administrador mestre não pode ser desativado.', type: 'warning' });
            return;
        }

        const newActive = !user.active;
        const updatedList = platformUsers.map(u => 
            u.id === user.id ? { ...u, active: newActive } : u
        );

        try {
            await savePlatformUsers(updatedList);
            setPlatformUsers(updatedList);
            addToast({ 
                message: newActive ? `Usuário ${user.name} ativado!` : `Usuário ${user.name} desativado!`, 
                type: 'info' 
            });
        } catch (err) {
            console.error("Erro ao alterar status:", err);
            addToast({ message: 'Erro ao salvar alteração.', type: 'error' });
        }
    };

    // Excluir usuário
    const handleDeleteUser = async (user: PlatformUser) => {
        if (MASTER_EMAILS.includes(user.email.toLowerCase())) {
            addToast({ message: 'Não é permitido excluir administradores mestres.', type: 'error' });
            return;
        }

        const confirmed = await confirm({
            title: 'Excluir Usuário',
            message: `Tem certeza que deseja remover o usuário "${user.name}" (${user.email})? Ele perderá o acesso à plataforma.`,
            confirmText: 'Sim, Excluir',
            cancelText: 'Cancelar',
            isDestructive: true
        });

        if (confirmed) {
            const updatedList = platformUsers.filter(u => u.id !== user.id);
            try {
                await savePlatformUsers(updatedList);
                setPlatformUsers(updatedList);
                addToast({ message: 'Usuário removido com sucesso.', type: 'success' });
            } catch (err) {
                console.error("Erro ao excluir usuário:", err);
                addToast({ message: 'Erro ao excluir usuário do banco.', type: 'error' });
            }
        }
    };

    // Toggle rápido de acesso financeiro para staff de restaurante
    const handleToggleRestaurantStaffFinancial = async (restaurantId: number, memberId: string) => {
        const group = restaurantStaffGroups.find(g => g.restaurantId === restaurantId);
        if (!group) return;

        const updatedStaff = group.staff.map(s => {
            if (s.id === memberId) {
                return { ...s, canAccessFinancial: !s.canAccessFinancial };
            }
            return s;
        });

        try {
            await updateRestaurant(restaurantId, { staff: updatedStaff });
            setRestaurantStaffGroups(prev => prev.map(g => 
                g.restaurantId === restaurantId ? { ...g, staff: updatedStaff } : g
            ));
            addToast({ message: 'Permissão da equipe atualizada!', type: 'success' });
        } catch (err) {
            console.error("Erro ao atualizar staff do restaurante:", err);
            addToast({ message: 'Erro ao atualizar permissão no restaurante.', type: 'error' });
        }
    };

    if (isLoading) return <Spinner />;

    return (
        <div className="space-y-6 animate-fadeIn pb-12">
            {/* Header & Sub-Tabs */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">👥</span>
                        <h2 className="text-xl md:text-2xl font-black text-gray-800">
                            Equipe & Usuários GuaráFood
                        </h2>
                    </div>
                    <p className="text-xs text-gray-500">
                        Gerencie os operadores e administradores da plataforma e defina rigorosamente quem possui ou não acesso aos relatórios e dados financeiros.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-sm flex items-center gap-2 transition-all active:scale-95"
                    >
                        <UserPlusIcon className="w-4 h-4" />
                        <span>Novo Usuário GuaráFood</span>
                    </button>
                </div>
            </div>

            {/* Aviso Explicativo de Segurança Financeira */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-2xl flex items-start gap-3">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl flex-shrink-0 mt-0.5">
                    <ShieldCheckIcon className="w-5 h-5" />
                </div>
                <div className="text-xs text-blue-900 space-y-1">
                    <p className="font-bold text-sm">Controle de Privacidade e Acesso Financeiro</p>
                    <p>
                        Usuários marcados com <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Com Acesso Financeiro</span> têm autorização para visualizar faturamento, ticket médio, relatórios de vendas e caixa.
                    </p>
                    <p>
                        Usuários marcados com <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">Sem Acesso Financeiro</span> podem operar o sistema normalmente (cadastrar restaurantes, cardápios, categorias, banners e suporte), mas a aba <strong>Relatório Vendas</strong> e dados de faturamento ficam 100% bloqueados.
                    </p>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total de Usuários</p>
                        <p className="text-2xl font-black text-gray-800 mt-1">{stats.total}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">Cadastrados na administração</p>
                    </div>
                    <div className="w-12 h-12 bg-gray-100 text-gray-600 rounded-2xl flex items-center justify-center text-xl font-bold">
                        👤
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Com Acesso Financeiro</p>
                        <p className="text-2xl font-black text-emerald-600 mt-1">{stats.withFinancial}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">Visualizam vendas e faturamento</p>
                    </div>
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-xl font-bold">
                        <BanknotesIcon className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-red-600 uppercase tracking-wider">Sem Acesso Financeiro</p>
                        <p className="text-2xl font-black text-red-600 mt-1">{stats.withoutFinancial}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">Bloqueados da área financeira</p>
                    </div>
                    <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center text-xl font-bold">
                        <LockClosedIcon className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Sub-Tab Selector */}
            <div className="flex border-b border-gray-200 gap-2">
                <button
                    onClick={() => setActiveSubTab('platform')}
                    className={`pb-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all ${
                        activeSubTab === 'platform' 
                            ? 'border-orange-600 text-orange-600' 
                            : 'border-transparent text-gray-400 hover:text-gray-700'
                    }`}
                >
                    Equipe GuaráFood (Painel Admin) ({platformUsers.length})
                </button>
                <button
                    onClick={() => setActiveSubTab('restaurants')}
                    className={`pb-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all ${
                        activeSubTab === 'restaurants' 
                            ? 'border-orange-600 text-orange-600' 
                            : 'border-transparent text-gray-400 hover:text-gray-700'
                    }`}
                >
                    Equipe dos Restaurantes (Lojas)
                </button>
            </div>

            {/* Sub-Tab 1: Equipe GuaráFood */}
            {activeSubTab === 'platform' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Filtros e Busca */}
                    <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-center justify-between bg-gray-50/50">
                        <div className="w-full sm:w-72">
                            <input
                                type="text"
                                placeholder="Buscar por nome ou e-mail..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <span className="text-[11px] font-bold text-gray-500">Filtrar:</span>
                            <select
                                value={filterFinancial}
                                onChange={e => setFilterFinancial(e.target.value as any)}
                                className="text-xs p-2 rounded-xl border border-gray-200 bg-white font-medium text-gray-700"
                            >
                                <option value="all">Todos os Usuários</option>
                                <option value="with_financial">Apenas com Acesso Financeiro</option>
                                <option value="without_financial">Apenas SEM Acesso Financeiro</option>
                            </select>
                        </div>
                    </div>

                    {/* Tabela de Usuários */}
                    {filteredPlatformUsers.length === 0 ? (
                        <div className="p-12 text-center text-gray-400 text-xs">
                            Nenhum usuário encontrado com os filtros aplicados.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {filteredPlatformUsers.map(user => {
                                const isMaster = MASTER_EMAILS.includes(user.email.toLowerCase());
                                return (
                                    <div key={user.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/80 transition-colors">
                                        <div className="flex items-start gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                                                user.canAccessFinancial 
                                                    ? 'bg-emerald-100 text-emerald-700' 
                                                    : 'bg-red-100 text-red-700'
                                            }`}>
                                                {user.canAccessFinancial ? '💰' : '🔒'}
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h4 className="font-bold text-sm text-gray-800">{user.name}</h4>
                                                    {isMaster && (
                                                        <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                                                            👑 Mestre
                                                        </span>
                                                    )}
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                                        user.role === 'admin' 
                                                            ? 'bg-indigo-100 text-indigo-700' 
                                                            : 'bg-gray-100 text-gray-700'
                                                    }`}>
                                                        {user.role === 'admin' ? 'Administrador' : 'Operador / Suporte'}
                                                    </span>
                                                    {!user.active && (
                                                        <span className="bg-gray-200 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                            Inativo
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>

                                                {user.password && (
                                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                                        Senha de acesso rápido: <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">{user.password}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Status de Acesso Financeiro & Ações */}
                                        <div className="flex items-center gap-3 self-end sm:self-center flex-wrap">
                                            {/* Toggle Acesso Financeiro */}
                                            <button
                                                onClick={() => handleToggleFinancialAccess(user)}
                                                disabled={isMaster}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                                                    user.canAccessFinancial 
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' 
                                                        : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                                                } ${isMaster ? 'opacity-80 cursor-not-allowed' : 'active:scale-95'}`}
                                                title={isMaster ? 'Administrador mestre sempre tem acesso financeiro' : 'Clique para alternar permissão financeira'}
                                            >
                                                {user.canAccessFinancial ? (
                                                    <>
                                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                                        <span>Acesso Financeiro Liberado</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <LockClosedIcon className="w-3.5 h-3.5 text-red-500" />
                                                        <span>Sem Acesso Financeiro</span>
                                                    </>
                                                )}
                                            </button>

                                            {/* Editar */}
                                            <button
                                                onClick={() => handleOpenModal(user)}
                                                className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                                                title="Editar usuário"
                                            >
                                                <PencilIcon className="w-4 h-4" />
                                            </button>

                                            {/* Toggle Ativo */}
                                            {!isMaster && (
                                                <button
                                                    onClick={() => handleToggleActive(user)}
                                                    className={`px-2 py-1 text-[11px] font-bold rounded-lg border transition-colors ${
                                                        user.active 
                                                            ? 'border-gray-200 text-gray-600 hover:bg-gray-100' 
                                                            : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                                                    }`}
                                                    title={user.active ? 'Desativar usuário' : 'Ativar usuário'}
                                                >
                                                    {user.active ? 'Desativar' : 'Ativar'}
                                                </button>
                                            )}

                                            {/* Excluir */}
                                            {!isMaster && (
                                                <button
                                                    onClick={() => handleDeleteUser(user)}
                                                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Excluir usuário"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Sub-Tab 2: Equipe dos Restaurantes */}
            {activeSubTab === 'restaurants' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 className="text-base font-bold text-gray-800">
                                Permissões Financeiras da Equipe dos Restaurantes
                            </h3>
                            <p className="text-xs text-gray-500">
                                Aqui você pode visualizar e configurar o acesso financeiro de funcionários de qualquer loja cadastrada no GuaráFood.
                            </p>
                        </div>

                        {/* Filtro por restaurante */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-500">Restaurante:</span>
                            <select
                                value={selectedRestaurantFilter}
                                onChange={e => setSelectedRestaurantFilter(e.target.value)}
                                className="text-xs p-2 rounded-xl border border-gray-200 bg-white font-medium"
                            >
                                <option value="all">Todos os Restaurantes</option>
                                {restaurantStaffGroups.map(g => (
                                    <option key={g.restaurantId} value={g.restaurantId.toString()}>
                                        {g.restaurantName} ({g.staff.length} membros)
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {restaurantStaffGroups
                            .filter(g => selectedRestaurantFilter === 'all' || g.restaurantId.toString() === selectedRestaurantFilter)
                            .map(group => (
                                <div key={group.restaurantId} className="border border-gray-200 rounded-2xl p-4 bg-gray-50/50">
                                    <div className="flex items-center justify-between mb-3 border-b pb-2">
                                        <h4 className="font-bold text-sm text-gray-800 flex items-center gap-2">
                                            <span>🏪</span>
                                            <span>{group.restaurantName}</span>
                                            <span className="text-xs font-normal text-gray-500">({group.staff.length} colaboradores)</span>
                                        </h4>
                                    </div>

                                    {group.staff.length === 0 ? (
                                        <p className="text-xs text-gray-400 italic py-2">
                                            Nenhum funcionário cadastrado nesta loja ainda.
                                        </p>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {group.staff.map(member => (
                                                <div key={member.id} className="p-3 bg-white rounded-xl border border-gray-100 shadow-xs flex flex-col justify-between gap-3">
                                                    <div>
                                                        <div className="flex items-center justify-between gap-1">
                                                            <p className="font-bold text-xs text-gray-800">{member.name}</p>
                                                            <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-black bg-gray-100 text-gray-600">
                                                                {member.role}
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] text-gray-500 truncate">{member.email}</p>
                                                    </div>

                                                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                                        <span className="text-[10px] text-gray-400 font-medium">Acesso Financeiro:</span>
                                                        <button
                                                            onClick={() => handleToggleRestaurantStaffFinancial(group.restaurantId, member.id)}
                                                            className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 transition-all ${
                                                                member.canAccessFinancial 
                                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                                                    : 'bg-red-50 text-red-700 border border-red-200'
                                                            }`}
                                                        >
                                                            {member.canAccessFinancial ? '🟢 Liberado' : '🔒 Bloqueado'}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {/* Modal: Cadastro / Edição de Usuário GuaráFood */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
                        <div className="flex justify-between items-center border-b pb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">👤</span>
                                <h3 className="text-lg font-black text-gray-800">
                                    {editingUser ? 'Editar Usuário da Plataforma' : 'Novo Usuário GuaráFood'}
                                </h3>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-sm"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveUser} className="space-y-4">
                            {/* Nome */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Nome Completo</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ex: Carlos Suporte GuaráFood"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                                />
                            </div>

                            {/* E-mail */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">E-mail de Login</label>
                                <input
                                    type="email"
                                    required
                                    placeholder="Ex: atendimento@guarafood.com.br"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                                />
                            </div>

                            {/* Senha */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    {editingUser ? 'Senha (deixe em branco para não alterar)' : 'Senha de Acesso (mínimo 6 dígitos)'}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Digite a senha"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full text-xs p-3 pr-10 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                                    >
                                        {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Cargo */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Cargo / Função na Plataforma</label>
                                <select
                                    value={role}
                                    onChange={e => setRole(e.target.value as any)}
                                    className="w-full text-xs p-3 rounded-xl border border-gray-200 font-medium bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                                >
                                    <option value="operator">Operador / Atendente da Plataforma (Recomendado)</option>
                                    <option value="admin">Administrador da Plataforma</option>
                                </select>
                            </div>

                            {/* Chave de Acesso Financeiro (Switch em Destaque) */}
                            <div className="p-4 rounded-2xl border border-orange-100 bg-orange-50/50 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                                            <span>💰</span>
                                            <span>Acesso à Parte Financeira do GuaráFood</span>
                                        </p>
                                        <p className="text-[11px] text-gray-500 mt-0.5">
                                            Permitir visualização de Relatórios de Vendas, Faturamento e Caixa
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setCanAccessFinancial(!canAccessFinancial)}
                                        className={`w-14 h-8 rounded-full p-1 transition-colors flex items-center ${
                                            canAccessFinancial ? 'bg-emerald-500 justify-end' : 'bg-gray-300 justify-start'
                                        }`}
                                    >
                                        <div className="w-6 h-6 rounded-full bg-white shadow-md"></div>
                                    </button>
                                </div>

                                <div className={`text-[11px] p-2 rounded-xl font-bold ${
                                    canAccessFinancial 
                                        ? 'bg-emerald-100 text-emerald-800' 
                                        : 'bg-red-100 text-red-800'
                                }`}>
                                    {canAccessFinancial ? (
                                        <span>✓ Acesso Liberado: Este usuário poderá visualizar relatórios financeiros completos.</span>
                                    ) : (
                                        <span>🔒 Acesso Bloqueado: Este usuário NÃO terá acesso a valores ou relatórios financeiros.</span>
                                    )}
                                </div>
                            </div>

                            {/* Botões do Modal */}
                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-orange-600 hover:bg-orange-700 text-white shadow-sm transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {isSaving ? 'Salvando...' : 'Salvar Usuário'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlatformUsersManagement;
