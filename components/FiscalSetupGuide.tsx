import React, { useState } from 'react';
import { useNotification } from '../hooks/useNotification';

interface FiscalSetupGuideProps {
    onGoToConfig?: () => void;
    onBack?: () => void;
}

export const FiscalSetupGuide: React.FC<FiscalSetupGuideProps> = ({ onGoToConfig, onBack }) => {
    const { addToast } = useNotification();
    const [activeTab, setActiveTab] = useState<'passo1' | 'passo2' | 'passo3' | 'passo4' | 'faq'>('passo1');
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    // Checklist interativo
    const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({
        step1_cert: false,
        step1_csc: false,
        step1_token: false,
        step2_upload: false,
        step2_nuvem_keys: false,
        step3_guara_save: false,
        step4_test_print: false
    });

    const toggleCheck = (id: string) => {
        setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(label);
        addToast({ message: `Copiado: ${label}`, type: 'success' });
        setTimeout(() => setCopiedKey(null), 2500);
    };

    const accountantMessageTemplate = `Olá! Preciso configurar a emissão de NFC-e (Cupom Fiscal Modelo 65) no sistema do restaurante.
Você poderia me disponibilizar, por gentileza:
1. Arquivo do Certificado Digital e-CNPJ Modelo A1 (.pfx ou .p12) e a senha;
2. Código CSC (Código de Segurança do Contribuinte) de Produção gerado na SEFAZ;
3. ID do Token do CSC (ex: 000001 ou 1);
4. Inscrição Estadual (I.E.) atualizada da empresa.
Muito obrigado!`;

    const totalSteps = Object.keys(checkedItems).length;
    const completedSteps = Object.values(checkedItems).filter(Boolean).length;
    const progressPercent = Math.round((completedSteps / totalSteps) * 100);

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-fadeIn">
            {/* Header / Banner Principal */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="bg-blue-500/30 border border-blue-400/40 text-blue-200 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                                Manual do Lojista
                            </span>
                            <span className="bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                SEFAZ & Nuvem Fiscal
                            </span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                            Guia Completo: Ativação da NFC-e e Impressão Fiscal
                        </h2>
                        <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
                            Aprenda passo a passo como configurar o <strong>Token</strong>, o <strong>CSC</strong> e o <strong>Certificado Digital A1</strong> para emitir cupons fiscais eletrônicos com QR Code em impressoras térmicas (80mm ou 58mm).
                        </p>
                    </div>

                    {/* Progress Card */}
                    <div className="bg-white/10 border border-white/20 backdrop-blur-md p-4 rounded-2xl flex-shrink-0 w-full md:w-auto text-center space-y-2">
                        <span className="text-xs font-black uppercase tracking-wider text-blue-200 block">
                            Progresso da Configuração
                        </span>
                        <div className="text-2xl sm:text-3xl font-black text-white">
                            {progressPercent}%
                        </div>
                        <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                            <div 
                                className="bg-emerald-400 h-full rounded-full transition-all duration-500" 
                                style={{ width: `${progressPercent}%` }}
                            ></div>
                        </div>
                        <span className="text-[10px] text-blue-200 block">
                            {completedSteps} de {totalSteps} etapas concluídas
                        </span>
                    </div>
                </div>

                {onGoToConfig && (
                    <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                        <span className="text-xs text-blue-200">
                            Já está com os dados do contador em mãos?
                        </span>
                        <button
                            type="button"
                            onClick={onGoToConfig}
                            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-lg active:scale-95 cursor-pointer"
                        >
                            <span>⚙️</span>
                            <span>Ir Direto para a Configuração Fiscal</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Stepper Tabs Navigation */}
            <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex space-x-1 overflow-x-auto no-scrollbar">
                <button
                    onClick={() => setActiveTab('passo1')}
                    className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                        activeTab === 'passo1'
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                    <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>
                    <span>1. Dados do Contador</span>
                </button>

                <button
                    onClick={() => setActiveTab('passo2')}
                    className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                        activeTab === 'passo2'
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                    <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">2</span>
                    <span>2. Na Nuvem Fiscal</span>
                </button>

                <button
                    onClick={() => setActiveTab('passo3')}
                    className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                        activeTab === 'passo3'
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                    <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">3</span>
                    <span>3. No GuaraFood</span>
                </button>

                <button
                    onClick={() => setActiveTab('passo4')}
                    className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                        activeTab === 'passo4'
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                    <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">4</span>
                    <span>4. Impressão Térmica</span>
                </button>

                <button
                    onClick={() => setActiveTab('faq')}
                    className={`flex-1 min-w-[110px] py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                        activeTab === 'faq'
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                    <span>❓</span>
                    <span>Dúvidas Frequentes</span>
                </button>
            </div>

            {/* TAB 1: DADOS DO CONTADOR */}
            {activeTab === 'passo1' && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center text-2xl flex-shrink-0">
                                📋
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-gray-900">
                                    Passo 1: O que solicitar ao Contador
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">
                                    Para emitir NFC-e (Cupom Fiscal Modelo 65) em qualquer estado brasileiro (ex: Minas Gerais), o estabelecimento precisa de 4 itens obrigatórios que são fornecidos pelo contador.
                                </p>
                            </div>
                        </div>

                        {/* Checklist dos 4 itens */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Item 1 */}
                            <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/40 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-purple-950 flex items-center gap-2">
                                        <span>🔒</span>
                                        <span>1. Certificado Digital e-CNPJ Modelo A1</span>
                                    </span>
                                    <input 
                                        type="checkbox" 
                                        checked={checkedItems.step1_cert} 
                                        onChange={() => toggleCheck('step1_cert')} 
                                        className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                                    />
                                </div>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Deve ser no formato arquivo digital (extensão <strong>.pfx</strong> ou <strong>.p12</strong>) acompanhado da senha. 
                                    <span className="block mt-1 text-[11px] text-amber-800 font-bold">
                                        ⚠️ Atenção: Certificados A3 (token USB ou cartão com chip) NÃO funcionam na nuvem. Exija o modelo A1 em arquivo.
                                    </span>
                                </p>
                            </div>

                            {/* Item 2 */}
                            <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/40 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-purple-950 flex items-center gap-2">
                                        <span>🔑</span>
                                        <span>2. Código CSC (Código de Segurança)</span>
                                    </span>
                                    <input 
                                        type="checkbox" 
                                        checked={checkedItems.step1_csc} 
                                        onChange={() => toggleCheck('step1_csc')} 
                                        className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                                    />
                                </div>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    É a chave alfanumérica de segurança fornecida pela SEFAZ Estadual (ex: no portal SIARE em Minas Gerais). 
                                    <span className="block mt-1 font-mono text-[11px] text-purple-900 bg-white p-1.5 rounded border border-purple-200">
                                        Ex: 3506d724cc86cb31674657778b14aa47
                                    </span>
                                </p>
                            </div>

                            {/* Item 3 */}
                            <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/40 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-purple-950 flex items-center gap-2">
                                        <span>🔢</span>
                                        <span>3. ID do Token do CSC (IdCSC)</span>
                                    </span>
                                    <input 
                                        type="checkbox" 
                                        checked={checkedItems.step1_token} 
                                        onChange={() => toggleCheck('step1_token')} 
                                        className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                                    />
                                </div>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    É o identificador numérico sequencial vinculado ao seu CSC no portal da SEFAZ.
                                    <span className="block mt-1 font-mono text-[11px] text-purple-900 bg-white p-1.5 rounded border border-purple-200 font-bold">
                                        Ex: 000001 (ou 1)
                                    </span>
                                </p>
                            </div>

                            {/* Item 4 */}
                            <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/40 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-purple-950 flex items-center gap-2">
                                        <span>🏛️</span>
                                        <span>4. Inscrição Estadual (I.E.) Ativa</span>
                                    </span>
                                    <span className="text-[10px] text-emerald-700 bg-emerald-100 font-bold px-2 py-0.5 rounded">
                                        Obrigatório
                                    </span>
                                </div>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    A empresa deve ter cadastro ativo na Receita Estadual e estar autorizada a emitir documentos modelo 65 (NFC-e).
                                </p>
                            </div>
                        </div>

                        {/* Template para enviar ao contador */}
                        <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
                                    <span>💬</span>
                                    <span>Mensagem Pronta para Enviar ao seu Contador (WhatsApp)</span>
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleCopy(accountantMessageTemplate, 'Mensagem ao Contador')}
                                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                                >
                                    <span>{copiedKey === 'Mensagem ao Contador' ? '✓ Copiado' : '📋 Copiar Mensagem'}</span>
                                </button>
                            </div>
                            <pre className="text-xs text-gray-700 bg-white p-4 rounded-xl border border-gray-200 font-sans whitespace-pre-wrap leading-relaxed">
                                {accountantMessageTemplate}
                            </pre>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                onClick={() => setActiveTab('passo2')}
                                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-black shadow-md transition-all flex items-center gap-2 cursor-pointer"
                            >
                                <span>Avançar para Passo 2: Na Nuvem Fiscal</span>
                                <span>&rarr;</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: NA NUVEM FISCAL */}
            {activeTab === 'passo2' && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center text-2xl flex-shrink-0">
                                ☁️
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-gray-900">
                                    Passo 2: Configuração no Painel da Nuvem Fiscal
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">
                                    A Nuvem Fiscal é a plataforma que assina digitalmente as notas e se comunica com o servidor da SEFAZ 24 horas por dia.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4 text-xs text-gray-700">
                            {/* Subetapa 2.1 */}
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="font-black text-gray-900 text-sm flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">2.1</span>
                                        <span>Cadastrar a Empresa e Enviar o Certificado A1 (.pfx)</span>
                                    </span>
                                    <input 
                                        type="checkbox" 
                                        checked={checkedItems.step2_upload} 
                                        onChange={() => toggleCheck('step2_upload')} 
                                        className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                                    />
                                </div>
                                <ol className="list-decimal pl-5 space-y-1 text-gray-600 leading-relaxed">
                                    <li>Acesse <a href="https://app.nuvemfiscal.com.br" target="_blank" rel="noreferrer" className="text-blue-600 font-bold underline">app.nuvemfiscal.com.br</a> com a sua conta.</li>
                                    <li>No menu esquerdo, clique em <strong>Empresas</strong> e depois em <strong>Nova Empresa</strong>.</li>
                                    <li>Informe o <strong>CNPJ</strong>, <strong>Razão Social</strong> e <strong>Inscrição Estadual</strong> do restaurante.</li>
                                    <li>Na aba <strong>Certificado Digital</strong>, clique em <em>Fazer Upload</em>, selecione o arquivo <strong>.pfx</strong> e digite a senha.</li>
                                </ol>
                            </div>

                            {/* Subetapa 2.2 */}
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                                <span className="font-black text-gray-900 text-sm flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">2.2</span>
                                    <span>Cadastrar o CSC e o Token ID em 'NFC-e'</span>
                                </span>
                                <ol className="list-decimal pl-5 space-y-1 text-gray-600 leading-relaxed">
                                    <li>Ainda dentro do cadastro da empresa, clique na aba <strong>NFC-e</strong>.</li>
                                    <li>No campo <strong>Ambiente</strong>, selecione <strong>Produção</strong> (ou Homologação se for para testes).</li>
                                    <li>No campo <strong>Identificador do CSC (IdCSC)</strong>, insira o número do token (ex: <code className="bg-purple-100 px-1 py-0.5 rounded font-mono font-bold text-purple-900">000001</code>).</li>
                                    <li>No campo <strong>Código de Segurança do Contribuinte (CSC)</strong>, cole a chave alfanumérica (ex: <code className="bg-purple-100 px-1 py-0.5 rounded font-mono font-bold text-purple-900">3506d724cc86cb31674657778b14aa47</code>).</li>
                                    <li>Defina a série padrão (normalmente <strong>1</strong>) e clique em <strong>Salvar</strong>.</li>
                                </ol>
                            </div>

                            {/* Subetapa 2.3 */}
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="font-black text-gray-900 text-sm flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">2.3</span>
                                        <span>Obter o Client ID e Client Secret da API</span>
                                    </span>
                                    <input 
                                        type="checkbox" 
                                        checked={checkedItems.step2_nuvem_keys} 
                                        onChange={() => toggleCheck('step2_nuvem_keys')} 
                                        className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                                    />
                                </div>
                                <p className="text-gray-600 leading-relaxed">
                                    Para conectar o GuaraFood à sua conta da Nuvem Fiscal:
                                </p>
                                <ol className="list-decimal pl-5 space-y-1 text-gray-600 leading-relaxed">
                                    <li>No menu superior ou lateral, vá em <strong>Minha Conta</strong> ou <strong>Aplicações / API</strong>.</li>
                                    <li>Crie uma nova aplicação OAuth2 ou copie o <strong>Client ID</strong> e o <strong>Client Secret</strong> já criados.</li>
                                </ol>
                            </div>
                        </div>

                        <div className="flex justify-between pt-2">
                            <button
                                type="button"
                                onClick={() => setActiveTab('passo1')}
                                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold transition-all cursor-pointer"
                            >
                                &larr; Voltar para Passo 1
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('passo3')}
                                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-black shadow-md transition-all flex items-center gap-2 cursor-pointer"
                            >
                                <span>Avançar para Passo 3: No GuaraFood</span>
                                <span>&rarr;</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: NO GUARAFOOD */}
            {activeTab === 'passo3' && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl flex-shrink-0">
                                ⚙️
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-gray-900">
                                    Passo 3: Salvar as Credenciais no GuaraFood
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">
                                    Agora amarramos o restaurante selecionado às suas credenciais fiscais no banco de dados da plataforma.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-200 space-y-2">
                                <span className="font-black text-purple-900 text-xs uppercase tracking-wider block">
                                    O que preencher na aba 'Configuração Fiscal':
                                </span>
                                <ul className="space-y-2 text-xs text-gray-700">
                                    <li className="flex items-start gap-2">
                                        <span className="text-purple-600 font-bold">1.</span>
                                        <span><strong>Selecione o Restaurante:</strong> No topo da página, escolha a loja desejada.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-purple-600 font-bold">2.</span>
                                        <span><strong>ID do Token (IdCSC):</strong> Insira o número enviado pelo contador (ex: <code className="bg-white px-1.5 py-0.5 rounded border font-mono font-bold">000001</code>).</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-purple-600 font-bold">3.</span>
                                        <span><strong>Código CSC:</strong> Cole a chave completa (ex: <code className="bg-white px-1.5 py-0.5 rounded border font-mono font-bold">3506d724cc86cb31674657778b14aa47</code>).</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-purple-600 font-bold">4.</span>
                                        <span><strong>CNPJ & Inscrição Estadual:</strong> Certifique-se de que correspondem exatamente aos dados cadastrados na SEFAZ.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-purple-600 font-bold">5.</span>
                                        <span><strong>Ambiente SEFAZ:</strong> Deixe como <strong>Produção</strong> para cupons reais ou <strong>Homologação</strong> para testes.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-purple-600 font-bold">6.</span>
                                        <span><strong>Client ID e Client Secret:</strong> Cole as chaves da sua conta Nuvem Fiscal.</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
                                <div className="space-y-1">
                                    <span className="font-black text-emerald-900 text-xs block">
                                        Gravação no Banco de Dados Supabase
                                    </span>
                                    <p className="text-[11px] text-emerald-700">
                                        Ao clicar no botão verde <strong>"Salvar Credenciais no Banco de Dados"</strong>, todas as configurações ficam permanentemente vinculadas ao perfil da loja.
                                    </p>
                                </div>
                                <input 
                                    type="checkbox" 
                                    checked={checkedItems.step3_guara_save} 
                                    onChange={() => toggleCheck('step3_guara_save')} 
                                    className="w-5 h-5 text-emerald-600 rounded cursor-pointer"
                                />
                            </div>

                            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200 space-y-1">
                                <span className="font-black text-blue-900 text-xs block">
                                    ⚡ Validação Instantânea:
                                </span>
                                <p className="text-xs text-blue-800">
                                    Após salvar, clique no botão azul <strong>"Testar Conexão Fiscal & Validar CSC"</strong>. Se tudo estiver correto, um aviso verde com confirmação aparecerá imediatamente na tela.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setActiveTab('passo2')}
                                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold transition-all cursor-pointer"
                            >
                                &larr; Voltar para Passo 2
                            </button>

                            <div className="flex items-center gap-3">
                                {onGoToConfig && (
                                    <button
                                        type="button"
                                        onClick={onGoToConfig}
                                        className="px-5 py-2.5 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-xl text-xs font-black transition-all cursor-pointer"
                                    >
                                        Ir para Configuração Fiscal Agora
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('passo4')}
                                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-black shadow-md transition-all flex items-center gap-2 cursor-pointer"
                                >
                                    <span>Avançar para Passo 4: Impressão Térmica</span>
                                    <span>&rarr;</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: IMPRESSÃO TÉRMICA */}
            {activeTab === 'passo4' && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-2xl flex-shrink-0">
                                🧾
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-gray-900">
                                    Passo 4: Emitir e Imprimir o Cupom DANFE NFC-e no Caixa
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">
                                    Veja como é rápido e direto emitir notas fiscais para clientes do delivery, balcão e salão.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                            {/* Explicação da Operação */}
                            <div className="space-y-4">
                                <div className="space-y-3 text-xs text-gray-700">
                                    <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200">
                                        <span className="font-black text-gray-900 block mb-1">1. Abrir os Detalhes do Pedido</span>
                                        <p className="text-gray-600 leading-relaxed">
                                            No painel de <strong>Gestão de Pedidos</strong> ou no módulo de <strong>Comandas / Mesas</strong>, clique sobre qualquer pedido concluído ou em preparo.
                                        </p>
                                    </div>

                                    <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-200">
                                        <span className="font-black text-purple-900 block mb-1">2. Clicar em '🧾 Cupom Fiscal'</span>
                                        <p className="text-gray-600 leading-relaxed">
                                            Na barra inferior do modal de detalhes, clique no botão roxo <strong>"🧾 Cupom Fiscal"</strong>.
                                        </p>
                                    </div>

                                    <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200">
                                        <span className="font-black text-emerald-900 block mb-1">3. Impressão Térmica Automática</span>
                                        <p className="text-gray-600 leading-relaxed">
                                            O GuaraFood monta automaticamente o DANFE NFC-e com a Chave de 44 dígitos, protocolo da SEFAZ e o <strong>QR Code oficial de alta resolução</strong> formatado para a largura da bobina (80mm ou 58mm).
                                        </p>
                                    </div>
                                </div>

                                <div className="p-4 bg-emerald-100/60 rounded-2xl border border-emerald-300 flex items-center justify-between">
                                    <span className="text-xs font-black text-emerald-950">
                                        ✓ Teste de Impressão Térmica Realizado
                                    </span>
                                    <input 
                                        type="checkbox" 
                                        checked={checkedItems.step4_test_print} 
                                        onChange={() => toggleCheck('step4_test_print')} 
                                        className="w-5 h-5 text-emerald-600 rounded cursor-pointer"
                                    />
                                </div>
                            </div>

                            {/* Mockup Visual do Cupom Impresso */}
                            <div className="bg-gray-100 p-4 rounded-3xl border border-gray-200">
                                <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider block text-center mb-2">
                                    Exemplo do Cupom Gerado (DANFE NFC-e)
                                </span>
                                <div className="bg-white p-4 rounded-xl shadow-md font-mono text-[11px] text-gray-900 space-y-2 border border-gray-300 max-w-[280px] mx-auto leading-tight">
                                    <div className="text-center font-bold text-xs">
                                        RESTAURANTE EXEMPLO LTDA
                                    </div>
                                    <div className="text-center text-[10px] text-gray-600">
                                        CNPJ: 00.000.000/0001-00<br/>
                                        INSCRIÇÃO ESTADUAL: 001234567.00-89
                                    </div>
                                    <div className="border-t border-dashed border-gray-400 my-1"></div>
                                    <div className="text-center font-bold text-[10px]">
                                        DANFE NFC-e - Doc Auxiliar da Nota Fiscal de Consumidor Eletrônica
                                    </div>
                                    <div className="text-center italic text-[9px] text-gray-500">
                                        Não permite aproveitamento de crédito ICMS
                                    </div>
                                    <div className="border-t border-dashed border-gray-400 my-1"></div>
                                    <div className="text-[10px]">
                                        001 X-TUDO ESPECIAL 1 UN x 28.00 = 28.00<br/>
                                        002 COCA-COLA LATA 1 UN x 6.00 = 6.00
                                    </div>
                                    <div className="border-t border-dashed border-gray-400 my-1"></div>
                                    <div className="flex justify-between font-bold text-xs">
                                        <span>TOTAL R$:</span>
                                        <span>34,00</span>
                                    </div>
                                    <div className="text-[10px]">FORMA PGTO: PIX</div>
                                    <div className="border-t border-dashed border-gray-400 my-1"></div>
                                    {/* Mock QR Code */}
                                    <div className="text-center py-1">
                                        <div className="w-24 h-24 mx-auto bg-gray-900 flex items-center justify-center text-white text-[9px] p-2 rounded">
                                            [ QR CODE OFICIAL SEFAZ ]
                                        </div>
                                        <div className="text-[8px] text-gray-500 mt-1">
                                            Consulte pela chave no portal SEFAZ
                                        </div>
                                    </div>
                                    <div className="text-center text-[8px] text-gray-400 border-t border-dashed border-gray-300 pt-1">
                                        EMISSÃO GUARA-FOOD PDV FISCAL
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between pt-2">
                            <button
                                type="button"
                                onClick={() => setActiveTab('passo3')}
                                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold transition-all cursor-pointer"
                            >
                                &larr; Voltar para Passo 3
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('faq')}
                                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-black shadow-md transition-all flex items-center gap-2 cursor-pointer"
                            >
                                <span>Ver Perguntas & Dúvidas Frequentes</span>
                                <span>&rarr;</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: FAQ & DÚVIDAS FREQUENTES */}
            {activeTab === 'faq' && (
                <div className="space-y-4 animate-fadeIn">
                    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-2xl flex-shrink-0">
                                💡
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-gray-900">
                                    Perguntas Frequentes & Resolução de Dúvidas (FAQ Fiscal)
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">
                                    Respostas rápidas para os problemas mais comuns na emissão e impressão de NFC-e.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {/* FAQ 1 */}
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-1">
                                <h4 className="font-black text-gray-900 text-xs flex items-center gap-2">
                                    <span>❓</span>
                                    <span>Por que meu Certificado Digital precisa ser Modelo A1 e não A3?</span>
                                </h4>
                                <p className="text-xs text-gray-600 leading-relaxed pl-6">
                                    O modelo A1 é um arquivo digital que fica instalado no servidor seguro na nuvem (Nuvem Fiscal), permitindo emissão instantânea sem depender de computadores físicos ligados com pendrives ou leitores de cartão USB (A3). O modelo A3 não é compatível com sistemas modernos em nuvem.
                                </p>
                            </div>

                            {/* FAQ 2 */}
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-1">
                                <h4 className="font-black text-gray-900 text-xs flex items-center gap-2">
                                    <span>❓</span>
                                    <span>O que significa o erro 'CSC ou Token Inválido / Revogado'?</span>
                                </h4>
                                <p className="text-xs text-gray-600 leading-relaxed pl-6">
                                    Isso ocorre quando o código CSC ou o IdToken digitados diferem do que está cadastrado na SEFAZ. Verifique se copiou todos os 32 caracteres do CSC sem espaços no início ou no fim, e se o Token ID é exatamente <strong>000001</strong> ou o número cadastrado no portal SIARE.
                                </p>
                            </div>

                            {/* FAQ 3 */}
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-1">
                                <h4 className="font-black text-gray-900 text-xs flex items-center gap-2">
                                    <span>❓</span>
                                    <span>Qual a validade do CSC e do Certificado A1?</span>
                                </h4>
                                <p className="text-xs text-gray-600 leading-relaxed pl-6">
                                    O Certificado A1 possui validade de <strong>1 ano</strong>. O código CSC geralmente <strong>não expira</strong>, a menos que o contador solicite uma revogação e gere um novo código no portal da fazenda estadual.
                                </p>
                            </div>

                            {/* FAQ 4 */}
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-1">
                                <h4 className="font-black text-gray-900 text-xs flex items-center gap-2">
                                    <span>❓</span>
                                    <span>Posso imprimir tanto em impressoras de 80mm quanto de 58mm?</span>
                                </h4>
                                <p className="text-xs text-gray-600 leading-relaxed pl-6">
                                    Sim! O layout do DANFE NFC-e do GuaraFood é responsivo e se ajusta automaticamente para bobinas de <strong>80mm</strong> e <strong>58mm</strong>, garantindo legibilidade perfeita do QR Code para a leitura da câmera do celular.
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-between pt-2">
                            <button
                                type="button"
                                onClick={() => setActiveTab('passo4')}
                                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold transition-all cursor-pointer"
                            >
                                &larr; Voltar para Passo 4
                            </button>
                            {onGoToConfig && (
                                <button
                                    type="button"
                                    onClick={onGoToConfig}
                                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black shadow-md transition-all flex items-center gap-2 cursor-pointer"
                                >
                                    <span>⚙️</span>
                                    <span>Ir para Configuração Fiscal</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FiscalSetupGuide;
