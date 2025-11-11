
import React, { useState, useEffect, useMemo } from 'react';
import { subscribeToOrders } from '../services/orderService';
import { useAuth } from '../services/authService';
import type { Order } from '../types';
import OrderDetailsModal from './OrderDetailsModal';
import SalesDashboard from './SalesDashboard';
import RestaurantManagement from './RestaurantManagement';


// Re-usable Icons
const ArrowLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);
const LogoutIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
);

const OrdersView: React.FC = () => {
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof Order | 'restaurantName' | 'customerName', direction: 'ascending' | 'descending' } | null>({ key: 'timestamp', direction: 'descending' });
    
    useEffect(() => {
        // FIX: The subscribeToOrders function was updated to make restaurantId optional. This call is now correct.
        const unsubscribe = subscribeToOrders(setAllOrders);
        return () => unsubscribe();
    }, []);

    const filteredOrders = useMemo(() => {
        if (!searchTerm.trim()) return allOrders;
        const lowercasedFilter = searchTerm.toLowerCase();
        return allOrders.filter(order =>
            order.restaurantName.toLowerCase().includes(lowercasedFilter) ||
            order.customerName.toLowerCase().includes(lowercasedFilter) ||
            order.id.substring(0, 6).toLowerCase().includes(lowercasedFilter)
        );
    }, [allOrders, searchTerm]);

    const sortedOrders = useMemo(() => {
        let sortableItems = [...filteredOrders];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key as keyof Order];
                const bValue = b[sortConfig.key as keyof Order];

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [filteredOrders, sortConfig]);

    const requestSort = (key: keyof Order | 'restaurantName' | 'customerName') => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: keyof Order | 'restaurantName' | 'customerName') => {
        if (!sortConfig || sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? '▲' : '▼';
    };

    const headers: { key: keyof Order | 'restaurantName' | 'customerName', label: string }[] = [
        { key: 'id', label: 'ID Pedido' },
        { key: 'restaurantName', label: 'Restaurante' },
        { key: 'customerName', label: 'Cliente' },
        { key: 'totalPrice', label: 'Total' },
        { key: 'status', label: 'Status' },
        { key: 'timestamp', label: 'Data' },
    ];
    
    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 border-b">
                 <input
                    type="text"
                    placeholder="Buscar por restaurante, cliente ou ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-2 pl-8 border rounded-full bg-gray-50 focus:ring-2 focus:ring-orange-400 focus:outline-none"
                />
            </div>
            <div className="overflow-auto max-h-[calc(100vh-250px)]">
                <table className="w-full text-sm text-left text-gray-600">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100 sticky top-0 z-10">
                        <tr>
                            {headers.map(header => (
                                <th key={header.key} scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort(header.key)}>
                                    {header.label} {getSortIndicator(header.key)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedOrders.map(order => (
                            <tr
                                key={order.id}
                                className="border-b odd:bg-white even:bg-gray-50 hover:bg-orange-50 cursor-pointer"
                                onClick={() => setSelectedOrder(order)}
                            >
                                <td className="px-6 py-4 font-mono text-gray-800">#{order.id.substring(0, 6)}</td>
                                <td className="px-6 py-4 font-semibold">{order.restaurantName}</td>
                                <td className="px-6 py-4">{order.customerName}</td>
                                <td className="px-6 py-4 font-semibold">R$ {order.totalPrice.toFixed(2)}</td>
                                <td className="px-6 py-4">{order.status}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{new Date(order.timestamp).toLocaleString('pt-BR')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {sortedOrders.length === 0 && (
                    <p className="text-center text-gray-500 py-8">Nenhum pedido encontrado.</p>
                )}
            </div>
            {selectedOrder && <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
        </div>
    );
};

const AdminDashboard: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { logout } = useAuth();
    const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'restaurants'>('overview');

    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                return <OrdersView />;
            case 'sales':
                return <SalesDashboard />;
            case 'restaurants':
                return <RestaurantManagement />;
            default:
                return null;
        }
    };

    return (
        <div className="w-full min-h-screen bg-gray-50">
             <header className="p-4 sticky top-0 bg-gray-50 z-20 border-b">
                <div className="flex justify-between items-center gap-4">
                    <div className="flex items-center space-x-4">
                        <button onClick={onBack} className="bg-white rounded-full p-2 shadow-md hover:bg-gray-100 transition-colors flex-shrink-0">
                            <ArrowLeftIcon className="w-6 h-6 text-gray-800"/>
                        </button>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Painel do Administrador</h1>
                    </div>
                     <button onClick={logout} className="flex items-center space-x-2 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors font-semibold" title="Sair">
                        <LogoutIcon className="w-6 h-6" />
                        <span className="hidden sm:inline">Sair</span>
                    </button>
                </div>
            </header>
            
            <nav className="p-4 border-b bg-gray-50 sticky top-[89px] z-10">
                <div className="flex space-x-2 rounded-lg bg-gray-200 p-1">
                    <button 
                        onClick={() => setActiveTab('overview')}
                        className={`w-full text-center font-semibold p-2 rounded-md transition-colors ${activeTab === 'overview' ? 'bg-white shadow text-orange-600' : 'text-gray-600'}`}
                    >
                        Visão Geral
                    </button>
                     <button 
                        onClick={() => setActiveTab('sales')}
                        className={`w-full text-center font-semibold p-2 rounded-md transition-colors ${activeTab === 'sales' ? 'bg-white shadow text-orange-600' : 'text-gray-600'}`}
                    >
                        Vendas
                    </button>
                    <button 
                        onClick={() => setActiveTab('restaurants')}
                        className={`w-full text-center font-semibold p-2 rounded-md transition-colors ${activeTab === 'restaurants' ? 'bg-white shadow text-orange-600' : 'text-gray-600'}`}
                    >
                        Restaurantes
                    </button>
                </div>
            </nav>
            
            <main className="p-4">
                {renderContent()}
            </main>
        </div>
    );
};

export default AdminDashboard;