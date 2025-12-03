
import React from 'react';
import type { Order } from '../types';

interface PrintableOrderProps {
    order: Order;
    printerWidth?: number; // 80 or 58 (default 80)
}

const PrintableOrder: React.FC<PrintableOrderProps> = ({ order, printerWidth = 80 }) => {
    const widthCss = `${printerWidth}mm`;
    const fontSizeTitle = printerWidth === 58 ? '14px' : '16px';
    const fontSizeText = printerWidth === 58 ? '11px' : '12px';
    const fontSizeSmall = '10px';

    return (
        <div style={{ fontFamily: '"Courier New", Courier, monospace', padding: '0', color: '#000', width: widthCss, margin: '0', boxSizing: 'border-box' }}>
            <style>
                {`
                    @media print {
                        @page {
                            margin: 0;
                            size: ${widthCss} auto; 
                        }
                        body {
                            margin: 0;
                            padding: 0;
                        }
                        /* Esconde tudo que não é area de impressão */
                        body * {
                            visibility: hidden;
                            height: 0; 
                            overflow: hidden;
                        }
                        /* Mostra apenas o cupom */
                        #printable-order, #printable-order * {
                            visibility: visible;
                            height: auto;
                            overflow: visible;
                        }
                        #printable-order {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%; 
                            max-width: ${widthCss};
                            padding: 2px 0;
                        }
                        .print-item {
                            page-break-inside: avoid;
                        }
                    }
                    .print-section {
                        border-bottom: 1px dashed #000;
                        padding-bottom: 5px;
                        margin-bottom: 5px;
                    }
                    .print-title {
                        font-size: ${printerWidth === 58 ? '12px' : '14px'};
                        font-weight: bold;
                        margin-bottom: 2px;
                        text-transform: uppercase;
                    }
                    .print-text {
                        font-size: ${fontSizeText};
                        line-height: 1.2;
                        word-break: break-word; /* Quebra palavras longas */
                    }
                    .print-row {
                         display: flex;
                         justify-content: space-between;
                         margin-bottom: 2px;
                    }
                `}
            </style>
            
            <div style={{ textAlign: 'center', marginBottom: '10px', borderBottom: '2px solid #000', paddingBottom: '5px' }}>
                <h1 style={{ fontSize: fontSizeTitle, fontWeight: 'bold', margin: '0', wordBreak: 'break-word' }}>{order.restaurantName}</h1>
                <p style={{ fontSize: fontSizeSmall, margin: '2px 0' }}>{new Date().toLocaleDateString('pt-BR')} - {new Date().toLocaleTimeString('pt-BR')}</p>
            </div>

            <div className="print-section">
                <p className="print-text" style={{ fontSize: fontSizeTitle, fontWeight: 'bold', textAlign: 'center' }}>PEDIDO #{order.id.substring(0, 6)}</p>
                <p className="print-text" style={{ textAlign: 'center', marginTop: '2px' }}>Via: Cozinha/Entrega</p>
            </div>
            
            <div className="print-section">
                <p className="print-title">CLIENTE</p>
                <p className="print-text" style={{fontWeight: 'bold'}}>{order.customerName}</p>
                <p className="print-text">{order.customerPhone}</p>
                 {order.customerAddress && (
                    <div style={{ marginTop: '2px' }}>
                        <p className="print-text">
                            {order.customerAddress.street}, {order.customerAddress.number}
                            <br />
                            {order.customerAddress.neighborhood}
                            {order.customerAddress.complement && ` (${order.customerAddress.complement})`}
                        </p>
                    </div>
                )}
            </div>

            <div className="print-section">
                <p className="print-title">ITENS</p>
                {order.items.map(item => (
                    <div key={item.id} className="print-item" style={{ marginBottom: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span className="print-text" style={{ fontWeight: 'bold', width: '70%' }}>{item.quantity}x {item.name}</span>
                            <span className="print-text" style={{ width: '30%', textAlign: 'right' }}>R$ {(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                        {item.sizeName && <p style={{ fontSize: fontSizeSmall, margin: '0 0 0 10px', fontStyle: 'italic' }}>Tam: {item.sizeName}</p>}
                        {item.halves && item.halves.length > 1 && (
                            <p style={{ fontSize: fontSizeSmall, margin: '0 0 0 10px' }}>½ {item.halves[0].name} | ½ {item.halves[1].name}</p>
                        )}
                        {item.selectedAddons && item.selectedAddons.length > 0 && (
                            <ul style={{ fontSize: fontSizeSmall, margin: '0 0 0 10px', paddingLeft: '0', listStyle: 'none' }}>
                                {item.selectedAddons.map(addon => (
                                    <li key={addon.id}>+ {addon.name}</li>
                                ))}
                            </ul>
                        )}
                        {item.description && <p style={{ fontSize: fontSizeSmall, margin: '0 0 0 10px', fontWeight: 'bold' }}>Obs: {item.description}</p>}
                        {item.notes && <p style={{ fontSize: fontSizeSmall, margin: '0 0 0 10px', fontWeight: 'bold' }}>Nota: {item.notes}</p>}
                    </div>
                ))}
            </div>

             <div className="print-section">
                <p className="print-title">PAGAMENTO</p>
                <p className="print-text"><strong>{order.paymentMethod}</strong></p>
            </div>
            
            <div>
                <div className="print-row print-text">
                    <span>Subtotal</span>
                    <span>R$ {order.subtotal?.toFixed(2)}</span>
                </div>
                 {order.discountAmount && order.discountAmount > 0 && (
                    <div className="print-row print-text">
                        <span>Desconto ({order.couponCode})</span>
                        <span>- R$ {order.discountAmount.toFixed(2)}</span>
                    </div>
                )}
                 <div className="print-row print-text">
                    <span>Entrega</span>
                    <span>R$ {order.deliveryFee?.toFixed(2)}</span>
                </div>
                <div className="print-row" style={{ borderTop: '2px solid #000', paddingTop: '5px', marginTop: '5px' }}>
                    <span style={{ fontSize: fontSizeTitle, fontWeight: 'bold' }}>TOTAL</span>
                    <span style={{ fontSize: fontSizeTitle, fontWeight: 'bold' }}>R$ {order.totalPrice.toFixed(2)}</span>
                </div>
            </div>
            
            <div style={{ marginTop: '20px', textAlign: 'center', fontSize: fontSizeSmall }}>
                <p>www.guarafood.com.br</p>
                <p>.</p> {/* Ponto final para garantir corte de papel */}
            </div>
        </div>
    );
};

export default PrintableOrder;
