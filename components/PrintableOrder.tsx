
import React from 'react';
import type { Order } from '../types';

interface PrintableOrderProps {
    order: Order;
    printerWidth?: number; // 80 or 58 (default 80)
}

const PrintableOrder: React.FC<PrintableOrderProps> = ({ order, printerWidth = 80 }) => {
    const paperSize = `${printerWidth}mm`;
    const contentWidth = printerWidth === 80 ? '70mm' : '46mm';
    
    const baseFontSize = printerWidth === 58 ? '11px' : '14px';
    const headerFontSize = printerWidth === 58 ? '13px' : '16px';
    const titleFontSize = printerWidth === 58 ? '16px' : '20px';
    const smallFontSize = printerWidth === 58 ? '10px' : '12px';

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
                            padding: 3mm 0 !important;
                            box-sizing: border-box !important;
                        }
                    }

                    #thermal-content {
                        font-family: 'Courier New', Courier, monospace; 
                        color: #000 !important;
                        line-height: 1.3;
                    }

                    #thermal-content * {
                        color: #000 !important;
                        word-wrap: break-word !important;
                        overflow-wrap: break-word !important;
                        word-break: break-all !important;
                        white-space: normal !important;
                        font-weight: 900 !important; /* FORÇA NEGRITO MÁXIMO EM TUDO */
                    }

                    .receipt-header {
                        text-align: center;
                        border-bottom: 2px dashed #000;
                        padding-bottom: 5px;
                        margin-bottom: 10px;
                    }

                    .receipt-title {
                        font-size: ${titleFontSize};
                        text-transform: uppercase;
                    }

                    .section-header {
                        font-size: ${baseFontSize};
                        border-bottom: 2px solid #000;
                        margin-top: 10px;
                        margin-bottom: 5px;
                        padding-bottom: 2px;
                        text-transform: uppercase;
                    }

                    .item-row {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        font-size: ${baseFontSize};
                        margin-bottom: 5px;
                        width: 100%;
                    }
                    
                    .item-desc {
                        flex: 1;
                        padding-right: 5px;
                        text-transform: uppercase;
                    }

                    .item-total-price {
                        text-align: right;
                        min-width: 70px;
                    }

                    /* ESTILO DOS ADICIONAIS - DESTAQUE MÁXIMO SEM FUNDO */
                    .addon-line {
                        font-size: ${baseFontSize};
                        text-transform: uppercase !important;
                        display: block;
                        margin-top: 2px;
                        padding-left: 2mm;
                        border-left: 3px solid #000;
                    }

                    .notes-line {
                        font-size: ${baseFontSize};
                        border: 1px solid #000;
                        padding: 2px;
                        margin-top: 4px;
                        text-transform: uppercase;
                    }

                    .total-box {
                        border-top: 3px solid #000;
                        border-bottom: 3px solid #000;
                        display: flex;
                        justify-content: space-between;
                        font-size: ${titleFontSize};
                        margin-top: 8px;
                        padding: 8px 0;
                    }

                    .payment-box {
                        border: 2px solid #000;
                        padding: 10px;
                        text-align: center;
                        font-size: ${headerFontSize};
                        margin: 10px 0;
                        text-transform: uppercase;
                    }

                    /* NOVO BANNER DE MODO DE RECEBIMENTO - SEM FUNDO PRETO PARA MELHOR LEITURA */
                    .mode-indicator {
                        border: 3px solid #000;
                        font-size: ${titleFontSize};
                        text-align: center;
                        padding: 8px;
                        margin: 10px 0;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                `}
            </style>

            <div id="thermal-content">
                <div className="receipt-header">
                    <div className="receipt-title">{order.restaurantName}</div>
                    <div style={{ marginTop: '2px' }}>
                        {new Date(order.timestamp).toLocaleDateString('pt-BR')} {new Date(order.timestamp).toLocaleTimeString('pt-BR').substring(0,5)}
                    </div>
                    <div style={{ fontSize: titleFontSize, marginTop: '5px' }}>
                        PEDIDO: #{displayOrderNum}
                    </div>
                </div>

                <div className="mode-indicator">
                    {isPickup ? ">> RETIRADA <<" : ">> ENTREGA <<"}
                </div>

                {order.wantsSachets !== undefined && (
                    <div style={{ textAlign: 'center', border: '1px solid #000', padding: '5px', marginBottom: '10px', fontSize: baseFontSize }}>
                        {order.wantsSachets ? "ENVIAR SACHÊS/TALHERES [SIM]" : "ENVIAR SACHÊS/TALHERES [NÃO]"}
                    </div>
                )}

                <div className="section-header">DADOS DO CLIENTE</div>
                <div style={{ fontSize: headerFontSize }}>{order.customerName.toUpperCase()}</div>
                <div>FONE: {order.customerPhone}</div>
                
                {!isPickup && order.customerAddress && (
                    <div style={{ border: '2px solid #000', padding: '5px', marginTop: '5px' }}>
                        <div style={{ fontSize: headerFontSize }}>{order.customerAddress.street.toUpperCase()}, {order.customerAddress.number}</div>
                        <div style={{ fontSize: headerFontSize }}>BAIRRO: {order.customerAddress.neighborhood.toUpperCase()}</div>
                        {order.customerAddress.complement && (
                            <div style={{ marginTop: '5px', borderTop: '1px dashed #000', paddingTop: '3px' }}>
                                OBS ENDEREÇO: {order.customerAddress.complement.toUpperCase()}
                            </div>
                        )}
                    </div>
                )}

                <div className="section-header" style={{ marginTop: '15px' }}>ITENS DO PEDIDO</div>
                
                <div style={{ paddingBottom: '10px' }}>
                    {order.items.map((item, index) => (
                        <div key={`${item.id}-${index}`} style={{ marginTop: '12px', borderBottom: '1px dashed #000', paddingBottom: '8px' }}>
                            <div className="item-row">
                                <div className="item-desc">
                                    {item.quantity}X {item.name}
                                    {item.sizeName && ` (${item.sizeName})`}
                                </div>
                                <div className="item-total-price">
                                    R$ {(item.price * item.quantity).toFixed(2)}
                                </div>
                            </div>
                            
                            {/* ADICIONAIS - VISIBILIDADE EXTREMA */}
                            {((item.selectedAddons && item.selectedAddons.length > 0) || item.notes) && (
                                <div style={{ marginTop: '3px' }}>
                                    {item.selectedAddons?.map(a => (
                                        <div key={a.id} className="addon-line">
                                            > {a.name}
                                        </div>
                                    ))}
                                    {item.notes && (
                                        <div className="notes-line">
                                            OBS ITEM: {item.notes.toUpperCase()}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: '10px' }}>
                    <div className="item-row">
                        <span>SUBTOTAL:</span>
                        <span>R$ {order.subtotal?.toFixed(2)}</span>
                    </div>
                    {order.deliveryFee != null && order.deliveryFee > 0 && (
                        <div className="item-row">
                            <span>TAXA ENTREGA:</span>
                            <span>R$ {order.deliveryFee.toFixed(2)}</span>
                        </div>
                    )}
                    {order.discountAmount != null && order.discountAmount > 0 && (
                        <div className="item-row">
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
                    PAGAMENTO: {order.paymentMethod.toUpperCase()}
                    {isPixPaid ? ' (PAGO ONLINE)' : ''}
                </div>

                <div style={{ textAlign: 'center', fontSize: smallFontSize, marginTop: '25px', borderTop: '1px solid #000', paddingTop: '10px' }}>
                    GUARA-FOOD PDV OFICIAL
                    <br/>TECNOLOGIA E CONFIANÇA
                    <br/>.
                </div>
            </div>
        </div>
    );
};

export default PrintableOrder;
