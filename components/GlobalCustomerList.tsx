
import React, { useState, useEffect, useMemo } from 'react';
import type { Order } from '../types';
import { fetchAllOrdersAdmin } from '../services/databaseService';
import Spinner from './Spinner';

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5(0) 105.196 5.196a7.5 7.5(0) 0010.607 10.607z" />
    </svg>
);

const WhatsAppIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01s-.521.074-.792.372c-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
    </svg>
);

const ExportIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
);

interface GlobalCustomerData {
    name: string;
    phone: string;
    totalOrders: number;
    totalSpent: number;
    lastOrderDate: Date;
    lastAddress: string;
    mostOrderedFrom: string;
    restaurantsSet: Set<string>;
}

const GlobalCustomerList: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const data = await fetchAllOrdersAdmin();
                setOrders(data);
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    const customers = useMemo(() => {
        const customerMap = orders.reduce((acc, order) => {
            const phone = order.customerPhone.replace(/\D/g, ''); 
            if (!phone) return acc;

            if (!acc[phone]) {
                acc[phone] = {
                    name: order.customerName,
                    phone: order.customerPhone,
                    totalOrders: 0,
                    totalSpent: 0,
                    lastOrderDate: new Date(order.timestamp),
                    lastAddress: order.customerAddress ? `${order.customerAddress.street}, ${order.customerAddress.number} - ${order.customerAddress.neighborhood}` : 'N/A',
                    mostOrderedFrom: order.restaurantName,
                    restaurantsSet: new Set([order.restaurantName]),
                    _restaurantCounts: { [order.restaurantName]: 1 }
                };
            } else {
                const c = acc[phone];
                c.restaurantsSet.add(order.restaurantName);
                c._restaurantCounts[order.restaurantName] = (c._restaurantCounts[order.restaurantName] || 0) + 1;
                
                const orderDate = new Date(order.timestamp);
                if (orderDate > c.lastOrderDate) {
                    c.lastOrderDate = orderDate;
                    c.name = order.customerName; 
                    if (order.customerAddress) {
                        c.lastAddress = `${order.customerAddress.street}, ${order.customerAddress.number} - ${order.customerAddress.neighborhood}`;
                    }
                }
            }

            const current = acc[phone];
            current.totalOrders += 1;
            if (order.status !== 'Cancelado') {
                current.totalSpent += Number(order.totalPrice || 0);
            }

            return acc;
        }, {} as Record<string, any>);

        Object.values(customerMap).forEach((c: any) => {
            const counts = c._restaurantCounts;
            c.mostOrderedFrom = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
        });

        return (Object.values(customerMap) as GlobalCustomerData[]).sort((a, b) => b.lastOrderDate.getTime() - a.lastOrderDate.getTime());
    }, [orders]);

    const filteredCustomers = useMemo(() => {
        if (!searchTerm) return customers;
        const lowerSearch = searchTerm.toLowerCase();
        return customers.filter(c => 
            c.name.toLowerCase().includes(lowerSearch) || 
            c.phone.includes(lowerSearch) ||
            c.mostOrderedFrom.toLowerCase().includes(lowerSearch)
        );
    }, [customers, searchTerm]);

    const handleExportCSV = () => {
        const headers = ["Nome", "Telefone", "Total Pedidos", "Total Gasto", "Ultimo Endereco", "Ultima Compra", "Restaurante Principal", "Lojas Frequentadas"];
        const csvContent = [
            headers.join(","),
            ...filteredCustomers.map(c => [
                `"${c.name}"`,
                `"${c.phone}"`,
                c.totalOrders,
                c.totalSpent.toFixed(2),
                `"${c.lastAddress}"`,
                c.lastOrderDate.toLocaleDateString(),
                `"${c.mostOrderedFrom}"`,
                `"${Array.from(c.restaurantsSet).join(' | ')}"`
            ].join(","))
        ].join("\n");

        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `clientes_guarafood_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleWhatsAppContact = (phone: string) => {
        // SMART LINK + REUSO DE ABA:
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const baseUrl = isMobile ? 'https://api.whatsapp.com/send' : 'https://web.whatsapp.com/send';
        
        const url = `${baseUrl}?phone=55${phone.replace(/\D/g, '')}`;
        // No desktop, o target fixo 'whatsapp_guarafood' reutiliza a janela se ela já existir
        window.open(url, isMobile ? '_blank' : 'whatsapp_guarafood');
    };

    if (isLoading) return <Spinner message="Compilando base de clientes..." />;

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Base Global de Clientes</h2>
                    <p className="text-sm text-gray-500 font-medium">Dados agregados de todos os restaurantes do sistema.</p>
                </div>
                <button 
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-all shadow-md active:scale-95 uppercase text-xs tracking-widest"
                >
                    <ExportIcon className="w-5 h-5" />
                    Exportar para Excel/CSV
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total de Clientes</p>
                    <p className="text-2xl font-black text-gray-800">{customers.length}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Volume Global</p>
                    <p className="text-2xl font-black text-green-600">R$ {customers.reduce((acc, c) => acc + c.totalSpent, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total de Pedidos</p>
                    <p className="text-2xl font-black text-blue-600">{orders.length}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ticket Médio</p>
                    <p className="text-2xl font-black text-orange-600">R$ {(orders.length > 0 ? (customers.reduce((acc, c) => acc + c.totalSpent, 0) / orders.length) : 0).toFixed(2)}</p>
                </div>
            </div>
            
            <div className="mb-6 relative">
                <input 
                    type="text" 
                    placeholder="Buscar por nome, telefone ou restaurante principal..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="w-full p-4 pl-12 border-2 border-gray-100 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition-all font-medium text-gray-700"
                />
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
            </div>

            <div className="overflow-x-auto -mx-6">
                <table className="w-full text-sm text-left text-gray-600">
                    <thead className="text-[10px] text-gray-700 uppercase bg-gray-50 font-black tracking-widest">
                        <tr>
                            <th className="px-6 py-4">Cliente</th>
                            <th className="px-6 py-4">Contato</th>
                            <th className="px-6 py-4">Restaurante Principal</th>
                            <th className="px-6 py-4 text-center">Frequência</th>
                            <th className="px-6 py-4 text-right">Valor Vitalício</th>
                            <th className="px-6 py-4">Última Atividade</th>
                            <th className="px-6 py-4 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredCustomers.length > 0 ? filteredCustomers.map((customer) => (
                            <tr key={customer.phone} className="bg-white hover:bg-orange-50/30 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-gray-900">{customer.name}</div>
                                    <div className="text-[10px] text-gray-400 truncate max-w-[200px]" title={customer.lastAddress}>
                                        {customer.lastAddress}
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-mono text-xs">{customer.phone}</td>
                                <td className="px-6 py-4">
                                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-[10px] font-bold">
                                        {customer.mostOrderedFrom}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="bg-blue-100 text-blue-800 text-xs font-black px-2.5 py-1 rounded-full">
                                        {customer.totalOrders}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="font-black text-emerald-600">R$ {customer.totalSpent.toFixed(2)}</div>
                                </td>
                                <td className="px-6 py-4 text-xs font-medium text-gray-500">
                                    {customer.lastOrderDate.toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <button 
                                        onClick={() => handleWhatsAppContact(customer.phone)} 
                                        className="text-green-600 hover:text-green-800 p-2 rounded-full hover:bg-green-50 transition-all active:scale-90"
                                        title="Marketing Direto"
                                    >
                                        <WhatsAppIcon className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={7} className="text-center py-20 text-gray-400">
                                    <p className="font-bold">Nenhum cliente encontrado na base.</p>
                                    <p className="text-xs">Tente ajustar sua busca ou aguarde novos pedidos.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default GlobalCustomerList;
