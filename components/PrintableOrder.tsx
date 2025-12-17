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
                        
                        #thermal-receipt {
                            display: block !important;
                            visibility: visible !important;
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: ${widthCss} !important;
                            background-color: #fff !important;
                            color: #000 !important;
                            padding: 0;
                            margin: 0;
                            z-index: 9999;
                            min-height: 100vh;
                            box-sizing: border-box;
                            -webkit-font-smoothing: none; /* Desativa suavização para preto puro */
                        }
                        
                        .no-print {
                            display: none !important;
                        }
                    }

                    /* Estilos do Cupom */
                    #thermal-receipt {
                        font-family: 'Courier New', Courier, monospace; 
                        width: 90%; /* Ajustado conforme pedido de 90% */
                        margin: 0 auto; /* Centralizado no papel */
                        max-width: ${widthCss};
                        background-color: #fff;
                        color: #000;
                        padding: 0;
                        line-height: 1.1;
                        box-sizing: border-box;
                        overflow: hidden; 
                    }

                    #thermal-receipt * {
                        box-sizing: border-box;
                        color: #000 !important; /* Força preto puro */
                    }

                    .receipt-header {
                        text-align: center;
                        border-bottom: 2px dashed #000;
                        padding-bottom: 8px;
                        margin-bottom: 8px;
                        width: 100%;
                    }

                    .receipt-title {
                        font-size: ${titleFontSize};
                        font-weight: 900;
                        text-transform: uppercase;
                        margin-bottom: 4px;
                    }

                    .section-header {
                        font-size: ${baseFontSize};
                        font-weight: 900;
                        border-bottom: 2px solid #000;
                        margin-top: 10px;
                        margin-bottom: 5px;
                        padding-bottom: 2px;
                        text-transform: uppercase;
                        display: flex;
                        justify-content: space-between;
                        width: 100%;
                    }

                    /* ESTILO FORTE PARA ENDEREÇO */
                    .address-box {
                        border: 3px solid #000; /* Borda mais grossa */
                        padding: 5px;
                        margin-top: 8px;
                        font-size: ${headerFontSize}; /* Aumentado */
                        font-weight: 900 !important; /* Peso máximo */
                        width: 100%;
                        word-wrap: break-word;
                        background: #fff;
                        letter-spacing: 0.5px;
                    }

                    .item-row {
                        display: flex;
                        justify-content: space-between;
                        font-size: ${baseFontSize};
                        margin-bottom: 2px;
                        align-items: flex-start;
                        margin-top: 6px;
                        width: 100%;
                    }
                    
                    .item-qty {
                        font-weight: 900;
                        min-width: 20px;
                        font-size: ${headerFontSize};
                    }
                    
                    /* ESTILO FORTE PARA SUBTOTAL E TOTAL */
                    .sub-row {
                        display: flex;
                        justify-content: space-between;
                        font-size: ${headerFontSize}; /* Maior */
                        font-weight: 900 !important; /* Mais forte */
                        margin-bottom: 3px;
                        width: 100%;
                    }

                    .total-box {
                        background-color: #000 !important;
                        color: #fff !important;
                        display: flex;
                        justify-content: space-between;
                        font-size: ${titleFontSize};
                        font-weight: 900;
                        margin-top: 10px;
                        padding: 8px 5px;
                        width: 100%;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .total-box * { color: #fff !important; }

                    .payment-box {
                        border: 3px solid #000;
                        padding: 8px;
                        text-align: center;
                        font-weight: 900;
                        font-size: ${headerFontSize};
                        margin: 10px 0;
                        text-transform: uppercase;
                        width: 100%;
                    }

                    .mode-banner {
                        background-color: #000 !important;
                        color: #fff !important;
                        font-size: ${headerFontSize};
                        font-weight: 900;
                        text-align: center;
                        padding: 8px;
                        margin-bottom: 8px;
                        text-transform: uppercase;
                        width: 100%;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .mode-banner * { color: #fff !important; }
                    
                    .bold { font-weight: 900 !important; }
                    .center { text-align: center; }
                `}
            </style>

            <div className="receipt-header">
                <div className="receipt-title">{order.restaurantName}</div>
                <div className="bold">
                    {new Date(order.timestamp).toLocaleDateString('pt-BR')} - {new Date(order.timestamp).toLocaleTimeString('pt-BR').substring(0,5)}
                </div>
                <div className="bold" style={{ fontSize: titleFontSize, marginTop: '5px' }}>
                    SENHA: #{order.id.substring(0, 4).toUpperCase()}
                </div>
            </div>

            <div className="mode-banner">
                <span>{isPickup ? "*** RETIRADA ***" : "=== ENTREGA ==="}</span>
            </div>

            <div className="section-header">
                <span>CLIENTE</span>
            </div>
            <div style={{ fontSize: headerFontSize }} className="bold">{order.customerName}</div>
            <div className="bold">Tel: {order.customerPhone}</div>
            
            {!isPickup && order.customerAddress && (
                <div className="address-box">
                    <div className="bold">ENTREGAR EM:</div>
                    <div>{order.customerAddress.street}, {order.customerAddress.number}</div>
                    <div>BAIRRO: {order.customerAddress.neighborhood}</div>
                    {order.customerAddress.complement && <div>OBS: {order.customerAddress.complement}</div>}
                </div>
            )}

            <div className="section-header">
                <span>QTD</span>
                <span>ITEM</span>
                <span>R$</span>
            </div>
            <div>
                {order.items.map((item, index) => (
                    <div key={`${item.id}-${index}`} style={{ borderBottom: '1px dashed #000', paddingBottom: '4px', marginTop: '5px' }}>
                        <div className="item-row">
                            <span className="item-qty">{item.quantity}</span>
                            <span className="item-name bold">{item.name}</span>
                            <span className="bold">{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                        {item.notes && (
                            <div className="bold" style={{ fontSize: smallFontSize, backgroundColor: '#eee', padding: '2px', display: 'inline-block' }}>
                                OBS: {item.notes}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="section-header" style={{marginTop: '15px'}}>
                <span>RESUMO VALORES</span>
            </div>
            <div className="sub-row">
                <span>SUBTOTAL:</span>
                <span>{order.subtotal?.toFixed(2)}</span>
            </div>
            {order.deliveryFee != null && order.deliveryFee > 0 && (
                <div className="sub-row">
                    <span>TAXA ENTREGA:</span>
                    <span>{order.deliveryFee.toFixed(2)}</span>
                </div>
            )}
            {order.discountAmount != null && order.discountAmount > 0 && (
                <div className="sub-row">
                    <span>DESCONTO:</span>
                    <span>-{order.discountAmount.toFixed(2)}</span>
                </div>
            )}
            
            <div className="total-box">
                <span>TOTAL PEDIDO</span>
                <span>R$ {order.totalPrice.toFixed(2)}</span>
            </div>

            <div style={{marginTop: '15px'}}>
                <div className="center bold" style={{fontSize: '12px', marginBottom: '4px'}}>FORMA DE PAGAMENTO</div>
                <div className="payment-box">
                    {order.paymentMethod === 'Marcar na minha conta' ? 'FIADO / CONTA' : order.paymentMethod}
                    {isPixPaid ? ' (PAGO)' : ''}
                </div>
            </div>

            <div className="center bold" style={{ fontSize: smallFontSize, marginTop: '30px', borderTop: '2px solid #000', paddingTop: '10px' }}>
                GuaraFood - Delivery da Cidade
                <br/>.<br/>.
            </div>
        </div>
    );
};

export default PrintableOrder;