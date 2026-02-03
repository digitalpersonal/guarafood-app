
import React from 'react';
import type { Order } from '../types';

interface PrintableOrderProps {
    order: Order;
    printerWidth?: number; // 80 or 58
}

const PrintableOrder: React.FC<PrintableOrderProps> = ({ order, printerWidth = 80 }) => {
    // Definimos larguras fixas em pixels para "travar" o layout no papel térmico
    // 80mm -> ~300px útil | 58mm -> ~210px útil
    const containerWidth = printerWidth === 80 ? '300px' : '210px';
    const baseFontSize = printerWidth === 58 ? '12px' : '14px';
    const bigFontSize = printerWidth === 58 ? '22px' : '28px';

    const isPickup = !order.customerAddress || 
                     !order.customerAddress.street ||
                     order.customerAddress.street.includes('Retirada') || 
                     order.tableNumber !== undefined;

    const displayOrderNum = order.order_number 
        ? `${String(order.order_number).padStart(3, '0')}`
        : `${order.id.substring(order.id.length - 4).toUpperCase()}`;

    return (
        <div id="thermal-print-area">
            <style>
                {`
                    @media print {
                        @page { margin: 0; size: auto; }
                        body { margin: 0; padding: 0; }
                    }

                    #thermal-print-area {
                        width: ${containerWidth};
                        background: #fff;
                        color: #000;
                        font-family: 'Courier New', Courier, monospace !important;
                        padding: 10px;
                        margin: 0 auto;
                        line-height: 1.2;
                    }

                    #thermal-print-area * {
                        color: #000 !important;
                        text-transform: uppercase !important;
                        font-weight: 900 !important;
                        -webkit-print-color-adjust: exact;
                    }

                    .divider {
                        border-top: 2px solid #000;
                        margin: 5px 0;
                        width: 100%;
                    }

                    .double-divider {
                        border-top: 1px solid #000;
                        border-bottom: 1px solid #000;
                        height: 4px;
                        margin: 8px 0;
                    }

                    .text-center { text-align: center; }
                    .text-right { text-align: right; }

                    .order-box {
                        border: 3px solid #000;
                        padding: 5px;
                        margin: 10px auto;
                        display: block;
                        width: fit-content;
                    }

                    /* Tabela de itens para máxima compatibilidade com drivers antigos */
                    .items-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 10px 0;
                    }
                    .items-table td {
                        vertical-align: top;
                        padding-bottom: 5px;
                    }

                    .payment-box {
                        border: 1px solid #000;
                        padding: 8px;
                        margin-top: 15px;
                        text-align: center;
                        font-size: ${baseFontSize};
                    }

                    .section-label {
                        text-decoration: underline;
                        display: block;
                        margin-bottom: 5px;
                        font-size: ${baseFontSize};
                    }
                `}
            </style>

            <div className="text-center">
                <div style={{ fontSize: baseFontSize }}>{order.restaurantName}</div>
                <div style={{ fontSize: '10px' }}>
                    {new Date(order.timestamp).toLocaleDateString('pt-BR')} - {new Date(order.timestamp).toLocaleTimeString('pt-BR').substring(0,5)}
                </div>
                
                <div className="order-box">
                    <span style={{ fontSize: '12px' }}>PEDIDO: </span>
                    <span style={{ fontSize: bigFontSize }}>{displayOrderNum}</span>
                </div>
            </div>

            <div className="double-divider"></div>
            <div className="text-center" style={{ fontSize: baseFontSize }}>
                {order.tableNumber 
                    ? `>> CONSUMO LOCAL - MESA ${order.tableNumber} <<` 
                    : isPickup 
                        ? ">> RETIRADA NO BALCÃO <<" 
                        : ">> ENTREGA EM DOMICÍLIO <<"}
            </div>
            <div className="double-divider"></div>

            <div className="text-center" style={{ margin: '5px 0' }}>
                <span style={{ border: '1px solid #000', padding: '2px 5px', fontSize: '10px' }}>
                    {order.wantsSachets !== false ? "ENVIAR SACHÊS/TALHERES" : "NÃO ENVIAR SACHÊS/TALHERES"}
                </span>
            </div>

            <div className="text-center" style={{ marginTop: '10px' }}>
                <span className="section-label">CLIENTE / DESTINO</span>
            </div>
            
            <div style={{ fontSize: baseFontSize }}>
                <div>{order.customerName}</div>
                <div>TEL: {order.customerPhone}</div>
                {!isPickup && order.customerAddress && (
                    <>
                        <div>{order.customerAddress.street}, {order.customerAddress.number}</div>
                        <div>BAIRRO: {order.customerAddress.neighborhood}</div>
                        {order.customerAddress.complement && (
                            <div style={{ fontSize: '10px' }}>REF: {order.customerAddress.complement}</div>
                        )}
                    </>
                )}
            </div>

            <div className="text-center" style={{ marginTop: '15px' }}>
                <span className="section-label">ITENS</span>
            </div>

            <table className="items-table">
                <tbody>
                    {order.items.map((item, index) => (
                        <React.Fragment key={index}>
                            <tr>
                                <td style={{ fontSize: baseFontSize }}>
                                    {item.quantity}X {item.name} {item.sizeName && `(${item.sizeName})`}
                                </td>
                                <td className="text-right" style={{ fontSize: baseFontSize, whiteSpace: 'nowrap', paddingLeft: '10px' }}>
                                    {(Number(item.price) * item.quantity).toFixed(2)}
                                </td>
                            </tr>
                            {item.selectedOptions?.map((opt, i) => (
                                <tr key={`opt-${i}`}>
                                    <td colSpan={2} style={{ fontSize: '10px', paddingLeft: '15px' }}>+ {opt.optionName}</td>
                                </tr>
                            ))}
                            {item.selectedAddons?.map((a, i) => (
                                <tr key={`add-${i}`}>
                                    <td colSpan={2} style={{ fontSize: '10px', paddingLeft: '15px' }}>+ {a.name}</td>
                                </tr>
                            ))}
                            {item.notes && (
                                <tr>
                                    <td colSpan={2} style={{ fontSize: '10px', paddingLeft: '15px', color: '#333' }}>OBS: {item.notes}</td>
                                </tr>
                            )}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>

            <div style={{ borderTop: '1px dashed #000', paddingTop: '5px' }}>
                <table style={{ width: '100%', fontSize: baseFontSize }}>
                    <tbody>
                        <tr>
                            <td>SUBTOTAL:</td>
                            <td className="text-right">R$ {Number(order.subtotal || 0).toFixed(2)}</td>
                        </tr>
                        {!isPickup && (
                            <tr>
                                <td>TAXA ENTREGA:</td>
                                <td className="text-right">R$ {Number(order.deliveryFee || 0).toFixed(2)}</td>
                            </tr>
                        )}
                        {Number(order.discountAmount || 0) > 0 && (
                            <tr>
                                <td>DESCONTO:</td>
                                <td className="text-right">- R$ {Number(order.discountAmount).toFixed(2)}</td>
                            </tr>
                        )}
                        <tr>
                            <td style={{ fontSize: baseFontSize, paddingTop: '5px' }}>TOTAL:</td>
                            <td className="text-right" style={{ fontSize: bigFontSize }}>R$ {Number(order.totalPrice).toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="payment-box">
                PAGAMENTO: {order.paymentMethod}
            </div>

            <div className="text-center" style={{ fontSize: '10px', marginTop: '20px' }}>
                GUARA-FOOD PDV - PADRAO JERE
                <br/>OBRIGADO PELA PREFERENCIA!
                <br/>.
            </div>
        </div>
    );
};

export default PrintableOrder;
