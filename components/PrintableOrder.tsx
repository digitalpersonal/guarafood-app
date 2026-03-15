
import React from 'react';
import type { Order } from '../types';

interface PrintableOrderProps {
    order: Order;
    printerWidth?: number; // 80 or 58
    printMode?: 'full' | 'kitchen' | 'admin'; // 'full' prints everything, 'kitchen'/'admin' prints only new items
    printedItems?: string[]; // IDs of items already printed (for kitchen mode)
}

const PrintableOrder: React.FC<PrintableOrderProps> = ({ order, printerWidth = 80, printMode = 'full', printedItems = [] }) => {
    const paperSize = `${printerWidth}mm`;
    
    // Filter items for kitchen/admin printing (only new items)
    const itemsToPrint = (printMode === 'kitchen' || printMode === 'admin')
        ? order.items.filter(item => !printedItems.includes(item.id))
        : order.items;

    // If kitchen/admin mode and no new items, don't render anything
    if ((printMode === 'kitchen' || printMode === 'admin') && itemsToPrint.length === 0) {
        return null; 
    }

    // ... (rest of the component logic remains mostly the same, but using itemsToPrint)

    // ÁREAS ÚTEIS SEGURAS:
    // 80mm -> Usamos 62mm de conteúdo útil
    // 58mm -> Usamos 48mm de conteúdo útil
    const contentWidth = printerWidth === 80 ? '65mm' : '44mm';
    
    const baseFontSize = printerWidth === 58 ? '16px' : '13px';
    const headerFontSize = printerWidth === 58 ? '18px' : '15px';
    const titleFontSize = printerWidth === 58 ? '22px' : '22px';
    const smallFontSize = printerWidth === 58 ? '14px' : '11px';
    const lineHeight = printerWidth === 58 ? '1.2' : '1.1';

    const isPixPaid = order.paymentMethod.toLowerCase().includes('pix') && order.paymentStatus === 'paid';
    
    const isPickup = !order.customerAddress || 
                     !order.customerAddress.street ||
                     order.customerAddress.street.includes('Retirada') || 
                     order.customerAddress.street.includes('Consumo Local') ||
                     order.tableNumber !== undefined;

    const displayOrderNum = order.order_number 
        ? `${String(order.order_number).padStart(3, '0')}`
        : `${order.id.substring(order.id.length - 4).toUpperCase()}`;

    return (
        <div id="thermal-receipt-container">
            <style>
                {`
                    @media print {
                        /* CONFIGURAÇÃO BLINDADA - NÃO ALTERAR */
                        /* Esta configuração garante o alinhamento correto e evita páginas em branco. */
                        @page {
                            margin: 0 !important;
                            size: ${paperSize} auto;
                        }
                        body {
                            margin: 0 !important;
                            padding: 0 !important;
                            width: ${paperSize} !important;
                            background: #fff !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        #thermal-receipt-container {
                            width: ${paperSize} !important;
                            margin: 0 auto !important;
                            padding: 0 !important;
                            background: #fff !important;
                            display: flex !important;
                            justify-content: center !important;
                        }
                        #thermal-content {
                            width: ${contentWidth} !important; 
                            margin: 0 auto !important;
                            padding: 4mm 0 !important;
                            box-sizing: border-box !important;
                            background: #fff !important;
                        }
                    }

                    #thermal-content {
                        font-family: 'Courier New', Courier, monospace; 
                        color: #000 !important;
                        line-height: ${lineHeight};
                        background: #fff !important;
                    }

                    #thermal-content * {
                        color: #000 !important;
                        background: #fff !important;
                        word-wrap: break-word !important;
                        overflow-wrap: break-word !important;
                        white-space: normal !important;
                        font-weight: 900 !important;
                    }

                    .receipt-header {
                        text-align: center;
                        margin-bottom: 6px;
                    }

                    .order-number-box {
                        font-size: ${titleFontSize};
                        border: 3px solid #000;
                        display: inline-block;
                        padding: 6px 16px;
                        margin: 6px 0;
                        line-height: 1;
                        text-transform: uppercase;
                    }

                    .mode-indicator {
                        font-size: ${headerFontSize};
                        text-align: center;
                        padding: 6px 0;
                        margin: 4px 0;
                        text-transform: uppercase;
                        border-top: 1.5px solid #000;
                        border-bottom: 1.5px solid #000;
                        display: block;
                        width: 100%;
                    }

                    .section-divider {
                        border-top: 1.5px solid #000;
                        margin: 4px 0;
                    }

                    .label-center {
                        text-align: center;
                        font-size: ${smallFontSize};
                        letter-spacing: 1px;
                        margin: 2px 0;
                    }

                    .item-row {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        width: 100%;
                        margin-bottom: 4px;
                    }

                    .item-price-col {
                        text-align: right;
                        min-width: ${printerWidth === 58 ? '80px' : '75px'};
                        margin-left: 2mm;
                    }

                    .payment-box {
                        border: 2px solid #000;
                        padding: 6px;
                        text-align: center;
                        margin-top: 8px;
                        font-size: ${baseFontSize};
                        text-transform: uppercase;
                    }

                    .condiments-box {
                        border: 1px solid #000;
                        padding: 4px;
                        text-align: center;
                        margin: 4px 0;
                        font-size: ${smallFontSize};
                    }
                `}
            </style>

            <div id="thermal-content">
                {/* CABEÇALHO */}
                <div className="receipt-header">
                    <div style={{ fontSize: headerFontSize, marginBottom: '2px' }}>{order.restaurantName.toUpperCase()}</div>
                    <div style={{ fontSize: smallFontSize }}>
                        {new Date(order.timestamp).toLocaleDateString('pt-BR')} - {new Date(order.timestamp).toLocaleTimeString('pt-BR').substring(0,5)}
                    </div>
                    <div className="order-number-box">
                        {printMode === 'kitchen' ? 'COZINHA / BAR' : printMode === 'admin' ? 'VIA ADMINISTRADOR' : `PEDIDO: ${displayOrderNum}`}
                    </div>
                </div>

                <div className="section-divider"></div>

                {/* MODO DE ENTREGA */}
                <div className="mode-indicator">
                    {order.tableNumber 
                        ? `>> MESA ${order.tableNumber} <<` 
                        : isPickup 
                            ? ">> RETIRADA NO BALCÃO <<" 
                            : ">> ENTREGA EM DOMICÍLIO <<"}
                </div>

                {/* SACHÊS / CONDIMENTOS */}
                {printMode === 'full' && (
                    <div className="condiments-box" style={{ fontWeight: 'bold', fontSize: headerFontSize }}>
                        {order.wantsSachets 
                            ? ">>> ENVIAR SACHÊS: SIM <<<" 
                            : ">>> NÃO ENVIAR SACHÊS <<<"}
                    </div>
                )}

                {/* DADOS DO CLIENTE / ENTREGA */}
                {(order.customerName || order.customerPhone) && (
                    <div style={{ marginTop: '4px', marginBottom: '8px', fontSize: baseFontSize, border: '1.5px solid #000', padding: '6px' }}>
                        <div style={{ fontWeight: '900', textDecoration: 'underline', marginBottom: '4px', fontSize: headerFontSize, textAlign: 'center' }}>
                            {isPickup ? 'DADOS DO CLIENTE' : 'DADOS DE ENTREGA'}
                        </div>
                        {order.customerName && <div style={{ marginBottom: '2px' }}>CLIENTE: {order.customerName.toUpperCase()}</div>}
                        {order.customerPhone && <div style={{ marginBottom: '2px' }}>FONE: {order.customerPhone}</div>}
                        
                        {!isPickup && order.customerAddress && (
                            <>
                                <div style={{ marginBottom: '2px' }}>RUA: {order.customerAddress.street.toUpperCase()}, {order.customerAddress.number}</div>
                                {order.customerAddress.complement && <div style={{ marginBottom: '2px' }}>COMPL: {order.customerAddress.complement.toUpperCase()}</div>}
                                <div style={{ marginBottom: '2px' }}>BAIRRO: {order.customerAddress.neighborhood.toUpperCase()}</div>
                            </>
                        )}
                    </div>
                )}

                {/* VISUALIZAÇÃO APENAS PARA COZINHA/ADMIN (SEM PREÇOS TOTAIS) */}
                {(printMode === 'kitchen' || printMode === 'admin') && (
                     <div style={{ textAlign: 'center', margin: '10px 0', fontSize: headerFontSize, fontWeight: 'bold' }}>
                        *** NOVOS ITENS ***
                     </div>
                )}

                {/* SEÇÃO ITENS */}
                <div className="section-divider"></div>
                <div className="label-center">ITENS</div>
                <div className="section-divider"></div>

                <div style={{ width: '100%', marginBottom: '8px' }}>
                    {itemsToPrint.map((item, index) => (
                        <div key={index} style={{ marginBottom: '6px' }}>
                            <div className="item-row">
                                <div style={{ flex: 1, textTransform: 'uppercase', fontSize: baseFontSize }}>
                                    {item.quantity}X {item.name} {item.sizeName && `(${item.sizeName})`}
                                </div>
                                {/* Hide price in kitchen mode if desired, or keep it. Keeping for now. */}
                                <div className="item-price-col" style={{ fontSize: baseFontSize }}>
                                    {(Number(item.price) * item.quantity).toFixed(2)}
                                </div>
                            </div>
                            
                            {/* ADICIONAIS E OPÇÕES */}
                            {item.selectedOptions?.map((opt, i) => (
                                <div key={i} style={{ fontSize: smallFontSize, paddingLeft: '4mm' }}>+ {opt.optionName.toUpperCase()}</div>
                            ))}
                            {item.selectedAddons?.map((a, i) => (
                                <div key={i} style={{ fontSize: smallFontSize, paddingLeft: '4mm' }}>+ {a.name.toUpperCase()}</div>
                            ))}
                            {item.notes && (
                                <div style={{ fontSize: smallFontSize, borderLeft: '3px solid #000', paddingLeft: '2mm', margin: '2px 0 0 4mm' }}>
                                    OBS: {item.notes.toUpperCase()}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* TOTAIS - APENAS SE NÃO FOR MODO COZINHA */}
                {printMode === 'full' && (
                    <>
                        <div className="section-divider"></div>
                        <div style={{ fontSize: baseFontSize }}>
                            <div className="item-row">
                                <span>SUBTOTAL:</span>
                                <span className="item-price-col">R$ {Number(order.subtotal || 0).toFixed(2)}</span>
                            </div>
                            {!isPickup && (
                                <div className="item-row">
                                    <span>TAXA ENTREGA:</span>
                                    <span className="item-price-col">R$ {Number(order.deliveryFee || 0).toFixed(2)}</span>
                                </div>
                            )}
                            {Number(order.discountAmount || 0) > 0 && (
                                <div className="item-row">
                                    <span>DESCONTO:</span>
                                    <span className="item-price-col">- R$ {Number(order.discountAmount).toFixed(2)}</span>
                                </div>
                            )}
                            <div className="item-row" style={{ fontSize: titleFontSize, marginTop: '4px', borderTop: '1px solid #000', paddingTop: '4px' }}>
                                <span>TOTAL:</span>
                                <span className="item-price-col">R$ {Number(order.totalPrice).toFixed(2)}</span>
                            </div>
                        </div>

                        {/* PAGAMENTO */}
                        <div className="payment-box">
                            <div style={{ fontWeight: 'bold' }}>PGTO: {order.paymentMethod.split('(')[0].trim().toUpperCase()}</div>
                            {(order.changeFor || order.paymentMethod.includes('Troco para')) && (
                                <div style={{ fontSize: headerFontSize, marginTop: '4px', borderTop: '1px dashed #000', paddingTop: '4px', fontWeight: '900' }}>
                                    {order.changeFor 
                                        ? `TROCO PARA: R$ ${order.changeFor.toFixed(2)}`
                                        : (order.paymentMethod.match(/\(([^)]+)\)/)?.[1].toUpperCase() || order.paymentMethod.toUpperCase())
                                    }
                                    {order.changeFor && order.changeFor > order.totalPrice && (
                                        <div style={{ fontSize: smallFontSize, marginTop: '2px' }}>
                                            TROCO: R$ {(order.changeFor - order.totalPrice).toFixed(2)}
                                        </div>
                                    )}
                                </div>
                            )}
                            {isPixPaid && <div style={{ fontSize: smallFontSize, marginTop: '2px' }}>(PAGO PELO APP)</div>}
                        </div>
                    </>
                )}

                {/* RODAPÉ */}
                <div style={{ textAlign: 'center', fontSize: smallFontSize, marginTop: '15px', borderTop: '1px dashed #000', paddingTop: '6px' }}>
                    GUARA-FOOD PDV
                </div>
            </div>
        </div>
    );
};

export default PrintableOrder;
