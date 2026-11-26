import React, { useState } from 'react';
import { APP_VERSION } from './VersionChecker';

interface GuideSection {
    id: string;
    title: string;
    icon: string;
    category: 'Iniciante' | 'Salão & Mesas' | 'Cardápio & Vendas' | 'Financeiro & Fiscal' | 'Avançado';
    summary: string;
    content: React.ReactNode;
}

export const GuaraFoodMasterGuide: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState<string>('visao-geral');
    const [searchQuery, setSearchQuery] = useState<string>('');

    const sections: GuideSection[] = [
        {
            id: 'visao-geral',
            title: '1. Visão Geral & Ecossistema',
            icon: '🌟',
            category: 'Iniciante',
            summary: 'Conheça o GuaráFood, o sistema definitivo para restaurantes, pizzarias, lanchonetes e bares.',
            content: (
                <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
                    <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 text-white p-6 sm:p-8 rounded-3xl shadow-lg">
                        <span className="bg-white/20 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full mb-3 inline-block">
                            Manual Oficial • v{APP_VERSION}
                        </span>
                        <h3 className="text-2xl sm:text-3xl font-black mb-2">Bem-vindo ao GuaráFood Masterclass</h3>
                        <p className="text-orange-100 text-xs sm:text-sm leading-relaxed">
                            Este guia foi elaborado para lojistas, gerentes e equipes operacionais. Aqui você aprenderá a extrair 100% da potência do GuaráFood, automatizando seu salão, delivery, emissão fiscal e controle financeiro.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                            <span className="text-2xl">⚡</span>
                            <h4 className="font-black text-gray-900 text-base">Velocidade Extrema</h4>
                            <p className="text-xs text-gray-600">
                                Operação em tempo real otimizada para smartphones, tablets e computadores, com sincronização automática e funcionamento offline resiliente.
                            </p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                            <span className="text-2xl">🏛️</span>
                            <h4 className="font-black text-gray-900 text-base">Conformidade Fiscal</h4>
                            <p className="text-xs text-gray-600">
                                Emissão integrada de NFC-e (Modelo 65) com QR Code oficial SEFAZ e portal dedicado para o contador da empresa.
                            </p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                            <span className="text-2xl">👥</span>
                            <h4 className="font-black text-gray-900 text-base">Multiusuários & RBAC</h4>
                            <p className="text-xs text-gray-600">
                                Controle de acesso por perfis (Admin, Gerente, Garçom, Cozinha, Atendente e Contador) com restrição opcional de dados financeiros.
                            </p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'pedidos',
            title: '2. Gestão de Pedidos & Cozinha (KDS)',
            icon: '📦',
            category: 'Iniciante',
            summary: 'Como gerenciar novos pedidos, alterar status, imprimir na cozinha e notificar clientes.',
            content: (
                <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
                    <div className="bg-orange-50 border border-orange-200 p-5 rounded-2xl space-y-3">
                        <h4 className="font-black text-orange-900 text-base flex items-center gap-2">
                            <span>🚀</span>
                            <span>O Fluxo do Pedido no Painel Lojista</span>
                        </h4>
                        <p className="text-xs text-orange-800 leading-relaxed">
                            O painel de pedidos divide-se entre <strong>Pedidos Ativos</strong> (Novos, Preparando, A Caminho) e <strong>Histórico</strong> (Entregues e Cancelados). Cada pedido possui um alerta sonoro customizável e botões de atalho rápidos.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                            <h5 className="font-black text-gray-900 text-sm flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">1</span>
                                <span>Recebimento e Aceite ("Novo Pedido")</span>
                            </h5>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                Quando o cliente finaliza o pedido (seja via Pix automático do Mercado Pago ou retirada), o card do pedido pisca em azul na coluna <em>Novo Pedido</em>. Ao aceitar, o pedido avança para <em>Em Preparo</em> e dispara automaticamente para a impressora da cozinha.
                            </p>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                            <h5 className="font-black text-gray-900 text-sm flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">2</span>
                                <span>Impressão Automática e Cozinha</span>
                            </h5>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                O sistema envia comandas formatadas para impressoras térmicas (suporta larguras de 80mm e 58mm com fontes otimizadas). Você pode configurar se o pedido sai automaticamente no momento do recebimento.
                            </p>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                            <h5 className="font-black text-gray-900 text-sm flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">3</span>
                                <span>Despacho e Conclusão</span>
                            </h5>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                Ao despachar para entrega, mude para <em>A Caminho</em>. Assim que o entregador retornar ou o cliente retirar no balcão, marque como <em>Entregue</em> para mover o pedido ao histórico financeiro.
                            </p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'mesas',
            title: '3. Salão: Mesas, Comandas & Garçons',
            icon: '🪑',
            category: 'Salão & Mesas',
            summary: 'Atendimento de salão ágil, login por PIN de garçom, divisão de contas e comandas individuais.',
            content: (
                <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
                    <div className="bg-purple-50 border border-purple-200 p-5 rounded-2xl space-y-3">
                        <h4 className="font-black text-purple-900 text-base flex items-center gap-2">
                            <span>🍽️</span>
                            <span>Revolucione o Atendimento do Seu Salão</span>
                        </h4>
                        <p className="text-xs text-purple-800 leading-relaxed">
                            O GuaraFood possui um módulo de salão completo. Garçons utilizam o celular para abrir mesas, lançar produtos e enviar para a cozinha sem precisar ir até o caixa.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                            <span className="text-xl">🔐</span>
                            <h5 className="font-black text-gray-900 text-sm">Modo Garçom &amp; PIN</h5>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                Garçons acessam o sistema com um PIN numérico individual de 4 dígitos. Cada item lançado fica associado ao garçom responsável pelo atendimento.
                            </p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                            <span className="text-xl">🧾</span>
                            <h5 className="font-black text-gray-900 text-sm">Múltiplas Comandas por Mesa</h5>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                Permite abrir várias subcomandas na mesma mesa (ex: Comanda do João, Comanda da Maria), facilitando o fechamento individual e evitando conflitos na hora de pagar.
                            </p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                            <span className="text-xl">🖨️</span>
                            <h5 className="font-black text-gray-900 text-sm">Envio Inteligente de Rodadas</h5>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                Ao adicionar novos itens em uma mesa já aberta e clicar em enviar, o sistema envia para a cozinha <strong>apenas os itens novos da rodada</strong>, sem duplicar o que já foi impresso antes.
                            </p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                            <span className="text-xl">💳</span>
                            <h5 className="font-black text-gray-900 text-sm">Divisão de Pagamento</h5>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                O caixa pode fechar a conta aceitando múltiplos pagamentos parciais (ex: parte em Pix, parte em cartão, parte em dinheiro) até zerar o saldo da mesa.
                            </p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'cardapio',
            title: '4. Cardápio, Complementos & Venda por Peso',
            icon: '🍕',
            category: 'Cardápio & Vendas',
            summary: 'Como criar categorias, itens com adicionais obrigatórios/opcionais e pratos por quilo.',
            content: (
                <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
                    <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl space-y-3">
                        <h4 className="font-black text-emerald-900 text-base flex items-center gap-2">
                            <span>✨</span>
                            <span>Cardápio Inteligente e Dinâmico</span>
                        </h4>
                        <p className="text-xs text-emerald-800 leading-relaxed">
                            Organize seus produtos por categorias (Ex: Pizzas, Bebidas, Porções, Sobremesas). Configure grupos de complementos (Ex: Escolha o sabor da borda, Escolha o ponto da carne) com limites mínimos e máximos.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                            <h5 className="font-black text-gray-900 text-sm">⚖️ Venda por Peso (Kilo / Marmitex)</h5>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                Para restaurantes self-service ou balança, defina o preço por quilo no cadastro do restaurante. Ao lançar o prato, o operador digita o peso em gramas (ex: 540g) e o sistema calcula o valor exato a pagar.
                            </p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                            <h5 className="font-black text-gray-900 text-sm">⏸️ Pausa Instantânea de Produtos</h5>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                Acabou o ingrediente de um prato? Clique em pausar no painel do cardápio e o item some imediatamente do cardápio online do cliente, evitando pedidos que não poderão ser entregues.
                            </p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'fiscal',
            title: '5. Emissão Fiscal (NFC-e & SEFAZ) & Contador',
            icon: '🏛️',
            category: 'Financeiro & Fiscal',
            summary: 'Certificado A1, CSC, aba exclusiva do contador, envio em lote para a SEFAZ e cálculo de impostos.',
            content: (
                <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
                    <div className="bg-blue-50 border border-blue-200 p-5 rounded-2xl space-y-3">
                        <h4 className="font-black text-blue-900 text-base flex items-center gap-2">
                            <span>🧾</span>
                            <span>Módulo Fiscal Robusto e Simplificado</span>
                        </h4>
                        <p className="text-xs text-blue-800 leading-relaxed">
                            O GuaraFood integra emissão de NFC-e (Modelo 65) com QR Code oficial SEFAZ exclusivamente através da Focus NFe.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                            <h5 className="font-black text-gray-900 text-sm">🔑 Configuração com o Contador</h5>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                Na aba de Configuração Fiscal, o lojista insere o <strong>Código CSC</strong> e o <strong>ID do Token</strong> fornecidos pelo contador para habilitar o QR Code nas impressões térmicas.
                            </p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                            <span className="text-xl">📑</span>
                            <h5 className="font-black text-gray-900 text-sm">Aba Exclusiva do Contador</h5>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                Crie uma conta com a role <code>accountant</code> para que o contador acesse mensalmente os pedidos, visualize quais notas foram emitidas, envie lotes inteiros para a SEFAZ com 1 clique e baixe todos os XMLs e DANFEs.
                            </p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                            <span className="text-xl">💰</span>
                            <h5 className="font-black text-gray-900 text-sm">Cálculo de Impostos Automático</h5>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                Defina a alíquota de imposto predefinida (ex: Simples Nacional) para calcular instantaneamente o imposto a pagar sobre o faturamento mensal emitido.
                            </p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                            <span className="text-xl">📥</span>
                            <h5 className="font-black text-gray-900 text-sm">Exportação em CSV e PDF</h5>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                Exporte relatórios mensais completos em CSV ou PDF paisagem otimizados para a contabilidade da empresa.
                            </p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'encomendas',
            title: '6. Modo Encomenda (Agendamento Seguro)',
            icon: '📅',
            category: 'Avançado',
            summary: 'Como aceitar encomendas para dias futuros (ex: fim de semana) sem sumir pedidos e com aviso claro.',
            content: (
                <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
                    <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl space-y-3">
                        <h4 className="font-black text-amber-900 text-base flex items-center gap-2">
                            <span>📅</span>
                            <span>Planejamento de Encomendas Sem Riscos</span>
                        </h4>
                        <p className="text-xs text-amber-800 leading-relaxed">
                            O <strong>Modo Encomenda</strong> permite que clientes façam pedidos antecipados (ex: pedir na segunda-feira para entregar no sábado) sem o risco de o pedido sumir após 48h ou confundir a cozinha.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                            <h5 className="font-black text-gray-900 text-sm">🔔 Aviso Automático para o Cliente</h5>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                O cardápio exibe um destaque claro informando o dia e horário da entrega agendada antes mesmo do pagamento.
                            </p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                            <h5 className="font-black text-gray-900 text-sm">🖨️ Destaque na Comanda Térmica</h5>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                Sai impresso no topo da comanda o aviso em destaque <code>*** ENCOMENDA: ENTREGA [DIA] [HORÁRIO] ***</code> para que a cozinha nunca confunda com um pedido de entrega imediata.
                            </p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'financeiro',
            title: '7. Relatórios de Vendas, Despesas & Lucro',
            icon: '📊',
            category: 'Financeiro & Fiscal',
            summary: 'Fluxo de caixa, controle de taxas de motoboy, lançamento de despesas e DRE simplificado.',
            content: (
                <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
                    <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl space-y-3">
                        <h4 className="font-black text-emerald-900 text-base flex items-center gap-2">
                            <span>📈</span>
                            <span>Controle Financeiro de Ponta a Ponta</span>
                        </h4>
                        <p className="text-xs text-emerald-800 leading-relaxed">
                            Acompanhe a saúde financeira do seu negócio em tempo real com gráficos de faturamento por período (dia, semana, mês e ano).
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                            <span className="text-xl">🛵</span>
                            <h5 className="font-black text-gray-900 text-sm">Acerto de Entregadores</h5>
                            <p className="text-xs text-gray-600">
                                O sistema calcula automaticamente quantas entregas cada motoboy realizou e qual o valor total de taxas a pagar e a receber.
                            </p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                            <span className="text-xl">📉</span>
                            <h5 className="font-black text-gray-900 text-sm">Lançamento de Despesas</h5>
                            <p className="text-xs text-gray-600">
                                Registre gastos diários (insumos, gelo, embalagens, manutenção) para abater do faturamento bruto.
                            </p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                            <span className="text-xl">💎</span>
                            <h5 className="font-black text-gray-900 text-sm">Lucro Líquido Real</h5>
                            <p className="text-xs text-gray-600">
                                Receita Bruta menos Despesas e Taxas de Entrega resulta no seu saldo líquido real do período.
                            </p>
                        </div>
                    </div>
                </div>
            )
        }
    ];

    const filteredSections = sections.filter(sec => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return sec.title.toLowerCase().includes(q) || sec.summary.toLowerCase().includes(q);
    });

    const activeContent = sections.find(s => s.id === activeTab) || sections[0];

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-8 animate-fadeIn pb-16">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-4">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-700 font-bold"
                            title="Voltar"
                        >
                            ←
                        </button>
                    )}
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="bg-orange-100 text-orange-700 font-black text-[10px] uppercase px-2.5 py-1 rounded-full">
                                GuaráFood Masterclass
                            </span>
                            <span className="bg-gray-100 text-gray-600 font-bold text-[10px] px-2.5 py-1 rounded-full">
                                v{APP_VERSION}
                            </span>
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight mt-1">
                            Manual Didático &amp; Guia de Uso Otimizado
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Tudo o que o GuaráFood pode fazer por você, explicado passo a passo para extração de potência máxima.
                        </p>
                    </div>
                </div>

                <div className="w-full md:w-72">
                    <input
                        type="text"
                        placeholder="🔍 Buscar no manual (ex: mesas, fiscal...)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                </div>
            </div>

            {/* Layout com Sidebar e Conteúdo */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar Navigation */}
                <div className="lg:col-span-1 space-y-2">
                    <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm space-y-1">
                        <p className="text-[10px] font-black uppercase text-gray-400 px-3 py-1.5 tracking-wider">
                            Tópicos do Sistema
                        </p>
                        {filteredSections.map(sec => (
                            <button
                                key={sec.id}
                                onClick={() => setActiveTab(sec.id)}
                                className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-between gap-2 ${
                                    activeTab === sec.id
                                        ? 'bg-orange-600 text-white shadow-md'
                                        : 'text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <div className="flex items-center gap-2.5 truncate">
                                    <span className="text-base">{sec.icon}</span>
                                    <span className="truncate">{sec.title}</span>
                                </div>
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                    activeTab === sec.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                                }`}>
                                    {sec.category}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="bg-gradient-to-br from-purple-900 to-indigo-900 p-5 rounded-2xl text-white space-y-3 shadow-sm">
                        <span className="text-2xl block">💡</span>
                        <h4 className="font-black text-sm">Dica de Ouro</h4>
                        <p className="text-xs text-purple-200 leading-relaxed">
                            Instale o GuaráFood como PWA (Aplicativo Web Progressivo) no seu celular ou tablet para ter acesso em tela cheia e notificações instantâneas.
                        </p>
                    </div>
                </div>

                {/* Main Content Pane */}
                <div className="lg:col-span-3 bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 pb-6 border-b border-gray-100 mb-6">
                        <span className="text-3xl">{activeContent.icon}</span>
                        <div>
                            <span className="text-xs font-bold text-orange-600 uppercase tracking-widest block">
                                {activeContent.category}
                            </span>
                            <h3 className="text-xl sm:text-2xl font-black text-gray-900">
                                {activeContent.title}
                            </h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {activeContent.summary}
                            </p>
                        </div>
                    </div>

                    <div className="animate-fadeIn">
                        {activeContent.content}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GuaraFoodMasterGuide;
