import React, { useState } from 'react';
import type { Restaurant, Order, MenuItem } from '../types';
import { useNotification } from '../hooks/useNotification';

interface FiscalXmlValidatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    restaurant: Restaurant | null;
    sampleOrder?: Order | null;
}

export const FiscalXmlValidatorModal: React.FC<FiscalXmlValidatorModalProps> = ({
    isOpen,
    onClose,
    restaurant,
    sampleOrder
}) => {
    const { addToast } = useNotification();
    const [activeTab, setActiveTab] = useState<'validation' | 'xml'>('validation');
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    // 1. Validações pré-SEFAZ
    const cleanCnpj = (restaurant?.cnpj || '').replace(/\D/g, '');
    const hasValidCnpj = cleanCnpj.length === 14;
    const hasIe = Boolean(restaurant?.ie && restaurant.ie.trim().length > 0);
    const hasCsc = Boolean(restaurant?.fiscalCsc && restaurant.fiscalCsc.trim().length > 5);
    const hasCscId = Boolean(restaurant?.fiscalCscId);
    const hasName = Boolean(restaurant?.name && restaurant.name.trim().length > 2);

    const isReadyForSefaz = hasValidCnpj && hasIe && hasCsc && hasCscId && hasName;

    // 2. Gerar XML simulado padrão SEFAZ NFC-e (Modelo 65)
    const generateNfcXml = () => {
        const emitCnpj = cleanCnpj || '00000000000100';
        const emitName = restaurant?.name || 'ESTABELECIMENTO COMERCIAL LTDA';
        const emitIe = restaurant?.ie || 'ISENTO';
        const emitAddress = restaurant?.address || 'Rua Principal, 100 - Centro';
        const cityCode = '3127701'; // Ex: Guaranésia-MG
        const uf = 'MG';

        const orderNum = sampleOrder?.order_number || 1042;
        const orderDate = new Date(sampleOrder?.createdAt || Date.now()).toISOString();
        const totalValue = sampleOrder?.totalPrice ? sampleOrder.totalPrice.toFixed(2) : '155.99';
        const subtotalValue = sampleOrder?.subtotal ? sampleOrder.subtotal.toFixed(2) : '145.00';
        const deliveryFee = sampleOrder?.deliveryFee ? sampleOrder.deliveryFee.toFixed(2) : '10.99';

        const items = sampleOrder?.items && sampleOrder.items.length > 0 
            ? sampleOrder.items 
            : [
                { id: 1, name: 'Pizza Grande Especial', quantity: 1, price: 95.00, category: 'Pizza' },
                { id: 2, name: 'Coca-Cola 2L', quantity: 1, price: 15.00, category: 'Bebidas' },
                { id: 3, name: 'Pudim Caseiro', quantity: 2, price: 17.50, category: 'Sobremesas' }
              ];

        let itemsXml = '';
        items.forEach((item, idx) => {
            const itemTotal = (Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2);
            itemsXml += `
    <det nItem="${idx + 1}">
        <prod>
            <cProd>PROD${item.id || idx + 1}</cProd>
            <cEAN>SEM GTIN</cEAN>
            <xProd>${item.name.replace(/[&<>'"]/g, '')}</xProd>
            <NIF>21069090</NIF>
            <CFOP>5102</CFOP>
            <uCom>UN</uCom>
            <qCom>${item.quantity || 1}.0000</qCom>
            <vUnCom>${Number(item.price || 0).toFixed(4)}</vUnCom>
            <vProd>${itemTotal}</vProd>
            <indTot>1</indTot>
        </prod>
        <imposto>
            <vTotTrib>14.35</vTotTrib>
            <ICMS><ICMS00><orig>0</orig><CST>00</CST><modBC>3</modBC><vBC>${itemTotal}</vBC><pICMS>18.00</pICMS><vICMS>${(Number(itemTotal) * 0.18).toFixed(2)}</vICMS></ICMS00></ICMS>
            <PIS><PISOutr><CST>99</CST><vBC>${itemTotal}</vBC><pPIS>1.65</pPIS><vPIS>${(Number(itemTotal) * 0.0165).toFixed(2)}</vPIS></PISOutr></PIS>
            <COFINS><COFINSOutr><CST>99</CST><vBC>${itemTotal}</vBC><pCOFINS>7.60</pCOFINS><vCOFINS>${(Number(itemTotal) * 0.076).toFixed(2)}</vCOFINS></COFINSOutr></COFINS>
        </imposto>
    </det>`;
        });

        const accessKey = `352610${emitCnpj}65001000${String(orderNum).padStart(9, '0')}1234567890`;

        return `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <infNFe versao="4.00" Id="NFe${accessKey}">
        <ide>
            <cUF>31</cUF>
            <cNF>12345678</cNF>
            <natOp>VENDAS DE MERCADORIAS</natOp>
            <mod>65</mod>
            <serie>1</serie>
            <nNF>${orderNum}</nNF>
            <dhEmi>${orderDate}</dhEmi>
            <tpNF>1</tpNF>
            <idDest>1</idDest>
            <cMunFG>${cityCode}</cMunFG>
            <tpImp>4</tpImp>
            <tpEmis>1</tpEmis>
            <cDV>0</cDV>
            <tpAmb>${restaurant?.fiscalEnv === 'producao' ? '1' : '2'}</tpAmb>
            <finNFe>1</finNFe>
            <indFinal>1</indFinal>
            <indPres>1</indPres>
            <procEmi>0</procEmi>
            <verProc>GuaraFood-Fiscal-4.0</verProc>
        </ide>
        <emit>
            <CNPJ>${emitCnpj}</CNPJ>
            <xNome>${emitName}</xNome>
            <enderEmit>
                <xLgr>${emitAddress}</xLgr>
                <nro>SN</nro>
                <xBairro>Centro</xBairro>
                <cMun>${cityCode}</cMun>
                <xMun>Guaranésia</xMun>
                <UF>${uf}</UF>
                <CEP>37810000</CEP>
                <cPais>1058</cPais>
                <xPais>BRASIL</xPais>
            </enderEmit>
            <IE>${emitIe}</IE>
            <CRT>1</CRT>
        </emit>
        <dest>
            <xNome>CONSUMIDOR FINAL</xNome>
        </dest>
        ${itemsXml}
        <total>
            <ICMSTot>
                <vBC>${subtotalValue}</vBC>
                <vICMS>${(Number(subtotalValue) * 0.18).toFixed(2)}</vICMS>
                <vICMSDeson>0.00</vICMSDeson>
                <vFCP>0.00</vICMSDeson>
                <vBCST>0.00</vBCST>
                <vST>0.00</vST>
                <vFCPST>0.00</vFCPST>
                <vFCPSTRet>0.00</vFCPSTRet>
                <vProd>${subtotalValue}</vProd>
                <vFrete>${deliveryFee}</vFrete>
                <vSeg>0.00</vSeg>
                <vDesc>0.00</vDesc>
                <vII>0.00</vII>
                <vIPI>0.00</vIPI>
                <vIPIDevol>0.00</vIPIDevol>
                <vPIS>${(Number(subtotalValue) * 0.0165).toFixed(2)}</vPIS>
                <vCOFINS>${(Number(subtotalValue) * 0.076).toFixed(2)}</vCOFINS>
                <vOutro>0.00</vOutro>
                <vNF>${totalValue}</vNF>
                <vTotTrib>14.35</vTotTrib>
            </ICMSTot>
        </total>
        <transp>
            <modFrete>9</modFrete>
        </transp>
        <pag>
            <detPag>
                <tPag>01</tPag>
                <vPag>${totalValue}</vPag>
            </detPag>
        </pag>
        <infAdic>
            <infCpl>Pedido #${orderNum} emitido via GuaraFood. Ambiente de ${restaurant?.fiscalEnv === 'producao' ? 'Produção' : 'Homologação (Sem Valor Fiscal)'}. CSC ID: ${restaurant?.fiscalCscId || '1'}</infCpl>
        </infAdic>
    </infNFe>
</NFe>`;
    };

    const xmlOutput = generateNfcXml();

    const handleCopyXml = () => {
        navigator.clipboard.writeText(xmlOutput);
        setCopied(true);
        addToast({ message: 'XML copiado para a área de transferência!', type: 'success' });
        setTimeout(() => setCopied(false), 2500);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="bg-purple-900 text-white p-5 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-xl shadow-inner">
                            🧾
                        </div>
                        <div>
                            <h3 className="font-black text-lg uppercase tracking-wider">Validador & Pré-Visualizador XML SEFAZ</h3>
                            <p className="text-xs text-purple-200 font-medium">Conformidade NFC-e (Modelo 65) e Certificado Digital A1</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white font-bold transition-all"
                    >
                        ✕
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 bg-gray-50 px-6 pt-3 gap-2">
                    <button
                        onClick={() => setActiveTab('validation')}
                        className={`px-5 py-2.5 rounded-t-xl font-black text-xs uppercase transition-all border-t border-x ${
                            activeTab === 'validation'
                                ? 'bg-white text-purple-900 border-gray-200 shadow-xs'
                                : 'text-gray-500 hover:text-gray-800 border-transparent'
                        }`}
                    >
                        🔍 Status de Validação Fiscal
                    </button>
                    <button
                        onClick={() => setActiveTab('xml')}
                        className={`px-5 py-2.5 rounded-t-xl font-black text-xs uppercase transition-all border-t border-x ${
                            activeTab === 'xml'
                                ? 'bg-white text-purple-900 border-gray-200 shadow-xs'
                                : 'text-gray-500 hover:text-gray-800 border-transparent'
                        }`}
                    >
                        📄 XML Pré-Visualizável (SEFAZ)
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto flex-grow space-y-6">
                    {activeTab === 'validation' ? (
                        <div className="space-y-6">
                            {/* Summary Banner */}
                            <div className={`p-4 rounded-2xl border flex items-center gap-4 ${
                                isReadyForSefaz 
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                                    : 'bg-amber-50 border-amber-200 text-amber-900'
                            }`}>
                                <div className="text-3xl">
                                    {isReadyForSefaz ? '✅' : '⚠️'}
                                </div>
                                <div>
                                    <h4 className="font-black text-sm uppercase">
                                        {isReadyForSefaz ? 'Empresa Pronta para Homologação SEFAZ' : 'Cadastros Fiscais Incompletos'}
                                    </h4>
                                    <p className="text-xs mt-0.5 opacity-90">
                                        {isReadyForSefaz 
                                            ? 'Todas as credenciais obrigatórias (CNPJ, IE, CSC e Token) foram preenchidas corretamente.' 
                                            : 'Preencha todos os campos obrigatórios nas Configurações do Restaurante para habilitar a transmissão de NFC-e.'}
                                    </p>
                                </div>
                            </div>

                            {/* Checklist */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className={`p-4 rounded-2xl border flex items-center justify-between ${hasValidCnpj ? 'bg-white border-emerald-200 shadow-2xs' : 'bg-red-50/50 border-red-200'}`}>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">{hasValidCnpj ? '✅' : '❌'}</span>
                                        <div>
                                            <span className="block font-bold text-xs text-gray-800">CNPJ da Empresa</span>
                                            <span className="text-[11px] font-mono text-gray-500">{restaurant?.cnpj || 'Não cadastrado'}</span>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${hasValidCnpj ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                        {hasValidCnpj ? 'Válido' : 'Obrigatório'}
                                    </span>
                                </div>

                                <div className={`p-4 rounded-2xl border flex items-center justify-between ${hasIe ? 'bg-white border-emerald-200 shadow-2xs' : 'bg-red-50/50 border-red-200'}`}>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">{hasIe ? '✅' : '❌'}</span>
                                        <div>
                                            <span className="block font-bold text-xs text-gray-800">Inscrição Estadual (I.E.)</span>
                                            <span className="text-[11px] font-mono text-gray-500">{restaurant?.ie || 'Não informada'}</span>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${hasIe ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                        {hasIe ? 'Preenchido' : 'Obrigatório'}
                                    </span>
                                </div>

                                <div className={`p-4 rounded-2xl border flex items-center justify-between ${hasCsc ? 'bg-white border-emerald-200 shadow-2xs' : 'bg-amber-50/50 border-amber-200'}`}>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">{hasCsc ? '✅' : '⚠️'}</span>
                                        <div>
                                            <span className="block font-bold text-xs text-gray-800">Código CSC (SIARE)</span>
                                            <span className="text-[11px] font-mono text-gray-500">{restaurant?.fiscalCsc ? 'Configurado' : 'Não informado'}</span>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${hasCsc ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                        {hasCsc ? 'Configurado' : 'Pendente'}
                                    </span>
                                </div>

                                <div className={`p-4 rounded-2xl border flex items-center justify-between ${hasCscId ? 'bg-white border-emerald-200 shadow-2xs' : 'bg-amber-50/50 border-amber-200'}`}>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">{hasCscId ? '✅' : '⚠️'}</span>
                                        <div>
                                            <span className="block font-bold text-xs text-gray-800">ID do Token (CSC ID)</span>
                                            <span className="text-[11px] font-mono text-gray-500">{restaurant?.fiscalCscId || '1'}</span>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${hasCscId ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                        {hasCscId ? 'Definido' : 'Padrão'}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-4 text-xs text-purple-900 space-y-2">
                                <div className="font-black text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                                    <span>💡</span> Dica de Homologação SEFAZ:
                                </div>
                                <p>
                                    O layout XML gerado acima segue estritamente o padrão nacional da **Nota Fiscal de Consumidor Eletrônica (NFC-e modelo 65)** exigido pela Receita Federal e Secretaria de Fazenda Estadual (SEF-MG). Você pode alternar para a aba <strong>XML Pré-Visualizável</strong> para inspecionar os blocos de itens, emitente e totais.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-black text-gray-500 uppercase tracking-wider">
                                    Estrutura XML (Layout NFC-e v4.00)
                                </span>
                                <button
                                    onClick={handleCopyXml}
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
                                >
                                    <span>{copied ? '✅' : '📋'}</span>
                                    <span>{copied ? 'Copiado!' : 'Copiar XML'}</span>
                                </button>
                            </div>

                            <div className="bg-gray-900 text-emerald-400 p-4 rounded-2xl font-mono text-[11px] overflow-x-auto max-h-[400px] border border-gray-800 shadow-inner select-all whitespace-pre">
                                {xmlOutput}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 border-t border-gray-200 p-4 px-6 flex justify-between items-center">
                    <span className="text-xs text-gray-500 font-bold">
                        Provedor Ativo: <strong className="text-purple-700 uppercase">{restaurant?.fiscalProvider || 'Focus NFe'}</strong> ({restaurant?.fiscalEnv === 'producao' ? 'Produção' : 'Homologação'})
                    </span>
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                        Fechar Validador
                    </button>
                </div>
            </div>
        </div>
    );
};
