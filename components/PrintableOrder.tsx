
import React from 'react';
import type { Order } from '../types';

interface PrintableOrderProps {
    order: Order;
    printerWidth?: number; // 80 or 58
}

const PrintableOrder: React.FC<PrintableOrderProps> = ({ order, printerWidth = 80 }) => {
    const paperSize = `${printerWidth}mm`;
    const contentWidth = printerWidth === 80 ? '72mm' : '52mm';
    
    // Escalonamento de fontes para parecerem idênticas à foto
    const baseFontSize = printerWidth === 58 ? '12px' : '14px';
    const titleFontSize = printerWidth === 58 ? '22px' : '28px';
    const smallFontSize = printerWidth === 58 ? '10px' : '11px';

    const isPickup = !order.customerAddress || 
                     !order.customerAddress.street ||
                     order.customerAddress.street.includes('Retirada') || 
                     order.tableNumber !== undefined;

    const displayOrderNum = order.order_number 
        ? `${String(order.order_number).padStart(3, '0')}`
        : `${order.id.substring(order.id.length - 4).toUpperCase()}`;

    return (
        <div id="thermal-receipt-container">
            <style>
                {`
                    @media print {
                        @page { margin: 0 !important; size: ${paperSize} auto; }
                        body { margin: 0 !important; padding: 0 !important; width: ${paperSize} !important; background: #fff !important; }
                        #thermal-receipt-container { width: ${paperSize} !important; display: flex; justify-content: center; }
                        #thermal-content { width: ${contentWidth} !important; padding: 5mm 0 !important; }
                    }

                    #thermal-content {
                        font-family: 'Courier New', Courier, monospace !important; 
                        color: #000 !important;
                        line-height: 1.2;
                    }

                    #thermal-content * {
                        color: #000 !important;
                        font-weight: 900 !important; 
                        text-transform: uppercase !important;
                        letter-spacing: -0.5px;
                    }

                    .text-center { text-align: center; }
                    .text-right { text-align: right; }

                    /* O Box do Pedido idêntico ao Jerê */
                    .pedido-box {
                        border: 2px solid #000;
                        padding: 5px 15px;
                        display: inline-block;
                        margin: 10px 0;
                    }
                    .pedido-label { font-size: ${baseFontSize}; }
                    .pedido-numero { font-size: ${titleFontSize}; }

                    /* Divisores de linha dupla do Jerê */
                    .double-line {
                        border-top: 1px solid #000;
                        border-bottom: 1px solid #000;
                        height: 3px;
                        margin: 8px 0;
                    }

                    /* Box de Saches e Labels de Seção */
                    .label-box {
                        border: 1px solid #000;
                        padding: 2px 10px;
                        font-size: ${smallFontSize};
                        display: inline-block;
                        margin-bottom: 5px;
                    }

                    /* Alinhamento de Itens: Nome na Esquerda, Preço na Direita */
                    .item-row {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        width: 100%;
                        margin-bottom: 8px;
                    }
                    .item-main { flex: 1; padding-right: 5px; }
                    .item-price { white-space: nowrap; text-align: right; min-width: 80px; }

                    /* Box de Pagamento do Jerê */
                    .pgto-box {
                        border: 1px solid #000;
                        padding: 8px;
                        margin-top: 15px;
                        font-size: ${baseFontSize};
                        text-align: center;
                    }

                    /* Destaque do Total */
                    .total-row {
                        font-size: ${titleFontSize};
                        display: flex;
                        justify-content: space-between;
                        margin-top: 5px;
                    }
                `}
            </style>

            <div id="thermal-content">
                {/* CABEÇALHO JERÊ STYLE */}
                <div className="text-center">
                    <div style={{ fontSize: baseFontSize, marginBottom: '2px' }}>{order.restaurantName}</div>
                    <div style={{ fontSize: smallFontSize }}>
                        {new Date(order.timestamp).toLocaleDateString('pt-BR')} - {new Date(order.timestamp).toLocaleTimeString('pt-BR').substring(0,5)}
                    </div>
                    
                    <div className="pedido-box">
                        <span className="pedido-label">PEDIDO: </span>
                        <span className="pedido-numero">{displayOrderNum}</span>
                    </div>
                </div>

                {/* MODO DE ENTREGA */}
                <div className="double-line"></div>
                <div className="text-center" style={{ fontSize: baseFontSize, margin: '2px 0' }}>
                    {order.tableNumber 
                        ? `>> CONSUMO LOCAL - MESA ${order.tableNumber} <<` 
                        : isPickup 
                            ? ">> RETIRADA NO BALCÃO <<" 
                            : ">> ENTREGA EM DOMICÍLIO <<"}
                </div>
                <div className="double-line"></div>

                {/* SACHÊS */}
                <div className="text-center">
                    <div className="label-box">
                        {order.wantsSachets !== false ? "ENVIAR SACHÊS/TALHERES" : "NÃO ENVIAR SACHÊS/TALHERES"}
                    </div>
                </div>

                {/* CLIENTE */}
                <div className="text-center">
                    <div className="label-box" style={{ border: 'none', textDecoration: 'underline' }}>CLIENTE / DESTINO</div>
                </div>
                
                <div style={{ fontSize: baseFontSize, marginBottom: '15px' }}>
                    <div>{order.customerName}</div>
                    <div>TEL: {order.customerPhone}</div>
                    {!isPickup && order.customerAddress && (
                        <>
                            <div>{order.customerAddress.street} , {order.customerAddress.number}</div>
                            <div>BAIRRO: {order.customerAddress.neighborhood}</div>
                            {order.customerAddress.complement && (
                                <div style={{ fontSize: smallFontSize }}>REF: {order.customerAddress.complement}</div>
                            )}
                        </>
                    )}
                </div>

                {/* ITENS */}
                <div className="text-center">
                    <div className="label-box" style={{ border: 'none', textDecoration: 'underline' }}>ITENS</div>
                </div>

                <div style={{ width: '100%', marginBottom: '10px' }}>
                    {order.items.map((item, index) => (
                        <div key={index} style={{ marginBottom: '10px' }}>
                            <div className="item-row">
                                <div className="item-main">
                                    {item.quantity}X {item.name} {item.sizeName && `(${item.sizeName})`}
                                </div>
                                <div className="item-price">
                                    {(Number(item.price) * item.quantity).toFixed(2)}
                                </div>
                            </div>
                            
                            {/* ADICIONAIS RECUADOS PARA NÃO QUEBRAR O LAYOUT */}
                            {item.selectedOptions?.map((opt, i) => (
                                <div key={i} style={{ fontSize: smallFontSize, marginLeft: '20px' }}>+ {opt.optionName}</div>
                            ))}
                            {item.selectedAddons?.map((a, i) => (
                                <div key={i} style={{ fontSize: smallFontSize, marginLeft: '20px' }}>+ {a.name}</div>
                            ))}
                        </div>
                    ))}
                </div>

                {/* TOTAIS */}
                <div style={{ borderTop: '1px dashed #000', paddingTop: '5px' }}>
                    <div className="item-row" style={{ fontSize: baseFontSize }}>
                        <span>SUBTOTAL:</span>
                        <span>R$ {Number(order.subtotal || 0).toFixed(2)}</span>
                    </div>
                    {!isPickup && (
                        <div className="item-row" style={{ fontSize: baseFontSize }}>
                            <span>TAXA ENTREGA:</span>
                            <span>R$ {Number(order.deliveryFee || 0).toFixed(2)}</span>
                        </div>
                    )}
                    {Number(order.discountAmount || 0) > 0 && (
                        <div className="item-row" style={{ fontSize: baseFontSize }}>
                            <span>DESCONTO:</span>
                            <span>- R$ {Number(order.discountAmount).toFixed(2)}</span>
                        </div>
                    )}
                    
                    <div className="total-row">
                        <span>TOTAL:</span>
                        <span>R$ {Number(order.totalPrice).toFixed(2)}</span>
                    </div>
                </div>

                {/* PAGAMENTO */}
                <div className="pgto-box">
                    PGTO: {order.paymentMethod}
                </div>

                {/* RODAPÉ */}
                <div className="text-center" style={{ fontSize: smallFontSize, marginTop: '20px' }}>
                    GUARA-FOOD PDV
                    <br/>OBRIGADO PELA PREFERENCIA!
                    <br/>.
                </div>
            </div>
        </div>
    );
};

export default PrintableOrder;
