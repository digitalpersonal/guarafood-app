
import React from 'react';
import type { Order } from '../types';

interface PrintableOrderProps {
    order: Order;
    printerWidth?: number; // 80 or 58 (default 80)
}

const PrintableOrder: React.FC<PrintableOrderProps> = ({ order, printerWidth = 80 }) => {
    const paperSize = `${printerWidth}mm`;
    // Medidas exatas solicitadas para evitar vazamento na área imprimível
    const contentWidth = printerWidth === 80 ? '70mm' : '46mm';
    
    // Escalonamento de fontes proporcional ao tamanho da bobina
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

                        /* TRAVA DE SEGURANÇA FÍSICA: Conteúdo nunca encosta na serrilha */
                        #thermal-content {
                            width: ${contentWidth} !important; 
                            margin: 0 auto !important; /* Centraliza na bobina */
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
                        word-break: break-all !important; /* BLINDAGEM: Quebra palavras gigantes para não alargar o papel */
                        white-space: normal !important;
                    }

                    .receipt-header {
                        text-align: center;
                        border-bottom: 1px dashed #000;
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
                        border-bottom: 1.5px solid #000;
                        margin-top: 8px;
                        margin-bottom: 4px;
                        padding-bottom: 1px;
                        text-transform: uppercase;
                    }

                    .address-box {
                        border: 1px solid #000;
                        padding: 3px;
                        margin-top: 4px;
                        font-size: ${headerFontSize};
                        font-weight: 900;
                    }

                    /* PROTEÇÃO DE PREÇO: O nome do item se vira no espaço que sobrar */
                    .item-row {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        font-size: ${baseFontSize};
                        margin-bottom: 6px;
                        width: 100%;
                    }
                    
                    .item-desc {
                        flex: 1;
                        padding-right: 4px;
                        font-weight: 900;
                    }

                    .item-total-price {
                        font-weight: 900;
                        text-align: right;
                        white-space: nowrap !important;
                        min-width: 65px; /* Reserva espaço inviolável pro preço na margem direita */
                    }

                    .totals-section {
                        border-top: 1px solid #000;
                        margin-top: 8px;
                        padding-top: 4px;
                    }

                    .sub-row {
                        display: flex;
                        justify-content: space-between;
                        font-size: ${baseFontSize}; 
                        margin-bottom: 2px;
                    }

                    .total-box {
                        border-top: 1.5px solid #000;
                        border-bottom: 1.5px solid #000;
                        display: flex;
                        justify-content: space-between;
                        font-size: ${titleFontSize};
                        font-weight: 900;
                        margin-top: 6px;
                        padding: 6px 0;
                    }

                    .payment-box {
                        border: 1.5px solid #000;
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
                        padding: 4px;
                        margin-bottom: 8px;
                        text-transform: uppercase;
                    }

                    .bold-extra { font-weight: 900 !important; }
                    .center { text-align: center; }
                `}
            </style>

            <div id="thermal-content">
                <div className="receipt-header">
                    <div className="receipt-title">{order.restaurantName}</div>
                    <div className="bold-extra">
                        {new Date(order.timestamp).toLocaleDateString('pt-BR')} {new Date(order.timestamp).toLocaleTimeString('pt-BR').substring(0,5)}
                    </div>
                    <div className="bold-extra" style={{ fontSize: titleFontSize, marginTop: '3px' }}>
                        PEDIDO: #{displayOrderNum}
                    </div>
                </div>

                <div className="mode-banner">
                    {isPickup ? "RETIRADA BALCÃO" : "ENTREGA EM CASA"}
                </div>

                {order.wantsSachets !== undefined && (
                    <div style={{ textAlign: 'center', border: '1px solid #000', padding: '3px', marginBottom: '8px', fontSize: baseFontSize }} className="bold-extra">
                        {order.wantsSachets ? "[X] ENVIAR SACHÊS" : "[ ] SEM SACHÊS"}
                    </div>
                )}

                <div className="section-header">CLIENTE</div>
                <div style={{ fontSize: headerFontSize }} className="bold-extra">{order.customerName}</div>
                <div className="bold-extra">TEL: {order.customerPhone}</div>
                
                {!isPickup && order.customerAddress && (
                    <div className="address-box">
                        <div>{order.customerAddress.street}, {order.customerAddress.number}</div>
                        <div>{order.customerAddress.neighborhood}</div>
                        {order.customerAddress.complement && (
                            <div style={{ marginTop: '3px', fontSize: baseFontSize, borderTop: '1px dashed #000', paddingTop: '2px' }}>
                                OBS: {order.customerAddress.complement}
                            </div>
                        )}
                    </div>
                )}

                <div className="section-header" style={{ marginTop: '12px' }}>ITENS</div>
                
                <div style={{ paddingBottom: '8px' }}>
                    {order.items.map((item, index) => (
                        <div key={`${item.id}-${index}`} style={{ marginTop: '8px', borderBottom: '1px dashed #eee', paddingBottom: '4px' }}>
                            <div className="item-row">
                                <div className="item-desc">
                                    {item.quantity}x {item.name}
                                    {item.sizeName && ` (${item.sizeName})`}
                                </div>
                                <div className="item-total-price">
                                    R$ {(item.price * item.quantity).toFixed(2)}
                                </div>
                            </div>
                            
                            {(item.notes || (item.selectedAddons && item.selectedAddons.length > 0)) && (
                                <div style={{ paddingLeft: '10px', fontSize: smallFontSize, opacity: 0.8 }}>
                                    {item.notes && <div>* OBS: {item.notes}</div>}
                                    {item.selectedAddons?.map(a => <div key={a.id}>+ {a.name}</div>)}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="totals-section">
                    <div className="sub-row">
                        <span>SUBTOTAL:</span>
                        <span>R$ {order.subtotal?.toFixed(2)}</span>
                    </div>
                    {order.deliveryFee != null && order.deliveryFee > 0 && (
                        <div className="sub-row">
                            <span>ENTREGA:</span>
                            <span>R$ {order.deliveryFee.toFixed(2)}</span>
                        </div>
                    )}
                    {order.discountAmount != null && order.discountAmount > 0 && (
                        <div className="sub-row">
                            <span>DESCONTO:</span>
                            <span>- R$ {order.discountAmount.toFixed(2)}</span>
                        </div>
                    )}
                    
                    <div className="total-box">
                        <span>TOTAL:</span>
                        <span>R$ {order.totalPrice.toFixed(2)}</span>
                    </div>
                </div>

                <div className="payment-box">
                    PGTO: {order.paymentMethod.toUpperCase()}
                    {isPixPaid ? ' [PAGO]' : ''}
                </div>

                <div className="center bold-extra" style={{ fontSize: smallFontSize, marginTop: '15px', paddingTop: '8px', borderTop: '1px solid #000' }}>
                    GUARA-FOOD PDV
                    <br/>.
                    <br/>.
                </div>
            </div>
        </div>
    );
};

export default PrintableOrder;
