import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Order, Restaurant } from '../types';
import { useAuth } from '../services/authService';
import { useNotification } from '../hooks/useNotification';
import {
    fetchOrdersByMonth,
    emitOrderFiscalToSefaz,
    updateOrderCustomerDocument,
} from '../services/orderService';
import { updateRestaurant } from '../services/databaseService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import FiscalInvoiceViewModal from './FiscalInvoiceViewModal';
import FiscalDocumentModal from './FiscalDocumentModal';
import Spinner from './Spinner';

interface AccountantFiscalViewProps {
    restaurant: Restaurant | null;
    onUpdateRestaurant?: (updated: Restaurant) => void;
}

type FiscalCategory = 'emitted' | 'pending' | 'processing' | 'error' | 'ignored';
type FilterMode = 'all' | 'pending' | 'emitted' | 'issues' | 'ignored';

const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const getFiscalCategory = (order: Order): FiscalCategory => {
    if (order.status === 'Cancelado' || order.status === 'Aguardando Pagamento') {
        return 'ignored';
    }
    if (order.fiscalStatus === 'erro_autorizacao' || order.fiscalStatus === 'rejeitado') {
        return 'error';
    }
    if (order.fiscalStatus === 'processando') {
        return 'processing';
    }
    if (order.fiscalStatus === 'autorizado' || Boolean(order.fiscalKey)) {
        return 'emitted';
    }
    return 'pending';
};

const formatOrderNumber = (order: Order): string => {
    return order.order_number
        ? `#${String(order.order_number).padStart(3, '0')}`
        : `#${order.id.substring(Math.max(0, order.id.length - 4)).toUpperCase()}`;
};

const escapeXml = (unsafe: string): string => {
    if (!unsafe) return '';
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
};

