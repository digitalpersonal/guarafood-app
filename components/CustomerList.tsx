
import React, { useMemo, useState } from 'react';
import type { Order } from '../types';

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
);

const WhatsAppIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01s-.521.074-.792.372c-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
    </svg>
);

interface CustomerListProps {
    orders: Order[];
}

interface CustomerData {
    name: string;
    phone: string;
    totalOrders: number;
    totalSpent: number;
    lastOrderDate: Date;
    address: string;
}

const CustomerList: React.FC<CustomerListProps> = ({ orders }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const customers = useMemo(() => {
        const customerMap = orders.reduce((acc, order) => {
            const phone = order.customerPhone.replace(/\D/g, ''); // Normalize phone as ID
            if (!phone) return acc;

            if (!acc[phone]) {
                acc[phone] = {
                    name: order.customerName,
                    phone: order.customerPhone,
                    totalOrders: 0,
                    totalSpent: 0,
                    lastOrderDate: new Date(order.timestamp),
                    address: order.customerAddress ? `${order.customerAddress.street}, ${order.customerAddress.number} - ${order.customerAddress.neighborhood}` : 'N/A'
                };
            }

            const current = acc[phone];
            current.totalOrders += 1;
            // Only count valid orders for spent amount
            if (order.status !== 'Cancelado') {
                current.totalSpent += order.totalPrice;
            }
            
            const orderDate = new Date(order.timestamp);
            if (orderDate > current.lastOrderDate) {
                current.lastOrderDate = orderDate;
            }

            return acc;
        }, {} as Record<string, CustomerData>);

        return (Object.values(customerMap) as CustomerData[]).sort((a, b) => b.lastOrderDate.getTime() - a.lastOrderDate.getTime());
    }, [orders]);

    const filteredCustomers = useMemo(() => {
        if (!searchTerm) return customers;
        const lowerSearch = searchTerm.toLowerCase();
        return customers.filter(c => 
            c.name.toLowerCase().includes(lowerSearch) || 
            c.phone.includes(lowerSearch)
        );
    }, [customers, searchTerm]);

    const handleWhatsApp = (phone: string) => {
        // FIX: Using official API endpoint for better reliability in native apps detection
        const url = `https://api.whatsapp.com/send?phone=55${phone.replace(/\D/g, '')}`;
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.click();
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Base de Clientes ({customers.length})</h2>
            
            <div className="mb-4 relative">
                <input 
                    type="text" 
                    placeholder="Buscar cliente por nome ou telefone..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="w-full p-3 pl-10 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-orange-400 focus:outline-none"
                />
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-600">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                        <tr>
                            <th className="px-6 py-3">Cliente</th>
                            <th className="px-6 py-3">Contato</th>
                            <th className="px-6 py-3">Endereço (Último)</th>
                            <th className="px-6 py-3 text-center">Pedidos</th>
                            <th className="px-6 py-3 text-right">Total Gasto</th>
                            <th className="px-6 py-3">Última Compra</th>
                            <th className="px-6 py-3 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCustomers.length > 0 ? filteredCustomers.map((customer) => (
                            <tr key={customer.phone} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4 font-bold text-gray-900">{customer.name}</td>
                                <td className="px-6 py-4">{customer.phone}</td>
                                <td className="px-6 py-4 truncate max-w-xs" title={customer.address}>{customer.address}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full">{customer.totalOrders}</span>
                                </td>
                                <td className="px-6 py-4 text-right font-bold text-green-600">R$ {customer.totalSpent.toFixed(2)}</td>
                                <td className="px-6 py-4">{customer.lastOrderDate.toLocaleDateString()}</td>
                                <td className="px-6 py-4 text-center">
                                    <button 
                                        onClick={() => handleWhatsApp(customer.phone)} 
                                        className="text-green-600 hover:text-green-800 p-2 rounded-full hover:bg-green-50 transition-colors"
                                        title="Abrir WhatsApp"
                                    >
                                        <WhatsAppIcon className="w-6 h-6" />
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={7} className="text-center py-8 text-gray-400">Nenhum cliente encontrado.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CustomerList;
