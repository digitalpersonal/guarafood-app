
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
                            /* DESATIVA SUAVIZAÇÃO: Garante preto puro para fita térmica */
                            -webkit-font-smoothing: none;
                            -moz-osx-font-smoothing: grayscale;
                        }
                        
                        .no-print {
                            display: none !important;
                        }
                    }

                    /* Estilos do Cupom */
                    #thermal-receipt {
                        font-family: 'Courier New', Courier, monospace; 
                        width: 90%; /* Margem física de segurança */
                        margin: 0 auto; 
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
                        color: #000 !important; /* Força contraste máximo */
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

                    /* CAIXA DE ENDEREÇO COM DESTAQUE MÁXIMO */
                    .address-box {
                        border: 3px solid #000;
                        padding: 6px;
                        margin-top: 8px;
                        font-size: ${headerFontSize};
                        font-weight: 900 !important;
                        width: 100%;
                        word-wrap: break-word;
                        background: #fff;
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
                    
                    /* VALORES EM ULTRA-NEGRITO */
                    .sub-row {
                        display: flex;
                        justify-content: space-between;
                        font-size: ${headerFontSize}; 
                        font-weight: 900 !important; 
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
                        padding: 10px 5px;
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
                    
                    .bold-extra { font-weight: 900 !important; }
                    .center { text-align: center; }
                `}
            </style>

            <div className="receipt-header">
                <div className="receipt-title">{order.restaurantName}</div>
                <div className="bold-extra">
                    {new Date(order.timestamp).toLocaleDateString('pt-BR')} - {new Date(order.timestamp).toLocaleTimeString('pt-BR').substring(0,5)}
                </div>
                <div className="bold-extra" style={{ fontSize: titleFontSize, marginTop: '5px' }}>
                    #{order.id.substring(0, 6).toUpperCase()}
                </div>
            </div>

            <div className="mode-banner">
                <span>{isPickup ? "*** RETIRADA NO BALCÃO ***" : "=== ENTREGA EM CASA ==="}</span>
            </div>

            <div className="section-header">
                <span>CLIENTE</span>
            </div>
            <div style={{ fontSize: headerFontSize }} className="bold-extra">{order.customerName}</div>
            <div className="bold-extra">Tel: {order.customerPhone}</div>
            
            {!isPickup && order.customerAddress && (
                <div className="address-box">
                    <div className="bold-extra" style={{textDecoration: 'underline', marginBottom: '4px'}}>ENDEREÇO DE ENTREGA:</div>
                    <div className="bold-extra">RUA: {order.customerAddress.street}, {order.customerAddress.number}</div>
                    <div className="bold-extra">BAIRRO: {order.customerAddress.neighborhood}</div>
                    {order.customerAddress.complement && <div className="bold-extra">OBS: {order.customerAddress.complement}</div>}
                </div>
            )}

            <div className="section-header">
                <span>QTD</span>
                <span>ITEM</span>
                <span>R$</span>
            </div>
            <div>
                {order.items.map((item, index) => (
                    <div key={`${item.id}-${index}`} style={{ borderBottom: '1px dashed #000', paddingBottom: '4px', marginTop: '6px' }}>
                        <div className="item-row">
                            <span className="item-qty">{item.quantity}</span>
                            <span className="item-name bold-extra">{item.name}</span>
                            <span className="bold-extra">{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                        {item.notes && (
                            <div className="bold-extra" style={{ fontSize: smallFontSize, backgroundColor: '#eee', padding: '4px', display: 'inline-block', border: '1px solid #000', marginTop: '4px' }}>
                                OBS: {item.notes}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="section-header" style={{marginTop: '20px'}}>
                <span>RESUMO DO PAGAMENTO</span>
            </div>
            <div className="sub-row">
                <span>SUBTOTAL:</span>
                <span>R$ {order.subtotal?.toFixed(2)}</span>
            </div>
            {order.deliveryFee != null && order.deliveryFee > 0 && (
                <div className="sub-row">
                    <span>TAXA ENTREGA:</span>
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
                <span>VALOR TOTAL</span>
                <span>R$ {order.totalPrice.toFixed(2)}</span>
            </div>

            <div style={{marginTop: '15px'}}>
                <div className="center bold-extra" style={{fontSize: '12px', marginBottom: '4px'}}>FORMA DE PAGAMENTO</div>
                <div className="payment-box">
                    {order.paymentMethod === 'Marcar na minha conta' ? 'FIADO / CONTA' : order.paymentMethod}
                    {isPixPaid ? ' (PAGO VIA PIX)' : ''}
                </div>
            </div>

            <div className="center bold-extra" style={{ fontSize: smallFontSize, marginTop: '35px', borderTop: '2px solid #000', paddingTop: '10px' }}>
                GuaraFood - Gestão Inteligente
                <br/>Obrigado pela preferência!
                <br/>.<br/>.
            </div>
        </div>
    );
};

export default PrintableOrder;
