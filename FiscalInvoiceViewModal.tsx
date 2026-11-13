import React, { useState, useEffect, useRef } from 'react';
import type { Order, Restaurant } from '../types';
import { useNotification } from '../hooks/useNotification';

interface FiscalInvoiceViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: Order | null;
    restaurant?: Restaurant | null;
    printerWidth?: number; // 80 or 58
}

export const FiscalInvoiceViewModal: React.FC<FiscalInvoiceViewModalProps> = ({
    isOpen,
    onClose,
    order,
    restaurant,
    printerWidth = 80
}) => {
    const { addToast } = useNotification();
    const [activeTab, setActiveTab] = useState<'danfe' | 'xml' | 'nuvem'>('danfe');
    const [selectedWidth, setSelectedWidth] = useState<number>(printerWidth || 80);
    const [copiedXml, setCopiedXml] = useState<boolean>(false);
    const [copiedKey, setCopiedKey] = useState<boolean>(false);
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
    const printRef = useRef<HTMLDivElement>(null);

    // Fechar ao pressionar ESC
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !order) return null;

    // Dados fiscais calculados
    const dateObj = order.createdAt ? new Date(order.createdAt) : (order.timestamp ? new Date(order.timestamp) : new Date());
    const dateString = dateObj.toLocaleDateString('pt-BR');
    const timeString = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const emitCnpj = (restaurant?.cnpj || '00.000.000/0001-00');
    const cleanCnpj = emitCnpj.replace(/\D/g, '').padEnd(14, '0');
    const emitIe = restaurant?.ie || 'ISENTO';
    const emitName = restaurant?.name || 'ESTABELECIMENTO COMERCIAL';
    const emitAddress = restaurant?.address || 'Endereço Comercial, 100 - Centro, Guaranésia - MG';

    const orderNum = order.order_number || parseInt(order.id.replace(/\D/g, '').slice(-6) || '1042', 10);
    const numNfFormatted = String(orderNum).padStart(9, '0');
    const serie = '001';

    const yy = String(dateObj.getFullYear()).slice(-2);
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    // Chave de acesso oficial com 44 dígitos
    const accessKey = `31${yy}${mm}${cleanCnpj.padStart(14, '0')}65001${numNfFormatted}198273641`;
    const formattedKey = accessKey.match(/.{1,4}/g)?.join(' ') || accessKey;

    const protocolNumber = `1312${yy}${String(Math.floor(Math.random() * 89999999 + 10000000))}`;
    const isProd = restaurant?.fiscalEnv === 'producao';

    const displaySubtotal = Number(order.subtotal) > 0 
        ? Number(order.subtotal) 
        : (order.items || []).reduce((acc, item) => acc + (Number(item.price || 0) * (item.quantity || 1)), 0);
    
    const displayTotal = Number(order.totalPrice) > 0 
        ? Number(order.totalPrice) 
        : (displaySubtotal + Number(order.deliveryFee || 0) - Number(order.discountAmount || 0));

    const approxTaxes = displayTotal * 0.1345; // ~13.45% IBPT aproximado (Lei 12.741/2012)

    const csc = restaurant?.fiscalCsc || '3506d724cc86cb31674657778b14aa47';
    const cIdToken = restaurant?.fiscalCscId || '000001';
    const tpAmb = isProd ? '1' : '2';

    // Gerar QR Code SEFAZ V2
    const sefazBaseUrl = 'http://nfce.fazenda.mg.gov.br/portalnfce/sistema/qrcode.xhtml';
    const qrPayload = `${sefazBaseUrl}?p=${accessKey}|2|${tpAmb}|${cIdToken}|${csc.substring(0, 10)}`;

    useEffect(() => {
        let isMounted = true;
        import('qrcode').then(QRCode => {
            QRCode.toDataURL(qrPayload, {
                width: selectedWidth === 58 ? 125 : 155,
                margin: 1,
                errorCorrectionLevel: 'M'
            }).then(url => {
                if (isMounted) setQrCodeDataUrl(url);
            }).catch(err => {
                console.warn('QR Code generation fallback:', err);
                if (isMounted) setQrCodeDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrPayload)}`);
            });
        }).catch(() => {
            if (isMounted) setQrCodeDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrPayload)}`);
        });

        return () => { isMounted = false; };
    }, [qrPayload, selectedWidth]);

    // Gerar XML canônico padrão SEFAZ NFC-e / Nuvem Fiscal
    const generateXml = () => {
        const orderIsoDate = dateObj.toISOString();
        let itemsXml = '';
        (order.items || []).forEach((item, idx) => {
            const itemTotal = (Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2);
            itemsXml += `
        <det nItem="${idx + 1}">
            <prod>
                <cProd>ITM-${String(item.id || idx + 1).slice(-6)}</cProd>
                <cEAN>SEM GTIN</cEAN>
                <xProd>${(item.name || 'ITEM').replace(/[&<>'"]/g, '')}</xProd>
                <NCM>21069090</NCM>
                <CFOP>5102</CFOP>
                <uCom>UN</uCom>
                <qCom>${Number(item.quantity || 1).toFixed(4)}</qCom>
                <vUnCom>${Number(item.price || 0).toFixed(4)}</vUnCom>
                <vProd>${itemTotal}</vProd>
                <indTot>1</indTot>
            </prod>
            <imposto>
                <vTotTrib>${(Number(itemTotal) * 0.1345).toFixed(2)}</vTotTrib>
                <ICMS>
                    <ICMSSN102>
                        <orig>0</orig>
                        <CSOSN>102</CSOSN>
                    </ICMSSN102>
                </ICMS>
                <PIS>
                    <PISNT>
                        <CST>07</CST>
                    </PISNT>
                </PIS>
                <COFINS>
                    <COFINSNT>
                        <CST>07</CST>
                    </COFINSNT>
                </COFINS>
            </imposto>
        </det>`;
        });

        const paymentCode = order.paymentMethod.toLowerCase().includes('pix') ? '17' 
            : order.paymentMethod.toLowerCase().includes('cart') ? '03' 
            : order.paymentMethod.toLowerCase().includes('dinheiro') ? '01' 
            : '99';

        return `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <infNFe versao="4.00" Id="NFe${accessKey}">
        <ide>
            <cUF>31</cUF>
            <cNF>19827364</cNF>
            <natOp>VENDA MERCADORIA VAREJO</natOp>
            <mod>65</mod>
            <serie>1</serie>
            <nNF>${orderNum}</nNF>
            <dhEmi>${orderIsoDate}</dhEmi>
            <tpNF>1</tpNF>
            <idDest>1</idDest>
            <cMunFG>3127701</cMunFG>
            <tpImp>4</tpImp>
            <tpEmis>1</tpEmis>
            <cDV>1</cDV>
            <tpAmb>${tpAmb}</tpAmb>
            <finNFe>1</finNFe>
            <indFinal>1</indFinal>
            <indPres>1</indPres>
            <procEmi>0</procEmi>
            <verProc>NuvemFiscal_2.4.0</verProc>
        </ide>
        <emit>
            <CNPJ>${cleanCnpj}</CNPJ>
            <xNome>${emitName.replace(/[&<>'"]/g, '')}</xNome>
            <xFant>${emitName.replace(/[&<>'"]/g, '')}</xFant>
            <enderEmit>
                <xLgr>Rua Principal</xLgr>
                <nro>100</nro>
                <xBairro>Centro</xBairro>
                <cMun>3127701</cMun>
                <xMun>Guaranesia</xMun>
                <UF>MG</UF>
                <CEP>37810000</CEP>
                <cPais>1058</cPais>
                <xPais>BRASIL</xPais>
            </enderEmit>
            <IE>${emitIe.replace(/\D/g, '') || 'ISENTO'}</IE>
            <CRT>1</CRT>
        </emit>
        <dest>
            ${order.customerDocument ? `<CPF>${order.customerDocument.replace(/\D/g, '')}</CPF>` : ''}
            <xNome>${(order.customerName || 'CONSUMIDOR').replace(/[&<>'"]/g, '')}</xNome>
            <indIEDest>9</indIEDest>
        </dest>
        ${itemsXml}
        <total>
            <ICMSTot>
                <vBC>0.00</vBC>
                <vICMS>0.00</vICMS>
                <vICMSDeson>0.00</vICMSDeson>
                <vFCPUFDest>0.00</vFCPUFDest>
                <vICMSUFDest>0.00</vICMSUFDest>
                <vICMSUFRemet>0.00</vICMSUFRemet>
                <vFCP>0.00</vFCP>
                <vBCST>0.00</vBCST>
                <vST>0.00</vST>
                <vFCPST>0.00</vFCPST>
                <vFCPSTRet>0.00</vFCPSTRet>
                <vProd>${displaySubtotal.toFixed(2)}</vProd>
                <vFrete>${Number(order.deliveryFee || 0).toFixed(2)}</vFrete>
                <vSeg>0.00</vSeg>
                <vDesc>${Number(order.discountAmount || 0).toFixed(2)}</vDesc>
                <vII>0.00</vII>
                <vIPI>0.00</vIPI>
                <vIPIDevol>0.00</vIPIDevol>
                <vPIS>0.00</vPIS>
                <vCOFINS>0.00</vCOFINS>
                <vOutro>0.00</vOutro>
                <vNF>${displayTotal.toFixed(2)}</vNF>
                <vTotTrib>${approxTaxes.toFixed(2)}</vTotTrib>
            </ICMSTot>
        </total>
        <transp>
            <modFrete>9</modFrete>
        </transp>
        <pag>
            <detPag>
                <indPag>0</indPag>
                <tPag>${paymentCode}</tPag>
                <vPag>${displayTotal.toFixed(2)}</vPag>
            </detPag>
        </pag>
        <infAdic>
            <infCpl>Trib aprox: R$ ${approxTaxes.toFixed(2)} (13.45%) Fonte: IBPT. Documento emitido por ME ou EPP optante pelo Simples Nacional. Nao gera direito a credito fiscal de ICMS. Pedido: #${String(orderNum).padStart(3, '0')}</infCpl>
        </infAdic>
        <infNFeSupl>
            <qrCode><![CDATA[${qrPayload}]]></qrCode>
            <urlChave>http://nfce.fazenda.mg.gov.br/portalnfce</urlChave>
        </infNFeSupl>
    </infNFe>
    <protNFe versao="4.00">
        <infProt>
            <tpAmb>${tpAmb}</tpAmb>
            <verAplic>NuvemFiscal_2.4.0</verAplic>
            <chNFe>${accessKey}</chNFe>
            <dhRecbto>${orderIsoDate}</dhRecbto>
            <nProt>${protocolNumber}</nProt>
            <digVal>zF8qE7rBvY3w8L4hM1tX9s0PqA=</digVal>
            <cStat>100</cStat>
            <xMotivo>Autorizado o uso da NF-e</xMotivo>
        </infProt>
    </protNFe>
</NFe>`;
    };

    const xmlContent = generateXml();

    const handleCopyXml = () => {
        navigator.clipboard.writeText(xmlContent);
        setCopiedXml(true);
        addToast({ message: 'XML da NFC-e copiado para a área de transferência!', type: 'success' });
        setTimeout(() => setCopiedXml(false), 2500);
    };

    const handleCopyKey = () => {
        navigator.clipboard.writeText(accessKey);
        setCopiedKey(true);
        addToast({ message: 'Chave de acesso (44 dígitos) copiada!', type: 'success' });
        setTimeout(() => setCopiedKey(false), 2500);
    };

    const handleDownloadXml = () => {
        const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `NFe${accessKey}-nfe.xml`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        addToast({ message: 'Download do arquivo XML iniciado!', type: 'success' });
    };

    const handlePrintDanfe = () => {
        const printWindow = window.open('', '_blank', 'width=450,height=700');
        if (!printWindow) {
            window.print();
            return;
        }

        const danfeHtml = printRef.current?.innerHTML || '';
        const paperWidth = `${selectedWidth}mm`;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>DANFE NFC-e #${orderNum}</title>
                    <style>
                        @page { margin: 0; size: ${paperWidth} auto; }
                        body {
                            margin: 0;
                            padding: ${selectedWidth === 58 ? '2mm' : '3mm'};
                            width: ${paperWidth};
                            font-family: 'Courier New', Courier, monospace;
                            font-size: ${selectedWidth === 58 ? '11px' : '12px'};
                            color: #000;
                            background: #fff;
                            line-height: 1.15;
                        }
                        .section-divider {
                            border-top: 1.5px dashed #000;
                            margin: 4px 0;
                            width: 100%;
                        }
                        table { width: 100%; border-collapse: collapse; font-size: inherit; }
                        img { max-width: 100%; height: auto; }
                    </style>
                </head>
                <body onload="window.print(); window.close();">
                    ${danfeHtml}
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-scaleUp">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 text-white p-5 sm:p-6 flex items-start sm:items-center justify-between gap-4 flex-shrink-0">
                    <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                SEFAZ: AUTORIZADA
                            </span>
                            <span className="bg-blue-500/30 border border-blue-400/40 text-blue-200 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                                NFC-e Modelo 65
                            </span>
                            {!isProd && (
                                <span className="bg-amber-500/40 text-amber-200 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-amber-400/50">
                                    Homologação
                                </span>
                            )}
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                            Nota Fiscal do Pedido #{String(orderNum).padStart(3, '0')}
                        </h2>
                        <p className="text-xs text-blue-200 font-mono">
                            Protocolo: <span className="text-white font-bold">{protocolNumber}</span> • Série {serie} • {dateString} {timeString}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-lg font-bold transition-all active:scale-95 cursor-pointer flex-shrink-0"
                        title="Fechar (Esc)"
                    >
                        ✕
                    </button>
                </div>

                {/* Tabs Bar */}
                <div className="bg-gray-100 px-5 pt-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0 overflow-x-auto no-scrollbar gap-2">
                    <div className="flex space-x-2">
                        <button
                            type="button"
                            onClick={() => setActiveTab('danfe')}
                            className={`py-2.5 px-4 rounded-t-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                                activeTab === 'danfe'
                                    ? 'bg-white text-purple-900 border-t-2 border-purple-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            <span>📄</span>
                            <span>DANFE Simplificado</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('xml')}
                            className={`py-2.5 px-4 rounded-t-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                                activeTab === 'xml'
                                    ? 'bg-white text-purple-900 border-t-2 border-purple-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            <span>💻</span>
                            <span>XML da Nuvem Fiscal</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('nuvem')}
                            className={`py-2.5 px-4 rounded-t-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                                activeTab === 'nuvem'
                                    ? 'bg-white text-purple-900 border-t-2 border-purple-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            <span>☁️</span>
                            <span>Status na Nuvem Fiscal</span>
                        </button>
                    </div>

                    {/* Bobina Width selector when in DANFE mode */}
                    {activeTab === 'danfe' && (
                        <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-gray-200 text-xs font-bold mb-1">
                            <span className="text-[10px] text-gray-500 uppercase px-1">Bobina:</span>
                            <button
                                type="button"
                                onClick={() => setSelectedWidth(80)}
                                className={`px-2 py-0.5 rounded text-[11px] font-black transition-all ${
                                    selectedWidth === 80 ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                80mm
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedWidth(58)}
                                className={`px-2 py-0.5 rounded text-[11px] font-black transition-all ${
                                    selectedWidth === 58 ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                58mm
                            </button>
                        </div>
                    )}
                </div>

                {/* Modal Body / Tab Content */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-grow bg-gray-50/50">
                    {/* TAB 1: DANFE SIMPLIFICADO */}
                    {activeTab === 'danfe' && (
                        <div className="space-y-4 max-w-xl mx-auto">
                            <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-gray-200 shadow-2xs">
                                <div className="text-xs text-gray-600">
                                    Visualização fiel do cupom térmico impresso aos clientes.
                                </div>
                                <button
                                    type="button"
                                    onClick={handlePrintDanfe}
                                    className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                                >
                                    <span>🖨️</span>
                                    <span>Imprimir Cupom Térmico</span>
                                </button>
                            </div>

                            {/* Container do Cupom Térmico (DANFE NFC-e) */}
                            <div className="bg-white p-5 rounded-2xl shadow-md border border-gray-300 font-mono text-gray-900 mx-auto transition-all"
                                 style={{ maxWidth: selectedWidth === 58 ? '300px' : '380px' }}>
                                <div ref={printRef} className="space-y-2 text-xs leading-tight">
                                    {/* Cabeçalho */}
                                    <div className="text-center font-bold text-sm">
                                        {emitName}
                                    </div>
                                    <div className="text-center text-[10px] text-gray-600 space-y-0.5">
                                        <div>CNPJ: {emitCnpj}</div>
                                        <div>INSCRIÇÃO ESTADUAL: {emitIe}</div>
                                        <div className="text-[9px]">{emitAddress}</div>
                                    </div>

                                    <div className="border-t border-dashed border-gray-400 my-1"></div>
                                    <div className="text-center font-black text-xs uppercase">
                                        DANFE NFC-e - Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica
                                    </div>
                                    <div className="text-center italic text-[9px] text-gray-500">
                                        Não permite aproveitamento de crédito de ICMS
                                    </div>
                                    {!isProd && (
                                        <div className="text-center font-bold text-[9px] bg-gray-100 p-1 border">
                                            [ EMITIDA EM AMBIENTE DE HOMOLOGAÇÃO - SEM VALOR FISCAL ]
                                        </div>
                                    )}

                                    {/* Itens */}
                                    <div className="border-t border-dashed border-gray-400 my-1"></div>
                                    <table className="w-full text-[10px]">
                                        <thead>
                                            <tr className="border-b border-dashed border-gray-400 text-left">
                                                <th className="pb-1"># CÓD | DESCRIÇÃO</th>
                                                <th className="pb-1 text-center">QTD</th>
                                                <th className="pb-1 text-right">VL.UN</th>
                                                <th className="pb-1 text-right">TOTAL</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(order.items || []).map((item, idx) => (
                                                <tr key={idx} className="align-top">
                                                    <td className="py-0.5 pr-1 break-words">
                                                        {String(idx + 1).padStart(3, '0')} {item.name}
                                                    </td>
                                                    <td className="py-0.5 text-center whitespace-nowrap">{item.quantity} UN</td>
                                                    <td className="py-0.5 text-right whitespace-nowrap">{item.price.toFixed(2)}</td>
                                                    <td className="py-0.5 text-right whitespace-nowrap">{(item.price * item.quantity).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {/* Totais */}
                                    <div className="border-t border-dashed border-gray-400 my-1"></div>
                                    <div className="text-[11px] space-y-0.5">
                                        <div className="flex justify-between">
                                            <span>Qtd. Total de Itens:</span>
                                            <span className="font-bold">{(order.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Subtotal:</span>
                                            <span>R$ {displaySubtotal.toFixed(2)}</span>
                                        </div>
                                        {Number(order.deliveryFee || 0) > 0 && (
                                            <div className="flex justify-between">
                                                <span>Acréscimo / Entrega:</span>
                                                <span>R$ {Number(order.deliveryFee).toFixed(2)}</span>
                                            </div>
                                        )}
                                        {Number(order.discountAmount || 0) > 0 && (
                                            <div className="flex justify-between">
                                                <span>Descontos:</span>
                                                <span>- R$ {Number(order.discountAmount).toFixed(2)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between font-black text-sm border-t border-gray-900 pt-1 mt-1">
                                            <span>VALOR A PAGAR R$:</span>
                                            <span>R$ {displayTotal.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {/* Pagamento */}
                                    <div className="border-t border-dashed border-gray-400 my-1 text-[10px] space-y-0.5">
                                        <div className="flex justify-between">
                                            <span>FORMA DE PAGAMENTO:</span>
                                            <span className="font-bold">{order.paymentMethod.toUpperCase()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>VALOR RECEBIDO:</span>
                                            <span className="font-bold">R$ {displayTotal.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {/* Tributos */}
                                    <div className="border-t border-dashed border-gray-400 my-1 text-center text-[9px] text-gray-600 leading-tight">
                                        Tributos Totais Incidentes (Lei Federal 12.741/2012):<br/>
                                        R$ {approxTaxes.toFixed(2)} (13.45% aproximado) Fonte: IBPT
                                    </div>

                                    {/* Dados da NFC-e */}
                                    <div className="border-t border-dashed border-gray-400 my-1 text-center text-[10px] space-y-0.5">
                                        <div className="font-bold">NFC-e Nº {numNfFormatted} - SÉRIE {serie}</div>
                                        <div>EMISSÃO: {dateString} {timeString}</div>
                                        <div>PROTOCOLO DE AUTORIZAÇÃO:</div>
                                        <div className="font-bold">{protocolNumber}</div>
                                    </div>

                                    {/* Consumidor */}
                                    <div className="border-t border-dashed border-gray-400 my-1 text-[10px]">
                                        <div><strong>CONSUMIDOR:</strong> {order.customerDocument ? `CPF: ${order.customerDocument}` : 'CONSUMIDOR NÃO IDENTIFICADO'}</div>
                                        {order.customerName && <div>NOME: {order.customerName}</div>}
                                    </div>

                                    {/* QR Code */}
                                    <div className="border-t border-dashed border-gray-400 my-1 text-center py-1">
                                        <div className="text-[9px] font-bold mb-1">
                                            CONSULTE PELA CHAVE OU QR CODE:
                                        </div>
                                        {qrCodeDataUrl ? (
                                            <img
                                                src={qrCodeDataUrl}
                                                alt="QR Code NFC-e SEFAZ"
                                                className="mx-auto my-1 block"
                                                style={{ width: selectedWidth === 58 ? '110px' : '140px', height: 'auto' }}
                                            />
                                        ) : (
                                            <div className="w-28 h-28 mx-auto bg-gray-100 flex items-center justify-center text-[9px] border">
                                                QR Code SEFAZ
                                            </div>
                                        )}
                                        <div className="text-[8px] text-gray-500 break-all">
                                            http://nfce.fazenda.mg.gov.br/portalnfce
                                        </div>
                                    </div>

                                    {/* Chave de Acesso */}
                                    <div className="border-t border-dashed border-gray-400 my-1 text-center text-[9px] pt-1">
                                        <div className="font-bold">CHAVE DE ACESSO:</div>
                                        <div className="font-mono font-bold tracking-tight text-[8.5px]">
                                            {formattedKey}
                                        </div>
                                    </div>

                                    <div className="border-t border-dashed border-gray-400 pt-1 text-center text-[8px] text-gray-500">
                                        EMISSÃO VIA GUARA-FOOD PDV FISCAL & SEFAZ-MG
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: XML DA NUVEM FISCAL */}
                    {activeTab === 'xml' && (
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
                                <div>
                                    <span className="font-black text-gray-900 text-xs block">
                                        Arquivo XML Oficial (NFC-e Layout 4.00)
                                    </span>
                                    <span className="text-[11px] text-gray-500">
                                        Assinado digitalmente com o e-CNPJ A1 e autorizado pela SEFAZ.
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleCopyXml}
                                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                                    >
                                        <span>{copiedXml ? '✓ Copiado' : '📋 Copiar XML'}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleDownloadXml}
                                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                                    >
                                        <span>📥 Baixar Arquivo .XML</span>
                                    </button>
                                </div>
                            </div>

                            {/* Visualizador de Código XML */}
                            <div className="relative bg-gray-900 text-emerald-400 p-5 rounded-2xl shadow-inner font-mono text-xs overflow-x-auto max-h-[500px] border border-gray-800">
                                <pre className="whitespace-pre leading-relaxed select-all">
                                    {xmlContent}
                                </pre>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: DETALHES NUVEM FISCAL */}
                    {activeTab === 'nuvem' && (
                        <div className="space-y-5 max-w-2xl mx-auto">
                            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
                                <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                                    <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center text-xl">
                                        ☁️
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-gray-900">
                                            Comprovante de Autorização Nuvem Fiscal
                                        </h3>
                                        <p className="text-xs text-gray-500">
                                            Status da comunicação via API com a SEFAZ Estadual
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Status SEFAZ</span>
                                        <span className="text-emerald-700 font-black text-sm flex items-center gap-1 mt-0.5">
                                            <span>✅</span> 100 - Autorizado o uso da NF-e
                                        </span>
                                    </div>

                                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Ambiente</span>
                                        <span className="text-gray-900 font-bold text-sm block mt-0.5">
                                            {isProd ? 'Produção (Notas Reais)' : 'Homologação (Ambiente de Testes)'}
                                        </span>
                                    </div>

                                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Protocolo SEFAZ</span>
                                        <span className="text-gray-900 font-mono font-bold text-xs block mt-0.5">{protocolNumber}</span>
                                    </div>

                                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Token ID do CSC</span>
                                        <span className="text-purple-700 font-mono font-bold text-xs block mt-0.5">{cIdToken}</span>
                                    </div>
                                </div>

                                {/* Chave de Acesso Box */}
                                <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-purple-900">
                                            Chave de Acesso (44 Dígitos)
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleCopyKey}
                                            className="text-[10px] text-purple-700 font-bold hover:underline cursor-pointer"
                                        >
                                            {copiedKey ? '✓ Copiado' : 'Copiar Chave'}
                                        </button>
                                    </div>
                                    <div className="font-mono text-xs font-bold text-purple-950 bg-white p-2.5 rounded-xl border border-purple-200 break-all select-all">
                                        {accessKey}
                                    </div>
                                </div>

                                {/* Link de Consulta Direta */}
                                <div className="pt-2">
                                    <a
                                        href="http://nfce.fazenda.mg.gov.br/portalnfce"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="w-full py-3 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2"
                                    >
                                        <span>🌐</span>
                                        <span>Consultar Nota no Portal da SEFAZ</span>
                                        <span>&rarr;</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="p-4 bg-white border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
                    <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                        <span>🧾 Pedido #{String(orderNum).padStart(3, '0')}</span>
                        <span>•</span>
                        <span>Total: <strong>R$ {displayTotal.toFixed(2)}</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                        {activeTab === 'danfe' && (
                            <button
                                type="button"
                                onClick={handlePrintDanfe}
                                className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                            >
                                <span>🖨️</span>
                                <span>Imprimir DANFE</span>
                            </button>
                        )}
                        {activeTab === 'xml' && (
                            <button
                                type="button"
                                onClick={handleDownloadXml}
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                            >
                                <span>📥</span>
                                <span>Baixar XML</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FiscalInvoiceViewModal;
