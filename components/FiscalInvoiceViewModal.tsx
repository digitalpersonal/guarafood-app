import React, { useState, useEffect, useRef } from 'react';
import type { Order, Restaurant } from '../types';
import { useNotification } from '../hooks/useNotification';
import FiscalDanfeReceipt from './FiscalDanfeReceipt';
import { printThermalElement } from '../utils/thermalPrint';
import { consultOrderFiscalSefaz, cancelOrderFiscalSefaz, emitOrderFiscalToSefaz } from '../services/orderService';

interface FiscalInvoiceViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: Order | null;
    restaurant?: Restaurant | null;
    printerWidth?: number; // 80 or 58
}

export const FiscalInvoiceViewModal: React.FC<FiscalInvoiceViewModalProps> = ({
    isOpen,
    onClose,
    order,
    restaurant,
    printerWidth = 80
}) => {
    const { addToast } = useNotification();
    const [activeTab, setActiveTab] = useState<'danfe' | 'xml' | 'focus'>('danfe');
    const [selectedWidth, setSelectedWidth] = useState<number>(printerWidth || 80);
    const [localOrder, setLocalOrder] = useState<Order | null>(order);
    const [copiedXml, setCopiedXml] = useState<boolean>(false);
    const [copiedKey, setCopiedKey] = useState<boolean>(false);
    const [officialXml, setOfficialXml] = useState<string>('');
    const [isLoadingXml, setIsLoadingXml] = useState<boolean>(false);
    const [xmlError, setXmlError] = useState<string>('');
    const [isConsulting, setIsConsulting] = useState<boolean>(false);
    const [isEmitting, setIsEmitting] = useState<boolean>(false);
    const [cancelReason, setCancelReason] = useState<string>('');
    const [showCancelForm, setShowCancelForm] = useState<boolean>(false);
    const [isCanceling, setIsCanceling] = useState<boolean>(false);
    const receiptRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setLocalOrder(order);
        setOfficialXml('');
        setXmlError('');
        setShowCancelForm(false);
        setCancelReason('');
    }, [order]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const loadOfficialXml = async (targetOrderId: string) => {
        setIsLoadingXml(true);
        setXmlError('');
        try {
            const resp = await fetch(`/api/fiscal/download-xml?orderId=${encodeURIComponent(targetOrderId)}`);
            if (!resp.ok) {
                const errJson = await resp.json().catch(() => ({}));
                throw new Error(errJson?.error || `XML oficial ainda não disponível na Focus NFe (HTTP ${resp.status}).`);
            }
            const xmlText = await resp.text();
            setOfficialXml(xmlText);
        } catch (err: any) {
            setXmlError(err?.message || 'Não foi possível carregar o XML oficial da Focus NFe.');
        } finally {
            setIsLoadingXml(false);
        }
    };

    useEffect(() => {
        if (isOpen && activeTab === 'xml' && localOrder?.id && !officialXml && !isLoadingXml) {
            loadOfficialXml(localOrder.id);
        }
    }, [isOpen, activeTab, localOrder?.id]);

    if (!isOpen || !localOrder) return null;

    const fiscalMeta = localOrder.payment_details?.fiscal;
    const dateObj = localOrder.createdAt
        ? new Date(localOrder.createdAt)
        : (localOrder.timestamp ? new Date(localOrder.timestamp) : new Date());
    const dateString = dateObj.toLocaleDateString('pt-BR');
    const timeString = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const orderNum = localOrder.order_number || parseInt(localOrder.id.replace(/\D/g, '').slice(-6) || '1', 10);
    const nfNumber = localOrder.fiscalNumber || fiscalMeta?.numero || String(orderNum);
    const serie = '001';
    const accessKey = String(localOrder.fiscalKey || fiscalMeta?.chave || '').trim();
    const protocolNumber = String(localOrder.fiscalProtocol || fiscalMeta?.protocolo || '').trim();
    const danfeUrl = localOrder.fiscalDanfeUrl || fiscalMeta?.danfe_url || '';
    const consultUrl = localOrder.fiscalConsultUrl || fiscalMeta?.url_consulta_nf || '';
    const fiscalMessage = localOrder.fiscalMessage || fiscalMeta?.mensagem || '';
    const rawStatus = String(localOrder.fiscalStatus || fiscalMeta?.status || '').toLowerCase();
    const isProd = restaurant?.fiscalEnv === 'producao';
    const cIdToken = restaurant?.fiscalCscId || '000001';

    const displaySubtotal = Number(localOrder.subtotal) > 0
        ? Number(localOrder.subtotal)
        : (localOrder.items || []).reduce((acc, item) => acc + (Number(item.price || 0) * (item.quantity || 1)), 0);

    const displayTotal = Number(localOrder.totalPrice) > 0
        ? Number(localOrder.totalPrice)
        : (displaySubtotal + Number(localOrder.deliveryFee || 0) - Number(localOrder.discountAmount || 0));

    const handleConsultFocus = async () => {
        if (!localOrder.id || !localOrder.restaurantId) return;
        setIsConsulting(true);
        try {
            const res = await consultOrderFiscalSefaz(localOrder.id, localOrder.restaurantId);
            setLocalOrder(prev => prev ? {
                ...prev,
                fiscalStatus: res.fiscalStatus,
                fiscalKey: res.fiscalKey || prev.fiscalKey,
                fiscalNumber: res.fiscalNumber || prev.fiscalNumber,
                fiscalProtocol: res.fiscalProtocol || prev.fiscalProtocol,
                fiscalDanfeUrl: res.fiscalDanfeUrl || prev.fiscalDanfeUrl,
                fiscalXmlUrl: res.fiscalXmlUrl || prev.fiscalXmlUrl,
                fiscalQrCodeUrl: res.fiscalQrCodeUrl || prev.fiscalQrCodeUrl,
                fiscalConsultUrl: res.fiscalConsultUrl || prev.fiscalConsultUrl,
                fiscalMessage: res.fiscalMessage || prev.fiscalMessage,
            } : prev);
            addToast({
                message: res.fiscalMessage || 'Consulta Focus NFe atualizada.',
                type: res.success ? 'success' : 'warning'
            });
            if (activeTab === 'xml') {
                loadOfficialXml(localOrder.id);
            }
        } finally {
            setIsConsulting(false);
        }
    };

    const handleEmitNow = async () => {
        if (!localOrder) return;
        setIsEmitting(true);
        try {
            const res = await emitOrderFiscalToSefaz(localOrder, restaurant);
            setLocalOrder(prev => prev ? {
                ...prev,
                fiscalStatus: res.fiscalStatus,
                fiscalKey: res.fiscalKey || prev.fiscalKey,
                fiscalNumber: res.fiscalNumber || prev.fiscalNumber,
                fiscalProtocol: res.fiscalProtocol || prev.fiscalProtocol,
                fiscalDanfeUrl: res.fiscalDanfeUrl || prev.fiscalDanfeUrl,
                fiscalXmlUrl: res.fiscalXmlUrl || prev.fiscalXmlUrl,
                fiscalQrCodeUrl: res.fiscalQrCodeUrl || prev.fiscalQrCodeUrl,
                fiscalConsultUrl: res.fiscalConsultUrl || prev.fiscalConsultUrl,
                fiscalMessage: res.fiscalMessage || prev.fiscalMessage,
            } : prev);
            addToast({
                message: res.fiscalMessage || (res.success ? 'NFC-e autorizada!' : 'Falha na transmissão SEFAZ.'),
                type: res.success ? 'success' : 'error'
            });
        } finally {
            setIsEmitting(false);
        }
    };

    const handleCancelNfce = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!localOrder.id || !localOrder.restaurantId) return;
        if (cancelReason.trim().length < 15) {
            addToast({ message: 'A justificativa para a SEFAZ deve ter pelo menos 15 caracteres.', type: 'warning' });
            return;
        }
        setIsCanceling(true);
        try {
            const res = await cancelOrderFiscalSefaz(localOrder.id, localOrder.restaurantId, cancelReason.trim());
            if (res.success) {
                setLocalOrder(prev => prev ? {
                    ...prev,
                    fiscalStatus: 'cancelado',
                    fiscalMessage: res.message,
                } : prev);
                setShowCancelForm(false);
                addToast({ message: res.message, type: 'success' });
            } else {
                addToast({ message: res.message, type: 'error' });
            }
        } finally {
            setIsCanceling(false);
        }
    };

    const handleCopyXml = () => {
        if (!officialXml) return;
        navigator.clipboard.writeText(officialXml);
        setCopiedXml(true);
        addToast({ message: 'XML oficial da NFC-e copiado!', type: 'success' });
        setTimeout(() => setCopiedXml(false), 2500);
    };

    const handleCopyKey = () => {
        if (!accessKey) return;
        navigator.clipboard.writeText(accessKey);
        setCopiedKey(true);
        addToast({ message: 'Chave de acesso (44 dígitos) copiada!', type: 'success' });
        setTimeout(() => setCopiedKey(false), 2500);
    };

    const handleDownloadXml = async () => {
        if (officialXml) {
            const blob = new Blob([officialXml], { type: 'application/xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `NFe${accessKey || localOrder.id}.xml`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            addToast({ message: 'Download do XML oficial iniciado!', type: 'success' });
            return;
        }
        await loadOfficialXml(localOrder.id);
    };

    const handlePrintDanfe = async () => {
        if (receiptRef.current) {
            await printThermalElement(receiptRef.current, selectedWidth);
        } else {
            window.print();
        }
    };

    const statusBadge = (() => {
        if (rawStatus === 'autorizado') {
            return { label: 'SEFAZ: AUTORIZADA', cls: 'bg-emerald-500/30 border-emerald-400/40 text-emerald-200', dot: 'bg-emerald-400' };
        }
        if (rawStatus === 'cancelado') {
            return { label: 'SEFAZ: CANCELADA', cls: 'bg-gray-500/40 border-gray-300/40 text-gray-200', dot: 'bg-gray-300' };
        }
        if (rawStatus === 'processando') {
            return { label: 'SEFAZ: PROCESSANDO', cls: 'bg-amber-500/30 border-amber-400/40 text-amber-200', dot: 'bg-amber-400' };
        }
        if (rawStatus === 'erro_autorizacao' || rawStatus === 'rejeitado') {
            return { label: 'SEFAZ: REJEITADA', cls: 'bg-red-500/30 border-red-400/40 text-red-200', dot: 'bg-red-400' };
        }
        return { label: 'NÃO TRANSMITIDA', cls: 'bg-slate-500/30 border-slate-400/40 text-slate-200', dot: 'bg-slate-300' };
    })();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-scaleUp">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 text-white p-5 sm:p-6 flex items-start sm:items-center justify-between gap-4 flex-shrink-0">
                    <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className={`border text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full flex items-center gap-1 ${statusBadge.cls}`}>
                                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${statusBadge.dot}`}></span>
                                {statusBadge.label}
                            </span>
                            <span className="bg-blue-500/30 border border-blue-400/40 text-blue-200 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                                Focus NFe • NFC-e Modelo 65
                            </span>
                            {!isProd && (
                                <span className="bg-amber-500/40 text-amber-200 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-amber-400/50">
                                    Homologação
                                </span>
                            )}
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                            Nota Fiscal #{nfNumber} (Pedido #{String(orderNum).padStart(3, '0')})
                        </h2>
                        <p className="text-xs text-blue-200 font-mono">
                            Protocolo: <span className="text-white font-bold">{protocolNumber || 'Pendente'}</span> • Série {serie} • {dateString} {timeString}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-lg font-bold transition-all active:scale-95 cursor-pointer flex-shrink-0"
                        title="Fechar (Esc)"
                    >
                        ✕
                    </button>
                </div>

                {/* Tabs Bar */}
                <div className="bg-gray-100 px-5 pt-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0 overflow-x-auto no-scrollbar gap-2">
                    <div className="flex space-x-2">
                        <button
                            type="button"
                            onClick={() => setActiveTab('danfe')}
                            className={`py-2.5 px-4 rounded-t-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                                activeTab === 'danfe'
                                    ? 'bg-white text-purple-900 border-t-2 border-purple-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            <span>📄</span>
                            <span>DANFE Simplificado</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('xml')}
                            className={`py-2.5 px-4 rounded-t-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                                activeTab === 'xml'
                                    ? 'bg-white text-purple-900 border-t-2 border-purple-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            <span>💻</span>
                            <span>XML Oficial (Focus NFe)</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('focus')}
                            className={`py-2.5 px-4 rounded-t-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                                activeTab === 'focus'
                                    ? 'bg-white text-purple-900 border-t-2 border-purple-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            <span>⚡</span>
                            <span>Status na Focus NFe / SEFAZ</span>
                        </button>
                    </div>

                    {activeTab === 'danfe' && (
                        <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-gray-200 text-xs font-bold mb-1">
                            <span className="text-[10px] text-gray-500 uppercase px-1">Bobina:</span>
                            <button
                                type="button"
                                onClick={() => setSelectedWidth(80)}
                                className={`px-2 py-0.5 rounded text-[11px] font-black transition-all ${
                                    selectedWidth === 80 ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                80mm
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedWidth(58)}
                                className={`px-2 py-0.5 rounded text-[11px] font-black transition-all ${
                                    selectedWidth === 58 ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                58mm
                            </button>
                        </div>
                    )}
                </div>

                {/* Modal Body */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-grow bg-gray-50/50">
                    {activeTab === 'danfe' && (
                        <div className="space-y-4 max-w-xl mx-auto">
                            <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-3 rounded-2xl border border-gray-200 shadow-2xs">
                                <div className="text-xs text-gray-600">
                                    Visualização do cupom térmico NFC-e.
                                </div>
                                <div className="flex items-center gap-2">
                                    {danfeUrl && (
                                        <a
                                            href={danfeUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-black transition-all"
                                        >
                                            🔗 DANFE Focus NFe
                                        </a>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handlePrintDanfe}
                                        className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                                    >
                                        <span>🖨️</span>
                                        <span>Imprimir Cupom Térmico</span>
                                    </button>
                                </div>
                            </div>

                            <div ref={receiptRef} className="bg-white p-5 rounded-2xl shadow-md border border-gray-300 mx-auto transition-all"
                                 style={{ maxWidth: selectedWidth === 58 ? '300px' : '380px' }}>
                                <FiscalDanfeReceipt
                                    order={localOrder}
                                    restaurant={restaurant}
                                    printerWidth={selectedWidth}
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'xml' && (
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
                                <div>
                                    <span className="font-black text-gray-900 text-xs block">
                                        Arquivo XML Oficial Assinado (Focus NFe / SEFAZ)
                                    </span>
                                    <span className="text-[11px] text-gray-500">
                                        Obtido diretamente da Focus NFe com protocolo de autorização real.
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => loadOfficialXml(localOrder.id)}
                                        disabled={isLoadingXml}
                                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                    >
                                        {isLoadingXml ? '⏳ Buscando...' : '🔄 Recarregar XML'}
                                    </button>
                                    {officialXml && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={handleCopyXml}
                                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                            >
                                                <span>{copiedXml ? '✓ Copiado' : '📋 Copiar XML'}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleDownloadXml}
                                                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer"
                                            >
                                                <span>📥 Baixar .XML</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {isLoadingXml ? (
                                <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center text-xs font-bold text-gray-500">
                                    ⏳ Baixando XML oficial armazenado na Focus NFe...
                                </div>
                            ) : xmlError ? (
                                <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-3">
                                    <p className="font-black">⚠️ {xmlError}</p>
                                    <p>
                                        Caso a nota ainda esteja em processamento ou não tenha sido transmitida, utilize os botões na aba <strong>Status na Focus NFe / SEFAZ</strong>.
                                    </p>
                                </div>
                            ) : (
                                <div className="relative bg-gray-900 text-emerald-400 p-5 rounded-2xl shadow-inner font-mono text-xs overflow-x-auto max-h-[500px] border border-gray-800">
                                    <pre className="whitespace-pre leading-relaxed select-all">
                                        {officialXml}
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'focus' && (
                        <div className="space-y-5 max-w-2xl mx-auto">
                            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center text-xl">
                                            ⚡
                                        </div>
                                        <div>
                                            <h3 className="text-base font-black text-gray-900">
                                                Comprovante de Transmissão Focus NFe / SEFAZ
                                            </h3>
                                            <p className="text-xs text-gray-500">
                                                {fiscalMessage || 'Consulte em tempo real ou transmita a NFC-e.'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleConsultFocus}
                                            disabled={isConsulting}
                                            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer disabled:opacity-50"
                                        >
                                            {isConsulting ? '⏳ Consultando...' : '🔄 Consultar na Focus'}
                                        </button>
                                        {rawStatus !== 'autorizado' && rawStatus !== 'cancelado' && (
                                            <button
                                                type="button"
                                                onClick={handleEmitNow}
                                                disabled={isEmitting}
                                                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer disabled:opacity-50"
                                            >
                                                {isEmitting ? '⏳ Transmitindo...' : '🚀 Transmitir Agora'}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Status SEFAZ</span>
                                        <span className="text-gray-900 font-black text-sm flex items-center gap-1 mt-0.5">
                                            {statusBadge.label}
                                        </span>
                                    </div>

                                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Ambiente</span>
                                        <span className="text-gray-900 font-bold text-sm block mt-0.5">
                                            {isProd ? 'Produção (Notas Reais)' : 'Homologação (Ambiente de Testes)'}
                                        </span>
                                    </div>

                                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Protocolo SEFAZ</span>
                                        <span className="text-gray-900 font-mono font-bold text-xs block mt-0.5">
                                            {protocolNumber || 'Não autorizado ainda'}
                                        </span>
                                    </div>

                                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Token ID do CSC</span>
                                        <span className="text-purple-700 font-mono font-bold text-xs block mt-0.5">{cIdToken}</span>
                                    </div>
                                </div>

                                {accessKey && (
                                    <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-purple-900">
                                                Chave de Acesso (44 Dígitos)
                                            </span>
                                            <button
                                                type="button"
                                                onClick={handleCopyKey}
                                                className="text-[10px] text-purple-700 font-bold hover:underline cursor-pointer"
                                            >
                                                {copiedKey ? '✓ Copiado' : 'Copiar Chave'}
                                            </button>
                                        </div>
                                        <div className="font-mono text-xs font-bold text-purple-950 bg-white p-2.5 rounded-xl border border-purple-200 break-all select-all">
                                            {accessKey}
                                        </div>
                                    </div>
                                )}

                                {(consultUrl || danfeUrl) && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                        {consultUrl && (
                                            <a
                                                href={consultUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="py-3 px-4 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2"
                                            >
                                                <span>🌐</span>
                                                <span>Consultar no Portal SEFAZ</span>
                                            </a>
                                        )}
                                        {danfeUrl && (
                                            <a
                                                href={danfeUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="py-3 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2"
                                            >
                                                <span>📄</span>
                                                <span>Abrir DANFE Oficial (Focus NFe)</span>
                                            </a>
                                        )}
                                    </div>
                                )}

                                {rawStatus === 'autorizado' && (
                                    <div className="pt-3 border-t border-gray-100">
                                        {!showCancelForm ? (
                                            <button
                                                type="button"
                                                onClick={() => setShowCancelForm(true)}
                                                className="text-xs font-bold text-red-600 hover:text-red-800 underline cursor-pointer"
                                            >
                                                Cancelar NFC-e na SEFAZ
                                            </button>
                                        ) : (
                                            <form onSubmit={handleCancelNfce} className="bg-red-50 border border-red-200 p-4 rounded-2xl space-y-3">
                                                <label className="block text-xs font-black text-red-900">
                                                    Justificativa de Cancelamento SEFAZ (mínimo 15 caracteres):
                                                </label>
                                                <input
                                                    type="text"
                                                    value={cancelReason}
                                                    onChange={(e) => setCancelReason(e.target.value)}
                                                    placeholder="Ex: Pedido cancelado pelo cliente antes da entrega"
                                                    className="w-full p-2.5 bg-white border border-red-200 rounded-xl text-xs text-gray-900"
                                                    minLength={15}
                                                    required
                                                />
                                                <div className="flex items-center gap-2 justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowCancelForm(false)}
                                                        className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700"
                                                    >
                                                        Voltar
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        disabled={isCanceling}
                                                        className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-black disabled:opacity-50"
                                                    >
                                                        {isCanceling ? 'Cancelando...' : 'Confirmar Cancelamento SEFAZ'}
                                                    </button>
                                                </div>
                                            </form>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="p-4 bg-white border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
                    <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                        <span>🧾 Pedido #{String(orderNum).padStart(3, '0')}</span>
                        <span>•</span>
                        <span>Total: <strong>R$ {displayTotal.toFixed(2)}</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                        {activeTab === 'danfe' && (
                            <button
                                type="button"
                                onClick={handlePrintDanfe}
                                className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                            >
                                <span>🖨️</span>
                                <span>Imprimir DANFE</span>
                            </button>
                        )}
                        {activeTab === 'xml' && officialXml && (
                            <button
                                type="button"
                                onClick={handleDownloadXml}
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                            >
                                <span>📥</span>
                                <span>Baixar XML</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FiscalInvoiceViewModal;