const AccountantFiscalView: React.FC<AccountantFiscalViewProps> = ({ restaurant, onUpdateRestaurant }) => {
    const { currentUser } = useAuth();
    const { addToast, confirm } = useNotification();

    const now = useMemo(() => new Date(), []);
    const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth()); // 0..11

    const [monthlyOrders, setMonthlyOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [filterMode, setFilterMode] = useState<FilterMode>('all');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const [isBatchSending, setIsBatchSending] = useState<boolean>(false);
    const [batchProgress, setBatchProgress] = useState<{
        current: number;
        total: number;
        currentLabel: string;
        successCount: number;
        errorCount: number;
    } | null>(null);
    const [sendingSingleId, setSendingSingleId] = useState<string | null>(null);

    const [orderForFiscalView, setOrderForFiscalView] = useState<Order | null>(null);
    const [orderForCpfEdit, setOrderForCpfEdit] = useState<Order | null>(null);

    const restaurantId = currentUser?.restaurantId || restaurant?.id;

    const [taxRateInput, setTaxRateInput] = useState<string>(() => {
        if (restaurant?.fiscalTaxRate !== undefined && restaurant?.fiscalTaxRate !== null) {
            return String(restaurant.fiscalTaxRate);
        }
        try {
            if (restaurantId) {
                const cached = localStorage.getItem(`guarafood-fiscal-tax-rate-${restaurantId}`);
                if (cached !== null && cached !== '') return cached;
            }
        } catch {}
        return '6';
    });
    const [isSavingTaxRate, setIsSavingTaxRate] = useState<boolean>(false);

    useEffect(() => {
        if (restaurant?.fiscalTaxRate !== undefined && restaurant?.fiscalTaxRate !== null) {
            setTaxRateInput(String(restaurant.fiscalTaxRate));
        }
    }, [restaurant?.fiscalTaxRate]);

    const loadMonthlyOrders = useCallback(async () => {
        if (!restaurantId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const list = await fetchOrdersByMonth(restaurantId, selectedYear, selectedMonth);
            setMonthlyOrders(list);
            setSelectedIds(new Set());
        } catch (err: any) {
            addToast({
                message: `Erro ao carregar pedidos do mês: ${err?.message || 'Tente novamente.'}`,
                type: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    }, [restaurantId, selectedYear, selectedMonth, addToast]);

    useEffect(() => {
        loadMonthlyOrders();
    }, [loadMonthlyOrders]);

    const handlePrevMonth = () => {
        if (isBatchSending) return;
        if (selectedMonth === 0) {
            setSelectedMonth(11);
            setSelectedYear(y => y - 1);
        } else {
            setSelectedMonth(m => m - 1);
        }
    };

    const handleNextMonth = () => {
        if (isBatchSending) return;
        if (selectedMonth === 11) {
            setSelectedMonth(0);
            setSelectedYear(y => y + 1);
        } else {
            setSelectedMonth(m => m + 1);
        }
    };

    const handleMonthInputChange = (value: string) => {
        if (isBatchSending || !value) return;
        const [yearStr, monthStr] = value.split('-');
        const y = parseInt(yearStr, 10);
        const m = parseInt(monthStr, 10) - 1;
        if (!isNaN(y) && !isNaN(m) && m >= 0 && m <= 11) {
            setSelectedYear(y);
            setSelectedMonth(m);
        }
    };

    const monthInputValue = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
    const monthLabel = `${MONTH_NAMES[selectedMonth]} / ${selectedYear}`;

    const stats = useMemo(() => {
        let validCount = 0;
        let validTotal = 0;
        let emittedCount = 0;
        let emittedTotal = 0;
        let pendingCount = 0;
        let pendingTotal = 0;
        let issuesCount = 0;
        let ignoredCount = 0;

        for (const order of monthlyOrders) {
            const cat = getFiscalCategory(order);
            const total = Number(order.totalPrice || 0);
            if (cat === 'ignored') {
                ignoredCount++;
                continue;
            }
            validCount++;
            validTotal += total;
            if (cat === 'emitted') {
                emittedCount++;
                emittedTotal += total;
            } else if (cat === 'pending') {
                pendingCount++;
                pendingTotal += total;
            } else {
                issuesCount++;
                if (cat === 'error') {
                    pendingTotal += total;
                }
            }
        }

        return {
            validCount,
            validTotal,
            emittedCount,
            emittedTotal,
            pendingCount,
            pendingTotal,
            issuesCount,
            ignoredCount,
        };
    }, [monthlyOrders]);

    const filteredOrders = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        return monthlyOrders.filter(order => {
            const cat = getFiscalCategory(order);
            if (filterMode === 'pending' && cat !== 'pending' && cat !== 'error') return false;
            if (filterMode === 'emitted' && cat !== 'emitted') return false;
            if (filterMode === 'issues' && cat !== 'error' && cat !== 'processing') return false;
            if (filterMode === 'ignored' && cat !== 'ignored') return false;

            if (!q) return true;
            const numStr = formatOrderNumber(order).toLowerCase();
            return (
                numStr.includes(q) ||
                order.id.toLowerCase().includes(q) ||
                (order.customerName || '').toLowerCase().includes(q) ||
                (order.customerDocument || '').toLowerCase().includes(q) ||
                (order.paymentMethod || '').toLowerCase().includes(q) ||
                (order.fiscalKey || '').toLowerCase().includes(q)
            );
        });
    }, [monthlyOrders, filterMode, searchTerm]);

    const eligibleFilteredOrders = useMemo(() => {
        return filteredOrders.filter(o => {
            const cat = getFiscalCategory(o);
            return cat === 'pending' || cat === 'error';
        });
    }, [filteredOrders]);

    const selectedOrders = useMemo(() => {
        return monthlyOrders.filter(o => {
            if (!selectedIds.has(o.id)) return false;
            const cat = getFiscalCategory(o);
            return cat === 'pending' || cat === 'error';
        });
    }, [monthlyOrders, selectedIds]);

    const selectedTotalAmount = useMemo(() => {
        return selectedOrders.reduce((acc, o) => acc + Number(o.totalPrice || 0), 0);
    }, [selectedOrders]);

    const parsedTaxRate = useMemo(() => {
        const clean = parseFloat(String(taxRateInput || '0').replace(',', '.'));
        if (isNaN(clean)) return 0;
        return Math.max(0, Math.min(100, clean));
    }, [taxRateInput]);

    const taxOnEmitted = useMemo(() => stats.emittedTotal * (parsedTaxRate / 100), [stats.emittedTotal, parsedTaxRate]);
    const taxOnSelected = useMemo(() => selectedTotalAmount * (parsedTaxRate / 100), [selectedTotalAmount, parsedTaxRate]);
    const projectedTotalTax = taxOnEmitted + taxOnSelected;

    const filteredSummary = useMemo(() => {
        let totalAmount = 0;
        let validAmount = 0;
        let emittedCount = 0;
        let emittedAmount = 0;
        let pendingCount = 0;
        let pendingAmount = 0;

        for (const o of filteredOrders) {
            const val = Number(o.totalPrice || 0);
            totalAmount += val;
            const cat = getFiscalCategory(o);
            if (cat === 'ignored') continue;
            validAmount += val;
            if (cat === 'emitted') {
                emittedCount++;
                emittedAmount += val;
            } else if (cat === 'pending' || cat === 'error') {
                pendingCount++;
                pendingAmount += val;
            }
        }

        return {
            count: filteredOrders.length,
            totalAmount,
            validAmount,
            emittedCount,
            emittedAmount,
            pendingCount,
            pendingAmount,
            taxOnEmittedFiltered: emittedAmount * (parsedTaxRate / 100),
            taxOnValidFiltered: validAmount * (parsedTaxRate / 100),
        };
    }, [filteredOrders, parsedTaxRate]);

    const handleSaveTaxRate = async (overrideRate?: number) => {
        if (!restaurantId) return;
        const rateToSave = overrideRate !== undefined ? overrideRate : parsedTaxRate;
        if (overrideRate !== undefined) {
            setTaxRateInput(String(overrideRate));
        }
        setIsSavingTaxRate(true);
        try {
            const updated = await updateRestaurant(restaurantId, { fiscalTaxRate: rateToSave });
            onUpdateRestaurant?.(updated);
            addToast({
                message: `Alíquota predefinida salva em ${rateToSave.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%!`,
                type: 'success',
            });
        } catch (err: any) {
            addToast({
                message: `Erro ao salvar alíquota: ${err?.message || 'Tente novamente.'}`,
                type: 'error',
            });
        } finally {
            setIsSavingTaxRate(false);
        }
    };

    const allEligibleFilteredSelected =
        eligibleFilteredOrders.length > 0 &&
        eligibleFilteredOrders.every(o => selectedIds.has(o.id));

    const toggleOrderSelection = (orderId: string) => {
        if (isBatchSending) return;
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(orderId)) {
                next.delete(orderId);
            } else {
                next.add(orderId);
            }
            return next;
        });
    };

    const handleToggleSelectAllPending = () => {
        if (isBatchSending || eligibleFilteredOrders.length === 0) return;
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (allEligibleFilteredSelected) {
                eligibleFilteredOrders.forEach(o => next.delete(o.id));
            } else {
                eligibleFilteredOrders.forEach(o => next.add(o.id));
            }
            return next;
        });
    };

    const handleSelectMarkedAtCashier = () => {
        if (isBatchSending) return;
        const markedPending = monthlyOrders.filter(o => {
            const cat = getFiscalCategory(o);
            return Boolean(o.fiscalExport) && (cat === 'pending' || cat === 'error');
        });
        if (markedPending.length === 0) {
            addToast({
                message: 'Não há pedidos pendentes marcados com "NF: Sim" no caixa neste mês.',
                type: 'info',
            });
            return;
        }
        setSelectedIds(new Set(markedPending.map(o => o.id)));
        addToast({
            message: `${markedPending.length} ${markedPending.length === 1 ? 'pedido marcado' : 'pedidos marcados'} no caixa selecionado(s)!`,
            type: 'success',
        });
    };

    const applyEmissionResultToState = (orderId: string, res: Awaited<ReturnType<typeof emitOrderFiscalToSefaz>>) => {
        setMonthlyOrders(prev =>
            prev.map(o =>
                o.id === orderId
                    ? {
                          ...o,
                          fiscalStatus: res.fiscalStatus,
                          fiscalKey: res.fiscalKey || o.fiscalKey,
                          fiscalNumber: res.fiscalNumber || o.fiscalNumber,
                          fiscalProtocol: res.fiscalProtocol || o.fiscalProtocol,
                          fiscalDanfeUrl: res.fiscalDanfeUrl || o.fiscalDanfeUrl,
                          fiscalXmlUrl: res.fiscalXmlUrl || o.fiscalXmlUrl,
                          fiscalMessage: res.fiscalMessage || o.fiscalMessage,
                          fiscalExport: res.success ? true : o.fiscalExport,
                      }
                    : o
            )
        );
    };

    const handleSendBatchToSefaz = async () => {
        if (selectedOrders.length === 0 || isBatchSending) return;

        const totalFormatted = selectedTotalAmount.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

        const confirmed = await confirm({
            title: 'Enviar Notas Fiscais em Lote para SEFAZ',
            message: `Deseja transmitir ${selectedOrders.length} ${selectedOrders.length === 1 ? 'pedido selecionado' : 'pedidos selecionados'} (Total: R$ ${totalFormatted}) diretamente para a SEFAZ sem imprimir cupons?`,
            confirmText: `Enviar ${selectedOrders.length} para SEFAZ`,
            cancelText: 'Cancelar',
        });

        if (!confirmed) return;

        setIsBatchSending(true);
        let successCount = 0;
        let errorCount = 0;

        setBatchProgress({
            current: 0,
            total: selectedOrders.length,
            currentLabel: formatOrderNumber(selectedOrders[0]),
            successCount: 0,
            errorCount: 0,
        });

        for (let i = 0; i < selectedOrders.length; i++) {
            const target = selectedOrders[i];
            setBatchProgress({
                current: i + 1,
                total: selectedOrders.length,
                currentLabel: formatOrderNumber(target),
                successCount,
                errorCount,
            });

            const res = await emitOrderFiscalToSefaz(target, restaurant);
            applyEmissionResultToState(target.id, res);

            if (res.success) {
                successCount++;
                setSelectedIds(prev => {
                    const next = new Set(prev);
                    next.delete(target.id);
                    return next;
                });
            } else {
                errorCount++;
            }
        }

        setIsBatchSending(false);
        setBatchProgress(null);

        if (errorCount === 0) {
            addToast({
                message: `✅ ${successCount} ${successCount === 1 ? 'nota fiscal enviada' : 'notas fiscais enviadas'} para a SEFAZ com sucesso!`,
                type: 'success',
            });
        } else {
            addToast({
                message: `Lote finalizado: ${successCount} enviada(s) com sucesso e ${errorCount} com erro/rejeição.`,
                type: 'warning',
            });
        }
    };

    const handleSendSingleToSefaz = async (order: Order) => {
        if (isBatchSending || sendingSingleId) return;
        setSendingSingleId(order.id);
        try {
            const res = await emitOrderFiscalToSefaz(order, restaurant);
            applyEmissionResultToState(order.id, res);
            if (res.success) {
                setSelectedIds(prev => {
                    const next = new Set(prev);
                    next.delete(order.id);
                    return next;
                });
                addToast({
                    message: `✅ Pedido ${formatOrderNumber(order)} enviado para a SEFAZ!`,
                    type: 'success',
                });
            } else {
                addToast({
                    message: `⚠️ Erro no pedido ${formatOrderNumber(order)}: ${res.fiscalMessage || 'Falha na SEFAZ'}`,
                    type: 'error',
                });
            }
        } finally {
            setSendingSingleId(null);
        }
    };

    const handleExportEmittedXmlBatch = () => {
        const emittedOrders = monthlyOrders.filter(o => getFiscalCategory(o) === 'emitted');
        if (emittedOrders.length === 0) {
            addToast({
                message: `Nenhuma nota fiscal emitida encontrada em ${monthLabel}.`,
                type: 'warning',
            });
            return;
        }

        const emitCnpj = (restaurant?.cnpj || '00.000.000/0001-00').replace(/\D/g, '').padEnd(14, '0');
        const emitIe = (restaurant?.ie || 'ISENTO').replace(/\D/g, '') || 'ISENTO';
        const emitName = escapeXml(restaurant?.name || 'ESTABELECIMENTO COMERCIAL');
        const tpAmb = restaurant?.fiscalEnv === 'producao' ? '1' : '2';

        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<loteContabilNFCe periodo="${monthInputValue}" quantidade="${emittedOrders.length}" geradoEm="${new Date().toISOString()}">\n`;

        emittedOrders.forEach(order => {
            const dateObj = order.timestamp ? new Date(order.timestamp) : new Date();
            const orderNum = order.order_number || parseInt(order.id.replace(/\D/g, '').slice(-6) || '1042', 10);
            const numNfFormatted = String(orderNum).padStart(9, '0');
            const yy = String(dateObj.getFullYear()).slice(-2);
            const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
            const accessKey = order.fiscalKey || `31${yy}${mm}${emitCnpj}65001${numNfFormatted}198273641`;
            const protocolNumber = order.fiscalProtocol || `1312${yy}${String(Math.abs(orderNum * 987654321) % 89999999 + 10000000)}`;
            const subtotal = Number(order.subtotal) > 0
                ? Number(order.subtotal)
                : (order.items || []).reduce((acc, it) => acc + Number(it.price || 0) * Number(it.quantity || 1), 0);
            const total = Number(order.totalPrice) > 0
                ? Number(order.totalPrice)
                : subtotal + Number(order.deliveryFee || 0) - Number(order.discountAmount || 0);
            const approxTaxes = total * 0.1345;
            const pmLower = (order.paymentMethod || '').toLowerCase();
            const tPag = pmLower.includes('pix') ? '17' : pmLower.includes('cart') ? '03' : pmLower.includes('dinheiro') ? '01' : '99';

            xml += `  <NFe xmlns="http://www.portalfiscal.inf.br/nfe">\n`;
            xml += `    <infNFe versao="4.00" Id="NFe${accessKey}">\n`;
            xml += `      <ide><cUF>31</cUF><mod>65</mod><serie>1</serie><nNF>${orderNum}</nNF><dhEmi>${dateObj.toISOString()}</dhEmi><tpAmb>${tpAmb}</tpAmb></ide>\n`;
            xml += `      <emit><CNPJ>${emitCnpj}</CNPJ><xNome>${emitName}</xNome><IE>${emitIe}</IE><CRT>1</CRT></emit>\n`;
            xml += `      <dest>${order.customerDocument ? `<CPF>${order.customerDocument.replace(/\D/g, '')}</CPF>` : ''}<xNome>${escapeXml(order.customerName || 'CONSUMIDOR')}</xNome><indIEDest>9</indIEDest></dest>\n`;
            (order.items || []).forEach((item, idx) => {
                const itemTotal = (Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2);
                xml += `      <det nItem="${idx + 1}"><prod><cProd>ITM-${idx + 1}</cProd><xProd>${escapeXml(item.name || 'ITEM')}</xProd><NCM>21069090</NCM><CFOP>5102</CFOP><uCom>UN</uCom><qCom>${Number(item.quantity || 1).toFixed(4)}</qCom><vUnCom>${Number(item.price || 0).toFixed(4)}</vUnCom><vProd>${itemTotal}</vProd></prod></det>\n`;
            });
            xml += `      <total><ICMSTot><vProd>${subtotal.toFixed(2)}</vProd><vFrete>${Number(order.deliveryFee || 0).toFixed(2)}</vFrete><vDesc>${Number(order.discountAmount || 0).toFixed(2)}</vDesc><vNF>${total.toFixed(2)}</vNF><vTotTrib>${approxTaxes.toFixed(2)}</vTotTrib></ICMSTot></total>\n`;
            xml += `      <pag><detPag><tPag>${tPag}</tPag><vPag>${total.toFixed(2)}</vPag></detPag></pag>\n`;
            xml += `    </infNFe>\n`;
            xml += `    <protNFe versao="4.00"><infProt><tpAmb>${tpAmb}</tpAmb><chNFe>${accessKey}</chNFe><dhRecbto>${dateObj.toISOString()}</dhRecbto><nProt>${protocolNumber}</nProt><cStat>100</cStat><xMotivo>Autorizado o uso da NF-e</xMotivo></infProt></protNFe>\n`;
            xml += `  </NFe>\n`;
        });

        xml += `</loteContabilNFCe>\n`;

        const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `nfce_emitidas_${monthInputValue}_${emittedOrders.length}_notas.xml`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        addToast({
            message: `📥 Lote XML com ${emittedOrders.length} notas emitidas em ${monthLabel} baixado!`,
            type: 'success',
        });
    };

    const getFiscalStatusLabel = (order: Order): string => {
        const cat = getFiscalCategory(order);
        if (cat === 'emitted') return 'Emitida (Autorizada SEFAZ)';
        if (cat === 'processing') return 'Processando SEFAZ';
        if (cat === 'error') return `Erro SEFAZ${order.fiscalMessage ? ` (${order.fiscalMessage})` : ''}`;
        if (cat === 'ignored') return `Não Emitível (${order.status})`;
        return 'Pendente de Emissão';
    };

    const formatBrlNumber = (val: number): string =>
        val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const escapeCsvCell = (value: string | number | undefined | null): string => {
        const str = String(value ?? '').replace(/\r?\n/g, ' ');
        return `"${str.replace(/"/g, '""')}"`;
    };

    const getActiveFilterLabel = (): string => {
        switch (filterMode) {
            case 'pending': return 'Pendentes';
            case 'emitted': return 'Emitidas';
            case 'issues': return 'Erros/Processando';
            case 'ignored': return 'Cancelados/Pgto Pendente';
            default: return 'Todos';
        }
    };

    const handleExportCsv = () => {
        if (filteredOrders.length === 0) {
            addToast({
                message: 'Não há pedidos filtrados para exportar em CSV.',
                type: 'warning',
            });
            return;
        }

        const headers = [
            'Pedido',
            'Data/Hora',
            'Cliente',
            'CPF/CNPJ',
            'Forma Pagamento',
            'Status Pedido',
            'Status Nota Fiscal (SEFAZ)',
            'Numero NFC-e',
            'Protocolo SEFAZ',
            'Chave de Acesso (44 digitos)',
            'Valor Pedido (R$)',
            'Aliquota Imposto (%)',
            'Imposto Estimado (R$)',
        ];

        const rows = filteredOrders.map(order => {
            const cat = getFiscalCategory(order);
            const dateObj = new Date(order.timestamp);
            const formattedDate = `${dateObj.toLocaleDateString('pt-BR')} ${dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
            const orderVal = Number(order.totalPrice || 0);
            const orderTax = cat === 'emitted' ? orderVal * (parsedTaxRate / 100) : 0;

            return [
                formatOrderNumber(order),
                formattedDate,
                order.customerName || 'Consumidor',
                order.customerDocument || '',
                order.paymentMethod || '',
                order.status || '',
                getFiscalStatusLabel(order),
                order.fiscalNumber || (cat === 'emitted' ? String(order.order_number || '') : ''),
                order.fiscalProtocol || '',
                order.fiscalKey || '',
                formatBrlNumber(orderVal),
                cat === 'emitted' ? formatBrlNumber(parsedTaxRate) : '0,00',
                formatBrlNumber(orderTax),
            ]
                .map(escapeCsvCell)
                .join(';');
        });

        const summaryRows = [
            '',
            [
                'RESUMO DO FILTRO',
                `Período: ${monthLabel}`,
                `Filtro: ${getActiveFilterLabel()}${searchTerm.trim() ? ` | Busca: ${searchTerm.trim()}` : ''}`,
                `Qtd Pedidos: ${filteredSummary.count}`,
                `Notas Emitidas: ${filteredSummary.emittedCount}`,
                `Pendentes: ${filteredSummary.pendingCount}`,
                '',
                '',
                '',
                'TOTAL PEDIDOS FILTRADOS (R$)',
                formatBrlNumber(filteredSummary.totalAmount),
                '',
                '',
            ].map(escapeCsvCell).join(';'),
            [
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                'TOTAL NOTAS EMITIDAS NO FILTRO (R$)',
                formatBrlNumber(filteredSummary.emittedAmount),
                `Alíquota ${formatBrlNumber(parsedTaxRate)}%`,
                formatBrlNumber(filteredSummary.taxOnEmittedFiltered),
            ].map(escapeCsvCell).join(';'),
        ];

        const csvContent = '\uFEFF' + [headers.map(escapeCsvCell).join(';'), ...rows, ...summaryRows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `relatorio_contabil_${monthInputValue}_${filterMode}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        addToast({
            message: `📊 CSV exportado com ${filteredOrders.length} pedidos de ${monthLabel}!`,
            type: 'success',
        });
    };

    const handleExportPdf = () => {
        if (filteredOrders.length === 0) {
            addToast({
                message: 'Não há pedidos filtrados para exportar em PDF.',
                type: 'warning',
            });
            return;
        }

        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();

        // Cabeçalho
        doc.setFillColor(30, 27, 75);
        doc.rect(0, 0, pageWidth, 26, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`Relatório Contábil / Fiscal — ${restaurant?.name || 'Restaurante'}`, 12, 11);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const cnpjInfo = restaurant?.cnpj ? `CNPJ: ${restaurant.cnpj}   |   ` : '';
        const searchInfo = searchTerm.trim() ? `   |   Busca: "${searchTerm.trim()}"` : '';
        doc.text(
            `${cnpjInfo}Período: ${monthLabel}   |   Filtro: ${getActiveFilterLabel()}${searchInfo}   |   Gerado em: ${new Date().toLocaleString('pt-BR')}`,
            12,
            18
        );

        // Quadro de Totais Calculados
        doc.setTextColor(31, 41, 55);
        doc.setFillColor(243, 244, 246);
        doc.roundedRect(12, 30, pageWidth - 24, 18, 2, 2, 'F');

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.text(`Pedidos Filtrados: ${filteredSummary.count}`, 16, 37);
        doc.text(`Valor Total Filtrado: R$ ${formatBrlNumber(filteredSummary.totalAmount)}`, 16, 43);

        doc.text(`Notas Emitidas (SEFAZ): ${filteredSummary.emittedCount}`, 92, 37);
        doc.text(`Total Emitidas: R$ ${formatBrlNumber(filteredSummary.emittedAmount)}`, 92, 43);

        doc.text(`Alíquota Predefinida: ${formatBrlNumber(parsedTaxRate)}%`, 175, 37);
        doc.setTextColor(5, 150, 105);
        doc.text(`Imposto a Pagar (Emitidas): R$ ${formatBrlNumber(filteredSummary.taxOnEmittedFiltered)}`, 175, 43);
        doc.setTextColor(31, 41, 55);

        const tableBody = filteredOrders.map(order => {
            const cat = getFiscalCategory(order);
            const dateObj = new Date(order.timestamp);
            const formattedDate = `${dateObj.toLocaleDateString('pt-BR')} ${dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
            const nfNumber = order.fiscalNumber || (cat === 'emitted' ? String(order.order_number || '-') : '-');
            const nfDetails = cat === 'emitted'
                ? `NF: ${nfNumber}${order.fiscalProtocol ? ` | Prot: ${order.fiscalProtocol}` : ''}\nChave: ${order.fiscalKey || '-'}`
                : (order.fiscalMessage || '-');

            return [
                formatOrderNumber(order),
                formattedDate,
                `${order.customerName || 'Consumidor'}${order.customerDocument ? `\n${order.customerDocument}` : ''}`,
                `${order.paymentMethod || '-'}\n(${order.status})`,
                getFiscalStatusLabel(order),
                nfDetails,
                `R$ ${formatBrlNumber(Number(order.totalPrice || 0))}`,
            ];
        });

        autoTable(doc, {
            startY: 52,
            head: [['Pedido', 'Data/Hora', 'Cliente / CPF-CNPJ', 'Pgto / Status', 'Status Fiscal', 'Detalhes NFC-e (Número / Protocolo / Chave)', 'Valor']],
            body: tableBody,
            foot: [[
                `Total (${filteredSummary.count})`,
                '',
                `Emitidas: ${filteredSummary.emittedCount}`,
                `Pendentes: ${filteredSummary.pendingCount}`,
                `Alíquota: ${formatBrlNumber(parsedTaxRate)}%`,
                `Imposto s/ Emitidas: R$ ${formatBrlNumber(filteredSummary.taxOnEmittedFiltered)}  |  Base Emitidas: R$ ${formatBrlNumber(filteredSummary.emittedAmount)}`,
                `R$ ${formatBrlNumber(filteredSummary.totalAmount)}`,
            ]],
            styles: {
                fontSize: 7.5,
                cellPadding: 2,
                valign: 'middle',
                overflow: 'linebreak',
            },
            headStyles: {
                fillColor: [49, 46, 129],
                textColor: 255,
                fontStyle: 'bold',
            },
            footStyles: {
                fillColor: [238, 242, 255],
                textColor: [30, 27, 75],
                fontStyle: 'bold',
            },
            columnStyles: {
                0: { cellWidth: 18 },
                1: { cellWidth: 27 },
                2: { cellWidth: 42 },
                3: { cellWidth: 30 },
                4: { cellWidth: 36 },
                5: { cellWidth: 94 },
                6: { cellWidth: 26, halign: 'right' },
            },
            margin: { left: 12, right: 12 },
        });

        doc.save(`relatorio_contabil_${monthInputValue}_${filterMode}.pdf`);

        addToast({
            message: `📄 PDF gerado e baixado com ${filteredOrders.length} pedidos de ${monthLabel}!`,
            type: 'success',
        });
    };

    const hasApiCredentials = Boolean(restaurant?.blingApiKey || restaurant?.nuvemClientId);
    const isProd = restaurant?.fiscalEnv === 'producao';

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-5">
            {/* Cabeçalho do Contador */}
            <div className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-purple-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-indigo-500/30 border border-indigo-400/40 text-indigo-100 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                            Acesso Exclusivo Contabilidade
                        </span>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                            isProd
                                ? 'bg-emerald-500/30 border-emerald-400/40 text-emerald-200'
                                : 'bg-amber-500/30 border-amber-400/40 text-amber-200'
                        }`}>
                            {isProd ? 'SEFAZ Produção' : 'SEFAZ Homologação'}
                        </span>
                        {restaurant?.cnpj && (
                            <span className="text-[11px] font-mono text-indigo-200 bg-white/10 px-2.5 py-0.5 rounded-full">
                                CNPJ: {restaurant.cnpj}
                            </span>
                        )}
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                        <span>📑</span>
                        <span>Painel Fiscal do Contador — Emissão em Lote (SEFAZ)</span>
                    </h2>
                    <p className="text-xs text-indigo-200">
                        Visualize todos os pedidos do mês, confira quais já possuem NFC-e autorizada e transmita os pendentes para a SEFAZ sem imprimir cupons.
                    </p>
                </div>

                {/* Navegação do Mês */}
                <div className="flex flex-wrap items-center gap-2 bg-white/10 p-2 rounded-2xl border border-white/15 backdrop-blur-xs">
                    <button
                        type="button"
                        onClick={handlePrevMonth}
                        disabled={isBatchSending}
                        className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-black transition-all disabled:opacity-40 cursor-pointer"
                        title="Mês Anterior"
                    >
                        ← Anterior
                    </button>
                    <input
                        type="month"
                        value={monthInputValue}
                        onChange={e => handleMonthInputChange(e.target.value)}
                        disabled={isBatchSending}
                        className="bg-white text-gray-900 font-black text-xs px-3 py-2 rounded-xl outline-none cursor-pointer"
                        aria-label="Selecionar Mês e Ano"
                    />
                    <button
                        type="button"
                        onClick={handleNextMonth}
                        disabled={isBatchSending}
                        className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-black transition-all disabled:opacity-40 cursor-pointer"
                        title="Próximo Mês"
                    >
                        Próximo →
                    </button>
                    <button
                        type="button"
                        onClick={loadMonthlyOrders}
                        disabled={isLoading || isBatchSending}
                        className="px-3 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-xs font-black transition-all disabled:opacity-40 cursor-pointer"
                        title="Recarregar pedidos do mês"
                    >
                        🔄 Atualizar
                    </button>
                </div>
            </div>

            {(!restaurant?.enableFiscal || !hasApiCredentials || !restaurant?.cnpj) && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                    <span className="text-base">⚠️</span>
                    <div>
                        <span className="font-black">Aviso de Configuração Fiscal: </span>
                        {!restaurant?.enableFiscal
                            ? 'O módulo fiscal ainda está desativado nas Configurações do restaurante. '
                            : ''}
                        {!restaurant?.cnpj ? 'CNPJ do restaurante não preenchido. ' : ''}
                        {!hasApiCredentials
                            ? 'Nenhuma API Key de provedor fiscal (Focus NFe / Nuvem Fiscal) cadastrada — os envios serão registrados em modo simulado/homologação até que a chave seja inserida em Configurações.'
                            : ''}
                    </div>
                </div>
            )}

            {/* KPIs do Mês */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">
                        Pedidos Válidos ({monthLabel})
                    </span>
                    <div className="text-2xl font-black text-gray-900 mt-1">{stats.validCount}</div>
                    <div className="text-xs font-bold text-gray-500 mt-0.5">
                        R$ {stats.validTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>

                <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">
                        ✅ Notas Já Emitidas
                    </span>
                    <div className="text-2xl font-black text-emerald-800 mt-1">{stats.emittedCount}</div>
                    <div className="text-xs font-bold text-emerald-700 mt-0.5">
                        R$ {stats.emittedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>

                <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200 shadow-xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">
                        🧾 Pendentes de Emissão
                    </span>
                    <div className="text-2xl font-black text-amber-900 mt-1">{stats.pendingCount}</div>
                    <div className="text-xs font-bold text-amber-700 mt-0.5">
                        R$ {stats.pendingTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">
                        Erros / Cancelados
                    </span>
                    <div className="text-2xl font-black text-gray-800 mt-1">
                        {stats.issuesCount}{' '}
                        <span className="text-xs font-bold text-gray-400">/ {stats.ignoredCount} cancel.</span>
                    </div>
                    <div className="text-[11px] font-semibold text-gray-500 mt-0.5">
                        Cancelados não entram no envio SEFAZ
                    </div>
                </div>
            </div>

            {/* Apuração Automática de Imposto a Pagar (Alíquota Predefinida) */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-md border border-indigo-500/30 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5 text-emerald-300">
                                <span>💰</span> Apuração de Imposto a Pagar ({monthLabel})
                            </h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-indigo-200">
                                {restaurant?.fiscalTaxRate !== undefined && restaurant?.fiscalTaxRate !== null
                                    ? `Predefinido: ${Number(restaurant.fiscalTaxRate).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
                                    : 'Alíquota sugerida (salve a oficial da loja)'}
                            </span>
                        </div>
                        <p className="text-[11px] text-indigo-200 mt-0.5">
                            Calculado automaticamente sobre o valor total das NFC-e emitidas no mês e atualizado em tempo real conforme você marca novas notas.
                        </p>
                    </div>

                    {/* Alíquota Predefinida + Atalhos */}
                    <div className="flex flex-wrap items-center gap-2 bg-white/10 p-2 rounded-xl border border-white/15">
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-200 pl-1">
                            Alíquota:
                        </span>
                        <div className="flex items-center bg-white rounded-lg px-2 py-1">
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={taxRateInput}
                                onChange={e => setTaxRateInput(e.target.value)}
                                className="w-16 text-right font-mono font-black text-xs text-gray-900 outline-none bg-transparent"
                                aria-label="Alíquota de imposto em porcentagem"
                            />
                            <span className="text-xs font-black text-gray-500 ml-1">%</span>
                        </div>
                        <div className="flex items-center gap-1">
                            {[4, 6, 7.3, 9.5, 13.45].map(preset => (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={() => setTaxRateInput(String(preset))}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                                        Math.abs(parsedTaxRate - preset) < 0.001
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-white/10 hover:bg-white/20 text-indigo-100'
                                    }`}
                                >
                                    {preset}%
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={() => handleSaveTaxRate()}
                            disabled={isSavingTaxRate || !restaurantId}
                            className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg text-[11px] font-black transition-all disabled:opacity-50 cursor-pointer"
                            title="Salvar esta alíquota como padrão do restaurante"
                        >
                            {isSavingTaxRate ? 'Salvando...' : '💾 Salvar'}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-white/10 border border-white/10 rounded-xl p-3.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 block">
                            Imposto a Pagar (Notas Já Emitidas)
                        </span>
                        <div className="text-xl sm:text-2xl font-mono font-black text-white mt-1">
                            R$ {taxOnEmitted.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[11px] text-indigo-200 mt-0.5">
                            {parsedTaxRate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% sobre R${' '}
                            {stats.emittedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({stats.emittedCount} emitidas)
                        </div>
                    </div>

                    <div className={`rounded-xl p-3.5 border transition-all ${
                        selectedOrders.length > 0
                            ? 'bg-amber-500/20 border-amber-400/40'
                            : 'bg-white/5 border-white/10 opacity-75'
                    }`}>
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 block">
                            + Imposto dos Selecionados ({selectedOrders.length})
                        </span>
                        <div className="text-xl sm:text-2xl font-mono font-black text-amber-200 mt-1">
                            + R$ {taxOnSelected.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[11px] text-amber-100/80 mt-0.5">
                            {selectedOrders.length > 0
                                ? `Sobre R$ ${selectedTotalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} marcados`
                                : 'Marque pedidos pendentes para simular'}
                        </div>
                    </div>

                    <div className="bg-emerald-500/20 border border-emerald-400/40 rounded-xl p-3.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-200 block">
                            Total Projetado a Pagar no Mês
                        </span>
                        <div className="text-xl sm:text-2xl font-mono font-black text-emerald-300 mt-1">
                            R$ {projectedTotalTax.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[11px] text-emerald-100/85 mt-0.5">
                            Base total: R${' '}
                            {(stats.emittedTotal + selectedTotalAmount).toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Barra de Filtros e Ações em Lote */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-3">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* Filtros de Status */}
                    <div className="flex flex-wrap gap-1.5 bg-gray-100 p-1 rounded-xl">
                        {[
                            { key: 'all', label: `Todos (${monthlyOrders.length})` },
                            { key: 'pending', label: `⏳ Pendentes (${stats.pendingCount})` },
                            { key: 'emitted', label: `✅ Emitidas (${stats.emittedCount})` },
                            { key: 'issues', label: `⚠️ Erros/Proc (${stats.issuesCount})` },
                            { key: 'ignored', label: `🚫 Cancel./Pgto Pend. (${stats.ignoredCount})` },
                        ].map(item => (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => setFilterMode(item.key as FilterMode)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                    filterMode === item.key
                                        ? 'bg-white text-indigo-700 shadow-xs'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    {/* Busca */}
                    <div className="relative w-full lg:w-72">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Buscar pedido #, cliente, CPF, chave..."
                            className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                </div>

                {/* Controles de Seleção e Envio SEFAZ em Lote */}
                <div className="pt-3 border-t border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={handleToggleSelectAllPending}
                            disabled={isBatchSending || eligibleFilteredOrders.length === 0}
                            className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-black transition-all disabled:opacity-40 cursor-pointer"
                        >
                            {allEligibleFilteredSelected
                                ? `Desmarcar Pendentes (${eligibleFilteredOrders.length})`
                                : `☑️ Selecionar Todos Pendentes (${eligibleFilteredOrders.length})`}
                        </button>

                        <button
                            type="button"
                            onClick={handleSelectMarkedAtCashier}
                            disabled={isBatchSending}
                            className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
                            title="Selecionar pedidos pendentes que foram marcados como 'NF: Sim' na tela do caixa/Kanban"
                        >
                            🏷️ Selecionar Marcados no Caixa
                        </button>

                        {selectedIds.size > 0 && (
                            <button
                                type="button"
                                onClick={() => setSelectedIds(new Set())}
                                disabled={isBatchSending}
                                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
                            >
                                Limpar ({selectedIds.size})
                            </button>
                        )}

                        <div className={`px-3.5 py-2 rounded-xl border text-xs flex items-center gap-2 transition-all ${
                            selectedOrders.length > 0
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-2xs'
                                : 'bg-gray-50 border-gray-200 text-gray-500'
                        }`}>
                            <span className="font-bold">
                                Marcados: <strong className="font-black">{selectedOrders.length}</strong>
                            </span>
                            <span className="opacity-40">|</span>
                            <span className="font-bold">
                                Total:{' '}
                                <strong className="font-mono font-black text-sm">
                                    R$ {selectedTotalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </strong>
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={handleExportCsv}
                            disabled={isBatchSending || filteredOrders.length === 0}
                            className="px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black transition-all disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
                            title="Exportar pedidos filtrados do mês em planilha CSV (Excel)"
                        >
                            <span>📊</span>
                            <span>Exportar CSV ({filteredOrders.length})</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleExportPdf}
                            disabled={isBatchSending || filteredOrders.length === 0}
                            className="px-3.5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-black transition-all disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
                            title="Gerar e baixar relatório em PDF dos pedidos filtrados e totais"
                        >
                            <span>📄</span>
                            <span>Exportar PDF ({filteredOrders.length})</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleExportEmittedXmlBatch}
                            disabled={isBatchSending || stats.emittedCount === 0}
                            className="px-3.5 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-xs font-black transition-all disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
                            title="Baixar arquivo XML consolidado com todas as NFC-e emitidas no mês"
                        >
                            <span>📥</span>
                            <span>XMLs ({stats.emittedCount})</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleSendBatchToSefaz}
                            disabled={isBatchSending || selectedOrders.length === 0}
                            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95 disabled:opacity-40 flex items-center gap-2 cursor-pointer"
                        >
                            <span>🚀</span>
                            <span>
                                Enviar Selecionados para SEFAZ ({selectedOrders.length})
                                {selectedOrders.length > 0
                                    ? ` • R$ ${selectedTotalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                    : ''}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Barra de Progresso do Lote */}
                {batchProgress && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between text-xs font-black text-indigo-900">
                            <span>
                                ⏳ Transmitindo para a SEFAZ: Pedido {batchProgress.currentLabel} ({batchProgress.current} de {batchProgress.total})
                            </span>
                            <span className="font-mono">
                                {Math.round((batchProgress.current / batchProgress.total) * 100)}%
                            </span>
                        </div>
                        <div className="w-full bg-indigo-200 rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-indigo-600 h-2 transition-all duration-300"
                                style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Tabela de Pedidos do Mês */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                {isLoading ? (
                    <div className="py-16 flex justify-center">
                        <Spinner message={`Carregando pedidos de ${monthLabel}...`} />
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="py-16 text-center text-gray-500 space-y-1">
                        <p className="font-bold text-sm">Nenhum pedido encontrado em {monthLabel} para este filtro.</p>
                        <p className="text-xs text-gray-400">Altere o mês acima ou ajuste os filtros.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-black uppercase tracking-wider text-gray-500">
                                    <th className="py-3 px-3 w-10 text-center">
                                        <input
                                            type="checkbox"
                                            checked={allEligibleFilteredSelected}
                                            onChange={handleToggleSelectAllPending}
                                            disabled={isBatchSending || eligibleFilteredOrders.length === 0}
                                            className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                                            title="Selecionar todos os pendentes visíveis"
                                        />
                                    </th>
                                    <th className="py-3 px-3">Pedido / Data</th>
                                    <th className="py-3 px-3">Cliente / CPF-CNPJ</th>
                                    <th className="py-3 px-3">Pagamento / Status</th>
                                    <th className="py-3 px-3 text-right">Valor</th>
                                    <th className="py-3 px-3">Status Nota Fiscal (SEFAZ)</th>
                                    <th className="py-3 px-3 text-right">Ações (Sem Imprimir)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredOrders.map(order => {
                                    const cat = getFiscalCategory(order);
                                    const isSelectable = cat === 'pending' || cat === 'error';
                                    const isChecked = selectedIds.has(order.id);
                                    const dateObj = new Date(order.timestamp);
                                    const formattedDate = `${dateObj.toLocaleDateString('pt-BR')} ${dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
                                    const isSendingThis = sendingSingleId === order.id;

                                    return (
                                        <tr
                                            key={order.id}
                                            className={`transition-colors ${
                                                isChecked ? 'bg-indigo-50/70' : 'hover:bg-gray-50/80'
                                            } ${cat === 'ignored' ? 'opacity-60 bg-gray-50/40' : ''}`}
                                        >
                                            <td className="py-3 px-3 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    disabled={!isSelectable || isBatchSending}
                                                    onChange={() => toggleOrderSelection(order.id)}
                                                    className="w-4 h-4 rounded accent-indigo-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                                                    title={
                                                        isSelectable
                                                            ? 'Selecionar para envio em lote à SEFAZ'
                                                            : cat === 'emitted'
                                                                ? 'Nota fiscal já emitida'
                                                                : 'Pedido cancelado ou aguardando pagamento'
                                                    }
                                                />
                                            </td>

                                            <td className="py-3 px-3 whitespace-nowrap">
                                                <div className="font-mono font-black text-orange-600 text-sm">
                                                    {formatOrderNumber(order)}
                                                </div>
                                                <div className="text-[11px] text-gray-500 font-mono">{formattedDate}</div>
                                            </td>

                                            <td className="py-3 px-3">
                                                <div className="font-bold text-gray-900 truncate max-w-[200px]" title={order.customerName}>
                                                    {order.customerName || 'Consumidor'}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className={`font-mono text-[11px] ${order.customerDocument ? 'text-indigo-700 font-bold' : 'text-gray-400'}`}>
                                                        {order.customerDocument || 'Sem CPF/CNPJ'}
                                                    </span>
                                                    {isSelectable && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setOrderForCpfEdit(order)}
                                                            disabled={isBatchSending}
                                                            className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                                                            title="Informar/editar CPF ou CNPJ para esta nota"
                                                        >
                                                            ✏️ CPF
                                                        </button>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="py-3 px-3">
                                                <div className="font-semibold text-gray-800">{order.paymentMethod || '-'}</div>
                                                <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    order.status === 'Entregue'
                                                        ? 'bg-green-100 text-green-800'
                                                        : order.status === 'Cancelado'
                                                            ? 'bg-red-100 text-red-700'
                                                            : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                    {order.status}
                                                </span>
                                            </td>

                                            <td className="py-3 px-3 text-right font-mono font-black text-gray-900 whitespace-nowrap">
                                                R$ {Number(order.totalPrice || 0).toFixed(2)}
                                            </td>

                                            <td className="py-3 px-3">
                                                {cat === 'emitted' && (
                                                    <div className="space-y-0.5">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                            ✅ Emitida (SEFAZ)
                                                        </span>
                                                        {order.fiscalKey && (
                                                            <div className="font-mono text-[10px] text-gray-500 truncate max-w-[180px]" title={order.fiscalKey}>
                                                                Chave: {order.fiscalKey}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                {cat === 'processing' && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                                                        ⏳ Processando SEFAZ
                                                    </span>
                                                )}
                                                {cat === 'error' && (
                                                    <div className="space-y-0.5">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                                                            ⚠️ Erro SEFAZ
                                                        </span>
                                                        {order.fiscalMessage && (
                                                            <div className="text-[10px] text-rose-600 font-semibold max-w-[200px] truncate" title={order.fiscalMessage}>
                                                                {order.fiscalMessage}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                {cat === 'pending' && (
                                                    <div className="flex flex-col items-start gap-1">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200">
                                                            🧾 Pendente de Envio
                                                        </span>
                                                        {order.fiscalExport && (
                                                            <span className="text-[9px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
                                                                🏷️ Marcado NF no Caixa
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                {cat === 'ignored' && (
                                                    <span className="text-[10px] font-bold text-gray-400">
                                                        — Não emitível ({order.status})
                                                    </span>
                                                )}
                                            </td>

                                            <td className="py-3 px-3 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {isSelectable && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSendSingleToSefaz(order)}
                                                            disabled={isBatchSending || Boolean(sendingSingleId)}
                                                            className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-black shadow-2xs transition-all disabled:opacity-40 cursor-pointer"
                                                            title="Transmitir este pedido para a SEFAZ sem imprimir"
                                                        >
                                                            {isSendingThis ? '⏳ Enviando...' : '⚡ Enviar SEFAZ'}
                                                        </button>
                                                    )}
                                                    {cat !== 'ignored' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setOrderForFiscalView(order)}
                                                            className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                                                            title="Visualizar DANFE / XML desta nota"
                                                        >
                                                            🔍 Ver NF / XML
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal para visualizar DANFE / XML sem imprimir automaticamente */}
            {orderForFiscalView && (
                <FiscalInvoiceViewModal
                    isOpen={Boolean(orderForFiscalView)}
                    onClose={() => setOrderForFiscalView(null)}
                    order={orderForFiscalView}
                    restaurant={restaurant}
                />
            )}

            {/* Modal opcional para preencher/corrigir CPF antes de enviar à SEFAZ */}
            {orderForCpfEdit && (
                <FiscalDocumentModal
                    isOpen={Boolean(orderForCpfEdit)}
                    onClose={() => setOrderForCpfEdit(null)}
                    order={orderForCpfEdit}
                    onConfirm={(doc, name) => {
                        const target = orderForCpfEdit;
                        setOrderForCpfEdit(null);
                        setMonthlyOrders(prev =>
                            prev.map(o =>
                                o.id === target.id
                                    ? {
                                          ...o,
                                          customerDocument: doc || undefined,
                                          customerName: name || o.customerName,
                                      }
                                    : o
                            )
                        );
                        updateOrderCustomerDocument(target.id, doc, name)
                            .then(() => {
                                addToast({
                                    message: `CPF/CNPJ do pedido ${formatOrderNumber(target)} atualizado!`,
                                    type: 'success',
                                });
                            })
                            .catch(err => {
                                addToast({
                                    message: `Erro ao salvar CPF/CNPJ: ${err?.message || 'Tente novamente'}`,
                                    type: 'error',
                                });
                            });
                    }}
                    actionLabel="Salvar CPF/CNPJ"
                />
            )}

            {/* Barra Flutuante Fixa com Total dos Pedidos Marcados ao rolar a lista */}
            {selectedOrders.length > 0 && (
                <div className="sticky bottom-4 z-30 bg-indigo-950/95 backdrop-blur-md text-white rounded-2xl p-3.5 sm:px-5 shadow-2xl border border-indigo-400/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3 sm:gap-5">
                        <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-xl bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center text-xs font-black">
                                {selectedOrders.length}
                            </span>
                            <div className="leading-tight">
                                <span className="text-[10px] uppercase tracking-wider text-indigo-300 font-bold block">
                                    Selecionados
                                </span>
                                <span className="text-xs font-black">
                                    {selectedOrders.length === 1 ? '1 pedido marcado' : `${selectedOrders.length} pedidos marcados`}
                                </span>
                            </div>
                        </div>

                        <div className="h-7 w-px bg-white/15 hidden sm:block" />

                        <div className="leading-tight">
                            <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold block">
                                Valor Total Selecionado
                            </span>
                            <span className="text-lg sm:text-xl font-mono font-black text-emerald-300">
                                R$ {selectedTotalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>

                        <div className="h-7 w-px bg-white/15 hidden sm:block" />

                        <div className="leading-tight">
                            <span className="text-[10px] uppercase tracking-wider text-amber-300 font-bold block">
                                Imposto s/ Selecionados ({parsedTaxRate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)
                            </span>
                            <span className="text-base sm:text-lg font-mono font-black text-amber-300">
                                + R$ {taxOnSelected.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setSelectedIds(new Set())}
                            disabled={isBatchSending}
                            className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
                        >
                            Limpar
                        </button>
                        <button
                            type="button"
                            onClick={handleSendBatchToSefaz}
                            disabled={isBatchSending}
                            className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-xl text-xs font-black shadow-lg transition-all active:scale-95 disabled:opacity-40 flex items-center gap-2 cursor-pointer"
                        >
                            <span>🚀</span>
                            <span>{isBatchSending ? 'Enviando...' : `Enviar ${selectedOrders.length} para SEFAZ (Sem Imprimir)`}</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccountantFiscalView;
