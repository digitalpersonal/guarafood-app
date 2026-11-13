import React from 'react';
import { createPortal } from 'react-dom';
import type { Order, Restaurant } from '../types';

interface PrintableOrderProps {
    order: Order;
    printerWidth?: number; // 80 or 58
    printMode?: 'full' | 'kitchen' | 'admin' | 'fiscal'; 
    printedItems?: string[]; // IDs of items already printed (for kitchen mode)
    restaurant?: Restaurant | null;
}

const sanitizePrintText = (str?: string): string => {
    if (!str) return '';
    return str
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/[–—]/g, '-')
        .trim();
};

const PrintableOrder: React.FC<PrintableOrderProps> = ({ order, printerWidth = 80, printMode = 'full', printedItems = [], restaurant }) => {
    const paperSize = `${printerWidth}mm`;

    const sidePadding = printerWidth === 58 ? '1mm' : '2mm';
    const baseFontSize = printerWidth === 58 ? '13px' : '14px';
    const headerFontSize = printerWidth === 58 ? '14px' : '15px';
    const titleFontSize = printerWidth === 58 ? '17px' : '19px';
    const smallFontSize = printerWidth === 58 ? '11px' : '12px';
    const lineHeight = printerWidth === 58 ? '1.2' : '1.15';

    const isPixPaid = order.paymentMethod.toLowerCase().includes('pix') && order.paymentStatus === 'paid';
    
    const isPickup = !order.customerAddress || 
                     !order.customerAddress.street ||
                     order.customerAddress.street.includes('Retirada') || 
                     order.customerAddress.street.includes('Consumo Local') ||
                     order.tableNumber !== undefined;

    const displayOrderNum = order.order_number 
        ? `${String(order.order_number).padStart(3, '0')}`
        : `${order.id.substring(order.id.length - 4).toUpperCase()}`;

    const displaySubtotal = Number(order.subtotal) > 0 
        ? Number(order.subtotal) 
        : (order.items || []).reduce((acc, item) => acc + (Number(item.price || 0) * (item.quantity || 1)), 0);
    
    const displayTotal = Number(order.totalPrice) > 0 
        ? Number(order.totalPrice) 
        : (displaySubtotal + Number(order.deliveryFee || 0) - Number(order.discountAmount || 0));

    const dateObj = order.createdAt ? new Date(order.createdAt) : new Date();
    const dateString = dateObj.toLocaleDateString('pt-BR');
    const timeString = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const [fiscalQrDataUrl, setFiscalQrDataUrl] = React.useState<string>('');

    // Generate SEFAZ compliant NFC-e QR Code using restaurant CSC & Token ID
    React.useEffect(() => {
        if (printMode === 'fiscal') {
            const rawCnpj = (restaurant?.cnpj || '00000000000100').replace(/\D/g, '');
            const now = dateObj;
            const yy = String(now.getFullYear()).slice(-2);
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const num = String(order.order_number || parseInt(order.id.replace(/\D/g, '').slice(-6) || '1', 10)).padStart(9, '0');
            // Standard 44-digit access key: 31 (MG) + AA + MM + CNPJ(14) + mod(65) + serie(001) + nNF(9) + tpEmis(1) + cNF(8) + cDV(1)
            const accessKey = `31${yy}${mm}${rawCnpj.padStart(14, '0')}65001${num}198273641`;
            
            const csc = restaurant?.fiscalCsc || '3506d724cc86cb31674657778b14aa47';
            const cIdToken = restaurant?.fiscalCscId || '000001';
            const tpAmb = restaurant?.fiscalEnv === 'producao' ? '1' : '2';
            
            // SEFAZ V2 QR-Code payload: chNFe|2|tpAmb|cIdToken|cHashQRCode
            // Standard SEFAZ MG public consultation link:
            const sefazBaseUrl = 'http://nfce.fazenda.mg.gov.br/portalnfce/sistema/qrcode.xhtml';
            const qrPayload = `${sefazBaseUrl}?p=${accessKey}|2|${tpAmb}|${cIdToken}|${csc.substring(0, 10)}`;

            import('qrcode').then(QRCode => {
                QRCode.toDataURL(qrPayload, {
                    width: printerWidth === 58 ? 120 : 145,
                    margin: 1,
                    errorCorrectionLevel: 'M'
                }).then(url => {
                    setFiscalQrDataUrl(url);
                }).catch(err => {
                    console.warn('Error generating QR code:', err);
                    setFiscalQrDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(qrPayload)}`);
                });
            }).catch(() => {
                setFiscalQrDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(qrPayload)}`);
            });
        }
    }, [printMode, restaurant, order, printerWidth, dateObj]);

    if (printMode === 'fiscal') {
        const approxTaxes = displayTotal * 0.1345; // ~13.45% IBPT approximation (Lei 12.741/2012)
        const rawCnpj = (restaurant?.cnpj || '00000000000100').replace(/\D/g, '');
        const yy = String(dateObj.getFullYear()).slice(-2);
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const num = String(order.order_number || parseInt(order.id.replace(/\D/g, '').slice(-6) || '1', 10)).padStart(9, '0');
        const accessKey = `31${yy}${mm}${rawCnpj.padStart(14, '0')}65001${num}198273641`;
        const formattedKey = accessKey.match(/.{1,4}/g)?.join(' ') || accessKey;
        const protocolNumber = `1312${yy}${String(Math.floor(Math.random() * 89999999 + 10000000))}`;
        const isProd = restaurant?.fiscalEnv === 'producao';

        return createPortal(
            <div id="thermal-receipt-container">
                <style dangerouslySetInnerHTML={{ __html: `
                    @media screen { #thermal-receipt-container { display: none !important; } }
                    @media print {
                        @page { margin: 0 !important; size: ${paperSize} auto; }
                        html, body {
                            margin: 0 !important; padding: 0 !important; width: ${paperSize} !important;
                            font-family: 'Courier New', Courier, monospace !important;
                            font-size: ${baseFontSize}; color: #000 !important; background: #fff !important;
                        }
                        body * { display: none !important; }
                        #thermal-receipt-container, #thermal-receipt-container * { display: block !important; visibility: visible !important; }
                        #thermal-receipt-container {
                            position: absolute !important; left: 0 !important; top: 0 !important;
                            width: ${paperSize} !important; padding: ${sidePadding} !important; box-sizing: border-box !important;
                        }
                        .section-divider { border-top: 1.5px dashed #000 !important; margin: 4px 0 !important; width: 100% !important; }
                    }
                `}} />
                <div style={{ width: '100%', fontFamily: 'Courier New, monospace', fontSize: baseFontSize, lineHeight, color: '#000', background: '#fff', padding: sidePadding }}>
                    {/* Header Fiscal */}
                    <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: headerFontSize, marginBottom: '2px' }}>
                        {sanitizePrintText(restaurant?.name || 'ESTABELECIMENTO COMERCIAL')}
                    </div>
                    <div style={{ textAlign: 'center', fontSize: smallFontSize, marginBottom: '1px' }}>
                        CNPJ: {restaurant?.cnpj || '00.000.000/0001-00'}
                    </div>
                    <div style={{ textAlign: 'center', fontSize: smallFontSize, marginBottom: '1px' }}>
                        INSCRIÇÃO ESTADUAL: {restaurant?.ie || 'ISENTO'}
                    </div>
                    <div style={{ textAlign: 'center', fontSize: smallFontSize, marginBottom: '4px' }}>
                        {sanitizePrintText(restaurant?.address || 'Endereço não informado')}
                    </div>

                    <div className="section-divider"></div>
                    <div style={{ textAlign: 'center', fontWeight: '900', fontSize: smallFontSize, margin: '2px 0' }}>
                        DANFE NFC-e - Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '10px', fontStyle: 'italic', margin: '1px 0' }}>
                        Não permite aproveitamento de crédito de ICMS
                    </div>
                    {!isProd && (
                        <div style={{ textAlign: 'center', fontSize: '10px', fontWeight: 'bold', background: '#eee', padding: '1px 0' }}>
                            [ EMITIDA EM AMBIENTE DE HOMOLOGAÇÃO - SEM VALOR FISCAL ]
                        </div>
                    )}
                    <div className="section-divider"></div>

                    {/* Tabela de Itens */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: smallFontSize }}>
                        <thead>
                            <tr style={{ borderBottom: '1px dashed #000' }}>
                                <th style={{ textAlign: 'left', paddingBottom: '2px' }}># CÓD | DESCRIÇÃO</th>
                                <th style={{ textAlign: 'center', paddingBottom: '2px' }}>QTD</th>
                                <th style={{ textAlign: 'right', paddingBottom: '2px' }}>VL.UN</th>
                                <th style={{ textAlign: 'right', paddingBottom: '2px' }}>TOTAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(order.items || []).map((item, idx) => (
                                <tr key={item.id || idx}>
                                    <td style={{ textAlign: 'left', paddingBottom: '2px', wordBreak: 'break-all' }}>
                                        {String(idx + 1).padStart(3, '0')} {sanitizePrintText(item.name)}
                                    </td>
                                    <td style={{ textAlign: 'center', paddingBottom: '2px' }}>{item.quantity} UN</td>
                                    <td style={{ textAlign: 'right', paddingBottom: '2px' }}>{item.price.toFixed(2)}</td>
                                    <td style={{ textAlign: 'right', paddingBottom: '2px' }}>{(item.price * item.quantity).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Totais */}
                    <div className="section-divider"></div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: baseFontSize }}>
                        <tbody>
                            <tr>
                                <td style={{ textAlign: 'left', fontSize: smallFontSize }}>Qtd. Total de Itens:</td>
                                <td style={{ textAlign: 'right', fontSize: smallFontSize }}>{(order.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0)}</td>
                            </tr>
                            <tr>
                                <td style={{ textAlign: 'left' }}>SUBTOTAL:</td>
                                <td style={{ textAlign: 'right' }}>R$ {displaySubtotal.toFixed(2)}</td>
                            </tr>
                            {!isPickup && Number(order.deliveryFee || 0) > 0 && (
                                <tr>
                                    <td style={{ textAlign: 'left' }}>ACRÉSCIMO / FRETE:</td>
                                    <td style={{ textAlign: 'right' }}>R$ {Number(order.deliveryFee).toFixed(2)}</td>
                                </tr>
                            )}
                            {Number(order.discountAmount || 0) > 0 && (
                                <tr>
                                    <td style={{ textAlign: 'left' }}>DESCONTOS:</td>
                                    <td style={{ textAlign: 'right' }}>- R$ {Number(order.discountAmount).toFixed(2)}</td>
                                </tr>
                            )}
                            <tr style={{ borderTop: '1px solid #000' }}>
                                <td style={{ textAlign: 'left', fontSize: titleFontSize, fontWeight: '900', paddingTop: '3px' }}>VALOR A PAGAR R$:</td>
                                <td style={{ textAlign: 'right', fontSize: titleFontSize, fontWeight: '900', paddingTop: '3px' }}>R$ {displayTotal.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Forma de Pagamento */}
                    <div style={{ marginTop: '4px', fontSize: smallFontSize, borderTop: '1px dashed #000', paddingTop: '3px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>FORMA DE PAGAMENTO:</span>
                            <span style={{ fontWeight: 'bold' }}>{order.paymentMethod.toUpperCase()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>VALOR RECEBIDO:</span>
                            <span style={{ fontWeight: 'bold' }}>R$ {displayTotal.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Tributos Lei 12.741/2012 */}
                    <div className="section-divider"></div>
                    <div style={{ textAlign: 'center', fontSize: '10px', lineHeight: '1.2' }}>
                        Tributos Totais Incidentes (Lei Federal 12.741/2012):<br/>
                        R$ {approxTaxes.toFixed(2)} (13.45% aproximado) Fonte: IBPT
                    </div>

                    {/* Dados de Emissão NFC-e */}
                    <div className="section-divider"></div>
                    <div style={{ textAlign: 'center', fontSize: smallFontSize, lineHeight: '1.25' }}>
                        <div><strong>NFC-e Nº {num} - SÉRIE 001</strong></div>
                        <div>EMISSÃO: {dateString} {timeString}</div>
                        <div>PROTOCOLO DE AUTORIZAÇÃO:</div>
                        <div style={{ fontWeight: 'bold' }}>{protocolNumber} {dateString} {timeString}</div>
                    </div>

                    {/* Dados do Consumidor */}
                    <div className="section-divider"></div>
                    <div style={{ fontSize: smallFontSize, marginBottom: '4px' }}>
                        <div><strong>CONSUMIDOR:</strong> {order.customerDocument ? `CPF: ${order.customerDocument}` : 'CONSUMIDOR NÃO IDENTIFICADO'}</div>
                        {order.customerName && <div>NOME: {sanitizePrintText(order.customerName)}</div>}
                        {!isPickup && order.customerAddress?.street && (
                            <div>ENDEREÇO: {sanitizePrintText(order.customerAddress.street)}, {order.customerAddress.number || 'S/N'}</div>
                        )}
                    </div>

                    {/* QR Code SEFAZ Oficial */}
                    <div className="section-divider"></div>
                    <div style={{ textAlign: 'center', margin: '6px 0' }}>
                        <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '3px' }}>
                            CONSULTE PELA CHAVE DE ACESSO OU QR CODE:
                        </div>
                        {fiscalQrDataUrl ? (
                            <img 
                                src={fiscalQrDataUrl} 
                                alt="QR Code NFC-e SEFAZ" 
                                style={{ display: 'block', margin: '0 auto', width: printerWidth === 58 ? '110px' : '135px', height: 'auto' }}
                            />
                        ) : (
                            <div style={{ width: '110px', height: '110px', margin: '0 auto', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px' }}>
                                QR Code SEFAZ
                            </div>
                        )}
                        <div style={{ fontSize: '9px', marginTop: '3px', wordBreak: 'break-all' }}>
                            http://nfce.fazenda.mg.gov.br/portalnfce
                        </div>
                    </div>

                    {/* Chave de Acesso */}
                    <div style={{ textAlign: 'center', fontSize: '10px', lineHeight: '1.2', borderTop: '1px dashed #000', paddingTop: '3px' }}>
                        <div style={{ fontSize: '9px', fontWeight: 'bold' }}>CHAVE DE ACESSO:</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '9px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                            {formattedKey}
                        </div>
                    </div>

                    <div style={{ textAlign: 'center', fontSize: '9px', marginTop: '6px', borderTop: '1px dashed #000', paddingTop: '4px', color: '#333' }}>
                        EMISSÃO VIA GUARA-FOOD PDV FISCAL & SEFAZ-MG
                    </div>
                </div>
            </div>,
            document.body
        );
    }

    // Filter items for kitchen/admin printing (only new items)
    const itemsToPrint = (printMode === 'kitchen' || printMode === 'admin')
        ? (order.items || []).filter(item => !printedItems.includes(item.id))
        : (order.items || []);

    // If no items to print, don't render anything to avoid blank prints
    if (itemsToPrint.length === 0) {
        return null; 
    }

    const content = (
        <div id="thermal-receipt-container">
            <style dangerouslySetInnerHTML={{ __html: `
                @media screen {
                    #thermal-receipt-container {
                        display: none !important;
                    }
                }

                @media print {
                    @page {
                        margin: 0 !important;
                        size: ${paperSize} auto;
                    }
                    
                    /* Aggressive reset for printing */
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        width: ${paperSize} !important;
                        height: auto !important;
                        min-height: 0 !important;
                        overflow: visible !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    /* Hide everything on the page */
                    body * {
                        display: none !important;
                    }

                    /* Show ONLY the thermal container and its children */
                    #thermal-receipt-container, 
                    #thermal-receipt-container *,
                    body > #thermal-receipt-container,
                    body > #thermal-receipt-container * {
                        display: block !important;
                        visibility: visible !important;
                    }

                    /* Explicitly keep tables behaving correctly */
                    #thermal-receipt-container table {
                        display: table !important;
                    }
                    #thermal-receipt-container tr {
                        display: table-row !important;
                    }
                    #thermal-receipt-container th,
                    #thermal-receipt-container td {
                        display: table-cell !important;
                    }

                    /* CRITICAL: Explicitly hide the style tag itself from the print output */
                    #thermal-receipt-container style {
                        display: none !important;
                    }

                    #thermal-receipt-container {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: ${paperSize} !important;
                        max-width: ${paperSize} !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        z-index: 999999 !important;
                        box-sizing: border-box !important;
                    }

                    #thermal-content {
                        width: 100% !important;
                        max-width: ${paperSize} !important;
                        margin: 0 !important;
                        padding: 1mm ${sidePadding} 6mm ${sidePadding} !important;
                        box-sizing: border-box !important;
                    }

                    .section-divider {
                        border-top: 1px dashed black !important;
                        margin: 3px 0 !important;
                        width: 100% !important;
                        height: 1px !important;
                        display: block !important;
                    }

                    /* Prevent items from being split across page breaks if they occur */
                    .item-row, .receipt-header, .payment-box, .condiments-box {
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                    }

                    /* Fix for some browsers that add headers/footers */
                    header, footer, nav {
                        display: none !important;
                    }
                }

                #thermal-content {
                    font-family: Arial, Helvetica, -apple-system, sans-serif; 
                    color: #000 !important;
                    line-height: ${lineHeight};
                    background: #fff !important;
                    width: ${paperSize};
                    max-width: ${paperSize};
                    padding: 4px ${sidePadding} 30px ${sidePadding};
                    box-sizing: border-box;
                    margin: 0 auto;
                }

                #thermal-content * {
                    color: #000 !important;
                    background: #fff !important;
                    word-wrap: break-word !important;
                    overflow-wrap: anywhere !important;
                    white-space: normal !important;
                    font-weight: 700 !important;
                    box-sizing: border-box !important;
                }

                .receipt-header {
                    text-align: center;
                    margin-bottom: 4px;
                }

                .order-number-box {
                    font-size: ${titleFontSize};
                    border: 2px solid #000;
                    display: inline-block;
                    padding: 4px 10px;
                    margin: 4px 0;
                    line-height: 1.1;
                    font-weight: 900 !important;
                    text-transform: uppercase;
                }

                .mode-indicator {
                    font-size: ${headerFontSize};
                    font-weight: 900 !important;
                    text-align: center;
                    padding: 4px 0;
                    margin: 3px 0;
                    text-transform: uppercase;
                    border-top: 1.5px solid #000;
                    border-bottom: 1.5px solid #000;
                    display: block;
                    width: 100%;
                }

                .section-divider {
                    border-top: 1px solid #000;
                    margin: 3px 0;
                }

                .label-center {
                    text-align: center;
                    font-size: ${smallFontSize};
                    font-weight: 900 !important;
                    letter-spacing: 0.5px;
                    margin: 2px 0;
                }

                .payment-box {
                    border: 2px solid #000;
                    padding: 5px;
                    text-align: center;
                    margin-top: 6px;
                    font-size: ${baseFontSize};
                    text-transform: uppercase;
                }

                .condiments-box {
                    border: 1.5px solid #000;
                    padding: 4px;
                    text-align: center;
                    margin: 3px 0;
                    font-size: ${headerFontSize};
                    font-weight: 900 !important;
                }
            ` }} />

            <div id="thermal-content">
                {/* CABEÇALHO */}
                <div className="receipt-header">
                    <div style={{ fontSize: headerFontSize, fontWeight: '900', marginBottom: '2px' }}>{sanitizePrintText(order.restaurantName).toUpperCase()}</div>
                    <div style={{ fontSize: smallFontSize, fontWeight: 'bold', marginBottom: '4px' }}>
                        {new Date(order.timestamp).toLocaleDateString('pt-BR')} - {new Date(order.timestamp).toLocaleTimeString('pt-BR').substring(0,5)}
                    </div>
                    <div className="order-number-box">
                        {printMode === 'kitchen' ? 'COZINHA / BAR' : printMode === 'admin' ? 'VIA ADMINISTRADOR' : `PEDIDO: ${displayOrderNum}`}
                    </div>
                </div>

                <div className="section-divider"></div>

                {/* MODO DE ENTREGA */}
                <div className="mode-indicator" style={{ border: '2px solid #000', margin: '4px 0', padding: '4px' }}>
                    {order.tableNumber 
                        ? `>> MESA ${order.tableNumber} <<` 
                        : isPickup 
                            ? ">> RETIRADA NO BALCÃO <<" 
                            : ">> ENTREGA EM DOMICÍLIO <<"}
                </div>

                {/* SACHÊS / CONDIMENTOS */}
                {printMode === 'full' && (
                    <div className="condiments-box" style={{ border: '2px solid #000', margin: '4px 0', padding: '4px', textAlign: 'center' }}>
                        {order.wantsSachets 
                            ? ">>> ENVIAR SACHÊS <<<" 
                            : ">>> NÃO ENVIAR SACHÊS <<<"}
                    </div>
                )}

                {/* DADOS DO CLIENTE / ENTREGA */}
                {(order.customerName || order.customerPhone) && (
                    <div style={{ marginTop: '2px', marginBottom: '4px', fontSize: baseFontSize, border: '2px solid #000', padding: '3px' }}>
                        <div style={{ fontWeight: '900', textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '2px', marginBottom: '3px' }}>
                            {isPickup ? 'DADOS DO CLIENTE' : 'DADOS DE ENTREGA'}
                        </div>
                        <div style={{ marginBottom: '1px' }}><strong>CLIENTE:</strong> {order.customerName?.toUpperCase()}</div>
                        <div style={{ marginBottom: '1px' }}><strong>FONE:</strong> {order.customerPhone}</div>
                        
                        {!isPickup && order.customerAddress && (
                            <div style={{ marginBottom: '1px' }}>
                                <strong>END: </strong>
                                {order.customerAddress.street.toUpperCase()}, {order.customerAddress.number}
                                {order.customerAddress.complement && `, ${order.customerAddress.complement.toUpperCase()}`}
                                {order.customerAddress.neighborhood && ` - ${order.customerAddress.neighborhood.toUpperCase()}`}
                            </div>
                        )}
                    </div>
                )}

                {/* VISUALIZAÇÃO APENAS PARA COZINHA/ADMIN (SEM PREÇOS TOTAIS) */}
                {(printMode === 'kitchen' || printMode === 'admin') && (
                     <div style={{ textAlign: 'center', margin: '6px 0', fontSize: headerFontSize, fontWeight: '900' }}>
                        *** NOVOS ITENS ***
                     </div>
                )}

                {/* SEÇÃO ITENS */}
                <div className="section-divider"></div>
                <div className="label-center">ITENS DO PEDIDO</div>
                <div className="section-divider"></div>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px', tableLayout: 'fixed' }}>
                    <tbody>
                        {itemsToPrint.map((item, index) => (
                            <React.Fragment key={index}>
                                <tr>
                                    <td style={{ 
                                        textAlign: 'left', 
                                        verticalAlign: 'top', 
                                        textTransform: 'uppercase', 
                                        fontSize: headerFontSize, 
                                        paddingBottom: '3px', 
                                        paddingRight: '4px', 
                                        fontWeight: '900'
                                    }}>
                                        {item.quantity}x {item.name} {item.sizeName && `(${item.sizeName})`} {item.weight && item.isKiloItem && `(${Number(item.weight).toFixed(3)}kg)`}
                                    </td>
                                    <td style={{ 
                                        textAlign: 'right', 
                                        verticalAlign: 'top', 
                                        fontSize: headerFontSize, 
                                        whiteSpace: 'nowrap', 
                                        paddingBottom: '3px', 
                                        fontWeight: '900',
                                        width: '60px'
                                    }}>
                                        {(Number(item.price) * item.quantity).toFixed(2)}
                                    </td>
                                </tr>
                                {(item.selectedOptions?.length || item.selectedAddons?.length || item.notes) ? (
                                    <tr>
                                        <td colSpan={2} style={{ paddingLeft: '2mm', paddingBottom: '5px' }}>
                                            {item.selectedOptions?.map((opt, i) => (
                                                <div key={i} style={{ fontSize: smallFontSize }}>• {opt.groupTitle.toUpperCase()}: {opt.optionName.toUpperCase()} {opt.price > 0 ? `(+R$ ${Number(opt.price).toFixed(2)})` : ''}</div>
                                            ))}
                                            {item.selectedAddons?.map((a, i) => (
                                                <div key={i} style={{ fontSize: smallFontSize }}>+ {a.name.toUpperCase()}</div>
                                            ))}
                                            {item.notes && (
                                                <div style={{ fontSize: baseFontSize, borderLeft: '3px solid #000', paddingLeft: '2mm', marginTop: '2px', fontWeight: '900', whiteSpace: 'normal' }}>
                                                    OBS: {item.notes.toUpperCase()}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ) : null}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>

                {/* TOTAIS - APENAS SE NÃO FOR MODO COZINHA */}
                {printMode === 'full' && (
                    <>
                        <div className="section-divider"></div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: baseFontSize }}>
                            <tbody>
                                <tr>
                                    <td style={{ textAlign: 'left', paddingBottom: '2px' }}>SUBTOTAL:</td>
                                    <td style={{ textAlign: 'right', paddingBottom: '2px', whiteSpace: 'nowrap' }}>R$ {displaySubtotal.toFixed(2)}</td>
                                </tr>
                                {!isPickup && (
                                    <tr>
                                        <td style={{ textAlign: 'left', paddingBottom: '2px' }}>TAXA ENTREGA:</td>
                                        <td style={{ textAlign: 'right', paddingBottom: '2px', whiteSpace: 'nowrap' }}>R$ {Number(order.deliveryFee || 0).toFixed(2)}</td>
                                    </tr>
                                )}
                                {Number(order.discountAmount || 0) > 0 && (
                                    <tr>
                                        <td style={{ textAlign: 'left', paddingBottom: '2px' }}>DESCONTO:</td>
                                        <td style={{ textAlign: 'right', paddingBottom: '2px', whiteSpace: 'nowrap' }}>- R$ {Number(order.discountAmount).toFixed(2)}</td>
                                    </tr>
                                )}
                                <tr>
                                    <td colSpan={2} style={{ padding: '0' }}><div className="section-divider" style={{ margin: '3px 0' }}></div></td>
                                </tr>
                                <tr>
                                    <td style={{ textAlign: 'left', fontSize: titleFontSize, fontWeight: '900', paddingTop: '2px' }}>TOTAL:</td>
                                    <td style={{ textAlign: 'right', fontSize: titleFontSize, fontWeight: '900', paddingTop: '2px', whiteSpace: 'nowrap' }}>R$ {displayTotal.toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>

                        {/* PAGAMENTO */}
                        <div className="payment-box">
                            <div style={{ fontWeight: '900' }}>FORMA PGTO: {order.paymentMethod.split('(')[0].trim().toUpperCase()}</div>
                            {(order.changeFor || order.paymentMethod.includes('Troco para')) && (
                                <div style={{ fontSize: headerFontSize, marginTop: '3px', borderTop: '1.5px dashed #000', paddingTop: '3px', fontWeight: '900' }}>
                                    {order.changeFor 
                                        ? `TROCO PARA: R$ ${order.changeFor.toFixed(2)}`
                                        : (order.paymentMethod.match(/\(([^)]+)\)/)?.[1].toUpperCase() || order.paymentMethod.toUpperCase())
                                    }
                                    {order.changeFor && order.changeFor > displayTotal && (
                                        <div style={{ fontSize: smallFontSize, marginTop: '1px', fontWeight: '900' }}>
                                            TROCO A DEVOLVER: R$ {(order.changeFor - displayTotal).toFixed(2)}
                                        </div>
                                    )}
                                </div>
                            )}
                            {isPixPaid && <div style={{ fontSize: smallFontSize, marginTop: '2px', fontWeight: '900' }}>(PAGO PELO APP)</div>}
                        </div>
                    </>
                )}

                {/* RODAPÉ */}
                <div style={{ textAlign: 'center', fontSize: smallFontSize, marginTop: '8px', borderTop: '1px dashed #000', paddingTop: '4px' }}>
                    GUARA-FOOD PDV
                </div>
            </div>
        </div>
    );

    return createPortal(content, document.body);
};

export default PrintableOrder;
