import React, { useState, useMemo, useEffect } from 'react';
import type { Order, PaymentEntry, Restaurant, Mensalista } from '../types';
import { recordOrderPayment, updateOrderStatus } from '../services/orderService';
import { searchMensalistas } from '../services/mensalistaService';
import { useNotification } from '../hooks/useNotification';

interface MultiComandaPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    orders: Order[];
    tableName?: string | null;
    restaurant: Restaurant | null;
    printerWidth?: number;
    onSuccess: () => void;
}

const MultiComandaPaymentModal: React.FC<MultiComandaPaymentModalProps> = ({
    isOpen,
    onClose,
    orders,
    tableName,
    restaurant,
    printerWidth = 80,
    onSuccess
}) => {
    const { addToast } = useNotification();
    const [paymentMethod, setPaymentMethod] = useState<'Dinheiro' | 'Cartão de Débito' | 'Cartão de Crédito' | 'Pix' | 'Mensalista'>('Dinheiro');
    const [changeFor, setChangeFor] = useState('');
    const [mensalistaSearch, setMensalistaSearch] = useState('');
    const [selectedMensalista, setSelectedMensalista] = useState<Mensalista | null>(null);
    const [mensalistaSuggestions, setMensalistaSuggestions] = useState<Mensalista[]>([]);
    const [closeOrdersAfterPayment, setCloseOrdersAfterPayment] = useState(true);
    const [printReceipt, setPrintReceipt] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);

    // Calculate balances per order
    const orderBalances = useMemo(() => {
        return orders.map(order => {
            const history = order.paymentHistory || [];
            const paid = history.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
            const balance = Math.max(0, Number(order.totalPrice || 0) - paid);
            return {
                order,
                paid,
                balance
            };
        });
    }, [orders]);

    const totalToPay = useMemo(() => {
        return orderBalances.reduce((acc, item) => acc + item.balance, 0);
    }, [orderBalances]);

    // Mensalista search effect
    useEffect(() => {
        const fetchMensalistas = async () => {
            if (paymentMethod === 'Mensalista' && mensalistaSearch.length >= 2 && restaurant?.id) {
                try {
                    const results = await searchMensalistas(restaurant.id, mensalistaSearch);
                    setMensalistaSuggestions(results);
                } catch (e) {
                    console.error('Erro ao buscar mensalistas:', e);
                }
            } else {
                setMensalistaSuggestions([]);
            }
        };
        fetchMensalistas();
    }, [mensalistaSearch, paymentMethod, restaurant?.id]);

    if (!isOpen || orders.length === 0) return null;

    const changeValue = parseFloat(changeFor.replace(',', '.').trim());
    const calculatedChange = !isNaN(changeValue) && changeValue > totalToPay ? changeValue - totalToPay : 0;

    const handleConfirmPayment = async () => {
        if (totalToPay <= 0) {
            addToast({ message: 'As comandas selecionadas já estão quitadas!', type: 'info' });
            return;
        }

        if (paymentMethod === 'Mensalista' && !selectedMensalista) {
            addToast({ message: 'Selecione um cliente mensalista para debitar.', type: 'error' });
            return;
        }

        setIsProcessing(true);

        try {
            let finalMethodString = paymentMethod;
            let mensalistaId: string | undefined = undefined;

            if (paymentMethod === 'Dinheiro' && changeFor && calculatedChange > 0) {
                finalMethodString = `Dinheiro (Troco p/ R$ ${changeValue.toFixed(2)})` as any;
            } else if (paymentMethod === 'Mensalista' && selectedMensalista) {
                finalMethodString = `Mensalista (${selectedMensalista.name})` as any;
                mensalistaId = selectedMensalista.id;
            }

            const timestamp = new Date().toISOString();

            // Process payment for each comanda
            for (const item of orderBalances) {
                if (item.balance <= 0) continue;

                const entry: PaymentEntry = {
                    amount: item.balance,
                    method: finalMethodString,
                    timestamp
                };

                const newTotalPaid = item.paid + item.balance;
                await recordOrderPayment(item.order.id, entry, newTotalPaid, item.order.totalPrice, mensalistaId);

                if (closeOrdersAfterPayment) {
                    await updateOrderStatus(item.order.id, 'Entregue');
                }
            }

            // Sync with all listeners
            window.dispatchEvent(new Event('guarafood:update-orders'));

            addToast({
                message: `🎉 Pagamento consolidado de R$ ${totalToPay.toFixed(2)} recebido! ${orders.length} comandas quitadas!`,
                type: 'success',
                duration: 5000
            });

            // Print unified receipt if selected
            if (printReceipt) {
                setIsPrinting(true);
                setTimeout(() => {
                    window.print();
                    setIsPrinting(false);
                    onSuccess();
                    onClose();
                }, 350);
            } else {
                onSuccess();
                onClose();
            }
        } catch (error: any) {
            console.error('Erro no pagamento agrupado:', error);
            addToast({ message: `Erro ao processar: ${error.message || 'Falha no pagamento'}`, type: 'error' });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-3 sm:p-4">
                <div 
                    className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-5 bg-gradient-to-r from-orange-600 to-amber-600 text-white flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shadow-inner">
                                💳
                            </div>
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight">
                                    Pagar Múltiplas Comandas
                                </h3>
                                <p className="text-xs text-orange-100 font-bold">
                                    {tableName ? `Mesa ${tableName} • ` : ''}
                                    {orders.length} {orders.length === 1 ? 'comanda selecionada' : 'comandas selecionadas'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={isProcessing}
                            className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-all"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
                        {/* List of Comandas being paid */}
                        <div>
                            <label className="text-xs font-black text-gray-500 uppercase tracking-wider block mb-2">
                                Comandas Selecionadas para Acerto:
                            </label>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {orderBalances.map(({ order, paid, balance }) => (
                                    <div 
                                        key={order.id}
                                        className="p-3 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between hover:bg-orange-50/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 bg-orange-100 text-orange-700 font-black text-sm rounded-xl flex items-center justify-center flex-shrink-0">
                                                {order.comandaNumber ? `C${order.comandaNumber}` : `#${String(order.order_number || '').padStart(3, '0')}`}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-black text-gray-800 text-sm uppercase truncate">
                                                    {order.customerName || 'Cliente'}
                                                </h4>
                                                <p className="text-[11px] text-gray-500 truncate">
                                                    {order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'itens'}: {order.items?.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0 pl-3">
                                            <p className="text-sm font-black text-gray-900">
                                                R$ {balance.toFixed(2)}
                                            </p>
                                            {paid > 0 && (
                                                <p className="text-[10px] text-green-600 font-bold">
                                                    Pago: R$ {paid.toFixed(2)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Grand Total Banner */}
                        <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-4 rounded-2xl text-white shadow-lg shadow-orange-500/20 flex items-center justify-between">
                            <div>
                                <span className="text-xs uppercase font-bold tracking-wider text-orange-100">
                                    Total Agrupado a Receber
                                </span>
                                <p className="text-3xl font-black tracking-tight">
                                    R$ {totalToPay.toFixed(2)}
                                </p>
                            </div>
                            <span className="text-xs font-black bg-white/20 px-3 py-1.5 rounded-xl uppercase tracking-wider backdrop-blur-md">
                                {orders.length} Contas
                            </span>
                        </div>

                        {/* Payment Method Selector */}
                        <div>
                            <label className="text-xs font-black text-gray-700 uppercase tracking-wider block mb-2">
                                Forma de Pagamento
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {(['Dinheiro', 'Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Mensalista'] as const).map(method => (
                                    <button
                                        key={method}
                                        type="button"
                                        onClick={() => setPaymentMethod(method)}
                                        className={`py-3 px-3 rounded-2xl font-black text-xs uppercase transition-all flex items-center justify-center gap-2 border-2 ${
                                            paymentMethod === method
                                                ? 'bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-600/20 scale-[1.02]'
                                                : 'bg-white text-gray-700 border-gray-200 hover:border-orange-200 hover:bg-orange-50/30'
                                        }`}
                                    >
                                        <span>
                                            {method === 'Dinheiro' && '💵'}
                                            {method === 'Pix' && '📱'}
                                            {method.includes('Crédito') && '💳'}
                                            {method.includes('Débito') && '💳'}
                                            {method === 'Mensalista' && '👤'}
                                        </span>
                                        <span className="truncate">{method}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Dinheiro (Troco) */}
                        {paymentMethod === 'Dinheiro' && (
                            <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 space-y-3">
                                <label className="text-xs font-bold text-amber-900 block">
                                    Troco para quanto? (Deixe em branco se for valor exato)
                                </label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">R$</span>
                                        <input
                                            type="text"
                                            value={changeFor}
                                            onChange={(e) => setChangeFor(e.target.value)}
                                            placeholder="Ex: 100,00"
                                            className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-amber-300 font-black text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                                        />
                                    </div>
                                    {/* Preset bill buttons */}
                                    {[50, 100, 200].map(val => (
                                        val >= totalToPay && (
                                            <button
                                                key={val}
                                                type="button"
                                                onClick={() => setChangeFor(val.toString())}
                                                className="px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-black text-amber-900 hover:bg-amber-100 transition-colors"
                                            >
                                                R$ {val}
                                            </button>
                                        )
                                    ))}
                                </div>
                                {calculatedChange > 0 && (
                                    <div className="p-2.5 bg-green-100 border border-green-300 rounded-xl flex items-center justify-between text-green-900 font-black text-sm">
                                        <span>Troco a devolver:</span>
                                        <span className="text-lg">R$ {calculatedChange.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Mensalista Selection */}
                        {paymentMethod === 'Mensalista' && (
                            <div className="bg-blue-50/80 p-4 rounded-2xl border border-blue-200 space-y-3">
                                <label className="text-xs font-black text-blue-900 uppercase block">
                                    Buscar Cliente Mensalista
                                </label>
                                <input
                                    type="text"
                                    value={mensalistaSearch}
                                    onChange={(e) => setMensalistaSearch(e.target.value)}
                                    placeholder="Digite o nome ou telefone do mensalista..."
                                    className="w-full px-3 py-2.5 rounded-xl border border-blue-300 font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                />
                                {mensalistaSuggestions.length > 0 && (
                                    <div className="max-h-36 overflow-y-auto space-y-1 bg-white p-2 rounded-xl border border-blue-200 shadow-sm">
                                        {mensalistaSuggestions.map(m => (
                                            <button
                                                key={m.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedMensalista(m);
                                                    setMensalistaSearch(m.name);
                                                    setMensalistaSuggestions([]);
                                                }}
                                                className={`w-full text-left p-2 rounded-lg text-xs flex justify-between items-center transition-colors ${
                                                    selectedMensalista?.id === m.id ? 'bg-blue-600 text-white font-bold' : 'hover:bg-blue-50 text-gray-800'
                                                }`}
                                            >
                                                <span>{m.name} ({m.phone})</span>
                                                <span className="font-mono">Saldo: R$ {(m.balance || 0).toFixed(2)}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {selectedMensalista && (
                                    <div className="p-2.5 bg-blue-100 rounded-xl text-xs text-blue-950 font-bold flex items-center justify-between">
                                        <span>Debitando na conta de: <strong>{selectedMensalista.name}</strong></span>
                                        <button 
                                            type="button" 
                                            onClick={() => { setSelectedMensalista(null); setMensalistaSearch(''); }}
                                            className="text-red-600 hover:underline"
                                        >
                                            Trocar
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Options */}
                        <div className="space-y-2 pt-2 border-t">
                            <label className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl cursor-pointer transition-colors border">
                                <input
                                    type="checkbox"
                                    checked={closeOrdersAfterPayment}
                                    onChange={(e) => setCloseOrdersAfterPayment(e.target.checked)}
                                    className="w-5 h-5 text-orange-600 rounded-lg focus:ring-orange-500 border-gray-300"
                                />
                                <div className="text-left">
                                    <span className="text-sm font-black text-gray-800 block">
                                        Encerrar estas comandas após o pagamento
                                    </span>
                                    <span className="text-xs text-gray-500 block">
                                        Dá baixa nas comandas quitadas liberando os lugares/pessoas.
                                    </span>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl cursor-pointer transition-colors border">
                                <input
                                    type="checkbox"
                                    checked={printReceipt}
                                    onChange={(e) => setPrintReceipt(e.target.checked)}
                                    className="w-5 h-5 text-orange-600 rounded-lg focus:ring-orange-500 border-gray-300"
                                />
                                <div className="text-left">
                                    <span className="text-sm font-black text-gray-800 block">
                                        Imprimir comprovante unificado das comandas
                                    </span>
                                    <span className="text-xs text-gray-500 block">
                                        Emite o comprovante térmico consolidado para o pagador.
                                    </span>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 sm:p-5 border-t bg-gray-50 flex items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isProcessing}
                            className="px-5 py-3 rounded-2xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                        >
                            Cancelar
                        </button>

                        <button
                            type="button"
                            onClick={handleConfirmPayment}
                            disabled={isProcessing || totalToPay <= 0}
                            className="flex-1 max-w-sm py-3.5 px-6 rounded-2xl bg-green-600 hover:bg-green-700 active:scale-95 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-green-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                    </svg>
                                    <span>Processando...</span>
                                </>
                            ) : (
                                <>
                                    <span>Confirmar Recebimento R$ {totalToPay.toFixed(2)}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Thermal Print Receipt for Unified Bill */}
            {isPrinting && (
                <div id="thermal-receipt-container" className="hidden print:block">
                    <style dangerouslySetInnerHTML={{ __html: `
                        @page { margin: 0; size: ${printerWidth}mm auto; }
                        html, body { margin: 0; padding: 0; width: ${printerWidth}mm; background: white; }
                        body * { display: none !important; }
                        #thermal-receipt-container, #thermal-receipt-container * { display: block !important; visibility: visible !important; }
                        #thermal-receipt-container { position: absolute; left: 0; top: 0; width: ${printerWidth}mm; font-family: monospace; padding: 4px; }
                    `}} />
                    <div className="text-center font-bold">
                        <h2 className="text-lg font-black uppercase">{restaurant?.name || 'GUARAFOOD'}</h2>
                        <p className="text-xs uppercase">COMPROVANTE DE PAGAMENTO AGRUPADO</p>
                        {tableName && <p className="text-sm font-black border-y border-black py-1 my-1">MESA {tableName}</p>}
                        <p className="text-[10px]">{new Date().toLocaleString('pt-BR')}</p>
                    </div>
                    <div className="border-t border-dashed border-black my-2"></div>
                    <div className="text-xs font-bold space-y-1">
                        <p className="uppercase text-[11px] font-black">COMANDAS QUITADAS ({orders.length}):</p>
                        {orderBalances.map(({ order, balance }) => (
                            <div key={order.id} className="border-b border-dotted pb-1 mb-1">
                                <div className="flex justify-between font-black">
                                    <span>CMD {order.comandaNumber || order.id.slice(-4)} - {order.customerName?.toUpperCase()}</span>
                                    <span>R$ {balance.toFixed(2)}</span>
                                </div>
                                {order.items?.map((it, idx) => (
                                    <div key={idx} className="flex justify-between text-[10px] font-normal pl-2">
                                        <span>{it.quantity}x {it.name}</span>
                                        <span>R$ {(it.price * it.quantity).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                    <div className="border-t border-dashed border-black my-2"></div>
                    <div className="text-sm font-black space-y-1">
                        <div className="flex justify-between">
                            <span>TOTAL PAGO:</span>
                            <span>R$ {totalToPay.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold">
                            <span>FORMA DE PGTO:</span>
                            <span>{paymentMethod}</span>
                        </div>
                        {calculatedChange > 0 && (
                            <div className="flex justify-between text-xs font-bold">
                                <span>TROCO ENTREGUE:</span>
                                <span>R$ {calculatedChange.toFixed(2)}</span>
                            </div>
                        )}
                    </div>
                    <div className="border-t border-dashed border-black my-2"></div>
                    <div className="text-center text-[10px] uppercase font-bold">
                        Obrigado pela preferência! Volte sempre!
                    </div>
                </div>
            )}
        </>
    );
};

export default MultiComandaPaymentModal;
