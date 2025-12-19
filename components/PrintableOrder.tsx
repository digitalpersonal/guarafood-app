
import React from 'react';
import type { Order } from '../types';

interface PrintableOrderProps {
    order: Order;
    printerWidth?: number; // 80 or 58 (default 80)
}

const PrintableOrder: React.FC<PrintableOrderProps> = ({ order, printerWidth = 80 }) => {
    const paperSize = `${printerWidth}mm`;
    const contentWidth = printerWidth === 80 ? '70mm' : '46mm';
    
    const baseFontSize = printerWidth === 58 ? '10px' : '13px';
    const headerFontSize = printerWidth === 58 ? '12px' : '15px';
    const titleFontSize = printerWidth === 58 ? '15px' : '18px';
    const smallFontSize = printerWidth === 58 ? '9px' : '11px';

    const isPixPaid = order.paymentMethod.toLowerCase().includes('pix') && order.paymentStatus === 'paid';
    const isPickup = !order.customerAddress || order.customerAddress.street === 'Retirada no Local';

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
                            background-color: #fff;
                        }
                        #thermal-receipt-container {
                            width: ${paperSize} !important;
                            margin: 0 !important;
                            padding: 0 !important;
                        }
                        #thermal-content {
                            width: ${contentWidth} !important; 
                            margin: 0 auto !important;
                            padding: 2mm 0 !important;
                            box-sizing: border-box !important;
                        }
                    }

                    #thermal-content {
                        font-family: 'Courier New', Courier, monospace; 
                        color: #000;
                        line-height: 1.2;
                    }

                    #thermal-content * {
                        color: #000 !important;
                        word-wrap: break-word !important;
                        overflow-wrap: break-word !important;
                        word-break: break-all !important;
                        white-space: normal !important;
                    }

                    .receipt-header {
                        text-align: center;
                        border-bottom: 1.5px dashed #000;
                        padding-bottom: 4px;
                        margin-bottom: 8px;
                    }

                    .receipt-title {
                        font-size: ${titleFontSize};
                        font-weight: 900;
                        text-transform: uppercase;
                    }

                    .section-header {
                        font-size: ${baseFontSize};
                        font-weight: 900;
                        border-bottom: 2px solid #000;
                        margin-top: 8px;
                        margin-bottom: 4px;
                        padding-bottom: 1px;
                        text-transform: uppercase;
                    }

                    .bold-extra { font-weight: 900 !important; }

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
                        font-weight: 900;
                        text-transform: uppercase;
                    }

                    .item-total-price {
                        font-weight: 900;
                        text-align: right;
                        min-width: 65px;
                    }

                    /* ESTILO DOS ADICIONAIS - CONTRASTE MÁXIMO */
                    .addon-line {
                        font-weight: 900 !important;
                        font-size: ${baseFontSize};
                        text-transform: uppercase !important;
                        display: block;
                        margin-top: 1px;
                        padding-left: 1mm;
                        border-left: 2px solid #000;
                    }

                    .notes-line {
                        font-weight: 900 !important;
                        font-size: ${baseFontSize};
                        color: #000 !important;
                        background: #eee !important; /* Ajuda a destacar se a impressora for boa */
                        padding: 1px;
                        margin-top: 2px;
                        text-transform: uppercase;
                    }

                    .total-box {
                        border-top: 2px solid #000;
                        border-bottom: 2px solid #000;
                        display: flex;
                        justify-content: space-between;
                        font-size: ${titleFontSize};
                        font-weight: 900;
                        margin-top: 6px;
                        padding: 6px 0;
                    }

                    .payment-box {
                        border: 2px solid #000;
                        padding: 8px;
                        text-align: center;
                        font-weight: 900;
                        font-size: ${headerFontSize};
                        margin: 8px 0;
                        text-transform: uppercase;
                    }

                    .mode-banner {
                        background-color: #000 !important;
                        color: #fff !important;
                        font-size: ${headerFontSize};
                        font-weight: 900;
                        text-align: center;
                        padding: 5px;
                        margin-bottom: 8px;
                        text-transform: uppercase;
                    }
                `}
            </style>

            <div id="thermal-content">
                <div className="receipt-header">
                    <div className="receipt-title">{order.restaurantName}</div>
                    <div className="bold-extra">
                        {new Date(order.timestamp).toLocaleDateString('pt-BR')} {new Date(order.timestamp).toLocaleTimeString('pt-BR').substring(0,5)}
                    </div>
                    <div className="bold-extra" style={{ fontSize: titleFontSize, marginTop: '4px' }}>
                        PEDIDO: #{displayOrderNum}
                    </div>
                </div>

                <div className="mode-banner">
                    {isPickup ? "RETIRADA BALCÃO" : "ENTREGA EM CASA"}
                </div>

                {order.wantsSachets !== undefined && (
                    <div style={{ textAlign: 'center', border: '1.5px solid #000', padding: '4px', marginBottom: '8px', fontSize: baseFontSize }} className="bold-extra">
                        {order.wantsSachets ? "[X] ENVIAR SACHÊS/TALHERES" : "[ ] NÃO ENVIAR SACHÊS"}
                    </div>
                )}

                <div className="section-header">CLIENTE</div>
                <div style={{ fontSize: headerFontSize }} className="bold-extra">{order.customerName.toUpperCase()}</div>
                <div className="bold-extra">TEL: {order.customerPhone}</div>
                
                {!isPickup && order.customerAddress && (
                    <div style={{ border: '1.5px solid #000', padding: '4px', marginTop: '4px' }} className="bold-extra">
                        <div>{order.customerAddress.street.toUpperCase()}, {order.customerAddress.number}</div>
                        <div>{order.customerAddress.neighborhood.toUpperCase()}</div>
                        {order.customerAddress.complement && (
                            <div style={{ marginTop: '4px', borderTop: '1px dashed #000', paddingTop: '2px' }}>
                                OBS END: {order.customerAddress.complement.toUpperCase()}
                            </div>
                        )}
                    </div>
                )}

                <div className="section-header" style={{ marginTop: '12px' }}>ITENS DO PEDIDO</div>
                
                <div style={{ paddingBottom: '8px' }}>
                    {order.items.map((item, index) => (
                        <div key={`${item.id}-${index}`} style={{ marginTop: '10px', borderBottom: '1px dashed #000', paddingBottom: '6px' }}>
                            <div className="item-row">
                                <div className="item-desc">
                                    {item.quantity}X {item.name}
                                    {item.sizeName && ` (${item.sizeName})`}
                                </div>
                                <div className="item-total-price">
                                    R$ {(item.price * item.quantity).toFixed(2)}
                                </div>
                            </div>
                            
                            {/* ADICIONAIS - VISIBILIDADE MÁXIMA */}
                            {((item.selectedAddons && item.selectedAddons.length > 0) || item.notes) && (
                                <div style={{ marginTop: '2px' }}>
                                    {item.selectedAddons?.map(a => (
                                        <div key={a.id} className="addon-line">
                                            > {a.name}
                                        </div>
                                    ))}
                                    {item.notes && (
                                        <div className="notes-line">
                                            OBS: {item.notes}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: '8px' }}>
                    <div className="item-row">
                        <span className="bold-extra">SUBTOTAL:</span>
                        <span className="bold-extra">R$ {order.subtotal?.toFixed(2)}</span>
                    </div>
                    {order.deliveryFee != null && order.deliveryFee > 0 && (
                        <div className="item-row">
                            <span className="bold-extra">TAXA ENTREGA:</span>
                            <span className="bold-extra">R$ {order.deliveryFee.toFixed(2)}</span>
                        </div>
                    )}
                    {order.discountAmount != null && order.discountAmount > 0 && (
                        <div className="item-row">
                            <span className="bold-extra">DESCONTO:</span>
                            <span className="bold-extra">- R$ {order.discountAmount.toFixed(2)}</span>
                        </div>
                    )}
                    
                    <div className="total-box">
                        <span>TOTAL:</span>
                        <span>R$ {order.totalPrice.toFixed(2)}</span>
                    </div>
                </div>

                <div className="payment-box">
                    PAGAMENTO: {order.paymentMethod.toUpperCase()}
                    {isPixPaid ? ' [PAGO]' : ''}
                </div>

                <div style={{ textAlign: 'center', fontSize: smallFontSize, marginTop: '20px', borderTop: '1px solid #000', paddingTop: '8px' }} className="bold-extra">
                    GUARA-FOOD - PDV OFICIAL
                    <br/>IMPRESSO EM {new Date().toLocaleTimeString()}
                    <br/>.
                </div>
            </div>
        </div>
    );
};

export default PrintableOrder;
