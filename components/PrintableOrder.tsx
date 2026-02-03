
import React from 'react';
import type { Order } from '../types';

interface PrintableOrderProps {
    order: Order;
    printerWidth?: number; // 80 or 58
}

const PrintableOrder: React.FC<PrintableOrderProps> = ({ order, printerWidth = 80 }) => {
    // Configurações de largura baseadas no papel selecionado
    const paperSize = `${printerWidth}mm`;
    
    // ÁREAS ÚTEIS (Padrão Jerê): 
    // Deixamos uma margem de segurança para os preços não cortarem na direita
    const contentWidth = printerWidth === 80 ? '68mm' : '48mm';
    
    const baseFontSize = printerWidth === 58 ? '11px' : '13px';
    const headerFontSize = printerWidth === 58 ? '12px' : '15px';
    const titleFontSize = printerWidth === 58 ? '18px' : '22px';
    const smallFontSize = printerWidth === 58 ? '9px' : '11px';

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
                            display: flex;
                            justify-content: center;
                        }
                        #thermal-content {
                            width: ${contentWidth} !important; 
                            margin: 0 auto !important;
                            padding: 5mm 0 !important;
                            box-sizing: border-box !important;
                        }
                    }

                    #thermal-content {
                        font-family: 'Courier New', Courier, monospace !important; 
                        color: #000 !important;
                        line-height: 1.1;
                        background: #fff !important;
                    }

                    #thermal-content * {
                        color: #000 !important;
                        background: #fff !important;
                        word-wrap: break-word !important;
                        overflow-wrap: break-word !important;
                        white-space: normal !important;
                        font-weight: 900 !important; /* Negrito ultra forte como na foto */
                        text-transform: uppercase !important;
                    }

                    .receipt-header {
                        text-align: center;
                        margin-bottom: 4px;
                    }

                    .order-box {
                        font-size: ${titleFontSize};
                        border: 2.5px solid #000;
                        display: inline-block;
                        padding: 4px 12px;
                        margin: 6px 0;
                        line-height: 1;
                    }

                    .delivery-mode {
                        font-size: ${headerFontSize};
                        text-align: center;
                        padding: 6px 0;
                        margin: 2px 0;
                        border-top: 1.5px solid #000;
                        border-bottom: 1.5px solid #000;
                        display: block;
                        width: 100%;
                    }

                    .sachet-warning {
                        border: 1px solid #000;
                        padding: 3px;
                        text-align: center;
                        margin: 4px 0;
                        font-size: ${smallFontSize};
                    }

                    .section-label {
                        text-align: center;
                        font-size: ${smallFontSize};
                        letter-spacing: 2px;
                        padding: 2px 0;
                        border-bottom: 1.5px solid #000;
                        margin-bottom: 4px;
                    }

                    .item-row {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        width: 100%;
                        margin-bottom: 3px;
                    }

                    .price-col {
                        text-align: right;
                        min-width: ${printerWidth === 58 ? '50px' : '70px'};
                        margin-left: 1mm;
                    }

                    .totals-section {
                        margin-top: 6px;
                        border-top: 1.5px solid #000;
                        padding-top: 4px;
                    }

                    .payment-method-box {
                        border: 2px solid #000;
                        padding: 5px;
                        text-align: center;
                        margin-top: 8px;
                        font-size: ${baseFontSize};
                    }

                    .footer-info {
                        text-align: center;
                        font-size: ${smallFontSize};
                        margin-top: 15px;
                        border-top: 1px dashed #000;
                        padding-top: 5px;
                    }
                `}
            </style>

            <div id="thermal-content">
                {/* TOPO IDENTICO AO JERE */}
                <div className="receipt-header">
                    <div style={{ fontSize: headerFontSize }}>{order.restaurantName}</div>
                    <div style={{ fontSize: smallFontSize }}>
                        {new Date(order.timestamp).toLocaleDateString('pt-BR')} - {new Date(order.timestamp).toLocaleTimeString('pt-BR').substring(0,5)}
                    </div>
                    <div className="order-box">
                        PEDIDO: {displayOrderNum}
                    </div>
                </div>

                {/* INDICADOR DE ENTREGA COM SETAS */}
                <div className="delivery-mode">
                    {order.tableNumber 
                        ? `>> CONSUMO MESA ${order.tableNumber} <<` 
                        : isPickup 
                            ? ">> RETIRADA NO BALCÃO <<" 
                            : ">> ENTREGA EM DOMICÍLIO <<"}
                </div>

                {/* BOX DE SACHES */}
                <div className="sachet-warning">
                    {order.wantsSachets !== false ? "ENVIAR SACHÊS/TALHERES" : "NÃO ENVIAR SACHÊS/TALHERES"}
                </div>

                {/* CLIENTE / DESTINO */}
                <div className="section-label">CLIENTE / DESTINO</div>
                <div style={{ fontSize: baseFontSize, marginBottom: '8px' }}>
                    <div style={{ fontWeight: '900' }}>{order.customerName}</div>
                    <div>TEL: {order.customerPhone}</div>
                    
                    {!isPickup && order.customerAddress && (
                        <>
                            <div>{order.customerAddress.street}, {order.customerAddress.number}</div>
                            <div>BAIRRO: {order.customerAddress.neighborhood}</div>
                            {order.customerAddress.complement && (
                                <div style={{ fontSize: smallFontSize }}>REF: {order.customerAddress.complement}</div>
                            )}
                        </>
                    )}
                </div>

                {/* ITENS */}
                <div className="section-label">ITENS</div>
                <div style={{ width: '100%' }}>
                    {order.items.map((item, index) => (
                        <div key={index} style={{ marginBottom: '5px' }}>
                            <div className="item-row">
                                <div style={{ flex: 1, fontSize: baseFontSize }}>
                                    {item.quantity}X {item.name} {item.sizeName && `(${item.sizeName})`}
                                </div>
                                <div className="price-col" style={{ fontSize: baseFontSize }}>
                                    {(Number(item.price) * item.quantity).toFixed(2)}
                                </div>
                            </div>
                            
                            {/* DETALHES DE ADICIONAIS */}
                            {item.selectedOptions?.map((opt, i) => (
                                <div key={i} style={{ fontSize: smallFontSize, paddingLeft: '4mm' }}>+ {opt.optionName}</div>
                            ))}
                            {item.selectedAddons?.map((a, i) => (
                                <div key={i} style={{ fontSize: smallFontSize, paddingLeft: '4mm' }}>+ {a.name}</div>
                            ))}
                            {item.notes && (
                                <div style={{ fontSize: smallFontSize, backgroundColor: '#eee', padding: '2px', marginTop: '2px' }}>
                                    OBS: {item.notes}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* TOTAIS EXATAMENTE COMO NO MODELO */}
                <div className="totals-section">
                    <div className="item-row" style={{ fontSize: baseFontSize }}>
                        <span>SUBTOTAL:</span>
                        <span className="price-col">R$ {Number(order.subtotal || 0).toFixed(2)}</span>
                    </div>
                    {!isPickup && (
                        <div className="item-row" style={{ fontSize: baseFontSize }}>
                            <span>TAXA ENTREGA:</span>
                            <span className="price-col">R$ {Number(order.deliveryFee || 0).toFixed(2)}</span>
                        </div>
                    )}
                    {Number(order.discountAmount || 0) > 0 && (
                        <div className="item-row" style={{ fontSize: baseFontSize }}>
                            <span>DESCONTO:</span>
                            <span className="price-col">- R$ {Number(order.discountAmount).toFixed(2)}</span>
                        </div>
                    )}
                    <div className="item-row" style={{ fontSize: titleFontSize, marginTop: '2px', borderTop: '2px solid #000', paddingTop: '2px' }}>
                        <span>TOTAL:</span>
                        <span className="price-col">R$ {Number(order.totalPrice).toFixed(2)}</span>
                    </div>
                </div>

                {/* FORMA DE PAGAMENTO EM BOX */}
                <div className="payment-method-box">
                    PGTO: {order.paymentMethod}
                    {isPixPaid && <div style={{ fontSize: '10px' }}>(PAGO PELO APP)</div>}
                </div>

                {/* RODAPÉ */}
                <div className="footer-info">
                    GUARA-FOOD PDV
                    <br/>OBRIGADO PELA PREFERENCIA!
                    <br/>.
                </div>
            </div>
        </div>
    );
};

export default PrintableOrder;
