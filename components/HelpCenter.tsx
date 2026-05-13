
import React, { useState } from 'react';

interface HelpSection {
    id: string;
    title: string;
    icon: string;
    content: React.ReactNode;
}

const HelpCenter: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [activeSection, setActiveSection] = useState('introducao');

    const sections: HelpSection[] = [
        {
            id: 'introducao',
            title: 'Introdução',
            icon: '👋',
            content: (
                <div className="space-y-4">
                    <p className="text-gray-600 leading-relaxed">
                        Bem-vindo ao GuaráFood v2.0! Este sistema é uma <strong>solução completa 360º</strong> para o seu restaurante. Ele abrange PDV (Caixa), KDS (Telas de Cozinha/Balcão), Gestão Financeira, Controle de Mesas/Comandas, Clube de Fidelidade, Autoatendimento por QR Code e Delivery Online.
                    </p>
                    <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 mt-4">
                        <h4 className="font-black text-orange-800 mb-2">Estrutura do Sistema</h4>
                        <ul className="list-disc list-inside text-orange-700 text-sm space-y-1">
                            <li><strong>Delivery e Balcão Online:</strong> Interface amigável para o cliente fazer pedidos usando o celular em casa ou diretamente do navegador.</li>
                            <li><strong>Gestão de Pedidos (KDS):</strong> Kanban em tempo real dividindo etapas entre Caixa, Cozinha e Entregadores.</li>
                            <li><strong>Gestão de Mesas e Comandas:</strong> Controle detalhado do salão com suporte a divisão de contas e leitura de autoatendimento via QR Code na mesa.</li>
                            <li><strong>Fidelidade e Mensalistas:</strong> Clube de pontos para reter clientes e controle do famoso "Fiado" de forma profissional.</li>
                            <li><strong>Gestão Financeira:</strong> Lançamento de despesas e lucros no painel administrativo.</li>
                        </ul>
                    </div>
                </div>
            )
        },
        {
            id: 'configuracoes',
            title: 'Configurações do Estabelecimento',
            icon: '⚙️',
            content: (
                <div className="space-y-6">
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">1. Configurações Iniciais</h4>
                        <p className="text-sm text-gray-600 mb-2">No painel Administrativo (Menu Lateral &rarr; Config), você deve estruturar a base da sua operação:</p>
                        <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                            <div>
                                <p className="font-bold text-gray-800 text-xs uppercase mb-1">Informações Básicas</p>
                                <p className="text-xs text-gray-500">Nome, endereço e o número de WhatsApp que receberá os alertas de novos pedidos.</p>
                            </div>
                            <div>
                                <p className="font-bold text-gray-800 text-xs uppercase mb-1">Taxa de Entrega</p>
                                <p className="text-xs text-gray-500">Valor fixo ou por bairros. Você também pode definir um valor de pedido mínimo para entrega.</p>
                            </div>
                            <div>
                                <p className="font-bold text-gray-800 text-xs uppercase mb-1">Horários</p>
                                <p className="text-xs text-gray-500">Defina o horário de abertura e fechamento. Fora desse período, o cardápio online avisa que a loja está fechada e bloqueia pedidos.</p>
                            </div>
                        </div>
                    </section>
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">2. Impressão Térmica Automática</h4>
                        <p className="text-sm text-gray-600">
                            Para que os pedidos saiam sozinhos na impressora:
                            <br/>- Instale o software <strong>QZ Tray</strong> no computador do caixa.
                            <br/>- No painel lateral, vá em <strong>Config</strong> e digite o nome da impressora exatamente como aparece no Windows/Painel de Controle.
                            <br/>- Deixe o sistema aberto. Novos pedidos e solicitações de conta de mesas imprimirão automaticamente.
                        </p>
                    </section>
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">3. Segurança e Acesso</h4>
                        <p className="text-sm text-gray-600 mb-2">Crie usuários para seus funcionários (Garçom, Cozinha, Gerente) com níveis de acesso diferentes:</p>
                        <ul className="list-disc list-inside text-xs text-gray-500 space-y-1">
                            <li><strong>Garçom:</strong> Acesso apenas à gestão de mesas e comandas.</li>
                            <li><strong>Cozinha:</strong> Acesso apenas à tela de preparo (KDS).</li>
                            <li><strong>Gerente:</strong> Acesso total às configurações e financeiro.</li>
                        </ul>
                    </section>
                </div>
            )
        },
        {
            id: 'financeiro',
            title: 'Financeiro e Caixa',
            icon: '💰',
            content: (
                <div className="space-y-6">
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">Fluxo de Caixa</h4>
                        <p className="text-sm text-gray-600 mb-4">O sistema separa o faturamento por formas de pagamento (Dinheiro, Pix, Cartão), facilitando o fechamento do dia.</p>
                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                            <h5 className="text-emerald-800 font-bold text-xs uppercase mb-2">Dica de Gestão</h5>
                            <p className="text-xs text-emerald-700">Registre todas as saídas (compras, pagamentos) na aba <strong>Financeiro &rarr; Despesas</strong>. Isso permite que o GuaráFood calcule seu <strong>lucro líquido real</strong> ao final do mês.</p>
                        </div>
                    </section>
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">Relatórios Gratuitos</h4>
                        <p className="text-sm text-gray-600">No Dashboard principal, você tem uma visão em tempo real de:</p>
                        <ul className="list-disc list-inside text-xs text-gray-500 space-y-1 mt-2">
                            <li>Total bruto do dia e do mês.</li>
                            <li>Ranking de produtos mais vendidos.</li>
                            <li>Quantidade de pedidos por canal (Entrega vs Local).</li>
                            <li>Evolução de despesas vs receitas.</li>
                        </ul>
                    </section>
                </div>
            )
        },
        {
            id: 'cardapio',
            title: 'Gestão de Cardápio',
            icon: '🍕',
            content: (
                <div className="space-y-6">
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">1. Categorias e Itens</h4>
                        <p className="text-sm text-gray-600">Organize seu menu por categorias (Bebidas, Lanches, etc). Em cada produto, você pode definir:</p>
                        <ul className="list-disc list-inside text-xs text-gray-500 space-y-1 mt-2">
                            <li><strong>Fotos:</strong> Use imagens reais para aumentar as vendas.</li>
                            <li><strong>Estoque:</strong> Desmarque "Disponível" para que o item apareça como "Esgotado" imediatamente.</li>
                            <li><strong>Pizzas:</strong> Configure tamanhos e preços dinâmicos (P, M, G).</li>
                        </ul>
                    </section>
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">2. Lógica de Marmitas e Açaís</h4>
                        <p className="text-sm text-gray-600">
                            Use os <strong>Complementos (Addons)</strong> para criar menus de montagem:
                            <br/>- Defina quantos acompanhamentos o cliente pode escolher por item.
                            <br/>- Cobre por itens extras após um certo limite de escolhas gratuitas.
                        </p>
                    </section>
                </div>
            )
        },
        {
            id: 'operacao',
            title: 'Operação (KDS e Balcão)',
            icon: '📋',
            content: (
                <div className="space-y-6">
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">Painel de Pedidos (KDS)</h4>
                        <p className="text-sm text-gray-600 mb-4">
                            Substitua o papel pelo digital. Use um Tablet ou Computador na cozinha para ver apenas a coluna <strong>"Em Preparo"</strong>.
                        </p>
                        <div className="grid grid-cols-2 gap-3 text-center">
                            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                                <p className="text-[10px] font-black text-blue-800 uppercase">Recebimento</p>
                                <p className="text-xs text-blue-600 font-bold">Aceite na aba "Pendentes".</p>
                            </div>
                            <div className="p-3 bg-orange-50 rounded-xl border border-orange-100">
                                <p className="text-[10px] font-black text-orange-800 uppercase">Preparo</p>
                                <p className="text-xs text-orange-600 font-bold">Mantenha o foco aqui.</p>
                            </div>
                            <div className="p-3 bg-green-50 rounded-xl border border-green-100">
                                <p className="text-[10px] font-black text-green-800 uppercase">Finalização</p>
                                <p className="text-xs text-green-600 font-bold">Avise que está Pronto.</p>
                            </div>
                            <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                                <p className="text-[10px] font-black text-purple-800 uppercase">Entrega</p>
                                <p className="text-xs text-purple-600 font-bold">Rastreio em tempo real.</p>
                            </div>
                        </div>
                    </section>
                </div>
            )
        },
        {
            id: 'mesas',
            title: 'Mesas e Comandas',
            icon: '🪑',
            content: (
                <div className="space-y-6">
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">Comandas e Salão</h4>
                        <p className="text-sm text-gray-600">
                            Na aba <strong>Mesas</strong>, você gerencia o salão. Ao abrir uma mesa, você pode criar várias <strong>Comandas</strong> para o mesmo local. Isso permite que cada cliente pague apenas o que consumiu.
                        </p>
                    </section>
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">Venda por Peso (Self-Service)</h4>
                        <p className="text-sm text-gray-600">
                            Configure o preço por KG. No momento de lançar o item na comanda, o sistema pedirá o peso e calculará automaticamente o valor conforme sua configuração.
                        </p>
                    </section>
                </div>
            )
        },
        {
            id: 'mensalistas',
            title: 'Mensalistas e Fidelidade',
            icon: '🤝',
            content: (
                <div className="space-y-6">
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">Mensalistas ("Fiado" Profissional)</h4>
                        <p className="text-sm text-gray-600">
                            Cadastre clientes que pagam mensalmente ou periodicamente. O sistema acumula as dívidas e gera um extrato detalhado para o acerto de contas. O saldo do mensalista é atualizado a cada novo pedido finalizado como "Mensalista".
                        </p>
                    </section>
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">Clube de Fidelidade</h4>
                        <p className="text-sm text-gray-600">
                            Habilite nas configurações. O cliente ganha pontos a cada compra identificada por telefone. Ao atingir o limite, o próprio sistema oferece o resgate da recompensa no Checkout.
                        </p>
                    </section>
                </div>
            )
        }
    ];

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header */}
            <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-gray-100 sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-gray-600">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                    </button>
                    <h1 className="text-2xl font-black text-gray-800 tracking-tight">Central de Ajuda</h1>
                </div>
                <div className="hidden md:block text-xs font-bold text-gray-400 uppercase tracking-widest">GuaráFood v{APP_VERSION}</div>
            </div>

            <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
                {/* Sidebar Navigation */}
                <div className="w-full md:w-72 bg-white border-r border-gray-100 overflow-y-auto p-4 space-y-1">
                    {sections.map(section => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                                activeSection === section.id 
                                ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' 
                                : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600'
                            }`}
                        >
                            <span className="text-xl">{section.icon}</span>
                            {section.title}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-grow overflow-y-auto p-6 md:p-10 bg-white">
                    <div className="max-w-3xl mx-auto">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-16 h-16 bg-orange-100 rounded-3xl flex items-center justify-center text-3xl">
                                {sections.find(s => s.id === activeSection)?.icon}
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-gray-800">{sections.find(s => s.id === activeSection)?.title}</h2>
                                <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">Documentação Oficial</p>
                            </div>
                        </div>

                        <div className="prose prose-orange max-w-none">
                            {sections.find(s => s.id === activeSection)?.content}
                        </div>

                        {/* Footer Help */}
                        <div className="mt-16 pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="font-black text-gray-800">Ainda com dúvidas?</h4>
                                    <p className="text-sm text-gray-500">Fale com nosso suporte via WhatsApp.</p>
                                </div>
                            </div>
                            <a 
                                href="https://wa.me/5511999999999" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="px-8 py-3 bg-green-600 text-white font-black rounded-2xl shadow-lg shadow-green-100 hover:scale-105 transition-transform"
                            >
                                Chamar Suporte
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Precisamos importar APP_VERSION para exibir no topo
import { APP_VERSION } from './VersionChecker';

export default HelpCenter;
