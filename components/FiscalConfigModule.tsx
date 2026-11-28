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

    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(null);
    const [isLoadingRestaurants, setIsLoadingRestaurants] = useState<boolean>(true);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

    const [environment, setEnvironment] = useState<'production' | 'homologation'>(() =>
        localStorage.getItem('guara_focus_env') === 'homologation' ? 'homologation' : 'production'
    );

    // Focus NFe Tokens (Produção e Homologação)
    const [focusTokenProducao, setFocusTokenProducao] = useState<string>('');
    const [focusTokenHomologacao, setFocusTokenHomologacao] = useState<string>('');
    const [showFocusProdKey, setShowFocusProdKey] = useState<boolean>(false);
    const [showFocusHomolKey, setShowFocusHomolKey] = useState<boolean>(false);

    // Contador Credentials (CSC & IdCSC)
    const [fiscalCsc, setFiscalCsc] = useState<string>(() => localStorage.getItem('guara_fiscal_csc') || '');
    const [fiscalCscId, setFiscalCscId] = useState<string>(() => localStorage.getItem('guara_fiscal_csc_id') || '000001');
    const [showCscPassword, setShowCscPassword] = useState<boolean>(false);

    // Lojista Fiscal Registration
    const [cnpj, setCnpj] = useState<string>('');
    const [ie, setIe] = useState<string>('');
    const [im, setIm] = useState<string>('');
    const [fiscalTaxRate, setFiscalTaxRate] = useState<string>('');
    const [enableFiscal, setEnableFiscal] = useState<boolean>(true);

    // Testing state
    const [isTesting, setIsTesting] = useState<boolean>(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

    const webhookUrl =
        typeof window !== 'undefined' ? `${window.location.origin}/api/fiscal/webhook` : '/api/fiscal/webhook';

    const applyRestaurantData = (r: Restaurant) => {
        setFiscalCsc(r.fiscalCsc || localStorage.getItem('guara_fiscal_csc') || '');
        setFiscalCscId(r.fiscalCscId || localStorage.getItem('guara_fiscal_csc_id') || '000001');
        setCnpj(r.cnpj || '');
        setIe(r.ie || '');
        setIm(r.im || '');
        setFiscalTaxRate(r.fiscalTaxRate !== undefined && r.fiscalTaxRate !== null ? String(r.fiscalTaxRate) : '');
        setEnableFiscal(Boolean(r.enableFiscal));
        setEnvironment(r.fiscalEnv === 'producao' ? 'production' : 'homologation');
        setFocusTokenProducao(r.focusNfeTokenProducao || '');
        setFocusTokenHomologacao(r.focusNfeTokenHomologacao || '');
    };

    useEffect(() => {
        let isMounted = true;
        const load = async () => {
            try {
                setIsLoadingRestaurants(true);
                const list = await fetchRestaurantsSecure();
                if (!isMounted) return;
                setRestaurants(list);

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

        const cleanCnpj = cnpj.replace(/\D/g, '');
        if (enableFiscal && cleanCnpj.length !== 14) {
            addToast({ message: 'Informe um CNPJ válido com 14 dígitos para habilitar a emissão fiscal.', type: 'warning' });
            return;
        }

        if (enableFiscal && !ie.trim()) {
            addToast({ message: 'Informe a Inscrição Estadual (I.E.) do estabelecimento.', type: 'warning' });
            return;
        }

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
            localStorage.setItem('guara_focus_env', environment);
            localStorage.setItem('guara_fiscal_csc', fiscalCsc.trim());
            localStorage.setItem('guara_fiscal_csc_id', fiscalCscId.trim());

            if (selectedRestaurantId) {
                const targetRest = restaurants.find(r => r.id === selectedRestaurantId);
                const parsedTaxRate =
                    fiscalTaxRate.trim() !== ''
                        ? Math.max(0, Math.min(100, parseFloat(fiscalTaxRate.replace(',', '.')) || 0))
                        : undefined;

                const updated = await updateRestaurant(selectedRestaurantId, {
                    fiscalCsc: fiscalCsc.trim(),
                    fiscalCscId: fiscalCscId.trim(),
                    cnpj: cnpj.trim(),
                    ie: ie.trim(),
                    im: im.trim(),
                    fiscalEnv: environment === 'production' ? 'producao' : 'homologacao',
                    focusNfeTokenProducao: focusTokenProducao.trim(),
                    focusNfeTokenHomologacao: focusTokenHomologacao.trim(),
                    fiscalTaxRate: parsedTaxRate,
                    enableFiscal,
                });

                setRestaurants(prev => prev.map(r => r.id === selectedRestaurantId ? { ...r, ...updated } : r));

                const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                setLastSavedTime(nowTime);

                addToast({
                    message: `Configuração Focus NFe salva no banco de dados para ${targetRest?.name || 'o restaurante'}!`,
                    type: 'success',
                });
            }
        } catch (err: any) {
            console.error('Error saving fiscal credentials to DB:', err);
            addToast({ message: `Erro ao salvar no banco de dados: ${err.message || 'Falha de comunicação'}`, type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleTestAuth = async () => {
        const activeFocusToken = (
            environment === 'production' ? focusTokenProducao : focusTokenHomologacao
        ).trim();

        if (!activeFocusToken) {
            addToast({
                message: `Preencha o Token Focus NFe de ${environment === 'production' ? 'Produção' : 'Homologação'} antes de testar.`,
                type: 'warning',
            });
            return;
        }

        setIsTesting(true);
        setTestResult(null);

        try {
            const response = await fetch('/api/fiscal/test-focus-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiKey: activeFocusToken,
                    ambiente: environment === 'production' ? 'producao' : 'homologacao',
                    cnpj: cnpj.replace(/\D/g, '') || undefined,
                }),
            });

            const textResp = await response.text();
            let data: any = {};
            try {
                data = textResp ? JSON.parse(textResp) : {};
            } catch {
                data = {
                    error: textResp.trim().startsWith('<')
                        ? `Servidor fiscal indisponível neste endereço (HTTP ${response.status}).`
                        : textResp,
                };
            }

            if (response.ok && data.success) {
                setTestResult({
                    success: true,
                    message: data.message,
                    details: data.empresa || undefined,
                });
                addToast({ message: 'Conexão Focus NFe & SEFAZ validada com sucesso!', type: 'success' });
            } else {
                const fallbackErr =
                    response.status === 404 || response.status === 405
                        ? `Endpoint fiscal (/api/fiscal/test-focus-token) não respondeu no servidor (HTTP ${response.status}).`
                        : 'Token da Focus NFe inválido para o ambiente selecionado.';
                const errMsg = data.error || data.mensagem || fallbackErr;
                setTestResult({
                    success: false,
                    message: errMsg,
                    details: data.details,
                });
                addToast({ message: errMsg, type: 'error' });
            }
        } catch (err: any) {
            console.error('Error testing Focus NFe connection:', err);
            setTestResult({
                success: false,
                message: err.message || 'Erro de rede ao validar credenciais com o servidor.',
            });
            addToast({ message: 'Erro ao testar conexão com a Focus NFe.', type: 'error' });
        } finally {
            setIsTesting(false);
        }
    };

    const handleCopyWebhook = () => {
        navigator.clipboard.writeText(webhookUrl);
        addToast({ message: 'URL do Webhook Focus NFe copiada!', type: 'success' });
    };

    const currentRestName = restaurants.find(r => r.id === selectedRestaurantId)?.name || 'Selecione um restaurante';

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Header / Intro */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-2 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-blue-500/30 border border-blue-400/40 text-blue-200 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                            Módulo Oficial Focus NFe & SEFAZ
                        </span>
                        <span className="bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            NFC-e Modelo 65
                        </span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Configuração Fiscal Centralizada (Focus NFe)</h2>
                    <p className="text-xs text-blue-100 leading-relaxed">
                        Gerencie exclusivamente por aqui a emissão de NFC-e dos estabelecimentos via <strong>Focus NFe</strong>: ative o módulo fiscal, defina CNPJ, Inscrição Estadual, <strong>CSC / IdCSC</strong> e os <strong>Tokens da API Focus NFe</strong> (Produção e Homologação).
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row md:flex-col items-center md:items-end gap-3 flex-shrink-0">
                    <div className="bg-white/10 border border-white/20 backdrop-blur-md p-4 rounded-2xl text-center w-full">
                        <span className="text-2xl block mb-1">⚡🧾</span>
                        <span className="text-xs font-black uppercase text-blue-200">Emissor Único Focus NFe</span>
                        <span className="text-[10px] block text-purple-200 font-semibold">Gestão exclusiva Super Admin</span>
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
                        <span>{showInlineGuide ? 'Ocultar Guia Passo a Passo' : 'Ver Guia Passo a Passo Focus NFe'}</span>
                    </button>
                </div>
            </div>

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

            {/* Quick Action Guide */}
            <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 border border-purple-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-md">
                            🧾
                        </div>
                        <div>
                            <h3 className="text-base font-black text-purple-950">
                                Requisitos no Painel da Focus NFe + Contador
                            </h3>
                            <p className="text-xs text-purple-700">
                                Certifique-se de que o Certificado A1 (.pfx) e o CSC estejam cadastrados tanto na Focus NFe quanto abaixo
                            </p>
                        </div>
                    </div>
                    <span className="bg-purple-200/80 text-purple-900 border border-purple-300 text-[11px] font-black uppercase px-3 py-1 rounded-full">
                        SEFAZ NFC-e v4.00
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl border border-purple-100 shadow-2xs space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-black flex items-center justify-center">1</span>
                            <span className="text-xs font-black text-gray-900 uppercase tracking-wider">IdCSC e Código CSC</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                            O <strong>IdCSC</strong> (ex: <code className="bg-purple-100 px-1 py-0.5 rounded font-mono text-purple-900 font-bold">000001</code>) e o <strong>CSC</strong> vêm do portal da SEFAZ via contador e devem estar idênticos no cadastro da empresa na Focus NFe.
                        </p>
                    </div>

                    <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl border border-purple-100 shadow-2xs space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">2</span>
                            <span className="text-xs font-black text-gray-900 uppercase tracking-wider">Token Produção vs Homologação</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                            Na Focus NFe cada ambiente possui seu próprio token. Cole cada um no respectivo campo abaixo para alternar com segurança.
                        </p>
                    </div>

                    <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl border border-purple-100 shadow-2xs space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center">3</span>
                            <span className="text-xs font-black text-gray-900 uppercase tracking-wider">Webhook Automático</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                            Configure este callback na Focus NFe para receber autorizações, cancelamentos e XMLs automaticamente:
                        </p>
                        <button
                            type="button"
                            onClick={handleCopyWebhook}
                            className="w-full text-left bg-emerald-50 hover:bg-emerald-100 p-2 rounded-xl text-[10px] font-mono text-emerald-900 border border-emerald-200 truncate font-bold cursor-pointer"
                            title={webhookUrl}
                        >
                            📋 {webhookUrl}
                        </button>
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
                            <span>Estabelecimento / Restaurante</span>
                        </h3>
                        <p className="text-xs text-gray-500">Selecione a loja cujas credenciais Focus NFe serão configuradas.</p>
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
                    {/* Toggle Ativação */}
                    <label className="flex items-center justify-between cursor-pointer p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200">
                        <div>
                            <span className="text-xs font-black uppercase tracking-wider text-emerald-950 block">
                                Ativar Emissão de NFC-e (Focus NFe) para {currentRestName}
                            </span>
                            <span className="text-[11px] text-emerald-800 block mt-0.5">
                                Exibe os botões de Cupom Fiscal / Ver Nota (XML & DANFE) no PDV e habilita o Painel do Contador deste restaurante.
                            </span>
                        </div>
                        <div className="relative flex-shrink-0 ml-4">
                            <input
                                type="checkbox"
                                checked={enableFiscal}
                                onChange={(e) => setEnableFiscal(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                        </div>
                    </label>

                    {/* SECTION 1: DADOS DO CONTADOR & ESTABELECIMENTO */}
                    <div className="space-y-4 bg-purple-50/50 p-5 rounded-2xl border border-purple-100">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black uppercase tracking-wider text-purple-900 flex items-center gap-2">
                                <span>🔑</span>
                                <span>1. Dados Fiscais da Empresa & Credenciais SEFAZ (CSC)</span>
                            </h4>
                            <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2.5 py-1 rounded-full uppercase">
                                Obrigatório para NFC-e
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            </div>

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
                                <input
                                    type={showCscPassword ? 'text' : 'password'}
                                    value={fiscalCsc}
                                    onChange={(e) => setFiscalCsc(e.target.value)}
                                    placeholder="Ex: 3506d724cc86cb31674657778b14aa47"
                                    className="w-full p-3.5 bg-white border border-purple-200 rounded-2xl text-xs font-mono font-bold text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none shadow-2xs"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
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
                                    Alíquota Imposto (%)
                                </label>
                                <input
                                    type="text"
                                    value={fiscalTaxRate}
                                    onChange={(e) => setFiscalTaxRate(e.target.value)}
                                    placeholder="Ex: 6.0"
                                    className="w-full p-3 bg-white border border-gray-200 rounded-2xl text-xs font-mono font-bold text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1.5">
                                    Ambiente Focus NFe / SEFAZ
                                </label>
                                <select
                                    value={environment}
                                    onChange={(e) => setEnvironment(e.target.value as 'production' | 'homologation')}
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
                                <span>2. Credenciais API Focus NFe (Emissão Exclusiva NFC-e)</span>
                            </h4>
                            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2.5 py-1 rounded-full uppercase">
                                Focus NFe v2
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className={`p-4 rounded-2xl border ${environment === 'production' ? 'bg-white border-emerald-400 ring-2 ring-emerald-200' : 'bg-white/80 border-blue-200'}`}>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="block text-xs font-black text-emerald-900 uppercase tracking-wider">
                                        Token Produção (Notas Reais)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowFocusProdKey(!showFocusProdKey)}
                                        className="text-[11px] text-blue-700 font-bold hover:underline cursor-pointer"
                                    >
                                        {showFocusProdKey ? 'Ocultar' : 'Exibir'}
                                    </button>
                                </div>
                                <input
                                    type={showFocusProdKey ? 'text' : 'password'}
                                    value={focusTokenProducao}
                                    onChange={(e) => setFocusTokenProducao(e.target.value)}
                                    placeholder="Cole aqui o Token de PRODUÇÃO da Focus NFe"
                                    className="w-full p-3 bg-white border border-blue-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none shadow-2xs"
                                />
                                <p className="text-[10px] text-gray-500 mt-1.5">
                                    Usado quando Ambiente = <strong>Produção</strong> (<code className="font-mono">api.focusnfe.com.br</code>).
                                </p>
                            </div>

                            <div className={`p-4 rounded-2xl border ${environment === 'homologation' ? 'bg-white border-amber-400 ring-2 ring-amber-200' : 'bg-white/80 border-blue-200'}`}>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="block text-xs font-black text-amber-900 uppercase tracking-wider">
                                        Token Homologação (Testes)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowFocusHomolKey(!showFocusHomolKey)}
                                        className="text-[11px] text-blue-700 font-bold hover:underline cursor-pointer"
                                    >
                                        {showFocusHomolKey ? 'Ocultar' : 'Exibir'}
                                    </button>
                                </div>
                                <input
                                    type={showFocusHomolKey ? 'text' : 'password'}
                                    value={focusTokenHomologacao}
                                    onChange={(e) => setFocusTokenHomologacao(e.target.value)}
                                    placeholder="Cole aqui o Token de HOMOLOGAÇÃO da Focus NFe"
                                    className="w-full p-3 bg-white border border-blue-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:ring-2 focus:ring-amber-500 outline-none shadow-2xs"
                                />
                                <p className="text-[10px] text-gray-500 mt-1.5">
                                    Usado quando Ambiente = <strong>Homologação</strong> (<code className="font-mono">homologacao.focusnfe.com.br</code>).
                                </p>
                            </div>
                        </div>
                    </div>

                    {testResult && (
                        <div className={`p-4 rounded-2xl border flex items-start gap-3 animate-fadeIn ${testResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
                            <span className="text-xl">{testResult.success ? '✅' : '❌'}</span>
                            <div className="space-y-1 text-xs min-w-0 flex-1">
                                <p className="font-bold">{testResult.message}</p>
                                {testResult.details && (
                                    <pre className="text-[10px] bg-white/80 p-2 rounded-lg font-mono overflow-x-auto">
                                        {JSON.stringify(testResult.details, null, 2)}
                                    </pre>
                                )}
                            </div>
                        </div>
                    )}

                    {lastSavedTime && (
                        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-bold">
                            <span>✅</span>
                            <span>Credenciais gravadas no Banco de Dados Supabase às {lastSavedTime} para <strong>{currentRestName}</strong>.</span>
                        </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            disabled={isTesting}
                            onClick={handleTestAuth}
                            className="px-5 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                            <span>{isTesting ? '⏳' : '⚡'}</span>
                            <span>{isTesting ? 'Validando na Focus NFe...' : 'Testar Token Focus NFe & SEFAZ'}</span>
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
                        <p className="text-xs text-gray-500">Volume de notas fiscais transmitidas e autorizadas pela SEFAZ através da Focus NFe.</p>
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
