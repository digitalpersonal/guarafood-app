
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
    const titleFontSize = printerWidth === 58 ? '16px' : '20px';
    const smallFontSize = printerWidth === 58 ? '10px' : '11px';

    const isPixPaid = order.paymentMethod.toLowerCase().includes('pix') && order.paymentStatus === 'paid';
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
                        
                        /* Configuração do Recibo - Sobrescreve e garante visibilidade */
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
                        line-height: 1.1;
                    }

                    .receipt-header {
                        text-align: center;
                        border-bottom: 2px dashed #000;
                        padding-bottom: 8px;
                        margin-bottom: 8px;
                    }

                    .receipt-title {
                        font-size: ${titleFontSize};
                        font-weight: 900;
                        text-transform: uppercase;
                        margin-bottom: 4px;
                    }

                    .receipt-info {
                        font-size: ${baseFontSize};
                    }

                    .section-header {
                        font-size: ${baseFontSize};
                        font-weight: 900;
                        border-bottom: 1px solid #000;
                        margin-top: 10px;
                        margin-bottom: 5px;
                        padding-bottom: 2px;
                        text-transform: uppercase;
                        display: flex;
                        justify-content: space-between;
                    }

                    .item-row {
                        display: flex;
                        justify-content: space-between;
                        font-size: ${baseFontSize};
                        margin-bottom: 2px;
                        align-items: flex-start;
                        margin-top: 6px;
                    }
                    
                    .item-qty {
                        font-weight: 900;
                        min-width: 25px;
                        font-size: ${headerFontSize};
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

                    .total-box {
                        background-color: #000;
                        color: #fff !important;
                        display: flex;
                        justify-content: space-between;
                        font-size: ${titleFontSize};
                        font-weight: 900;
                        margin-top: 8px;
                        padding: 5px;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }

                    .sub-row {
                        display: flex;
                        justify-content: space-between;
                        font-size: ${baseFontSize};
                        margin-bottom: 2px;
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
                    .mode-banner {
                        background-color: #000;
                        color: #fff !important;
                        font-size: ${headerFontSize};
                        font-weight: 900;
                        text-align: center;
                        padding: 5px;
                        margin-bottom: 8px;
                        text-transform: uppercase;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    
                    /* Box de Endereço */
                    .address-box {
                        border: 2px solid #000;
                        padding: 5px;
                        margin-top: 5px;
                        font-size: ${baseFontSize};
                    }
                    
                    /* Utilitários */
                    .bold { font-weight: 900; }
                    .center { text-align: center; }
                    .uppercase { text-transform: uppercase; }
                    .dashed-line { border-bottom: 1px dashed #000; margin: 5px 0; }
                `}
            </style>

            {/* HEADER */}
            <div className="receipt-header">
                <div className="receipt-title">{order.restaurantName}</div>
                <div className="receipt-info">
                    {new Date(order.timestamp).toLocaleDateString('pt-BR')} - {new Date(order.timestamp).toLocaleTimeString('pt-BR').substring(0,5)}
                </div>
                <div className="receipt-info bold" style={{ fontSize: titleFontSize, marginTop: '5px' }}>
                    SENHA: #{order.id.substring(0, 4).toUpperCase()}
                </div>
            </div>

            {/* MODO DE ENTREGA (DESTAQUE) */}
            <div className="mode-banner">
                {isPickup ? "*** RETIRADA NO BALCÃO ***" : "=== ENTREGA ==="}
            </div>

            {/* CLIENTE */}
            <div className="section-header">
                <span>CLIENTE</span>
            </div>
            <div style={{ fontSize: headerFontSize }} className="bold">{order.customerName}</div>
            <div style={{ fontSize: baseFontSize }}>Tel: {order.customerPhone}</div>
            
            {/* Endereço só aparece se NÃO for retirada */}
            {!isPickup && order.customerAddress && (
                <div className="address-box">
                    <span className="bold">ENTREGAR EM:</span><br/>
                    {order.customerAddress.street}, {order.customerAddress.number}<br/>
                    {order.customerAddress.neighborhood}<br/>
                    {order.customerAddress.complement && <span className="bold">Obs: {order.customerAddress.complement}<br/></span>}
                </div>
            )}

            {/* ITENS */}
            <div className="section-header">
                <span>QTD</span>
                <span>ITEM</span>
                <span>R$</span>
            </div>
            <div>
                {order.items.map((item, index) => (
                    <div key={`${item.id}-${index}`} style={{ borderBottom: '1px dashed #ccc', paddingBottom: '4px' }}>
                        <div className="item-row">
                            <span className="item-qty">{item.quantity}</span>
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
                                <div style={{ fontWeight: 'bold', marginTop: '2px', textTransform: 'uppercase', backgroundColor: '#eee', display: 'inline-block', padding: '2px' }}>
                                    OBS: {item.notes}
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
                
                <div className="total-box">
                    <span>TOTAL</span>
                    <span>R$ {order.totalPrice.toFixed(2)}</span>
                </div>
            </div>

            {/* FORMA DE PAGAMENTO */}
            <div style={{marginTop: '10px'}}>
                <div style={{fontSize: '12px', fontWeight: 'bold', textAlign: 'center', marginBottom: '2px'}}>FORMA DE PAGAMENTO</div>
                {isPixPaid ? (
                    <div className="payment-box-pix">
                        PIX - JÁ PAGO
                    </div>
                ) : (
                    <div className="payment-box">
                        {order.paymentMethod === 'Marcar na minha conta' ? 'FIADO / CONTA' : order.paymentMethod}
                        {order.paymentStatus === 'paid' ? ' (PAGO)' : ''}
                    </div>
                )}
            </div>

            <div className="center" style={{ fontSize: smallFontSize, marginTop: '20px', borderTop: '1px solid #000', paddingTop: '5px' }}>
                Sistema GuaraFood<br/>
                www.guarafood.com.br
                <br/>.<br/>.
            </div>
        </div>
    );
};

export default PrintableOrder;
