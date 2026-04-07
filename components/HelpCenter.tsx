
import React, { useState } from 'react';
import { 
  ChevronLeft, 
  BookOpen, 
  ShoppingBag, 
  Utensils, 
  LayoutDashboard, 
  Settings, 
  HelpCircle, 
  RefreshCw, 
  Smartphone, 
  Printer, 
  Users, 
  CreditCard, 
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  Ticket,
  ChevronRight,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HelpSection {
    id: string;
    title: string;
    icon: React.ElementType;
    description: string;
    content: React.ReactNode;
}

const HelpCenter: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [activeSection, setActiveSection] = useState('introducao');
    const [searchQuery, setSearchQuery] = useState('');

    const handleClearCache = async () => {
        if (window.confirm("Tem certeza que deseja limpar o cache do sistema? Você precisará fazer login novamente.")) {
            localStorage.clear();
            sessionStorage.clear();
            
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (let registration of registrations) {
                    await registration.unregister();
                }
            }
            
            window.location.reload();
        }
    };

    const sections: HelpSection[] = [
        {
            id: 'introducao',
            title: 'Introdução ao GuaraFood',
            icon: BookOpen,
            description: 'Visão geral e primeiros passos no sistema.',
            content: (
                <div className="space-y-6">
                    <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100">
                        <h3 className="text-xl font-black text-orange-900 mb-2">Bem-vindo ao Futuro do seu Restaurante!</h3>
                        <p className="text-orange-800 leading-relaxed">
                            O GuaraFood é uma plataforma PWA (Progressive Web App) completa que une a facilidade do delivery online com a eficiência da gestão presencial. Aqui, você controla tudo: desde o primeiro clique do cliente até o fechamento do caixa.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                            <h4 className="font-bold text-gray-800 flex items-center gap-2 mb-2">
                                <Smartphone className="w-4 h-4 text-orange-600" /> Multi-Plataforma
                            </h4>
                            <p className="text-sm text-gray-600">Funciona em celulares, tablets e computadores sem precisar baixar na loja.</p>
                        </div>
                        <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                            <h4 className="font-bold text-gray-800 flex items-center gap-2 mb-2">
                                <Clock className="w-4 h-4 text-orange-600" /> Tempo Real
                            </h4>
                            <p className="text-sm text-gray-600">Pedidos e status de mesas são atualizados instantaneamente para toda a equipe.</p>
                        </div>
                    </div>

                    <section className="space-y-3">
                        <h4 className="text-lg font-black text-gray-800">Níveis de Acesso</h4>
                        <div className="space-y-2">
                            {[
                                { role: 'Admin', desc: 'Acesso total, relatórios financeiros e configurações globais.' },
                                { role: 'Lojista (Merchant)', desc: 'Gerencia o restaurante, cardápio e pedidos.' },
                                { role: 'Gerente', desc: 'Supervisiona a operação, mesas e cancelamentos.' },
                                { role: 'Garçom', desc: 'Focado no atendimento de mesas e lançamento de pedidos.' }
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                                    <Users className="w-5 h-5 text-gray-400 mt-0.5" />
                                    <div>
                                        <span className="font-bold text-gray-800">{item.role}:</span>
                                        <span className="text-sm text-gray-600 ml-2">{item.desc}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            )
        },
        {
            id: 'pedidos',
            title: 'Gestão de Pedidos',
            icon: ShoppingBag,
            description: 'Como receber, aceitar e finalizar pedidos de delivery.',
            content: (
                <div className="space-y-6">
                    <section className="space-y-4">
                        <h4 className="text-lg font-black text-gray-800">O Fluxo do Pedido</h4>
                        <p className="text-gray-600 text-sm">Cada pedido passa por estados específicos para manter o cliente informado:</p>
                        
                        <div className="space-y-3">
                            {[
                                { status: 'Novo Pedido', color: 'bg-blue-500', desc: 'O pedido acabou de chegar. Você ouvirá um alerta sonoro.' },
                                { status: 'Aceito / Em Preparo', color: 'bg-orange-500', desc: 'A cozinha já está trabalhando no pedido.' },
                                { status: 'Pronto', color: 'bg-green-500', desc: 'O pedido está aguardando retirada ou entregador.' },
                                { status: 'Saiu para Entrega', color: 'bg-purple-500', desc: 'O entregador já está a caminho do cliente.' },
                                { status: 'Entregue / Finalizado', color: 'bg-gray-800', desc: 'Ciclo concluído e valor contabilizado no financeiro.' }
                            ].map((step, i) => (
                                <div key={i} className="flex items-center gap-4 p-3 border border-gray-100 rounded-2xl">
                                    <div className={`w-3 h-3 rounded-full ${step.color} shrink-0`} />
                                    <div>
                                        <h5 className="font-bold text-gray-800 text-sm">{step.status}</h5>
                                        <p className="text-xs text-gray-500">{step.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
                        <p className="text-xs text-blue-800 font-medium">
                            <strong>Dica Pro:</strong> Você pode imprimir o ticket do pedido automaticamente assim que aceitá-lo. Configure sua impressora térmica na aba de "Configurações".
                        </p>
                    </div>
                </div>
            )
        },
        {
            id: 'cardapio',
            title: 'Cardápio & Produtos',
            icon: Utensils,
            description: 'Organização de categorias, itens e adicionais.',
            content: (
                <div className="space-y-6">
                    <section className="space-y-4">
                        <h4 className="text-lg font-black text-gray-800">Estrutura de Cadastro</h4>
                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <h5 className="font-bold text-gray-800 mb-1">1. Categorias</h5>
                                <p className="text-sm text-gray-600">Agrupe seus produtos (ex: Pizzas, Bebidas, Sobremesas). Você pode definir uma imagem de fundo para cada categoria no menu do cliente.</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <h5 className="font-bold text-gray-800 mb-1">2. Itens (Produtos)</h5>
                                <p className="text-sm text-gray-600">Cadastre nome, preço, descrição e foto. Ative opções como "Destaque" para aparecer no topo do cardápio.</p>
                                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div className="text-[10px] bg-white p-2 rounded-lg border border-gray-200 font-bold uppercase tracking-tighter">🍕 Suporte a Meio-a-Meio</div>
                                    <div className="text-[10px] bg-white p-2 rounded-lg border border-gray-200 font-bold uppercase tracking-tighter">🍱 Marmitas com Horário</div>
                                    <div className="text-[10px] bg-white p-2 rounded-lg border border-gray-200 font-bold uppercase tracking-tighter">⚖️ Venda por Peso (KG)</div>
                                    <div className="text-[10px] bg-white p-2 rounded-lg border border-gray-200 font-bold uppercase tracking-tighter">🍧 Açaí Personalizável</div>
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <h5 className="font-bold text-gray-800 mb-1">3. Adicionais & Complementos</h5>
                                <p className="text-sm text-gray-600">Crie grupos de adicionais (ex: "Escolha sua borda", "Ingredientes extras"). Você pode definir limites mínimos e máximos de escolha para cada grupo.</p>
                            </div>
                        </div>
                    </section>
                </div>
            )
        },
        {
            id: 'mesas',
            title: 'Mesas & Comandas',
            icon: LayoutDashboard,
            description: 'Gestão de salão, comandas individuais e peso.',
            content: (
                <div className="space-y-6">
                    <section className="space-y-4">
                        <h4 className="text-lg font-black text-gray-800">Operação de Salão</h4>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="flex gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 shrink-0">
                                    <Users className="w-5 h-5" />
                                </div>
                                <div>
                                    <h5 className="font-bold text-gray-800">Comandas Individuais</h5>
                                    <p className="text-sm text-gray-500">Uma mesa pode ter vários clientes com contas separadas. O sistema permite lançar itens para cada comanda e fechar o pagamento individualmente.</p>
                                </div>
                            </div>
                            <div className="flex gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                                    <CreditCard className="w-5 h-5" />
                                </div>
                                <div>
                                    <h5 className="font-bold text-gray-800">Venda por Peso</h5>
                                    <p className="text-sm text-gray-500">Para buffets, use itens configurados como "Venda por Peso". Ao lançar, informe o peso (ex: 0.450) e o sistema calcula o valor baseado no preço do KG configurado.</p>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            )
        },
        {
            id: 'configuracoes',
            title: 'Configurações da Loja',
            icon: Settings,
            description: 'Horários, taxas de entrega e perfil da loja.',
            content: (
                <div className="space-y-6">
                    <section className="space-y-4">
                        <h4 className="text-lg font-black text-gray-800">Personalização</h4>
                        <div className="space-y-3">
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <Clock className="w-4 h-4 text-orange-600" />
                                    <h5 className="font-bold text-gray-800">Horários de Funcionamento</h5>
                                </div>
                                <p className="text-sm text-gray-600">Defina os horários para cada dia da semana. O sistema fecha automaticamente o cardápio de delivery fora desses períodos.</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <MapPin className="w-4 h-4 text-orange-600" />
                                    <h5 className="font-bold text-gray-800">Taxas de Entrega</h5>
                                </div>
                                <p className="text-sm text-gray-600">Configure taxas fixas ou por bairro/distância para garantir que seu delivery seja rentável.</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <Ticket className="w-4 h-4 text-orange-600" />
                                    <h5 className="font-bold text-gray-800">Cupons de Desconto</h5>
                                </div>
                                <p className="text-sm text-gray-600">Crie códigos promocionais (ex: BEMVINDO10) com validade e valor mínimo de pedido.</p>
                            </div>
                        </div>
                    </section>
                </div>
            )
        },
        {
            id: 'impressao',
            title: 'Impressão Térmica',
            icon: Printer,
            description: 'Configuração de impressoras de cozinha e balcão.',
            content: (
                <div className="space-y-6">
                    <section className="space-y-4">
                        <h4 className="text-lg font-black text-gray-800">Como Configurar</h4>
                        <p className="text-sm text-gray-600">O GuaraFood suporta impressão direta em impressoras térmicas de 58mm ou 80mm.</p>
                        
                        <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100 space-y-3">
                            <h5 className="font-bold text-orange-900">Passo a Passo:</h5>
                            <ol className="list-decimal list-inside text-sm text-orange-800 space-y-2">
                                <li>Instale o driver da sua impressora no Windows/Mac.</li>
                                <li>No Painel Administrativo, vá em <strong>Configurações do Restaurante</strong>.</li>
                                <li>No campo "Nome da Impressora", digite o nome exato da impressora no seu sistema operacional.</li>
                                <li>Certifique-se de que o aplicativo <strong>GuaraPrint</strong> (ponte de impressão) esteja rodando no computador.</li>
                            </ol>
                        </div>
                    </section>
                </div>
            )
        },
        {
            id: 'pwa',
            title: 'Instalação & PWA',
            icon: Smartphone,
            description: 'Como instalar o GuaraFood como um aplicativo.',
            content: (
                <div className="space-y-6">
                    <section className="space-y-4">
                        <h4 className="text-lg font-black text-gray-800">Instalando no Celular</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <h5 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                                    <Smartphone className="w-4 h-4" /> Android (Chrome)
                                </h5>
                                <p className="text-xs text-gray-600">Toque nos 3 pontinhos no canto superior e selecione <strong>"Instalar Aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <h5 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                                    <Smartphone className="w-4 h-4" /> iOS (Safari)
                                </h5>
                                <p className="text-xs text-gray-600">Toque no ícone de <strong>Compartilhar</strong> (quadrado com seta) e selecione <strong>"Adicionar à Tela de Início"</strong>.</p>
                            </div>
                        </div>
                    </section>

                    <div className="bg-green-50 p-4 rounded-2xl border border-green-100 flex gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                        <p className="text-xs text-green-800 font-medium">
                            <strong>Vantagem:</strong> Como aplicativo, o GuaraFood abre mais rápido, ocupa menos memória e permite notificações de novos pedidos em tempo real.
                        </p>
                    </div>
                </div>
            )
        },
        {
            id: 'solucao-problemas',
            title: 'Solução de Problemas',
            icon: RefreshCw,
            description: 'Limpando o cache e forçando atualizações.',
            content: (
                <div className="space-y-6">
                    <section className="space-y-4">
                        <h4 className="text-lg font-black text-gray-800">Sistema Lento ou Desatualizado?</h4>
                        <p className="text-sm text-gray-600">Às vezes o navegador guarda versões antigas do sistema para economizar internet. Se algo não parece certo, tente limpar o cache.</p>
                        
                        <div className="bg-red-50 p-6 rounded-3xl border border-red-100 flex flex-col items-center text-center gap-4">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                                <RefreshCw className="w-8 h-8" />
                            </div>
                            <div>
                                <h5 className="font-black text-red-800 text-xl">Limpeza Profunda</h5>
                                <p className="text-sm text-red-700 mt-1 max-w-sm">
                                    Isso removerá todos os arquivos temporários e forçará o download da versão mais recente. Você precisará fazer login novamente.
                                </p>
                            </div>
                            <button 
                                onClick={handleClearCache}
                                className="bg-red-600 hover:bg-red-700 text-white font-black py-4 px-8 rounded-2xl shadow-xl shadow-red-200 transition-all active:scale-95 flex items-center gap-2"
                            >
                                Limpar Cache e Reiniciar
                            </button>
                        </div>
                    </section>
                </div>
            )
        }
    ];

    const filteredSections = sections.filter(s => 
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const ActiveIcon = sections.find(s => s.id === activeSection)?.icon || HelpCircle;

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="bg-white px-6 py-6 flex items-center justify-between border-b border-gray-100 sticky top-0 z-30 backdrop-blur-md bg-white/90">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Central de Ajuda</h1>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">GuaraFood Documentação Oficial</p>
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-xl">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Buscar ajuda..." 
                        className="bg-transparent border-none focus:ring-0 text-sm font-medium w-40"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
                {/* Sidebar Navigation */}
                <div className="w-full md:w-80 bg-gray-50 border-r border-gray-100 overflow-y-auto p-4 space-y-2">
                    {filteredSections.map(section => {
                        const Icon = section.icon;
                        return (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id)}
                                className={`w-full flex items-start gap-4 px-4 py-4 rounded-2xl text-left transition-all group ${
                                    activeSection === section.id 
                                    ? 'bg-orange-600 text-white shadow-xl shadow-orange-200' 
                                    : 'bg-white border border-gray-100 text-gray-600 hover:border-orange-200 hover:bg-orange-50/30'
                                }`}
                            >
                                <div className={`p-2 rounded-xl shrink-0 transition-colors ${
                                    activeSection === section.id ? 'bg-white/20' : 'bg-gray-100 group-hover:bg-orange-100'
                                }`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div className="overflow-hidden">
                                    <h3 className="font-black text-sm truncate">{section.title}</h3>
                                    <p className={`text-[10px] font-medium mt-0.5 line-clamp-1 ${
                                        activeSection === section.id ? 'text-white/70' : 'text-gray-400'
                                    }`}>
                                        {section.description}
                                    </p>
                                </div>
                                {activeSection === section.id && (
                                    <ChevronRight className="w-4 h-4 ml-auto self-center opacity-50" />
                                )}
                            </button>
                        );
                    })}
                    
                    <div className="pt-8 px-4">
                        <div className="bg-gray-900 rounded-2xl p-4 text-white">
                            <h4 className="text-xs font-black uppercase tracking-widest mb-2 opacity-50">Versão do Sistema</h4>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold">GuaraFood v2.1.0</span>
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-grow overflow-y-auto p-6 md:p-12 bg-white">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeSection}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            className="max-w-3xl mx-auto"
                        >
                            <div className="flex items-center gap-6 mb-10">
                                <div className="w-20 h-20 bg-orange-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl shadow-orange-200">
                                    <ActiveIcon className="w-10 h-10" />
                                </div>
                                <div>
                                    <h2 className="text-4xl font-black text-gray-900 tracking-tight">
                                        {sections.find(s => s.id === activeSection)?.title}
                                    </h2>
                                    <p className="text-gray-400 font-bold text-sm uppercase tracking-widest mt-1">
                                        {sections.find(s => s.id === activeSection)?.description}
                                    </p>
                                </div>
                            </div>

                            <div className="prose prose-orange max-w-none text-gray-700">
                                {sections.find(s => s.id === activeSection)?.content}
                            </div>

                            {/* Footer Help */}
                            <div className="mt-20 p-8 bg-gray-50 rounded-[2rem] border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-8">
                                <div className="flex items-center gap-5">
                                    <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center text-green-600 shadow-inner">
                                        <MessageSquare className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-gray-900 text-lg">Ainda precisa de ajuda?</h4>
                                        <p className="text-sm text-gray-500 font-medium">Nosso suporte técnico está disponível via WhatsApp.</p>
                                    </div>
                                </div>
                                <a 
                                    href="https://wa.me/5511999999999" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="px-10 py-4 bg-green-600 text-white font-black rounded-2xl shadow-xl shadow-green-200 hover:scale-105 transition-all active:scale-95 flex items-center gap-3"
                                >
                                    <MessageSquare className="w-5 h-5" />
                                    Falar com Suporte
                                </a>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default HelpCenter;
