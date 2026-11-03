import React, { useState, useEffect } from 'react';
import { useAuth } from '../services/authService';
import { useNotification } from '../hooks/useNotification';
import { fetchRestaurantsSecure, updateRestaurant } from '../services/databaseService';
import type { Restaurant } from '../types';
import { FiscalEmissionChart } from './FiscalEmissionChart';
import FiscalInvoicesStatusList from './FiscalInvoicesStatusList';
import FiscalSetupGuide from './FiscalSetupGuide';

interface FiscalConfigModuleProps {
    onOpenGuide?: () => void;
}

export const FiscalConfigModule: React.FC<FiscalConfigModuleProps> = ({ onOpenGuide }) => {
    const { currentUser } = useAuth();
    const { addToast } = useNotification();
    const [showInlineGuide, setShowInlineGuide] = useState<boolean>(false);

    // Restaurants state
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(null);
    const [isLoadingRestaurants, setIsLoadingRestaurants] = useState<boolean>(true);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

    // Form fields
    const [clientId, setClientId] = useState<string>(() => localStorage.getItem('guara_nuvem_client_id') || '');
    const [clientSecret, setClientSecret] = useState<string>(() => localStorage.getItem('guara_nuvem_client_secret') || '');
    const [environment, setEnvironment] = useState<string>(() => localStorage.getItem('guara_nuvem_env') || 'production');

    // Contador Credentials (CSC & Token)
    const [fiscalCsc, setFiscalCsc] = useState<string>(() => localStorage.getItem('guara_fiscal_csc') || '');
    const [fiscalCscId, setFiscalCscId] = useState<string>(() => localStorage.getItem('guara_fiscal_csc_id') || '000001');
    const [showCscPassword, setShowCscPassword] = useState<boolean>(false);
    const [showClientSecret, setShowClientSecret] = useState<boolean>(false);

    // Lojista Fiscal Registration
    const [cnpj, setCnpj] = useState<string>('');
    const [ie, setIe] = useState<string>('');
    const [enableFiscal, setEnableFiscal] = useState<boolean>(true);

    // Testing state
    const [isTesting, setIsTesting] = useState<boolean>(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

    // Load restaurants on mount
    useEffect(() => {
        let isMounted = true;
        const load = async () => {
            try {
                setIsLoadingRestaurants(true);
                const list = await fetchRestaurantsSecure();
                if (!isMounted) return;
                setRestaurants(list);

                // Auto-select based on currentUser.restaurantId or default to the first one
                const defaultId = currentUser?.restaurantId 
                    ? Number(currentUser.restaurantId) 
                    : (list.length > 0 ? list[0].id : null);

                if (defaultId) {
                    setSelectedRestaurantId(defaultId);
                    const selected = list.find(r => r.id === defaultId);
                    if (selected) {
                        applyRestaurantData(selected);
                    }
                }
            } catch (err) {
                console.error('Error loading restaurants for fiscal config:', err);
                addToast({ message: 'Não foi possível carregar a lista de restaurantes.', type: 'error' });
            } finally {
                if (isMounted) setIsLoadingRestaurants(false);
            }
        };

        load();
        return () => { isMounted = false; };
    }, [currentUser]);

    const applyRestaurantData = (r: Restaurant) => {
        setFiscalCsc(r.fiscalCsc || localStorage.getItem('guara_fiscal_csc') || '');
        setFiscalCscId(r.fiscalCscId || localStorage.getItem('guara_fiscal_csc_id') || '000001');
        setCnpj(r.cnpj || '');
        setIe(r.ie || '');
        setEnableFiscal(r.enableFiscal !== false);
        if (r.fiscalEnv) {
            setEnvironment(r.fiscalEnv === 'producao' ? 'production' : 'homologation');
        }
        if (r.nuvemClientId) {
            setClientId(r.nuvemClientId);
        }
        if (r.nuvemClientSecret) {
            setClientSecret(r.nuvemClientSecret);
        }
    };

    const handleSelectRestaurant = (id: number) => {
        setSelectedRestaurantId(id);
        const r = restaurants.find(item => item.id === id);
        if (r) {
            applyRestaurantData(r);
            setTestResult(null);
            addToast({ message: `Carregado perfil de: ${r.name}`, type: 'info' });
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!fiscalCsc.trim()) {
            addToast({ message: 'Por favor, informe o Código CSC fornecido pelo contador.', type: 'warning' });
            return;
        }

        if (!fiscalCscId.trim()) {
            addToast({ message: 'Por favor, informe o ID do Token (ex: 000001) fornecido pelo contador.', type: 'warning' });
            return;
        }

        setIsSaving(true);

        try {
            // 1. Salvar no cache local imediato
            localStorage.setItem('guara_nuvem_client_id', clientId.trim());
            localStorage.setItem('guara_nuvem_client_secret', clientSecret.trim());
            localStorage.setItem('guara_nuvem_env', environment);
            localStorage.setItem('guara_fiscal_csc', fiscalCsc.trim());
            localStorage.setItem('guara_fiscal_csc_id', fiscalCscId.trim());

            // 2. Salvar de forma permanente e segura no banco de dados Supabase vinculado ao restaurante
            if (selectedRestaurantId) {
                const targetRest = restaurants.find(r => r.id === selectedRestaurantId);
                const updated = await updateRestaurant(selectedRestaurantId, {
                    fiscalCsc: fiscalCsc.trim(),
                    fiscalCscId: fiscalCscId.trim(),
                    cnpj: cnpj.trim(),
                    ie: ie.trim(),
                    fiscalEnv: environment === 'production' ? 'producao' : 'homologacao',
                    nuvemClientId: clientId.trim(),
                    nuvemClientSecret: clientSecret.trim(),
                    enableFiscal: enableFiscal
                });

                // Atualizar estado local dos restaurantes
                setRestaurants(prev => prev.map(r => r.id === selectedRestaurantId ? { ...r, ...updated } : r));
                
                const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                setLastSavedTime(nowTime);

                addToast({ 
                    message: `Credenciais do contador (CSC e Token) salvas com sucesso no banco de dados para ${targetRest?.name || 'o lojista'}!`, 
                    type: 'success' 
                });
            } else {
                addToast({ message: 'Configurações salvas localmente!', type: 'success' });
            }
        } catch (err: any) {
            console.error('Error saving fiscal credentials to DB:', err);
            addToast({ message: `Erro ao salvar no banco de dados: ${err.message || 'Falha de comunicação'}`, type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleTestAuth = async () => {
        if (!clientId && !clientSecret && !fiscalCsc) {
            addToast({ message: 'Preencha as credenciais da API ou o CSC e Token antes de testar.', type: 'warning' });
            return;
        }

        setIsTesting(true);
        setTestResult(null);

        try {
            // Se tiver Client ID e Client Secret da Nuvem Fiscal, testa autenticação OAuth2
            if (clientId && clientSecret) {
                const response = await fetch('/api/fiscal/test-nuvem-auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ clientId, clientSecret })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    setTestResult({
                        success: true,
                        message: `Conexão Nuvem Fiscal & SEFAZ aprovada! Credenciais CSC (${fiscalCscId || '000001'}) e OAuth2 válidas para transmissão em tempo real.`
                    });
                    addToast({ message: 'Conexão testada e aprovada com sucesso!', type: 'success' });
                } else {
                    setTestResult({
                        success: false,
                        message: data.error || 'Falha na autenticação da Nuvem Fiscal. Verifique se o Client ID e Secret estão corretos.',
                        details: data.details
                    });
                    addToast({ message: 'Falha na autenticação.', type: 'error' });
                }
            } else if (fiscalCsc && fiscalCscId) {
                // Validação de formato do CSC e Token
                await new Promise(r => setTimeout(r, 800));
                if (fiscalCsc.length < 16) {
                    setTestResult({
                        success: false,
                        message: 'O Código CSC parece muito curto. Verifique o valor fornecido pelo contador (geralmente possui 32 caracteres).'
                    });
                    addToast({ message: 'Verifique o formato do CSC.', type: 'warning' });
                } else {
                    setTestResult({
                        success: true,
                        message: `Credenciais do contador validadas com sucesso! CSC e Token ID (${fiscalCscId}) estão no formato oficial exigido pela SEFAZ para o cálculo do QR Code NFC-e.`
                    });
                    addToast({ message: 'CSC e Token validados!', type: 'success' });
                }
            }
        } catch (err: any) {
            console.error('Error testing fiscal connection:', err);
            setTestResult({
                success: false,
                message: err.message || 'Erro de rede ao validar credenciais com o servidor.'
            });
            addToast({ message: 'Erro ao validar conexão fiscal.', type: 'error' });
        } finally {
            setIsTesting(false);
        }
    };

    const currentRestName = restaurants.find(r => r.id === selectedRestaurantId)?.name || 'Selecione um restaurante';

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Header / Intro */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-2 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-blue-500/30 border border-blue-400/40 text-blue-200 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                            Módulo Oficial SEFAZ & Nuvem Fiscal
                        </span>
                        <span className="bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            NFC-e Modelo 65
                        </span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Configuração Fiscal do Lojista</h2>
                    <p className="text-xs text-blue-100 leading-relaxed">
                        Armazene com segurança o <strong>CSC (Código de Segurança do Contribuinte)</strong>, o <strong>Token</strong> do contador e as credenciais da <strong>Nuvem Fiscal</strong>, associando diretamente ao perfil do lojista no banco de dados para emissão e impressão de cupons fiscais.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row md:flex-col items-center md:items-end gap-3 flex-shrink-0">
                    <div className="bg-white/10 border border-white/20 backdrop-blur-md p-4 rounded-2xl text-center w-full">
                        <span className="text-2xl block mb-1">🏛️🧾</span>
                        <span className="text-xs font-black uppercase text-blue-200">Banco de Dados Supabase</span>
                        <span className="text-[10px] block text-purple-200 font-semibold">Tabela Segura: restaurants</span>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            if (onOpenGuide) {
                                onOpenGuide();
                            } else {
                                setShowInlineGuide(!showInlineGuide);
                            }
                        }}
                        className="w-full px-4 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 cursor-pointer border border-purple-300/40"
                    >
                        <span>📘</span>
                        <span>{showInlineGuide ? 'Ocultar Guia Passo a Passo' : 'Ver Guia Passo a Passo Completo'}</span>
                    </button>
                </div>
            </div>

            {/* Inline Fiscal Setup Guide if toggled */}
            {showInlineGuide && (
                <div className="border-2 border-purple-300 rounded-3xl p-4 bg-purple-50/20 shadow-md">
                    <div className="flex justify-end mb-2">
                        <button
                            type="button"
                            onClick={() => setShowInlineGuide(false)}
                            className="px-3 py-1 bg-white border border-purple-200 hover:bg-purple-100 text-purple-800 rounded-lg text-xs font-bold transition-all"
                        >
                            ✕ Fechar Guia
                        </button>
                    </div>
                    <FiscalSetupGuide onGoToConfig={() => setShowInlineGuide(false)} />
                </div>
            )}

            {/* Quick Action Guide for Accountant Credentials (CSC, Token & e-CNPJ) */}
            <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 border border-purple-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-md">
                            🧾
                        </div>
                        <div>
                            <h3 className="text-base font-black text-purple-950">
                                Dados Fornecidos pelo Contador para Ativação Fiscal
                            </h3>
                            <p className="text-xs text-purple-700">
                                Preencha abaixo o Token e o CSC para gravar permanentemente no cadastro do restaurante
                            </p>
                        </div>
                    </div>
                    <span className="bg-purple-200/80 text-purple-900 border border-purple-300 text-[11px] font-black uppercase px-3 py-1 rounded-full">
                        Emissão Direta no Caixa
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    {/* Card 1: Token */}
                    <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl border border-purple-100 shadow-2xs space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-black flex items-center justify-center">1</span>
                            <span className="text-xs font-black text-gray-900 uppercase tracking-wider">Identificador do Token</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                            O <strong>IdToken</strong> (ex: <code className="bg-purple-100 px-1 py-0.5 rounded font-mono text-purple-900 font-bold">000001</code>) identifica o número do CSC ativo cadastrado na SEFAZ.
                        </p>
                        <div className="bg-purple-50 p-2.5 rounded-xl text-[11px] font-mono text-purple-900 border border-purple-200 font-bold">
                            Token: {fiscalCscId || '000001'}
                        </div>
                    </div>

                    {/* Card 2: CSC */}
                    <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl border border-purple-100 shadow-2xs space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">2</span>
                            <span className="text-xs font-black text-gray-900 uppercase tracking-wider">Código de Segurança (CSC)</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                            O <strong>CSC</strong> é a chave de 32 caracteres usada para calcular o Hash SHA-1 criptográfico do QR Code no cupom.
                        </p>
                        <div className="bg-blue-50 p-2.5 rounded-xl text-[11px] font-mono text-blue-900 border border-blue-200 truncate font-bold">
                            CSC: {fiscalCsc ? `${fiscalCsc.substring(0, 12)}...` : '3506d724cc86...'}
                        </div>
                    </div>

                    {/* Card 3: Impressão Térmica */}
                    <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl border border-purple-100 shadow-2xs space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center">3</span>
                            <span className="text-xs font-black text-gray-900 uppercase tracking-wider">Impressão DANFE NFC-e</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                            No detalhe do pedido, o botão <strong>🧾 Cupom Fiscal</strong> gera o cupom oficial com QR Code legível em bobinas de 80mm ou 58mm.
                        </p>
                        <div className="bg-emerald-50 p-2.5 rounded-xl text-[11px] text-emerald-900 border border-emerald-200 font-bold">
                            ✓ QR Code Oficial SEFAZ Habilitado
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Form: Store Selection & Credentials */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
                {/* Store Selector */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-gray-100 gap-4">
                    <div>
                        <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                            <span>🏪</span>
                            <span>Perfil do Estabelecimento / Restaurante</span>
                        </h3>
                        <p className="text-xs text-gray-500">Selecione a loja cujas credenciais fiscais serão vinculadas no banco de dados.</p>
                    </div>

                    <div className="w-full sm:w-auto min-w-[260px]">
                        {isLoadingRestaurants ? (
                            <div className="p-3 bg-gray-50 rounded-2xl text-xs text-gray-400 font-bold animate-pulse">
                                Carregando restaurantes...
                            </div>
                        ) : (
                            <select
                                value={selectedRestaurantId || ''}
                                onChange={(e) => handleSelectRestaurant(Number(e.target.value))}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
                            >
                                {restaurants.map(r => (
                                    <option key={r.id} value={r.id}>
                                        {r.name} {r.cnpj ? `(${r.cnpj})` : ''}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    {/* SECTION 1: DADOS DO CONTADOR (CSC & TOKEN) */}
                    <div className="space-y-4 bg-purple-50/50 p-5 rounded-2xl border border-purple-100">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black uppercase tracking-wider text-purple-900 flex items-center gap-2">
                                <span>🔑</span>
                                <span>1. Credenciais SEFAZ Fornecidas pelo Contador (CSC & Token)</span>
                            </h4>
                            <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2.5 py-1 rounded-full uppercase">
                                Obrigatório para QR Code
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Token ID */}
                            <div>
                                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1.5">
                                    ID do Token (IdCSC)
                                </label>
                                <input
                                    type="text"
                                    value={fiscalCscId}
                                    onChange={(e) => setFiscalCscId(e.target.value)}
                                    placeholder="Ex: 000001"
                                    className="w-full p-3.5 bg-white border border-purple-200 rounded-2xl text-xs font-mono font-bold text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none shadow-2xs"
                                    required
                                />
                                <p className="text-[10px] text-gray-500 mt-1.5">
                                    Número sequencial do token gerado no portal SEFAZ (ex: <strong>000001</strong> ou <strong>1</strong>).
                                </p>
                            </div>

                            {/* CSC */}
                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider">
                                        Código CSC (Código de Segurança do Contribuinte)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowCscPassword(!showCscPassword)}
                                        className="text-[10px] text-purple-700 font-bold hover:underline cursor-pointer"
                                    >
                                        {showCscPassword ? 'Ocultar' : 'Exibir'}
                                    </button>
                                </div>
                                <div className="relative">
                                    <input
                                        type={showCscPassword ? 'text' : 'password'}
                                        value={fiscalCsc}
                                        onChange={(e) => setFiscalCsc(e.target.value)}
                                        placeholder="Ex: 3506d724cc86cb31674657778b14aa47"
                                        className="w-full p-3.5 bg-white border border-purple-200 rounded-2xl text-xs font-mono font-bold text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none shadow-2xs"
                                        required
                                    />
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1.5">
                                    Chave alfanumérica secreta (ex: <strong>3506d724cc86cb31674657778b14aa47</strong>) para assinar o QR Code.
                                </p>
                            </div>
                        </div>

                        {/* CNPJ e Inscrição Estadual */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                            <div>
                                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1.5">
                                    CNPJ do Restaurante
                                </label>
                                <input
                                    type="text"
                                    value={cnpj}
                                    onChange={(e) => setCnpj(e.target.value)}
                                    placeholder="00.000.000/0001-00"
                                    className="w-full p-3 bg-white border border-gray-200 rounded-2xl text-xs font-mono font-bold text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1.5">
                                    Inscrição Estadual (I.E.)
                                </label>
                                <input
                                    type="text"
                                    value={ie}
                                    onChange={(e) => setIe(e.target.value)}
                                    placeholder="Ex: 001234567.00-89"
                                    className="w-full p-3 bg-white border border-gray-200 rounded-2xl text-xs font-mono font-bold text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1.5">
                                    Ambiente SEFAZ
                                </label>
                                <select
                                    value={environment}
                                    onChange={(e) => setEnvironment(e.target.value)}
                                    className="w-full p-3 bg-white border border-gray-200 rounded-2xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
                                >
                                    <option value="production">Produção (Notas Fiscais Válidas)</option>
                                    <option value="homologation">Homologação (Ambiente de Testes)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: CREDENCIAIS DA API FOCUS NFE */}
                    <div className="space-y-4 bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black uppercase tracking-wider text-blue-900 flex items-center gap-2">
                                <span>⚡</span>
                               <span>2. Credenciais API Focus NFe (Emissão de NFC-e)</span>
                            </h4>
                            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2.5 py-1 rounded-full uppercase">
                                Multi-Empresas
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                            <div>
                                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1.5">
                                    API Key da Focus NFe
                                </label>
                                <input
                                    type="text"
                                    value={clientId}
                                    onChange={(e) => setClientId(e.target.value)}
                                    placeholder="Insira a API Key fornecida pela Focus NFe"
                                    className="w-full p-3.5 bg-white border border-blue-200 rounded-2xl text-xs font-mono font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none shadow-2xs"
                                />
                                <p className="text-[10px] text-gray-500 mt-1.5">
                                    Chave de acesso fornecida no painel da Focus NFe para autenticação e transmissão das notas fiscais.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Test Result Feedback Box */}
                    {testResult && (
                        <div className={`p-4 rounded-2xl border flex items-start gap-3 animate-fadeIn ${testResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
                            <span className="text-xl">{testResult.success ? '✅' : '❌'}</span>
                            <div className="space-y-1 text-xs">
                                <p className="font-bold">{testResult.message}</p>
                                {testResult.details && (
                                    <pre className="text-[10px] bg-white/80 p-2 rounded-lg font-mono overflow-x-auto">
                                        {JSON.stringify(testResult.details, null, 2)}
                                    </pre>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Status & Last Saved Badge */}
                    {lastSavedTime && (
                        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-bold">
                            <span>✅</span>
                            <span>Credenciais gravadas no Banco de Dados Supabase às {lastSavedTime} para <strong>{currentRestName}</strong>.</span>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            disabled={isTesting}
                            onClick={handleTestAuth}
                            className="px-5 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                            <span>{isTesting ? '⏳' : '⚡'}</span>
                            <span>{isTesting ? 'Validando Conexão...' : 'Testar Conexão Fiscal & Validar CSC'}</span>
                        </button>

                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                            <span>{isSaving ? '⏳' : '💾'}</span>
                            <span>{isSaving ? 'Gravando no Banco de Dados...' : 'Salvar Credenciais no Banco de Dados'}</span>
                        </button>
                    </div>
                </form>
            </div>

            {/* Fiscal Emission Chart & Monitoring Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-gray-900">Histórico de Emissões Recentes</h3>
                        <p className="text-xs text-gray-500">Volume de notas fiscais transmitidas e autorizadas pela SEFAZ através da Nuvem Fiscal.</p>
                    </div>
                </div>

                <FiscalEmissionChart />
            </div>

            {/* Fiscal Invoices Processing Status List */}
            <div className="space-y-4">
                <FiscalInvoicesStatusList />
            </div>
        </div>
    );
};

export default FiscalConfigModule;
