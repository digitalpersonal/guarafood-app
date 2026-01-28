
import React from 'react';
import type { Order } from '../types';

interface PrintableOrderProps {
    order: Order;
    printerWidth?: number; // 80 or 58 (default 80)
}

const PrintableOrder: React.FC<PrintableOrderProps> = ({ order, printerWidth = 80 }) => {
    const paperSize = `${printerWidth}mm`;
    const contentWidth = printerWidth === 80 ? '72mm' : '48mm';
    
    const baseFontSize = printerWidth === 58 ? '11px' : '14px';
    const headerFontSize = printerWidth === 58 ? '13px' : '16px';
    const titleFontSize = printerWidth === 58 ? '18px' : '22px';
    const smallFontSize = printerWidth === 58 ? '9px' : '11px';

    const isPixPaid = order.paymentMethod.toLowerCase().includes('pix') && order.paymentStatus === 'paid';
    const isPickup = !order.customerAddress || order.customerAddress.street === 'Retirada no Local' || order.customerAddress.street === 'Consumo Local';

    const displayOrderNum = order.order_number 
        ? `${String(order.order_number).padStart(3, '0')}`
        : `${order.id.substring(order.id.length - 4).toUpperCase()}`;

    return (
        <div id="thermal-receipt-container">
            <style>
                {`
                    @media print {
                        @page {
                            margin: 0 !important;
                            size: ${paperSize} auto;
                        }
                        body {
                            margin: 0 !important;
                            padding: 0 !important;
                            width: ${paperSize} !important;
                            background-color: #fff !important;
                            -webkit-print-color-adjust: exact !important;
                        }
                        #thermal-receipt-container {
                            width: ${paperSize} !important;
                            margin: 0 !important;
                            padding: 0 !important;
                        }
                        #thermal-content {
                            width: ${contentWidth} !important; 
                            margin: 0 auto !important;
                            padding: 5mm 0 !important;
                            box-sizing: border-box !important;
                        }
                    }

                    #thermal-content {
                        font-family: 'Courier New', Courier, monospace; 
                        color: #000 !important;
                        line-height: 1.2;
                    }

                    #thermal-content * {
                        color: #000 !important;
                        word-wrap: break-word !important;
                        overflow-wrap: break-word !important;
                        word-break: break-word !important;
                        white-space: normal !important;
                        font-weight: 900 !important;
                    }

                    .receipt-header {
                        text-align: center;
                        border-bottom: 2px dashed #000;
                        padding-bottom: 8px;
                        margin-bottom: 10px;
                    }

                    .receipt-title {
                        font-size: ${headerFontSize};
                        text-transform: uppercase;
                        margin-bottom: 2px;
                    }

                    .order-number-box {
                        font-size: ${titleFontSize};
                        border: 3px solid #000;
                        display: inline-block;
                        padding: 4px 12px;
                        margin: 8px 0;
                    }

                    .section-header {
                        font-size: ${baseFontSize};
                        border-bottom: 1px solid #000;
                        margin-top: 12px;
                        margin-bottom: 6px;
                        padding-bottom: 2px;
                        text-transform: uppercase;
                        text-align: center;
                    }

                    .item-row {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        font-size: ${baseFontSize};
                        margin-bottom: 4px;
                        width: 100%;
                    }
                    
                    .item-desc {
                        flex: 1;
                        padding-right: 4px;
                        text-transform: uppercase;
                    }

                    .item-total-price {
                        text-align: right;
                        min-width: 75px;
                        font-size: ${baseFontSize};
                    }

                    .addon-line {
                        font-size: ${baseFontSize};
                        text-transform: uppercase !important;
                        display: block;
                        margin-top: 1px;
                        padding-left: 3mm;
                        border-left: 3px solid #000;
                        margin-left: 1mm;
                        margin-bottom: 2px;
                    }

                    .notes-line {
                        font-size: ${baseFontSize};
                        background-color: #000 !important;
                        color: #fff !important;
                        padding: 2px 4px;
                        margin-top: 5px;
                        text-transform: uppercase;
                    }

                    .total-box {
                        border-top: 2px dashed #000;
                        border-bottom: 2px dashed #000;
                        margin-top: 10px;
                        padding: 8px 0;
                    }

                    .total-row {
                        display: flex;
                        justify-content: space-between;
                        font-size: ${baseFontSize};
                        margin-bottom: 2px;
                    }

                    .final-price {
                        font-size: ${titleFontSize};
                        display: flex;
                        justify-content: space-between;
                        margin-top: 4px;
                    }

                    .payment-box {
                        border: 2px solid #000;
                        padding: 8px;
                        text-align: center;
                        font-size: ${headerFontSize};
                        margin: 12px 0;
                        text-transform: uppercase;
                    }

                    .mode-indicator {
                        background-color: #000 !important;
                        color: #fff !important;
                        font-size: ${headerFontSize};
                        text-align: center;
                        padding: 6px;
                        margin: 10px 0;
                        text-transform: uppercase;
                    }
                `}
            </style>

            <div id="thermal-content">
                <div className="receipt-header">
                    <div className="receipt-title">{order.restaurantName}</div>
                    <div style={{ fontSize: smallFontSize }}>
                        {new Date(order.timestamp).toLocaleDateString('pt-BR')} - {new Date(order.timestamp).toLocaleTimeString('pt-BR').substring(0,5)}
                    </div>
                    <div className="order-number-box">
                        PEDIDO: {displayOrderNum}
                    </div>
                </div>

                <div className="mode-indicator">
                    {order.tableNumber ? `>> MESA ${order.tableNumber} <<` : isPickup ? ">> RETIRADA NO BALCÃO <<" : ">> ENTREGA EM DOMICÍLIO <<"}
                </div>

                {order.wantsSachets !== undefined && !order.tableNumber && (
                    <div style={{ textAlign: 'center', border: '1px dashed #000', padding: '4px', marginBottom: '8px', fontSize: smallFontSize }}>
                        {order.wantsSachets ? "SOLICITOU: SACHÊS E TALHERES" : "NÃO ENVIAR: SACHÊS/TALHERES"}
                    </div>
                )}

                <div className="section-header">CLIENTE / DESTINO</div>
                <div style={{ fontSize: headerFontSize }}>{order.customerName.toUpperCase()}</div>
                <div>TEL: {order.customerPhone}</div>
                
                {!isPickup && order.customerAddress && (
                    <div style={{ marginTop: '5px' }}>
                        <div style={{ fontSize: baseFontSize }}>{order.customerAddress.street.toUpperCase()}, {order.customerAddress.number}</div>
                        <div style={{ fontSize: baseFontSize }}>BAIRRO: {order.customerAddress.neighborhood.toUpperCase()}</div>
                        {order.customerAddress.complement && (
                            <div style={{ marginTop: '3px', fontStyle: 'italic', fontSize: smallFontSize }}>
                                REF: {order.customerAddress.complement.toUpperCase()}
                            </div>
                        )}
                    </div>
                )}

                <div className="section-header">ITENS DO PEDIDO</div>
                
                <div style={{ paddingBottom: '5px' }}>
                    {order.items.map((item, index) => (
                        <div key={`${item.id}-${index}`} style={{ marginTop: '10px', borderBottom: '1px dotted #ccc', paddingBottom: '6px' }}>
                            <div className="item-row">
                                <div className="item-desc">
                                    {item.quantity}X {item.name}
                                    {item.sizeName && item.sizeName !== 'Único' && ` (${item.sizeName})`}
                                </div>
                                <div className="item-total-price">
                                    R$ {(Number(item.price) * item.quantity).toFixed(2)}
                                </div>
                            </div>
                            
                            {item.selectedOptions?.map((opt, i) => (
                                <div key={i} className="addon-line">
                                    {`+ ${opt.groupTitle}: ${opt.optionName}`.toUpperCase()}
                                </div>
                            ))}

                            {item.selectedAddons?.map(a => (
                                <div key={a.id} className="addon-line">
                                    {`+ ${a.name} (R$${Number(a.price).toFixed(2)})`.toUpperCase()}
                                </div>
                            ))}

                            {item.notes && (
                                <div className="notes-line">
                                    {`OBS: ${item.notes.toUpperCase()}`}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="total-box">
                    <div className="total-row">
                        <span>SUBTOTAL:</span>
                        <span>R$ {Number(order.subtotal || 0).toFixed(2)}</span>
                    </div>
                    {order.deliveryFee != null && Number(order.deliveryFee) > 0 && (
                        <div className="total-row">
                            <span>TAXA ENTREGA:</span>
                            <span>R$ {Number(order.deliveryFee).toFixed(2)}</span>
                        </div>
                    )}
                    {order.discountAmount != null && Number(order.discountAmount) > 0 && (
                        <div className="total-row" style={{ color: '#000' }}>
                            <span>DESCONTO:</span>
                            <span>- R$ {Number(order.discountAmount).toFixed(2)}</span>
                        </div>
                    )}
                    
                    <div className="final-price">
                        <span>TOTAL:</span>
                        <span>R$ {Number(order.totalPrice).toFixed(2)}</span>
                    </div>
                </div>

                <div className="payment-box">
                    PAGTO: {order.paymentMethod.toUpperCase()}
                    {isPixPaid ? '\n(PAGO VIA PIX APP)' : ''}
                </div>

                <div style={{ textAlign: 'center', fontSize: smallFontSize, marginTop: '20px', borderTop: '1px solid #000', paddingTop: '8px' }}>
                    GUARA-FOOD - PDV OFICIAL
                    <br/>OBRIGADO PELA PREFERENCIA!
                    <br/>.
                </div>
            </div>
        </div>
    );
};

export default PrintableOrder;
