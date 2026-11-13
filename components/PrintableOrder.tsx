import React from 'react';
import type { Order, Restaurant } from '../types';

import FiscalDanfeReceipt from './FiscalDanfeReceipt';

interface PrintableOrderProps {
    order: Order;
    printerWidth?: number; // 80 or 58
    printMode?: 'full' | 'kitchen' | 'admin' | 'fiscal'; 
    printedItems?: string[]; // IDs of items already printed (for kitchen mode)
    restaurant?: Restaurant | null;
}

const sanitizePrintText = (str?: string): string => {
    if (!str) return '';
    return str
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/[–—]/g, '-')
        .trim();
};

const PrintableOrder: React.FC<PrintableOrderProps> = ({ order, printerWidth = 80, printMode = 'full', printedItems = [], restaurant }) => {
    const paperSize = `${printerWidth}mm`;

    const sidePadding = printerWidth === 58 ? '1mm' : '2mm';
    const baseFontSize = printerWidth === 58 ? '13px' : '14px';
    const headerFontSize = printerWidth === 58 ? '14px' : '15px';
    const titleFontSize = printerWidth === 58 ? '17px' : '19px';
    const smallFontSize = printerWidth === 58 ? '11px' : '12px';
    const lineHeight = printerWidth === 58 ? '1.2' : '1.15';

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

    if (printMode === 'fiscal') {
        return (
            <div
                id="thermal-receipt-container"
                style={{
                    width: paperSize,
                    maxWidth: paperSize,
                    margin: 0,
                    padding: `1mm ${sidePadding} 3mm ${sidePadding}`,
                    backgroundColor: '#fff',
                    color: '#000',
                    boxSizing: 'border-box',
                }}
            >
                <FiscalDanfeReceipt
                    order={order}
                    restaurant={restaurant}
                    printerWidth={printerWidth}
                />
            </div>
        );
    }

    // Filter items for kitchen/admin printing (only new items)
    const itemsToPrint = (printMode === 'kitchen' || printMode === 'admin')
        ? (order.items || []).filter(item => !printedItems.includes(item.id))
        : (order.items || []);

    // If no items to print, don't render anything to avoid blank prints
    if (itemsToPrint.length === 0) {
        return null; 
    }

    return (
        <div id="thermal-receipt-container">
            <style dangerouslySetInnerHTML={{ __html: `
                #thermal-content {
                    font-family: Arial, Helvetica, -apple-system, sans-serif; 
                    color: #000 !important;
                    line-height: ${lineHeight};
                    background: #fff !important;
                    width: ${paperSize};
                    max-width: ${paperSize};
                    padding: 1mm ${sidePadding} 3mm ${sidePadding};
                    box-sizing: border-box;
                    margin: 0;
                }

                #thermal-content * {
                    color: #000 !important;
                    background: #fff !important;
                    word-wrap: break-word !important;
                    overflow-wrap: anywhere !important;
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
                    line-height: 1.1;
                    font-weight: 900 !important;
                    text-transform: uppercase;
                }

                .mode-indicator {
                    font-size: ${headerFontSize};
                    font-weight: 900 !important;
                    text-align: center;
                    padding: 4px 0;
                    margin: 3px 0;
                    text-transform: uppercase;
                    border-top: 1.5px solid #000;
                    border-bottom: 1.5px solid #000;
                    display: block;
                    width: 100%;
                }

                .section-divider {
                    border-top: 1px dashed #000;
                    margin: 3px 0;
                    width: 100%;
                    height: 1px;
                }

                .label-center {
                    text-align: center;
                    font-size: ${smallFontSize};
                    font-weight: 900 !important;
                    letter-spacing: 0.5px;
                    margin: 2px 0;
                }

                .payment-box {
                    border: 2px solid #000;
                    padding: 5px;
                    text-align: center;
                    margin-top: 6px;
                    font-size: ${baseFontSize};
                    text-transform: uppercase;
                }

                .condiments-box {
                    border: 1.5px solid #000;
                    padding: 4px;
                    text-align: center;
                    margin: 3px 0;
                    font-size: ${headerFontSize};
                    font-weight: 900 !important;
                }

                .item-row, .receipt-header, .payment-box, .condiments-box {
                    break-inside: avoid;
                    page-break-inside: avoid;
                }
            ` }} />

            <div id="thermal-content">
                {/* CABEÇALHO */}
                <div className="receipt-header">
                    <div style={{ fontSize: headerFontSize, fontWeight: '900', marginBottom: '2px' }}>{sanitizePrintText(order.restaurantName).toUpperCase()}</div>
                    <div style={{ fontSize: smallFontSize, fontWeight: 'bold', marginBottom: '4px' }}>
                        {new Date(order.timestamp).toLocaleDateString('pt-BR')} - {new Date(order.timestamp).toLocaleTimeString('pt-BR').substring(0,5)}
                    </div>
                    <div className="order-number-box">
                        {printMode === 'kitchen' ? 'COZINHA / BAR' : printMode === 'admin' ? 'VIA ADMINISTRADOR' : `PEDIDO: ${displayOrderNum}`}
                    </div>
                </div>

                <div className="section-divider"></div>

                {/* MODO DE ENTREGA */}
                <div className="mode-indicator" style={{ border: '2px solid #000', margin: '4px 0', padding: '4px' }}>
                    {order.tableNumber 
                        ? `>> MESA ${order.tableNumber} <<` 
                        : isPickup 
                            ? ">> RETIRADA NO BALCÃO <<" 
                            : ">> ENTREGA EM DOMICÍLIO <<"}
                </div>

                {/* SACHÊS / CONDIMENTOS */}
                {printMode === 'full' && (
                    <div className="condiments-box" style={{ border: '2px solid #000', margin: '4px 0', padding: '4px', textAlign: 'center' }}>
                        {order.wantsSachets 
                            ? ">>> ENVIAR SACHÊS <<<" 
                            : ">>> NÃO ENVIAR SACHÊS <<<"}
                    </div>
                )}

                {/* DADOS DO CLIENTE / ENTREGA */}
                {(order.customerName || order.customerPhone) && (
                    <div style={{ marginTop: '2px', marginBottom: '4px', fontSize: baseFontSize, border: '2px solid #000', padding: '3px' }}>
                        <div style={{ fontWeight: '900', textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '2px', marginBottom: '3px' }}>
                            {isPickup ? 'DADOS DO CLIENTE' : 'DADOS DE ENTREGA'}
                        </div>
                        <div style={{ marginBottom: '1px' }}><strong>CLIENTE:</strong> {order.customerName?.toUpperCase()}</div>
                        <div style={{ marginBottom: '1px' }}><strong>FONE:</strong> {order.customerPhone}</div>
                        
                        {!isPickup && order.customerAddress && (
                            <div style={{ marginBottom: '1px' }}>
                                <strong>END: </strong>
                                {order.customerAddress.street.toUpperCase()}, {order.customerAddress.number}
                                {order.customerAddress.complement && `, ${order.customerAddress.complement.toUpperCase()}`}
                                {order.customerAddress.neighborhood && ` - ${order.customerAddress.neighborhood.toUpperCase()}`}
                            </div>
                        )}
                    </div>
                )}

                {/* VISUALIZAÇÃO APENAS PARA COZINHA/ADMIN (SEM PREÇOS TOTAIS) */}
                {(printMode === 'kitchen' || printMode === 'admin') && (
                     <div style={{ textAlign: 'center', margin: '6px 0', fontSize: headerFontSize, fontWeight: '900' }}>
                        *** NOVOS ITENS ***
                     </div>
                )}

                {/* SEÇÃO ITENS */}
                <div className="section-divider"></div>
                <div className="label-center">ITENS DO PEDIDO</div>
                <div className="section-divider"></div>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px', tableLayout: 'fixed' }}>
                    <tbody>
                        {itemsToPrint.map((item, index) => (
                            <React.Fragment key={index}>
                                <tr>
                                    <td style={{ 
                                        textAlign: 'left', 
                                        verticalAlign: 'top', 
                                        textTransform: 'uppercase', 
                                        fontSize: headerFontSize, 
                                        paddingBottom: '3px', 
                                        paddingRight: '4px', 
                                        fontWeight: '900'
                                    }}>
                                        {item.quantity}x {item.name} {item.sizeName && `(${item.sizeName})`} {item.weight && item.isKiloItem && `(${Number(item.weight).toFixed(3)}kg)`}
                                    </td>
                                    <td style={{ 
                                        textAlign: 'right', 
                                        verticalAlign: 'top', 
                                        fontSize: headerFontSize, 
                                        whiteSpace: 'nowrap', 
                                        paddingBottom: '3px', 
                                        fontWeight: '900',
                                        width: '60px'
                                    }}>
                                        {(Number(item.price) * item.quantity).toFixed(2)}
                                    </td>
                                </tr>
                                {(item.selectedOptions?.length || item.selectedAddons?.length || item.notes) ? (
                                    <tr>
                                        <td colSpan={2} style={{ paddingLeft: '2mm', paddingBottom: '5px' }}>
                                            {item.selectedOptions?.map((opt, i) => (
                                                <div key={i} style={{ fontSize: smallFontSize }}>• {opt.groupTitle.toUpperCase()}: {opt.optionName.toUpperCase()} {opt.price > 0 ? `(+R$ ${Number(opt.price).toFixed(2)})` : ''}</div>
                                            ))}
                                            {item.selectedAddons?.map((a, i) => (
                                                <div key={i} style={{ fontSize: smallFontSize }}>+ {a.name.toUpperCase()}</div>
                                            ))}
                                            {item.notes && (
                                                <div style={{ fontSize: baseFontSize, borderLeft: '3px solid #000', paddingLeft: '2mm', marginTop: '2px', fontWeight: '900', whiteSpace: 'normal' }}>
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
                                    <td colSpan={2} style={{ padding: '0' }}><div className="section-divider" style={{ margin: '3px 0' }}></div></td>
                                </tr>
                                <tr>
                                    <td style={{ textAlign: 'left', fontSize: titleFontSize, fontWeight: '900', paddingTop: '2px' }}>TOTAL:</td>
                                    <td style={{ textAlign: 'right', fontSize: titleFontSize, fontWeight: '900', paddingTop: '2px', whiteSpace: 'nowrap' }}>R$ {displayTotal.toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>

                        {/* PAGAMENTO */}
                        <div className="payment-box">
                            <div style={{ fontWeight: '900' }}>FORMA PGTO: {order.paymentMethod.split('(')[0].trim().toUpperCase()}</div>
                            {(order.changeFor || order.paymentMethod.includes('Troco para')) && (
                                <div style={{ fontSize: headerFontSize, marginTop: '3px', borderTop: '1.5px dashed #000', paddingTop: '3px', fontWeight: '900' }}>
                                    {order.changeFor 
                                        ? `TROCO PARA: R$ ${order.changeFor.toFixed(2)}`
                                        : (order.paymentMethod.match(/\(([^)]+)\)/)?.[1].toUpperCase() || order.paymentMethod.toUpperCase())
                                    }
                                    {order.changeFor && order.changeFor > displayTotal && (
                                        <div style={{ fontSize: smallFontSize, marginTop: '1px', fontWeight: '900' }}>
                                            TROCO A DEVOLVER: R$ {(order.changeFor - displayTotal).toFixed(2)}
                                        </div>
                                    )}
                                </div>
                            )}
                            {isPixPaid && <div style={{ fontSize: smallFontSize, marginTop: '2px', fontWeight: '900' }}>(PAGO PELO APP)</div>}
                        </div>
                    </>
                )}

                {/* RODAPÉ */}
                <div style={{ textAlign: 'center', fontSize: smallFontSize, marginTop: '8px', borderTop: '1px dashed #000', paddingTop: '4px' }}>
                    GUARA-FOOD PDV
                </div>
            </div>
        </div>
    );
};

export default PrintableOrder;
