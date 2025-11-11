

import React from 'react';
import type { Order } from '../types';

interface PrintableOrderProps {
    order: Order;
}

const PrintableOrder: React.FC<PrintableOrderProps> = ({ order }) => {
    return (
        <div style={{ fontFamily: 'sans-serif', padding: '20px', color: '#000', width: '100%' }}>
            <style>
                {`
                    @media print {
                        @page {
                            size: A5 portrait;
                            margin: 10mm;
                        }
                        body {
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                    }
                    .print-section {
                        border-bottom: 2px dashed #ccc;
                        padding-bottom: 12px;
                        margin-bottom: 12px;
                    }
                    .print-title {
                        font-size: 1.1rem;
                        font-weight: bold;
                        margin-bottom: 8px;
                    }
                    .print-text {
                        font-size: 0.9rem;
                        line-height: 1.4;
                    }
                    .print-item {
                         display: flex;
                         justify-content: space-between;
                         margin-bottom: 6px;
                    }
                `}
            </style>
            
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0' }}>{order.restaurantName}</h1>
                <p style={{ fontSize: '0.9rem', margin: '4px 0' }}>{order.restaurantAddress}</p>
                <p style={{ fontSize: '0.9rem', margin: '4px 0' }}>Telefone: {order.restaurantPhone}</p>
            </div>

            <div className="print-section">
                <p className="print-text"><strong>Pedido:</strong> #{order.id.substring(0, 6)}</p>
                <p className="print-text"><strong>Data:</strong> {new Date(order.timestamp).toLocaleString('pt-BR')}</p>
            </div>
            
            <div className="print-section">
                <p className="print-title">Dados do Cliente</p>
                <p className="print-text"><strong>Nome:</strong> {order.customerName}</p>
                <p className="print-text"><strong>Telefone:</strong> {order.customerPhone}</p>
                 {order.customerAddress && (
                    <div style={{ marginTop: '4px' }}>
                        <p className="print-text"><strong>Endereço de Entrega:</strong></p>
                        <p className="print-text" style={{ paddingLeft: '10px' }}>
                            {order.customerAddress.street}, {order.customerAddress.number}
                            <br />
                            {order.customerAddress.neighborhood}
                            {order.customerAddress.complement && ` - ${order.customerAddress.complement}`}
                            <br />
                            CEP: {order.customerAddress.zipCode}
                        </p>
                    </div>
                )}
            </div>

            <div className="print-section">
                <p className="print-title">Itens do Pedido</p>
                {order.items.map(item => (
                    <div key={item.id} className="print-item">
                        <div style={{ flexGrow: 1 }}>
                            <p className="print-text"><strong>{item.quantity}x {item.name}</strong></p>
                            {item.description && <p style={{ fontSize: '0.8rem', color: '#555', marginLeft: '10px' }}>{item.description}</p>}
                        </div>
                        <p className="print-text" style={{ whiteSpace: 'nowrap', marginLeft: '16px' }}>R$ {(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                ))}
            </div>

             <div className="print-section">
                <p className="print-title">Pagamento</p>
                <p className="print-text" style={{ fontSize: '1rem' }}><strong>Forma:</strong> {order.paymentMethod}</p>
            </div>
            
            <div>
                <div className="print-item print-text">
                    <span>Subtotal</span>
                    <span>R$ {order.subtotal?.toFixed(2)}</span>
                </div>
                 {order.discountAmount && order.discountAmount > 0 && (
                    <div className="print-item print-text">
                        <span>Desconto ({order.couponCode})</span>
                        <span>- R$ {order.discountAmount.toFixed(2)}</span>
                    </div>
                )}
                 <div className="print-item print-text">
                    <span>Taxa de Entrega</span>
                    <span>R$ {order.deliveryFee?.toFixed(2)}</span>
                </div>
                <div className="print-item" style={{ borderTop: '2px solid #333', paddingTop: '8px', marginTop: '8px' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Total a Pagar</span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>R$ {order.totalPrice.toFixed(2)}</span>
                </div>
            </div>
        </div>
    );
};

export default PrintableOrder;