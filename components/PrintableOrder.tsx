
import React from 'react';
import type { Order } from '../types';

interface PrintableOrderProps {
    order: Order;
    printerWidth?: number; // 80 or 58 (default 80)
}

const PrintableOrder: React.FC<PrintableOrderProps> = ({ order, printerWidth = 80 }) => {
    // Configurações baseadas na largura do papel
    const widthCss = `${printerWidth}mm`;
    // Fontes maiores para 80mm, compactas para 58mm
    const baseFontSize = printerWidth === 58 ? '11px' : '13px';
    const headerFontSize = printerWidth === 58 ? '14px' : '16px';
    const smallFontSize = printerWidth === 58 ? '10px' : '11px';

    const isPixPaid = order.paymentMethod.toLowerCase().includes('pix');
    const isPickup = !order.customerAddress || order.customerAddress.street === 'Retirada no Local';

    return (
        <div id="thermal-receipt">
            <style>
                {`
                    @media print {
                        @page {
                            margin: 0;
                            size: auto;
                        }
                        
                        /* 
                           RESET NUCLEAR:
                           Esconde TUDO na página, exceto o recibo.
                           Isso garante que o recibo seja a única coisa impressa.
                        */
                        body > *:not(.print\\:block) {
                            display: none !important;
                        }

                        /* Configuração do Recibo */
                        #thermal-receipt {
                            display: block !important;
                            visibility: visible !important;
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: ${widthCss};
                            background-color: #fff !important;
                            color: #000 !important;
                            padding: 0;
                            margin: 0;
                            z-index: 9999;
                            min-height: 100vh; /* Garante fundo branco total */
                        }
                        
                        .no-print {
                            display: none !important;
                        }
                    }

                    /* Estilos do Cupom (Válidos para tela e impressão) */
                    #thermal-receipt {
                        font-family: 'Courier New', Courier, monospace; /* Fonte monoespaçada para alinhamento */
                        width: ${widthCss};
                        background-color: #fff;
                        color: #000;
                        padding: 2px 0;
                        line-height: 1.2;
                    }

                    .receipt-header {
                        text-align: center;
                        border-bottom: 2px dashed #000;
                        padding-bottom: 8px;
                        margin-bottom: 8px;
                    }

                    .receipt-title {
                        font-size: ${headerFontSize};
                        font-weight: 900;
                        text-transform: uppercase;
                        margin-bottom: 4px;
                    }

                    .receipt-info {
                        font-size: ${smallFontSize};
                    }

                    .section-header {
                        font-size: ${baseFontSize};
                        font-weight: 900;
                        border-bottom: 1px solid #000;
                        margin-top: 10px;
                        margin-bottom: 5px;
                        padding-bottom: 2px;
                        text-transform: uppercase;
                    }

                    .item-row {
                        display: flex;
                        justify-content: space-between;
                        font-size: ${baseFontSize};
                        margin-bottom: 4px;
                        align-items: flex-start;
                    }
                    
                    .item-qty {
                        font-weight: 900;
                        min-width: 25px;
                    }
                    
                    .item-name {
                        flex-grow: 1;
                        font-weight: 600;
                        padding-right: 5px;
                    }

                    .item-price {
                        white-space: nowrap;
                        font-weight: 600;
                    }

                    .item-details {
                        font-size: ${smallFontSize};
                        margin-left: 25px; /* Alinha com o nome */
                        color: #000; /* Garante preto */
                    }

                    .receipt-footer {
                        border-top: 2px dashed #000;
                        margin-top: 10px;
                        padding-top: 8px;
                    }

                    .total-row {
                        display: flex;
                        justify-content: space-between;
                        font-size: ${headerFontSize};
                        font-weight: 900;
                        margin-top: 5px;
                    }

                    .sub-row {
                        display: flex;
                        justify-content: space-between;
                        font-size: ${baseFontSize};
                    }
                    
                    .payment-box {
                        border: 2px solid #000;
                        padding: 5px;
                        text-align: center;
                        font-weight: 900;
                        font-size: ${baseFontSize};
                        margin: 10px 0;
                        text-transform: uppercase;
                    }

                    /* Destaque para PIX */
                    .payment-box-pix {
                        border: 4px solid #000;
                        background-color: #000;
                        color: #fff !important;
                        padding: 8px;
                        text-align: center;
                        font-weight: 900;
                        font-size: ${headerFontSize};
                        margin: 10px 0;
                        text-transform: uppercase;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }

                    /* Destaque para RETIRADA */
                    .mode-pickup {
                        background-color: #000;
                        color: #fff !important;
                        font-size: 18px;
                        font-weight: 900;
                        text-align: center;
                        padding: 8px;
                        margin-bottom: 8px;
                        text-transform: uppercase;
                        border: 4px solid #000;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }

                    .mode-delivery {
                        font-size: 16px;
                        font-weight: 900;
                        text-align: center;
                        padding: 5px;
                        margin-bottom: 8px;
                        text-transform: uppercase;
                        border: 2px solid #000;
                    }
                    
                    /* Utilitários */
                    .bold { font-weight: 900; }
                    .center { text-align: center; }
                    .uppercase { text-transform: uppercase; }
                `}
            </style>

            {/* HEADER */}
            <div className="receipt-header">
                <div className="receipt-title">{order.restaurantName}</div>
                <div className="receipt-info">
                    Data: {new Date(order.timestamp).toLocaleDateString('pt-BR')} {new Date(order.timestamp).toLocaleTimeString('pt-BR').substring(0,5)}
                </div>
                <div className="receipt-info bold" style={{ fontSize: headerFontSize, marginTop: '5px' }}>
                    SENHA: #{order.id.substring(0, 4).toUpperCase()}
                </div>
            </div>

            {/* MODO DE ENTREGA (DESTAQUE) */}
            <div className={isPickup ? "mode-pickup" : "mode-delivery"}>
                {isPickup ? "RETIRADA NO BALCÃO" : "ENTREGA"}
            </div>

            {/* CLIENTE */}
            <div className="section-header">CLIENTE</div>
            <div style={{ fontSize: baseFontSize, marginBottom: '2px' }} className="bold">{order.customerName}</div>
            <div style={{ fontSize: baseFontSize }}>{order.customerPhone}</div>
            
            {/* Endereço só aparece se NÃO for retirada */}
            {!isPickup && order.customerAddress && (
                <div style={{ fontSize: baseFontSize, marginTop: '4px', padding: '4px', border: '1px solid #000' }}>
                    <span className="bold">Endereço:</span><br/>
                    {order.customerAddress.street}, {order.customerAddress.number}<br/>
                    {order.customerAddress.neighborhood}<br/>
                    {order.customerAddress.complement && <span>Obs: {order.customerAddress.complement}<br/></span>}
                </div>
            )}

            {/* ITENS */}
            <div className="section-header">ITENS</div>
            <div>
                {order.items.map((item, index) => (
                    <div key={`${item.id}-${index}`} style={{ marginBottom: '8px', borderBottom: '1px dotted #ccc', paddingBottom: '4px' }}>
                        <div className="item-row">
                            <span className="item-qty">{item.quantity}x</span>
                            <span className="item-name">{item.name}</span>
                            <span className="item-price">{(item.price * item.quantity).toFixed(2)}</span>
                        </div>

                        {/* Detalhes do Item */}
                        <div className="item-details">
                            {item.sizeName && <div>Tam: {item.sizeName}</div>}
                            
                            {item.halves && item.halves.length > 1 && (
                                <div>½ {item.halves[0].name} | ½ {item.halves[1].name}</div>
                            )}

                            {/* Opções Customizadas */}
                            {item.selectedOptions && item.selectedOptions.map((opt, idx) => (
                                <div key={`opt-${idx}`}>+ {opt.optionName}</div>
                            ))}

                            {/* Adicionais */}
                            {item.selectedAddons && item.selectedAddons.map((addon, idx) => (
                                <div key={`add-${idx}`}>+ {addon.name}</div>
                            ))}

                            {/* Observação - Destaque em Negrito */}
                            {item.notes && (
                                <div style={{ fontWeight: 'bold', marginTop: '2px', textTransform: 'uppercase' }}>
                                    [OBS: {item.notes}]
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* TOTAIS */}
            <div className="receipt-footer">
                <div className="sub-row">
                    <span>Subtotal:</span>
                    <span>{order.subtotal?.toFixed(2)}</span>
                </div>
                {order.deliveryFee != null && order.deliveryFee > 0 && (
                    <div className="sub-row">
                        <span>Taxa Entrega:</span>
                        <span>{order.deliveryFee.toFixed(2)}</span>
                    </div>
                )}
                {order.discountAmount != null && order.discountAmount > 0 && (
                    <div className="sub-row">
                        <span>Desconto:</span>
                        <span>-{order.discountAmount.toFixed(2)}</span>
                    </div>
                )}
                
                <div className="total-row">
                    <span>TOTAL:</span>
                    <span>R$ {order.totalPrice.toFixed(2)}</span>
                </div>
            </div>

            {/* FORMA DE PAGAMENTO */}
            {isPixPaid ? (
                <div className="payment-box-pix">
                    PIX - JÁ PAGO
                </div>
            ) : (
                <div className="payment-box">
                    {order.paymentMethod === 'Marcar na minha conta' ? 'FIADO / CONTA' : order.paymentMethod}
                    {order.paymentStatus === 'paid' ? ' (PAGO)' : ' (A COBRAR)'}
                </div>
            )}

            <div className="center" style={{ fontSize: smallFontSize, marginTop: '15px' }}>
                GuaraFood Delivery<br/>
                www.guarafood.com.br
                <br/>.<br/>. {/* Espaço para corte */}
            </div>
        </div>
    );
};

export default PrintableOrder;
