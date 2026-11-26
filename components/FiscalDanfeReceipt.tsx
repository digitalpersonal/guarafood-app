import React, { useMemo } from 'react';
import QRCode from 'qrcode';
import type { Order, Restaurant } from '../types';

interface FiscalDanfeReceiptProps {
    order: Order;
    restaurant?: Restaurant | null;
    printerWidth?: number; // 80 or 58
    className?: string;
    style?: React.CSSProperties;
}

const sanitizeFiscalText = (str?: string): string => {
    if (!str) return '';
    return str
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/[–—]/g, '-')
        .trim();
};

export const FiscalDanfeReceipt: React.FC<FiscalDanfeReceiptProps> = ({
    order,
    restaurant,
    printerWidth = 80,
    className = '',
    style = {},
}) => {
    const is58mm = printerWidth === 58;

    const dateObj = order.createdAt
        ? new Date(order.createdAt)
        : (order.timestamp ? new Date(order.timestamp) : new Date());
    const dateString = dateObj.toLocaleDateString('pt-BR');
    const timeString = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const emitCnpj = restaurant?.cnpj || 'CNPJ não configurado';
    const emitIe = restaurant?.ie || 'ISENTO';
    const emitName = sanitizeFiscalText(restaurant?.name || order.restaurantName || 'ESTABELECIMENTO COMERCIAL').toUpperCase();
    const emitAddress = sanitizeFiscalText(restaurant?.address || order.restaurantAddress || 'Endereço Comercial');
    const emitPhone = sanitizeFiscalText(restaurant?.phone || order.restaurantPhone || '');

    const fiscalMeta = order.payment_details?.fiscal;
    const orderNum = order.order_number || parseInt(order.id.replace(/\D/g, '').slice(-6) || '1', 10);
    const nfNumberRaw = order.fiscalNumber || fiscalMeta?.numero || String(orderNum);
    const numNfFormatted = String(nfNumberRaw).padStart(9, '0');
    const serie = '001';

    const accessKey = String(order.fiscalKey || fiscalMeta?.chave || '').trim();
    const formattedKey = accessKey ? (accessKey.match(/.{1,4}/g)?.join(' ') || accessKey) : '';
    const protocolNumber = String(order.fiscalProtocol || fiscalMeta?.protocolo || '').trim();
    const rawFiscalStatus = String(order.fiscalStatus || fiscalMeta?.status || '').toLowerCase();
    const isAuthorized = rawFiscalStatus === 'autorizado' || Boolean(accessKey);
    const isCanceled = rawFiscalStatus === 'cancelado';
    const isProd = restaurant?.fiscalEnv === 'producao';

    const displaySubtotal = Number(order.subtotal) > 0
        ? Number(order.subtotal)
        : (order.items || []).reduce((acc, item) => acc + (Number(item.price || 0) * (item.quantity || 1)), 0);

    const displayTotal = Number(order.totalPrice) > 0
        ? Number(order.totalPrice)
        : (displaySubtotal + Number(order.deliveryFee || 0) - Number(order.discountAmount || 0));

    const totalItemCount = (order.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0);
    const taxPercent = restaurant?.fiscalTaxRate != null ? Number(restaurant.fiscalTaxRate) : 13.45;
    const approxTaxes = displayTotal * (taxPercent / 100);

    const qrPayload = String(order.fiscalQrCodeUrl || fiscalMeta?.qrcode_url || '').trim();
    const consultUrl = String(
        order.fiscalConsultUrl ||
        fiscalMeta?.url_consulta_nf ||
        'Consulte no portal da SEFAZ do seu estado'
    ).trim();

    const qrSvgData = useMemo(() => {
        if (!qrPayload) return null;
        try {
            const qr = QRCode.create(qrPayload, { errorCorrectionLevel: 'M' });
            const size = qr.modules.size;
            let pathD = '';
            for (let row = 0; row < size; row++) {
                for (let col = 0; col < size; col++) {
                    if (qr.modules.get(row, col)) {
                        pathD += `M${col},${row}h1v1h-1z`;
                    }
                }
            }
            return { size, pathD };
        } catch (err) {
            console.warn('Erro ao gerar SVG QR Code:', err);
            return null;
        }
    }, [qrPayload]);

    const baseFontSize = is58mm ? '13.5px' : '14px';
    const headerFontSize = is58mm ? '16px' : '17px';
    const smallFontSize = is58mm ? '12.5px' : '13px';
    const microFontSize = is58mm ? '11.5px' : '12px';
    const totalFontSize = is58mm ? '17px' : '18px';
    const qrDisplaySize = is58mm ? 124 : 148;

    const cleanDoc = order.customerDocument ? order.customerDocument.replace(/\D/g, '') : '';
    const docLabel = cleanDoc.length === 14 ? 'CNPJ' : 'CPF';

    return (
        <div
            className={`fiscal-danfe-ticket ${className}`}
            style={{
                width: '100%',
                fontFamily: "Arial, Helvetica, -apple-system, sans-serif",
                fontSize: baseFontSize,
                fontWeight: 700,
                lineHeight: 1.3,
                color: '#000',
                backgroundColor: '#fff',
                boxSizing: 'border-box',
                textAlign: 'left',
                ...style
            }}
        >
            {/* CABEÇALHO DO EMITENTE */}
            <div style={{ textAlign: 'center', fontWeight: 900, fontSize: headerFontSize, marginBottom: '3px', wordBreak: 'break-word', letterSpacing: '0.2px' }}>
                {emitName}
            </div>
            <div style={{ textAlign: 'center', fontSize: smallFontSize, fontWeight: 700, color: '#000', lineHeight: 1.3 }}>
                <div>CNPJ: {emitCnpj} • IE: {emitIe}</div>
                <div style={{ fontSize: microFontSize, fontWeight: 600 }}>{emitAddress}</div>
                {emitPhone && <div style={{ fontSize: microFontSize, fontWeight: 600 }}>Fone: {emitPhone}</div>}
            </div>

            <div style={{ borderTop: '1.5px dashed #000', margin: '5px 0', width: '100%' }}></div>

            {/* TÍTULO OFICIAL DO DOCUMENTO */}
            <div style={{
                textAlign: 'center',
                border: '1.5px solid #000',
                padding: '4px 5px',
                marginBottom: '4px',
            }}>
                <div style={{ fontWeight: 900, fontSize: smallFontSize, textTransform: 'uppercase', lineHeight: 1.2 }}>
                    DANFE NFC-e
                </div>
                <div style={{ fontWeight: 700, fontSize: microFontSize, lineHeight: 1.2, marginTop: '1px' }}>
                    Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica
                </div>
                <div style={{ fontWeight: 600, fontSize: microFontSize, fontStyle: 'italic', marginTop: '2px' }}>
                    Não permite aproveitamento de crédito de ICMS
                </div>
            </div>

            {!isProd && (
                <div style={{
                    textAlign: 'center',
                    fontWeight: 900,
                    fontSize: microFontSize,
                    border: '1px dashed #000',
                    padding: '2px 4px',
                    marginBottom: '4px',
                    textTransform: 'uppercase'
                }}>
                    EMITIDA EM AMBIENTE DE HOMOLOGAÇÃO - SEM VALOR FISCAL
                </div>
            )}

            {isCanceled && (
                <div style={{
                    textAlign: 'center',
                    fontWeight: 900,
                    fontSize: smallFontSize,
                    border: '2px solid #000',
                    padding: '3px 4px',
                    marginBottom: '4px',
                    textTransform: 'uppercase'
                }}>
                    NFC-e CANCELADA NA SEFAZ
                </div>
            )}

            <div style={{ borderTop: '1.5px dashed #000', margin: '5px 0', width: '100%' }}></div>

            {/* TABELA DE ITENS */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: is58mm ? '12px' : '13px', tableLayout: 'fixed' }}>
                <thead>
                    <tr style={{ borderBottom: '1.5px solid #000', textAlign: 'left', fontSize: is58mm ? '11.5px' : '12.5px' }}>
                        <th style={{ paddingBottom: '3px', fontWeight: 900, width: '44%', textAlign: 'left' }}>CÓD | DESC</th>
                        <th style={{ paddingBottom: '3px', fontWeight: 900, textAlign: 'center', width: '14%' }}>QTD</th>
                        <th style={{ paddingBottom: '3px', fontWeight: 900, textAlign: 'right', width: '20%' }}>VL.UN</th>
                        <th style={{ paddingBottom: '3px', fontWeight: 900, textAlign: 'right', width: '22%' }}>TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    {(order.items || []).map((item, idx) => {
                        const unitPrice = Number(item.price || 0);
                        const qty = Number(item.quantity || 1);
                        const itemTotal = unitPrice * qty;
                        return (
                            <tr key={item.id || idx} style={{ verticalAlign: 'top', borderBottom: '1px dotted #ccc' }}>
                                <td style={{ padding: '3px 4px 3px 0', wordBreak: 'break-word', fontWeight: 700, textAlign: 'left' }}>
                                    <div>
                                        {String(idx + 1).padStart(3, '0')} {sanitizeFiscalText(item.name)}
                                        {item.sizeName ? ` (${sanitizeFiscalText(item.sizeName)})` : ''}
                                        {item.weight && item.isKiloItem ? ` (${Number(item.weight).toFixed(3)}kg)` : ''}
                                    </div>
                                    {item.notes && (
                                        <div style={{ fontSize: microFontSize, fontWeight: 700, marginTop: '1px' }}>
                                            Obs: {sanitizeFiscalText(item.notes)}
                                        </div>
                                    )}
                                </td>
                                <td style={{ padding: '3px 0', textAlign: 'center', whiteSpace: 'nowrap', fontWeight: 700 }}>
                                    {qty}x
                                </td>
                                <td style={{ padding: '3px 0', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 700 }}>
                                    {unitPrice.toFixed(2)}
                                </td>
                                <td style={{ padding: '3px 0', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 900 }}>
                                    {itemTotal.toFixed(2)}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            <div style={{ borderTop: '1.5px dashed #000', margin: '5px 0', width: '100%' }}></div>

            {/* TOTAIS DO DOCUMENTO FISCAL */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: baseFontSize, lineHeight: 1.35 }}>
                <tbody>
                    <tr>
                        <td style={{ textAlign: 'left', padding: '1px 0', fontWeight: 700 }}>Qtd. Total de Itens</td>
                        <td style={{ textAlign: 'right', padding: '1px 0', fontWeight: 900 }}>{totalItemCount}</td>
                    </tr>
                    <tr>
                        <td style={{ textAlign: 'left', padding: '1px 0', fontWeight: 700 }}>Valor Total dos Produtos</td>
                        <td style={{ textAlign: 'right', padding: '1px 0', fontWeight: 700 }}>R$ {displaySubtotal.toFixed(2)}</td>
                    </tr>
                    {Number(order.deliveryFee || 0) > 0 && (
                        <tr>
                            <td style={{ textAlign: 'left', padding: '1px 0', fontWeight: 700 }}>Acréscimo / Entrega</td>
                            <td style={{ textAlign: 'right', padding: '1px 0', fontWeight: 700 }}>R$ {Number(order.deliveryFee).toFixed(2)}</td>
                        </tr>
                    )}
                    {Number(order.discountAmount || 0) > 0 && (
                        <tr>
                            <td style={{ textAlign: 'left', padding: '1px 0', fontWeight: 700 }}>Descontos</td>
                            <td style={{ textAlign: 'right', padding: '1px 0', fontWeight: 700 }}>- R$ {Number(order.discountAmount).toFixed(2)}</td>
                        </tr>
                    )}
                    <tr style={{ borderTop: '2px solid #000' }}>
                        <td style={{ textAlign: 'left', fontWeight: 900, fontSize: totalFontSize, paddingTop: '4px', paddingBottom: '2px' }}>
                            VALOR A PAGAR R$
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 900, fontSize: totalFontSize, paddingTop: '4px', paddingBottom: '2px', whiteSpace: 'nowrap' }}>
                            R$ {displayTotal.toFixed(2)}
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* BOX DE PAGAMENTO */}
            <div style={{ border: '1.5px solid #000', padding: '4px 6px', margin: '4px 0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: smallFontSize, lineHeight: 1.3 }}>
                    <tbody>
                        <tr>
                            <td style={{ textAlign: 'left', fontWeight: 900 }}>FORMA DE PAGAMENTO</td>
                            <td style={{ textAlign: 'right', fontWeight: 900 }}>VALOR PAGO R$</td>
                        </tr>
                        <tr>
                            <td style={{ textAlign: 'left', fontWeight: 700, paddingTop: '2px' }}>
                                {sanitizeFiscalText(order.paymentMethod).toUpperCase()}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 900, paddingTop: '2px', whiteSpace: 'nowrap' }}>
                                {displayTotal.toFixed(2)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div style={{ borderTop: '1.5px dashed #000', margin: '5px 0', width: '100%' }}></div>

            {/* DADOS DO CONSUMIDOR */}
            <div style={{ fontSize: smallFontSize, lineHeight: 1.35, textAlign: 'center', padding: '2px 0' }}>
                <div style={{ fontWeight: 900, textTransform: 'uppercase' }}>
                    {order.customerDocument
                        ? `CONSUMIDOR - ${docLabel}: ${order.customerDocument}`
                        : 'CONSUMIDOR NÃO IDENTIFICADO'}
                </div>
                {order.customerName && (
                    <div style={{ fontWeight: 700 }}>NOME: {sanitizeFiscalText(order.customerName).toUpperCase()}</div>
                )}
            </div>

            <div style={{ borderTop: '1.5px dashed #000', margin: '5px 0', width: '100%' }}></div>

            {/* CONSULTA CHAVE DE ACESSO E QR CODE OFICIAL */}
            <div style={{ textAlign: 'center', fontSize: microFontSize, lineHeight: 1.3 }}>
                <div style={{ fontWeight: 900 }}>Consulte pela Chave de Acesso em:</div>
                <div style={{ fontWeight: 700, wordBreak: 'break-all' }}>
                    {consultUrl}
                </div>
                <div style={{
                    fontFamily: "'Courier New', Courier, monospace",
                    fontWeight: 900,
                    fontSize: is58mm ? '11.5px' : '12px',
                    letterSpacing: '0.2px',
                    marginTop: '4px',
                    marginBottom: '4px',
                    wordBreak: 'break-word'
                }}>
                    {formattedKey || 'AGUARDANDO AUTORIZAÇÃO SEFAZ'}
                </div>
            </div>

            {/* QR CODE SEFAZ VETORIAL */}
            <div style={{ textAlign: 'center', padding: '3px 0' }}>
                {qrSvgData ? (
                    <svg
                        viewBox={`-2 -2 ${qrSvgData.size + 4} ${qrSvgData.size + 4}`}
                        width={qrDisplaySize}
                        height={qrDisplaySize}
                        shapeRendering="crispEdges"
                        style={{
                            display: 'block',
                            margin: '2px auto',
                            backgroundColor: '#fff'
                        }}
                        aria-label="QR Code NFC-e SEFAZ"
                    >
                        <rect x="-2" y="-2" width={qrSvgData.size + 4} height={qrSvgData.size + 4} fill="#ffffff" />
                        <path d={qrSvgData.pathD} fill="#000000" />
                    </svg>
                ) : (
                    <div style={{
                        border: '1px dashed #000',
                        padding: '8px 6px',
                        margin: '4px auto',
                        fontSize: microFontSize,
                        fontWeight: 800
                    }}>
                        {isAuthorized
                            ? 'QR Code disponível no DANFE oficial da Focus NFe'
                            : 'QR Code será gerado após autorização da SEFAZ'}
                    </div>
                )}
            </div>

            {/* DADOS DA EMISSÃO SEFAZ */}
            <div style={{ textAlign: 'center', fontSize: smallFontSize, lineHeight: 1.35, marginTop: '3px' }}>
                <div style={{ fontWeight: 900 }}>
                    NFC-e nº {numNfFormatted} Série {serie} • {dateString} {timeString}
                </div>
                <div style={{ fontWeight: 700, fontSize: microFontSize, marginTop: '2px' }}>
                    Protocolo de Autorização:{' '}
                    <span style={{ fontWeight: 900 }}>{protocolNumber || 'Aguardando SEFAZ'}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: microFontSize }}>
                    Data de Autorização: {dateString} {timeString}
                </div>
            </div>

            <div style={{ borderTop: '1.5px dashed #000', margin: '5px 0', width: '100%' }}></div>

            {/* TRIBUTOS LEI 12.741/2012 */}
            <div style={{ textAlign: 'center', fontSize: microFontSize, fontWeight: 700, lineHeight: 1.3 }}>
                Tributos Totais Incidentes (Lei Federal 12.741/2012): R$ {approxTaxes.toFixed(2)} ({taxPercent.toFixed(2).replace('.', ',')}% aprox.)
            </div>

            <div style={{ borderTop: '1.5px dashed #000', margin: '5px 0', width: '100%' }}></div>

            <div style={{ textAlign: 'center', fontSize: microFontSize, fontWeight: 900 }}>
                PEDIDO #{String(orderNum).padStart(3, '0')} • GUARA-FOOD FOCUS NFE
            </div>
        </div>
    );
};

export default FiscalDanfeReceipt;
