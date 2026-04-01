import React from 'react';
import type { Order, Restaurant } from '../types';

interface PrintableOrderProps {
    order: Order;
    restaurant?: Restaurant | null;
    printerWidth?: number; // 80 or 58
    printMode?: 'full' | 'kitchen' | 'admin'; // 'full' prints everything, 'kitchen'/'admin' prints only new items
    printedItems?: string[]; // IDs of items already printed (for kitchen mode)
}

const PrintableOrder: React.FC<PrintableOrderProps> = ({ 
    order, 
    restaurant,
    printerWidth = 80, 
    printMode = 'full', 
    printedItems = [] 
}) => {
    const paperSize = `${printerWidth}mm`;
    
    // Use logo from restaurant prop or order if available
    const logoUrl = restaurant?.imageUrl || order.restaurantLogo;
    const restaurantName = restaurant?.name || order.restaurantName;
    const restaurantPhone = restaurant?.phone || order.restaurantPhone;
    const restaurantAddress = restaurant?.address || order.restaurantAddress;

    // Filter items for kitchen/admin printing (only new items)
    const itemsToPrint = (printMode === 'kitchen' || printMode === 'admin')
        ? order.items.filter(item => !item.kitchenPrinted && !printedItems.includes(item.id))
        : order.items;

    // If kitchen/admin mode and no new items, don't render anything
    if ((printMode === 'kitchen' || printMode === 'admin') && itemsToPrint.length === 0) {
        return null; 
    }

    // ÁREAS ÚTEIS SEGURAS:
    // 80mm -> Usamos 62mm de conteúdo útil
    // 58mm -> Usamos 48mm de conteúdo útil
    const contentWidth = printerWidth === 80 ? '65mm' : '48mm';
    
    const baseFontSize = printerWidth === 58 ? '18px' : '13px';
    const headerFontSize = printerWidth === 58 ? '20px' : '15px';
    const titleFontSize = printerWidth === 58 ? '26px' : '22px';
    const smallFontSize = printerWidth === 58 ? '16px' : '11px';
    const lineHeight = printerWidth === 58 ? '1.2' : '1.1';

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
                        }
                        html, body {
                            margin: 0 !important;
                            padding: 0 !important;
                            height: auto !important;
                            width: ${paperSize} !important;
                            background: #fff !important;
                        }
                        #thermal-receipt-container {
                            width: ${paperSize} !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            background: #fff !important;
                            display: block !important;
                        }
                        #thermal-content {
                            width: 100% !important; 
                            margin: 0 !important;
                            padding: 2mm 0 10mm 0 !important;
                            box-sizing: border-box !important;
                            background: #fff !important;
                        }
                    }

                    #thermal-content {
                        font-family: 'Courier New', Courier, monospace; 
                        color: #000 !important;
                        line-height: ${lineHeight};
                        background: #fff !important;
                        padding: 0 2mm;
                    }

                    #thermal-content * {
                        color: #000 !important;
                        background: #fff !important;
                        word-wrap: break-word !important;
                        overflow-wrap: break-word !important;
                        white-space: normal !important;
                        font-weight: 900 !important;
                    }

                    .receipt-header {
                        text-align: center;
                        margin-bottom: 8px;
                    }

                    .order-number-box {
                        font-size: ${titleFontSize};
                        border: 4px solid #000;
                        display: inline-block;
                        padding: 8px 24px;
                        margin: 10px 0;
                        line-height: 1;
                        text-transform: uppercase;
                    }

                    .mode-indicator {
                        font-size: ${headerFontSize};
                        text-align: center;
                        padding: 10px 0;
                        margin: 6px 0;
                        text-transform: uppercase;
                        border-top: 2px dashed #000;
                        border-bottom: 2px dashed #000;
                        display: block;
                        width: 100%;
                    }

                    .section-divider {
                        border-top: 2.5px solid #000;
                        margin: 8px 0;
                    }

                    .dashed-divider {
                        border-top: 2px dashed #000;
                        margin: 8px 0;
                    }

                    .label-center {
                        text-align: center;
                        font-size: ${smallFontSize};
                        letter-spacing: 2px;
                        margin: 4px 0;
                        text-transform: uppercase;
                        font-weight: bold;
                    }

                    .item-row {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        width: 100%;
                        margin-bottom: 6px;
                    }

                    .item-price-col {
                        text-align: right;
                        min-width: ${printerWidth === 58 ? '85px' : '80px'};
                        margin-left: 2mm;
                    }

                    .payment-box {
                        border: 3px solid #000;
                        padding: 10px;
                        text-align: center;
                        margin-top: 12px;
                        font-size: ${baseFontSize};
                        text-transform: uppercase;
                    }

                    .condiments-box {
                        border: 2px solid #000;
                        padding: 6px;
                        text-align: center;
                        margin: 6px 0;
                        font-size: ${headerFontSize};
                        font-weight: bold;
                    }

                    .qr-code-container {
                        text-align: center;
                        margin: 15px 0;
                        border: 1px solid #eee;
                        padding: 10px;
                    }

                    .qr-code-container img {
                        width: 120px;
                        height: 120px;
                        display: inline-block;
                    }

                    .footer-message {
                        text-align: center;
                        font-size: ${smallFontSize};
                        margin-top: 15px;
                        font-style: italic;
                    }

                    .cut-line {
                        text-align: center;
                        font-size: 10px;
                        color: #666 !important;
                        margin: 20px 0 0 0;
                        border-top: 1px dashed #ccc;
                        padding-top: 5px;
                    }
                `}
            </style>

            <div id="thermal-content">
                {/* CABEÇALHO */}
                <div className="receipt-header">
                    {logoUrl && (
                        <div style={{ marginBottom: '10px' }}>
                            <img 
                                src={logoUrl} 
                                alt="Logo" 
                                style={{ maxWidth: '50mm', maxHeight: '25mm', objectFit: 'contain' }}
                                referrerPolicy="no-referrer"
                            />
                        </div>
                    )}
                    <div style={{ fontSize: titleFontSize, marginBottom: '4px', fontWeight: 'bold' }}>{restaurantName.toUpperCase()}</div>
                    {printMode === 'full' && (
                        <div style={{ fontSize: smallFontSize, marginBottom: '4px' }}>
                            {restaurantAddress && <div>{restaurantAddress.toUpperCase()}</div>}
                            {restaurantPhone && <div>FONE: {restaurantPhone}</div>}
                        </div>
                    )}
                    <div style={{ fontSize: smallFontSize }}>
                        {new Date(order.timestamp).toLocaleDateString('pt-BR')} - {new Date(order.timestamp).toLocaleTimeString('pt-BR').substring(0,5)}
                    </div>
                    {order.waiterName && (
                        <div style={{ fontSize: smallFontSize, marginTop: '2px', fontWeight: 'bold' }}>
                            ATENDIDO POR: {order.waiterName.toUpperCase()}
                        </div>
                    )}
                    <div className="order-number-box">
                        {printMode === 'kitchen' ? `COZINHA - #${displayOrderNum}` : printMode === 'admin' ? `ADMIN - #${displayOrderNum}` : `PEDIDO: ${displayOrderNum}`}
                    </div>
                    
                    {/* MESA / COMANDA */}
                    {(order.tableNumber || order.comandaNumber) && (
                        <div style={{ 
                            marginTop: '8px', 
                            border: '3px solid #000', 
                            padding: '8px', 
                            display: 'flex', 
                            justifyContent: 'space-around',
                            fontSize: titleFontSize,
                            fontWeight: '900'
                        }}>
                            {order.tableNumber && <div>MESA: {order.tableNumber}</div>}
                            {order.comandaNumber && <div>COMANDA: {order.comandaNumber}</div>}
                        </div>
                    )}
                </div>

                <div className="section-divider"></div>

                {/* MODO DE ENTREGA */}
                <div className="mode-indicator">
                    {order.tableNumber 
                        ? `>>> CONSUMO LOCAL <<<` 
                        : isPickup 
                            ? ">>> RETIRADA NO BALCÃO <<<" 
                            : ">>> ENTREGA EM DOMICÍLIO <<<"}
                </div>

                {/* SACHÊS / CONDIMENTOS */}
                {printMode === 'full' && (
                    <div className="condiments-box">
                        {order.wantsSachets 
                            ? "ENVIAR SACHÊS: SIM" 
                            : "NÃO ENVIAR SACHÊS"}
                    </div>
                )}

                {/* DADOS DO CLIENTE / ENTREGA */}
                {(order.customerName || order.customerPhone) && (
                    <div style={{ marginTop: '6px', marginBottom: '10px', fontSize: baseFontSize, border: '2px solid #000', padding: '8px' }}>
                        <div style={{ fontWeight: '900', textDecoration: 'underline', marginBottom: '6px', fontSize: headerFontSize, textAlign: 'center' }}>
                            {isPickup ? 'DADOS DO CLIENTE' : 'DADOS DE ENTREGA'}
                        </div>
                        {order.customerName && <div style={{ marginBottom: '4px' }}>CLIENTE: {order.customerName.toUpperCase()}</div>}
                        {order.customerPhone && <div style={{ marginBottom: '4px' }}>FONE: {order.customerPhone}</div>}
                        
                        {!isPickup && order.customerAddress && (
                            <>
                                <div style={{ marginBottom: '4px' }}>RUA: {order.customerAddress.street.toUpperCase()}, {order.customerAddress.number}</div>
                                {order.customerAddress.complement && <div style={{ marginBottom: '4px' }}>COMPL: {order.customerAddress.complement.toUpperCase()}</div>}
                                <div style={{ marginBottom: '4px' }}>BAIRRO: {order.customerAddress.neighborhood.toUpperCase()}</div>
                            </>
                        )}
                    </div>
                )}

                {/* VISUALIZAÇÃO APENAS PARA COZINHA/ADMIN (SEM PREÇOS TOTAIS) */}
                {(printMode === 'kitchen' || printMode === 'admin') && (
                     <div style={{ textAlign: 'center', margin: '15px 0', fontSize: titleFontSize, fontWeight: 'bold', border: '2px solid #000', padding: '5px' }}>
                        *** NOVOS ITENS ***
                     </div>
                )}

                {/* SACHÊS / CONDIMENTOS (Para Cozinha) */}
                {order.wantsSachets && (
                    <div style={{ 
                        marginTop: '10px', 
                        padding: '8px', 
                        border: '2px solid #000', 
                        textAlign: 'center', 
                        fontSize: headerFontSize, 
                        fontWeight: 'bold',
                        backgroundColor: '#f0f0f0'
                    }}>
                        *** ENVIAR SACHÊS / CONDIMENTOS ***
                    </div>
                )}

                {/* SEÇÃO ITENS */}
                <div className="dashed-divider"></div>
                <div className="label-center">ITENS DO PEDIDO</div>
                <div className="dashed-divider"></div>

                <div style={{ width: '100%', marginBottom: '10px' }}>
                    {itemsToPrint.map((item, index) => (
                        <div key={index} style={{ marginBottom: '12px' }}>
                            <div className="item-row">
                                <div style={{ 
                                    flex: 1, 
                                    textTransform: 'uppercase', 
                                    fontSize: printMode === 'kitchen' ? titleFontSize : baseFontSize, 
                                    fontWeight: 'bold' 
                                }}>
                                    {item.quantity}X {item.name} {item.sizeName && `(${item.sizeName})`}
                                </div>
                                {printMode !== 'kitchen' && (
                                    <div className="item-price-col" style={{ fontSize: baseFontSize }}>
                                        {(Number(item.price) * item.quantity).toFixed(2)}
                                    </div>
                                )}
                            </div>
                            
                            {/* ADICIONAIS E OPÇÕES */}
                            {item.selectedOptions?.map((opt, i) => (
                                <div key={i} style={{ fontSize: printMode === 'kitchen' ? headerFontSize : smallFontSize, paddingLeft: '6mm', fontWeight: 'bold' }}>+ {opt.optionName.toUpperCase()}</div>
                            ))}
                            {item.selectedAddons?.map((a, i) => (
                                <div key={i} style={{ fontSize: printMode === 'kitchen' ? headerFontSize : smallFontSize, paddingLeft: '6mm', fontWeight: 'bold' }}>+ {a.name.toUpperCase()}</div>
                            ))}
                            {item.notes && (
                                <div style={{ 
                                    fontSize: printMode === 'kitchen' ? headerFontSize : smallFontSize, 
                                    borderLeft: '5px solid #000', 
                                    paddingLeft: '4mm', 
                                    margin: '6px 0 0 6mm', 
                                    fontWeight: 'bold',
                                    fontStyle: 'italic'
                                }}>
                                    OBS: {item.notes.toUpperCase()}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* TOTAIS - APENAS SE NÃO FOR MODO COZINHA */}
                {printMode === 'full' && (
                    <>
                        <div className="dashed-divider"></div>
                        <div style={{ fontSize: baseFontSize }}>
                            <div className="item-row">
                                <span>SUBTOTAL:</span>
                                <span className="item-price-col">R$ {Number(order.subtotal || 0).toFixed(2)}</span>
                            </div>
                            {!isPickup && (
                                <div className="item-row">
                                    <span>TAXA ENTREGA:</span>
                                    <span className="item-price-col">R$ {Number(order.deliveryFee || 0).toFixed(2)}</span>
                                </div>
                            )}
                            {order.serviceCharge != null && order.serviceCharge > 0 && (
                                <div className="item-row">
                                    <span>TAXA SERVIÇO (10%):</span>
                                    <span className="item-price-col">R$ {order.serviceCharge.toFixed(2)}</span>
                                </div>
                            )}
                            {order.discountAmount && order.discountAmount > 0 && (
                                <div className="item-row" style={{ color: '#000' }}>
                                    <span>DESCONTO {order.couponCode && `(${order.couponCode})`}:</span>
                                    <span className="item-price-col">- R$ {order.discountAmount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="item-row" style={{ fontSize: titleFontSize, marginTop: '8px', borderTop: '3px solid #000', paddingTop: '8px', fontWeight: 'bold' }}>
                                <span>TOTAL:</span>
                                <span className="item-price-col">R$ {Number(order.totalPrice).toFixed(2)}</span>
                            </div>
                        </div>

                        {/* PAGAMENTO */}
                        <div className="payment-box">
                            <div style={{ fontWeight: 'bold', fontSize: headerFontSize }}>FORMA DE PGTO:</div>
                            <div style={{ fontSize: titleFontSize, fontWeight: 'bold', margin: '4px 0' }}>{order.paymentMethod.split('(')[0].trim().toUpperCase()}</div>
                            
                            {(order.changeFor || order.paymentMethod.includes('Troco para')) && (
                                <div style={{ fontSize: headerFontSize, marginTop: '6px', borderTop: '2px dashed #000', paddingTop: '6px', fontWeight: '900' }}>
                                    {order.changeFor 
                                        ? `TROCO PARA: R$ ${order.changeFor.toFixed(2)}`
                                        : (order.paymentMethod.match(/\(([^)]+)\)/)?.[1].toUpperCase() || order.paymentMethod.toUpperCase())
                                    }
                                    {order.changeFor && order.changeFor > order.totalPrice && (
                                        <div style={{ fontSize: baseFontSize, marginTop: '4px' }}>
                                            DEVOLVER: R$ {(order.changeFor - order.totalPrice).toFixed(2)}
                                        </div>
                                    )}
                                </div>
                            )}
                            {isPixPaid && <div style={{ fontSize: baseFontSize, marginTop: '4px', color: '#000', fontWeight: 'bold' }}>[ PAGO PELO APP ]</div>}
                            
                            {/* HISTÓRICO DE PAGAMENTOS E SALDO */}
                            {order.paymentHistory && order.paymentHistory.length > 0 && (
                                <div style={{ marginTop: '10px', borderTop: '2px solid #000', paddingTop: '6px', fontSize: smallFontSize }}>
                                    <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>PAGAMENTOS REALIZADOS:</div>
                                    {order.paymentHistory.map((p, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                                            <span>{new Date(p.timestamp).toLocaleDateString()} {p.method}</span>
                                            <span>R$ {p.amount.toFixed(2)}</span>
                                        </div>
                                    ))}
                                    <div style={{ marginTop: '6px', borderTop: '1.5px solid #000', paddingTop: '4px', fontWeight: '900', fontSize: baseFontSize }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span>TOTAL PAGO:</span>
                                            <span>R$ {order.paymentHistory.reduce((acc, p) => acc + p.amount, 0).toFixed(2)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span>SALDO DEVEDOR:</span>
                                            <span>R$ {(order.totalPrice - order.paymentHistory.reduce((acc, p) => acc + p.amount, 0)).toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="footer-message">
                            OBRIGADO PELA PREFERÊNCIA!<br/>
                            VOLTE SEMPRE!
                        </div>
                    </>
                )}

                {/* RODAPÉ TÉCNICO */}
                <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '20px', borderTop: '1.5px dashed #000', paddingTop: '8px' }}>
                    SISTEMA GUARA-FOOD PDV<br/>
                    www.guarafood.com.br
                </div>

                <div className="cut-line">
                    - - - - - - - CORTE AQUI - - - - - - -
                </div>
            </div>
        </div>
    );
};

export default PrintableOrder;
