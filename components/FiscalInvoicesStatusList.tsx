import React, { useState, useEffect, useMemo } from 'react';
import { fetchFiscalOrdersAdmin, fetchRestaurantsSecure } from '../services/databaseService';
import { consultOrderFiscalSefaz } from '../services/orderService';
import type { Order, Restaurant } from '../types';
import { useNotification } from '../hooks/useNotification';
import Spinner from './Spinner';
import FiscalStatusIcon from './FiscalStatusIcon';

interface FiscalInvoiceItem {
    id: string;
    orderId: string;
    restaurantId: number;
    restaurantName: string;
    customerName: string;
    amount: number;
    status: 'Autorizada' | 'Pendente' | 'Rejeitada';
    protocol: string;
    key: string;
    issuedAt: string;
    errorMessage?: string;
    hasXmlUrl: boolean;
}

export const FiscalInvoicesStatusList: React.FC = () => {
    const { addToast } = useNotification();
    const [orders, setOrders] = useState<Order[]>([]);
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('all');
    const [checkingNoteId, setCheckingNoteId] = useState<string | null>(null);
    const [downloadingXmlId, setDownloadingXmlId] = useState<string | null>(null);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [ordersData, restData] = await Promise.all([
                fetchFiscalOrdersAdmin(),
                fetchRestaurantsSecure()
            ]);
            setOrders(ordersData);
            setRestaurants(restData);
        } catch (err) {
            console.error('Erro ao carregar pedidos para notas fiscais:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const handleRefresh = () => {
            loadData();
        };
        window.addEventListener('guarafood:update-orders', handleRefresh);
        return () => window.removeEventListener('guarafood:update-orders', handleRefresh);
    }, []);

    const invoices: FiscalInvoiceItem[] = useMemo(() => {
        const restMap = new Map(restaurants.map(r => [String(r.id), r.name]));

        const fiscalOrders = orders.filter(o => {
            const fiscalMeta = o.payment_details?.fiscal;
            const raw = o as any;
            return Boolean(
                o.fiscalStatus ||
                raw.fiscal_status ||
                o.fiscalKey ||
                raw.fiscal_key ||
                fiscalMeta?.status ||
                fiscalMeta?.chave
            );
        });

        return fiscalOrders.map((o) => {
            const fiscalMeta = o.payment_details?.fiscal;
            const raw = o as any;
            const rawStatus = String(o.fiscalStatus || raw.fiscal_status || fiscalMeta?.status || '').toLowerCase();
            const key = o.fiscalKey || raw.fiscal_key || fiscalMeta?.chave || '';
            const protocol = o.fiscalProtocol || fiscalMeta?.protocolo || (key ? key.substring(0, 15) : 'PENDENTE');
            const nfNumber = o.fiscalNumber || fiscalMeta?.numero || o.order_number || o.id.slice(-6).toUpperCase();
            const restName = restMap.get(String(o.restaurantId)) || o.restaurantName || 'Restaurante';

            let status: 'Autorizada' | 'Pendente' | 'Rejeitada' = 'Pendente';
            if (rawStatus === 'rejeitado' || rawStatus === 'erro_autorizacao' || rawStatus === 'cancelado') {
                status = 'Rejeitada';
            } else if (rawStatus === 'processando') {
                status = 'Pendente';
            } else if (rawStatus === 'autorizado' || Boolean(key)) {
                status = 'Autorizada';
            }

            return {
                id: `NFCe-${nfNumber}`,
                orderId: o.id,
                restaurantId: Number(o.restaurantId),
                restaurantName: restName,
                customerName: o.customerName || 'Cliente GuaraFood',
                amount: Number(o.totalPrice || raw.total || 0),
                status,
                protocol,
                key,
                issuedAt: o.timestamp || new Date().toISOString(),
                errorMessage: o.fiscalMessage || raw.fiscal_error || fiscalMeta?.mensagem || undefined,
                hasXmlUrl: Boolean(o.fiscalXmlUrl || raw.fiscal_xml_url || fiscalMeta?.xml_url),
            };
        });
    }, [orders, restaurants]);

    const filteredInvoices = useMemo(() => {
        return invoices.filter(inv => {
            if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
            if (selectedRestaurantId !== 'all' && inv.restaurantName.toLowerCase() !== selectedRestaurantId.toLowerCase()) return false;
            if (searchQuery.trim() !== '') {
                const q = searchQuery.toLowerCase();
                return (
                    inv.id.toLowerCase().includes(q) ||
                    inv.orderId.toLowerCase().includes(q) ||
                    inv.customerName.toLowerCase().includes(q) ||
                    inv.key.toLowerCase().includes(q) ||
                    inv.restaurantName.toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [invoices, statusFilter, selectedRestaurantId, searchQuery]);

    const handleQuerySefazStatus = async (inv: FiscalInvoiceItem) => {
        setCheckingNoteId(inv.id);
        try {
            const res = await consultOrderFiscalSefaz(inv.orderId, inv.restaurantId);
            if (res.success) {
                addToast({
                    message: `${inv.id} consultada na Focus NFe: ${res.fiscalMessage || res.fiscalStatus}`,
                    type: 'success',
                });
                await loadData();
            } else {
                addToast({
                    message: res.fiscalMessage || `Erro ao consultar ${inv.id} na Focus NFe.`,
                    type: 'warning',
                });
            }
        } catch (err: any) {
            addToast({ message: err?.message || 'Erro ao consultar status na API da Focus NFe.', type: 'error' });
        } finally {
            setCheckingNoteId(null);
        }
    };

    const handleDownloadOfficialXml = async (inv: FiscalInvoiceItem) => {
        setDownloadingXmlId(inv.id);
        try {
            const resp = await fetch(`/api/fiscal/download-xml?orderId=${encodeURIComponent(inv.orderId)}`);
            if (!resp.ok) {
                const errJson = await resp.json().catch(() => ({}));
                throw new Error(errJson?.error || `XML oficial indisponível (HTTP ${resp.status}).`);
            }
            const xmlText = await resp.text();
            const blob = new Blob([xmlText], { type: 'application/xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `NFe${inv.key || inv.orderId}.xml`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            addToast({ message: `Download do XML oficial da ${inv.id} concluído!`, type: 'success' });
        } catch (err: any) {
            addToast({ message: err?.message || 'Erro ao baixar XML oficial da Focus NFe.', type: 'warning' });
        } finally {
            setDownloadingXmlId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-48">
                <Spinner />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-6">
            {/* Header and Filters */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-gray-100">
                <div>
                    <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                        <span>📋</span>
                        <span>Monitoramento de Notas Fiscais (Focus NFe / SEFAZ)</span>
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Acompanhe em tempo real o status de processamento de todas as NFC-e emitidas pela Focus NFe.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="flex rounded-xl bg-gray-100 p-1">
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === 'all' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600'}`}
                        >
                            Todas ({invoices.length})
                        </button>
                        <button
                            onClick={() => setStatusFilter('Autorizada')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === 'Autorizada' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-600'}`}
                        >
                            Autorizadas
                        </button>
                        <button
                            onClick={() => setStatusFilter('Pendente')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === 'Pendente' ? 'bg-white shadow-sm text-amber-600' : 'text-gray-600'}`}
                        >
                            Pendentes
                        </button>
                        <button
                            onClick={() => setStatusFilter('Rejeitada')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === 'Rejeitada' ? 'bg-white shadow-sm text-red-600' : 'text-gray-600'}`}
                        >
                            Rejeitadas
                        </button>
                    </div>

                    <select
                        value={selectedRestaurantId}
                        onChange={(e) => setSelectedRestaurantId(e.target.value)}
                        className="bg-gray-50 border border-gray-200 text-gray-800 text-xs font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">Todos os Restaurantes</option>
                        {restaurants.map(r => (
                            <option key={r.id} value={r.name}>{r.name}</option>
                        ))}
                    </select>

                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por ID, cliente, chave..."
                        className="bg-gray-50 border border-gray-200 text-gray-900 text-xs font-semibold rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-60"
                    />

                    <button
                        type="button"
                        onClick={loadData}
                        className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-black transition-all cursor-pointer"
                        title="Atualizar lista de notas fiscais"
                    >
                        🔄 Atualizar
                    </button>
                </div>
            </div>

            {/* Invoices Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-gray-100 text-[11px] font-black uppercase text-gray-400 tracking-wider">
                            <th className="py-3 px-4">Nota / Pedido</th>
                            <th className="py-3 px-4">Restaurante</th>
                            <th className="py-3 px-4">Cliente</th>
                            <th className="py-3 px-4">Valor</th>
                            <th className="py-3 px-4">Status SEFAZ</th>
                            <th className="py-3 px-4">Chave de Acesso / Protocolo</th>
                            <th className="py-3 px-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-xs">
                        {filteredInvoices.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center py-12 text-gray-400 font-semibold">
                                    Nenhuma nota fiscal encontrada com os filtros selecionados.
                                </td>
                            </tr>
                        ) : (
                            filteredInvoices.map((inv) => (
                                <tr key={inv.id} className="hover:bg-gray-50/80 transition-colors">
                                    <td className="py-3.5 px-4">
                                        <div className="flex items-center gap-2">
                                            <FiscalStatusIcon
                                                isEmitted={inv.status === 'Autorizada'}
                                                tooltip={`${inv.status}${inv.errorMessage ? ` — ${inv.errorMessage}` : ''}`}
                                                size="sm"
                                            />
                                            <div>
                                                <div className="font-black text-gray-900">{inv.id}</div>
                                                <div className="text-[10px] text-gray-400">Pedido #{inv.orderId.slice(-6)}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3.5 px-4">
                                        <span className="font-bold text-gray-800">{inv.restaurantName}</span>
                                    </td>
                                    <td className="py-3.5 px-4 font-semibold text-gray-700">
                                        {inv.customerName}
                                    </td>
                                    <td className="py-3.5 px-4 font-black text-gray-900">
                                        R$ {inv.amount.toFixed(2)}
                                    </td>
                                    <td className="py-3.5 px-4">
                                        {inv.status === 'Autorizada' && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                Autorizada
                                            </span>
                                        )}
                                        {inv.status === 'Pendente' && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                                Pendente
                                            </span>
                                        )}
                                        {inv.status === 'Rejeitada' && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-red-100 text-red-800 border border-red-200" title={inv.errorMessage}>
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                                Rejeitada
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-3.5 px-4">
                                        <div className="font-mono text-[10px] text-gray-600 truncate max-w-[200px]" title={inv.key}>
                                            {inv.key || 'Sem chave'}
                                        </div>
                                        <div className="text-[10px] text-gray-400 font-mono">Prot: {inv.protocol}</div>
                                        {inv.errorMessage && (
                                            <div className="text-[10px] text-red-600 font-semibold mt-0.5 max-w-[240px] truncate" title={inv.errorMessage}>
                                                ⚠️ {inv.errorMessage}
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-3.5 px-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleQuerySefazStatus(inv)}
                                                disabled={checkingNoteId === inv.id}
                                                className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-[10px] transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                                title="Consultar status atualizado na Focus NFe"
                                            >
                                                <span>{checkingNoteId === inv.id ? '⏳' : '🔄'}</span>
                                                <span>{checkingNoteId === inv.id ? 'Consultando...' : 'Consultar'}</span>
                                            </button>
                                            <button
                                                onClick={() => handleDownloadOfficialXml(inv)}
                                                disabled={downloadingXmlId === inv.id}
                                                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold text-[10px] transition-all cursor-pointer disabled:opacity-50"
                                                title={inv.hasXmlUrl ? 'Baixar XML oficial da Focus NFe' : 'Consultar XML oficial'}
                                            >
                                                {downloadingXmlId === inv.id ? '⏳...' : '📥 XML'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FiscalInvoicesStatusList;
