
import React from 'react';
import type { Order } from '../types';

interface PrintableOrderProps {
    order: Order;
    printerWidth?: number; // 80 or 58 (default 80)
}

const PrintableOrder: React.FC<PrintableOrderProps> = ({ order, printerWidth = 80 }) => {
    const paperSize = `${printerWidth}mm`;
    
    // Ajuste de largura útil para garantir que nada corte à direita
    // 67mm para papel de 80mm deixa uma margem de segurança confortável
    const contentWidth = printerWidth === 80 ? '67mm' : '44mm';
    
    const baseFontSize = printerWidth === 58 ? '10px' : '13px';
    const headerFontSize = printerWidth === 58 ? '12px' : '15px';
    const titleFontSize = printerWidth === 58 ? '16px' : '20px';
    const smallFontSize = printerWidth === 58 ? '8px' : '10px';

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
                            margin: 0 !important;
                            padding: 0 !important;
                            background: #fff !important;
                        }
                        #thermal-content {
                            width: ${contentWidth} !important; 
                            margin-left: 1mm !important; /* Margem mínima à esquerda */
                            padding: 5mm 0 !important;
                            box-sizing: border-box !important;
                            background: #fff !important;
                        }
                    }

                    #thermal-content {
                        font-family: 'Courier New', Courier, monospace; 
                        color: #000 !important;
                        line-height: 1.1;
                    }

                    #thermal-content * {
                        color: #000 !important;
                        background: transparent !important;
                        word-wrap: break-word !important;
                        overflow-wrap: break-word !important;
                        white-space: normal !important;
                        font-weight: 900 !important;
                    }

                    .receipt-header {
                        text-align: center;
                        border-bottom: 1px dashed #000;
                        padding-bottom: 6px;
                        margin-bottom: 8px;
                    }

                    .receipt-title {
                        font-size: ${headerFontSize};
                        text-transform: uppercase;
                        margin-bottom: 1px;
                    }

                    .order-number-box {
                        font-size: ${titleFontSize};
                        border: 2px solid #000;
                        display: inline-block;
                        padding: 3px 10px;
                        margin: 5px 0;
                    }

                    .section-header {
                        font-size: ${baseFontSize};
                        border-bottom: 1px solid #000;
                        margin-top: 10px;
                        margin-bottom: 4px;
                        padding-bottom: 1px;
                        text-transform: uppercase;
                        text-align: center;
                    }

                    .item-row {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        font-size: ${baseFontSize};
                        margin-bottom: 3px;
                        width: 100%;
                    }
                    
                    .item-desc {
                        flex: 1;
                        padding-right: 2mm;
                        text-transform: uppercase;
                    }

                    .item-total-price {
                        text-align: right;
                        min-width: 60px;
                        font-size: ${baseFontSize};
                    }

                    .addon-line {
                        font-size: ${baseFontSize};
                        text-transform: uppercase !important;
                        display: block;
                        padding-left: 2mm;
                        border-left: 2px solid #000;
                        margin-left: 1mm;
                        margin-bottom: 1px;
                    }

                    .notes-line {
                        font-size: ${baseFontSize};
                        border: 1px solid #000;
                        padding: 2px;
                        margin: 4px 0;
                        text-transform: uppercase;
                        text-align: center;
                    }

                    .total-box {
                        border-top: 1px dashed #000;
                        border-bottom: 1px dashed #000;
                        margin-top: 8px;
                        padding: 6px 0;
                    }

                    .total-row {
                        display: flex;
                        justify-content: space-between;
                        font-size: ${baseFontSize};
                    }

                    .final-price {
                        font-size: ${titleFontSize};
                        display: flex;
                        justify-content: space-between;
                        margin-top: 2px;
                    }

                    .payment-box {
                        border: 1px solid #000;
                        padding: 6px;
                        text-align: center;
                        font-size: ${baseFontSize};
                        margin: 8px 0;
                        text-transform: uppercase;
                    }

                    .mode-indicator {
                        font-size: ${headerFontSize};
                        font-weight: 900 !important;
                        text-align: center;
                        padding: 5px 0;
                        margin: 5px 0;
                        text-transform: uppercase;
                        border-top: 2px solid #000;
                        border-bottom: 2px solid #000;
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
                    {order.tableNumber ? `MESA ${order.tableNumber}` : isPickup ? ">> RETIRADA NO BALCÃO <<" : ">> ENTREGA EM DOMICÍLIO <<"}
                </div>

                {order.wantsSachets !== undefined && !order.tableNumber && (
                    <div style={{ textAlign: 'center', border: '1px dotted #000', padding: '2px', marginBottom: '6px', fontSize: smallFontSize }}>
                        {order.wantsSachets ? "ENVIAR SACHÊS/TALHERES" : "NÃO ENVIAR SACHÊS"}
                    </div>
                )}

                <div className="section-header">CLIENTE / DESTINO</div>
                <div style={{ fontSize: baseFontSize }}>{order.customerName.toUpperCase()}</div>
                <div style={{ fontSize: baseFontSize }}>TEL: {order.customerPhone}</div>
                
                {!isPickup && order.customerAddress && (
                    <div style={{ marginTop: '3px' }}>
                        <div style={{ fontSize: baseFontSize }}>{order.customerAddress.street.toUpperCase()}, {order.customerAddress.number}</div>
                        <div style={{ fontSize: baseFontSize }}>BAIRRO: {order.customerAddress.neighborhood.toUpperCase()}</div>
                        {order.customerAddress.complement && (
                            <div style={{ marginTop: '1px', fontSize: smallFontSize }}>
                                REF: {order.customerAddress.complement.toUpperCase()}
                            </div>
                        )}
                    </div>
                )}

                <div className="section-header">ITENS</div>
                
                <div style={{ paddingBottom: '3px' }}>
                    {order.items.map((item, index) => (
                        <div key={`${item.id}-${index}`} style={{ marginTop: '6px', borderBottom: '1px dotted #eee', paddingBottom: '3px' }}>
                            <div className="item-row">
                                <div className="item-desc">
                                    {item.quantity}X {item.name}
                                    {item.sizeName && item.sizeName !== 'Único' && ` (${item.sizeName})`}
                                </div>
                                <div className="item-total-price">
                                    {(Number(item.price) * item.quantity).toFixed(2)}
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
                    {order.deliveryFee != null && Number(order.deliveryFee) > 0 && !isPickup && (
                        <div className="total-row">
                            <span>TAXA ENTREGA:</span>
                            <span>R$ {Number(order.deliveryFee).toFixed(2)}</span>
                        </div>
                    )}
                    {order.discountAmount != null && Number(order.discountAmount) > 0 && (
                        <div className="total-row">
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
                    PGTO: {order.paymentMethod.toUpperCase()}
                    {isPixPaid ? '\n(PAGO NO APP)' : ''}
                </div>

                <div style={{ textAlign: 'center', fontSize: smallFontSize, marginTop: '10px', borderTop: '1px solid #000', paddingTop: '4px' }}>
                    GUARA-FOOD PDV
                    <br/>OBRIGADO PELA PREFERENCIA!
                    <br/>.
                </div>
            </div>
        </div>
    );
};

export default PrintableOrder;
