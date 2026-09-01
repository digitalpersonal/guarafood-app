import React from 'react';
import { createPortal } from 'react-dom';
import type { Order } from '../types';

interface PrintableOrderProps {
    order: Order;
    printerWidth?: number; // 80 or 58
    printMode?: 'full' | 'kitchen' | 'admin'; // 'full' prints everything, 'kitchen'/'admin' prints only new items
    printedItems?: string[]; // IDs of items already printed (for kitchen mode)
}

const sanitizePrintText = (str?: string): string => {
    if (!str) return '';
    return str
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/[–—]/g, '-')
        .trim();
};

const PrintableOrder: React.FC<PrintableOrderProps> = ({ order, printerWidth = 80, printMode = 'full', printedItems = [] }) => {
    const paperSize = `${printerWidth}mm`;
    
    // Filter items for kitchen/admin printing (only new items)
    const itemsToPrint = (printMode === 'kitchen' || printMode === 'admin')
        ? (order.items || []).filter(item => !printedItems.includes(item.id))
        : (order.items || []);

    // If no items to print, don't render anything to avoid blank prints
    if (itemsToPrint.length === 0) {
        return null; 
    }

    // Precise side padding tailored for thermal print heads (avoiding 58mm right clipping)
    // 58mm paper has ~48mm printable width. 2mm padding on each side = 54mm content box.
    const sidePadding = printerWidth === 58 ? '2mm' : '4mm';
    
    const baseFontSize = printerWidth === 58 ? '13px' : '13px';
    const headerFontSize = printerWidth === 58 ? '15px' : '15px';
    const titleFontSize = printerWidth === 58 ? '16px' : '18px';
    const smallFontSize = printerWidth === 58 ? '11px' : '11px';
    const lineHeight = printerWidth === 58 ? '1.15' : '1.1';

    const isPixPaid = order.paymentMethod.toLowerCase().includes('pix') && order.paymentStatus === 'paid';
    
    const isPickup = !order.customerAddress || 
                     !order.customerAddress.street ||
                     order.customerAddress.street.includes('Retirada') || 
                     order.customerAddress.street.includes('Consumo Local') ||
                     order.tableNumber !== undefined;

    const displayOrderNum = order.order_number 
        ? `${String(order.order_number).padStart(3, '0')}`
        : `${order.id.substring(order.id.length - 4).toUpperCase()}`;

    const displaySubtotal = Number(order.subtotal) > 0 
        ? Number(order.subtotal) 
        : (order.items || []).reduce((acc, item) => acc + (Number(item.price || 0) * (item.quantity || 1)), 0);
    
    const displayTotal = Number(order.totalPrice) > 0 
        ? Number(order.totalPrice) 
        : (displaySubtotal + Number(order.deliveryFee || 0) - Number(order.discountAmount || 0));

    const content = (
        <div id="thermal-receipt-container">
            <style dangerouslySetInnerHTML={{ __html: `
                @media screen {
                    #thermal-receipt-container {
                        display: none !important;
                    }
                }

                @media print {
                    @page {
                        margin: 0 !important;
                        size: ${paperSize} auto;
                    }
                    
                    /* Aggressive reset for printing */
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        width: ${paperSize} !important;
                        height: auto !important;
                        min-height: 0 !important;
                        overflow: visible !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    /* Hide everything on the page */
                    body * {
                        display: none !important;
                    }

                    /* Show ONLY the thermal container and its children */
                    #thermal-receipt-container, 
                    #thermal-receipt-container *,
                    body > #thermal-receipt-container,
                    body > #thermal-receipt-container * {
                        display: block !important;
                        visibility: visible !important;
                    }

                    /* Explicitly keep tables behaving correctly */
                    #thermal-receipt-container table {
                        display: table !important;
                    }
                    #thermal-receipt-container tr {
                        display: table-row !important;
                    }
                    #thermal-receipt-container th,
                    #thermal-receipt-container td {
                        display: table-cell !important;
                    }

                    /* CRITICAL: Explicitly hide the style tag itself from the print output */
                    #thermal-receipt-container style {
                        display: none !important;
                    }

                    #thermal-receipt-container {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: ${paperSize} !important;
                        max-width: ${paperSize} !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        z-index: 999999 !important;
                        box-sizing: border-box !important;
                    }

                    #thermal-content {
                        width: 100% !important;
                        max-width: ${paperSize} !important;
                        margin: 0 !important;
                        padding: 1mm ${sidePadding} 6mm ${sidePadding} !important;
                        box-sizing: border-box !important;
                    }

                    .section-divider {
                        border-top: 1px dashed black !important;
                        margin: 3px 0 !important;
                        width: 100% !important;
                        height: 1px !important;
                        display: block !important;
                    }

                    /* Prevent items from being split across page breaks if they occur */
                    .item-row, .receipt-header, .payment-box, .condiments-box {
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                    }

                    /* Fix for some browsers that add headers/footers */
                    header, footer, nav {
                        display: none !important;
                    }
                }

                #thermal-content {
                    font-family: 'Courier New', Courier, monospace, Arial, sans-serif; 
                    color: #000 !important;
                    line-height: ${lineHeight};
                    background: #fff !important;
                    width: ${paperSize};
                    max-width: ${paperSize};
                    padding: 4px ${sidePadding} 30px ${sidePadding};
                    box-sizing: border-box;
                    margin: 0 auto;
                }

                #thermal-content * {
                    color: #000 !important;
                    background: #fff !important;
                    word-wrap: break-word !important;
                    overflow-wrap: break-word !important;
                    white-space: normal !important;
                    font-weight: 700 !important;
                    box-sizing: border-box !important;
                }

                .receipt-header {
                    text-align: center;
                    margin-bottom: 4px;
                }

                .order-number-box {
                    font-size: ${titleFontSize};
                    border: 2px solid #000;
                    display: inline-block;
                    padding: 4px 10px;
                    margin: 4px 0;
                    line-height: 1;
                    text-transform: uppercase;
                }

                .mode-indicator {
                    font-size: ${headerFontSize};
                    text-align: center;
                    padding: 4px 0;
                    margin: 3px 0;
                    text-transform: uppercase;
                    border-top: 1px solid #000;
                    border-bottom: 1px solid #000;
                    display: block;
                    width: 100%;
                }

                .section-divider {
                    border-top: 1px solid #000;
                    margin: 3px 0;
                }

                .label-center {
                    text-align: center;
                    font-size: ${smallFontSize};
                    letter-spacing: 0.5px;
                    margin: 2px 0;
                }

                .payment-box {
                    border: 1.5px solid #000;
                    padding: 4px;
                    text-align: center;
                    margin-top: 6px;
                    font-size: ${baseFontSize};
                    text-transform: uppercase;
                }

                .condiments-box {
                    border: 1px solid #000;
                    padding: 3px;
                    text-align: center;
                    margin: 3px 0;
                    font-size: ${smallFontSize};
                }
            ` }} />

            <div id="thermal-content">
                {/* CABEÇALHO */}
                <div className="receipt-header">
                    <div style={{ fontSize: headerFontSize, marginBottom: '2px' }}>{sanitizePrintText(order.restaurantName).toUpperCase()}</div>
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
                    <div style={{ marginTop: '3px', marginBottom: '6px', fontSize: baseFontSize, border: '1px solid #000', padding: '4px' }}>
                        <div style={{ fontWeight: '900', textDecoration: 'underline', marginBottom: '3px', fontSize: headerFontSize, textAlign: 'center' }}>
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
                     <div style={{ textAlign: 'center', margin: '6px 0', fontSize: headerFontSize, fontWeight: 'bold' }}>
                        *** NOVOS ITENS ***
                     </div>
                )}

                {/* SEÇÃO ITENS */}
                <div className="section-divider"></div>
                <div className="label-center">ITENS DO PEDIDO</div>
                <div className="section-divider"></div>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
                    <tbody>
                        {itemsToPrint.map((item, index) => (
                            <React.Fragment key={index}>
                                <tr>
                                    <td style={{ textAlign: 'left', verticalAlign: 'top', textTransform: 'uppercase', fontSize: baseFontSize, paddingBottom: '3px', paddingRight: '2px' }}>
                                        {item.quantity}x {item.name} {item.sizeName && `(${item.sizeName})`} {item.weight && item.isKiloItem && `(${Number(item.weight).toFixed(3)}kg)`}
                                    </td>
                                    <td style={{ textAlign: 'right', verticalAlign: 'top', fontSize: baseFontSize, whiteSpace: 'nowrap', paddingBottom: '3px', width: printerWidth === 58 ? '45px' : '55px' }}>
                                        {(Number(item.price) * item.quantity).toFixed(2)}
                                    </td>
                                </tr>
                                {(item.selectedOptions?.length || item.selectedAddons?.length || item.notes) ? (
                                    <tr>
                                        <td colSpan={2} style={{ paddingLeft: '3mm', paddingBottom: '4px' }}>
                                            {item.selectedOptions?.map((opt, i) => (
                                                <div key={i} style={{ fontSize: smallFontSize }}>• {opt.groupTitle.toUpperCase()}: {opt.optionName.toUpperCase()} {opt.price > 0 ? `(+R$ ${Number(opt.price).toFixed(2)})` : ''}</div>
                                            ))}
                                            {item.selectedAddons?.map((a, i) => (
                                                <div key={i} style={{ fontSize: smallFontSize }}>+ {a.name.toUpperCase()}</div>
                                            ))}
                                            {item.notes && (
                                                <div style={{ fontSize: smallFontSize, borderLeft: '2px solid #000', paddingLeft: '2mm', marginTop: '1px' }}>
                                                    OBS: {item.notes.toUpperCase()}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ) : null}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>

                {/* TOTAIS - APENAS SE NÃO FOR MODO COZINHA */}
                {printMode === 'full' && (
                    <>
                        <div className="section-divider"></div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: baseFontSize }}>
                            <tbody>
                                <tr>
                                    <td style={{ textAlign: 'left', paddingBottom: '2px' }}>SUBTOTAL:</td>
                                    <td style={{ textAlign: 'right', paddingBottom: '2px', whiteSpace: 'nowrap' }}>R$ {displaySubtotal.toFixed(2)}</td>
                                </tr>
                                {!isPickup && (
                                    <tr>
                                        <td style={{ textAlign: 'left', paddingBottom: '2px' }}>TAXA ENTREGA:</td>
                                        <td style={{ textAlign: 'right', paddingBottom: '2px', whiteSpace: 'nowrap' }}>R$ {Number(order.deliveryFee || 0).toFixed(2)}</td>
                                    </tr>
                                )}
                                {Number(order.discountAmount || 0) > 0 && (
                                    <tr>
                                        <td style={{ textAlign: 'left', paddingBottom: '2px' }}>DESCONTO:</td>
                                        <td style={{ textAlign: 'right', paddingBottom: '2px', whiteSpace: 'nowrap' }}>- R$ {Number(order.discountAmount).toFixed(2)}</td>
                                    </tr>
                                )}
                                <tr>
                                    <td colSpan={2} style={{ padding: '0' }}><div className="section-divider" style={{ margin: '2px 0' }}></div></td>
                                </tr>
                                <tr>
                                    <td style={{ textAlign: 'left', fontSize: titleFontSize, fontWeight: '900', paddingTop: '2px' }}>TOTAL:</td>
                                    <td style={{ textAlign: 'right', fontSize: titleFontSize, fontWeight: '900', paddingTop: '2px', whiteSpace: 'nowrap' }}>R$ {displayTotal.toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>

                        {/* PAGAMENTO */}
                        <div className="payment-box">
                            <div style={{ fontWeight: 'bold' }}>PGTO: {order.paymentMethod.split('(')[0].trim().toUpperCase()}</div>
                            {(order.changeFor || order.paymentMethod.includes('Troco para')) && (
                                <div style={{ fontSize: headerFontSize, marginTop: '3px', borderTop: '1px dashed #000', paddingTop: '3px', fontWeight: '900' }}>
                                    {order.changeFor 
                                        ? `TROCO PARA: R$ ${order.changeFor.toFixed(2)}`
                                        : (order.paymentMethod.match(/\(([^)]+)\)/)?.[1].toUpperCase() || order.paymentMethod.toUpperCase())
                                    }
                                    {order.changeFor && order.changeFor > displayTotal && (
                                        <div style={{ fontSize: smallFontSize, marginTop: '1px' }}>
                                            TROCO: R$ {(order.changeFor - displayTotal).toFixed(2)}
                                        </div>
                                    )}
                                </div>
                            )}
                            {isPixPaid && <div style={{ fontSize: smallFontSize, marginTop: '2px' }}>(PAGO PELO APP)</div>}
                        </div>
                    </>
                )}

                {/* RODAPÉ */}
                <div style={{ textAlign: 'center', fontSize: smallFontSize, marginTop: '10px', borderTop: '1px dashed #000', paddingTop: '4px' }}>
                    GUARA-FOOD PDV
                </div>
            </div>
        </div>
    );

    return createPortal(content, document.body);
};

export default PrintableOrder;
