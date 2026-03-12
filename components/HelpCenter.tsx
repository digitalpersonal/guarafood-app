
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
                        Bem-vindo ao GuaráFood! Este sistema foi projetado para ser a solução completa para o seu restaurante, abrangendo desde o autoatendimento do cliente até o gerenciamento financeiro e de estoque.
                    </p>
                    <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                        <h4 className="font-black text-orange-800 mb-2">Estrutura do Sistema</h4>
                        <ul className="list-disc list-inside text-orange-700 text-sm space-y-1">
                            <li><strong>Área do Cliente:</strong> Interface intuitiva para pedidos via delivery ou QR Code na mesa.</li>
                            <li><strong>Gestão de Pedidos:</strong> Painel em tempo real para cozinha e balcão.</li>
                            <li><strong>Gestão de Mesas:</strong> Controle total do salão com status de ocupação e pagamentos.</li>
                            <li><strong>Painel Administrativo:</strong> Configurações de cardápio, funcionários e relatórios.</li>
                        </ul>
                    </div>
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
                        <h4 className="font-black text-gray-800 mb-2">1. Categorias</h4>
                        <p className="text-sm text-gray-600">As categorias organizam seu cardápio. Você pode criar categorias como "Pizzas", "Bebidas", "Lanches". Cada categoria pode ter uma imagem de fundo personalizada.</p>
                    </section>
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">2. Produtos (Itens)</h4>
                        <p className="text-sm text-gray-600">Ao cadastrar um produto, você define nome, descrição, preço e imagem. Além disso, existem tipos especiais:</p>
                        <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
                            <li><strong>Pizzas:</strong> Permitem que o cliente escolha sabores (meio a meio) e bordas.</li>
                            <li><strong>Açaí:</strong> Permite a escolha de acompanhamentos e coberturas.</li>
                            <li><strong>Marmitas:</strong> Podem ser configuradas como "Prato do Dia", aparecendo em destaque no horário do almoço.</li>
                        </ul>
                    </section>
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">3. Combos</h4>
                        <p className="text-sm text-gray-600">Combos são conjuntos de itens vendidos por um preço único. Exemplo: X-Tudo + Batata + Refri.</p>
                    </section>
                </div>
            )
        },
        {
            id: 'pedidos',
            title: 'Gestão de Pedidos',
            icon: '📋',
            content: (
                <div className="space-y-6">
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">Fluxo de Pedidos</h4>
                        <p className="text-sm text-gray-600">Os pedidos chegam com o status <strong>"Novo Pedido"</strong>. Você pode:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                                <span className="font-bold text-blue-800">Aceitar:</span> Move para "Em Preparo".
                            </div>
                            <div className="p-3 bg-green-50 rounded-xl border border-green-100">
                                <span className="font-bold text-green-800">Pronto:</span> Notifica o cliente ou entregador.
                            </div>
                            <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                                <span className="font-bold text-purple-800">Saiu para Entrega:</span> Para pedidos de delivery.
                            </div>
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <span className="font-bold text-gray-800">Finalizar:</span> Conclui o ciclo do pedido.
                            </div>
                        </div>
                    </section>
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">Impressão Automática</h4>
                        <p className="text-sm text-gray-600">O sistema suporta impressão térmica para Cozinha e Balcão. Certifique-se de que o aplicativo de ponte de impressão esteja ativo no computador da impressora.</p>
                    </section>
                </div>
            )
        },
        {
            id: 'mesas',
            title: 'Gestão de Mesas',
            icon: '🪑',
            content: (
                <div className="space-y-6">
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">Abrindo uma Mesa</h4>
                        <p className="text-sm text-gray-600">Clique em uma mesa livre, informe o nome do cliente e adicione os itens iniciais. A mesa ficará com o status "Ocupada".</p>
                    </section>
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">Adicionando Itens</h4>
                        <p className="text-sm text-gray-600">Você pode adicionar novos itens à mesa a qualquer momento. O sistema mantém o histórico de tudo o que foi pedido.</p>
                    </section>
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">Fechamento e Pagamento</h4>
                        <p className="text-sm text-gray-600">Ao solicitar a conta, você pode registrar pagamentos parciais (ex: um cliente paga sua parte) ou o total. O sistema aceita Dinheiro, Pix, Cartões e <strong>Mensalista</strong>.</p>
                    </section>
                </div>
            )
        },
        {
            id: 'mensalistas',
            title: 'Mensalistas (Vendedores)',
            icon: '🤝',
            content: (
                <div className="space-y-6">
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">O que são?</h4>
                        <p className="text-sm text-gray-600">São clientes especiais (como vendedores de lojas vizinhas) que consomem diariamente e pagam tudo de uma vez no final do mês.</p>
                    </section>
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">Como usar?</h4>
                        <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2">
                            <li>Cadastre o mensalista com nome e WhatsApp.</li>
                            <li>Ao fazer um pedido, informe o WhatsApp dele.</li>
                            <li>O valor será somado ao "Saldo Devedor" do mensalista.</li>
                            <li>No final do mês, acesse o painel de Mensalistas para ver o total e registrar o pagamento (baixa no saldo).</li>
                        </ol>
                    </section>
                </div>
            )
        },
        {
            id: 'financeiro',
            title: 'Financeiro e Cupons',
            icon: '💰',
            content: (
                <div className="space-y-6">
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">Cupons de Desconto</h4>
                        <p className="text-sm text-gray-600">Crie cupons fixos ou percentuais. Você pode definir uma validade e um valor mínimo de pedido para o cupom ser aceito.</p>
                    </section>
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">Taxas de Entrega</h4>
                        <p className="text-sm text-gray-600">Configure taxas por bairro ou uma taxa única. Isso é calculado automaticamente no checkout do delivery.</p>
                    </section>
                </div>
            )
        },
        {
            id: 'configuracoes',
            title: 'Configurações e Impressão',
            icon: '⚙️',
            content: (
                <div className="space-y-6">
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">Horários de Funcionamento</h4>
                        <p className="text-sm text-gray-600">Defina os horários de abertura e fechamento para cada dia da semana. O sistema impedirá pedidos de delivery fora desses horários.</p>
                    </section>
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">Impressão Térmica</h4>
                        <p className="text-sm text-gray-600">Para que a impressão funcione, você deve configurar o nome da impressora exatamente como aparece no Windows/Mac nas configurações do restaurante dentro do painel administrativo.</p>
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
                <div className="hidden md:block text-xs font-bold text-gray-400 uppercase tracking-widest">GuaráFood v2.0</div>
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
                        <div className="mt-16 pt-8 border-top border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
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

export default HelpCenter;
