
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
                        Bem-vindo ao GuaráFood! Este sistema é uma <strong>solução completa 360º</strong> para o seu restaurante. Ele abrange PDV (Caixa), KDS (Telas de Cozinha/Balcão), Gestão Financeira, Controle de Mesas/Comandas, Clube de Fidelidade, Autoatendimento por QR Code e Delivery Online.
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
                        <p className="text-sm text-gray-600 mb-2">No painel Administrativo, na aba <strong>"Config"</strong>, você estrutura toda a operação do restaurante:</p>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                            <li><strong>Informações Básicas:</strong> Nome, endereço e contato do WhatsApp do restaurante.</li>
                            <li><strong>Taxa de Entrega:</strong> Valor Fixo ou por Bairros.</li>
                            <li><strong>Horários de Funcionamento:</strong> Se um cliente tentar pedir delivery fora do horário, o painel online avisará que está fechado.</li>
                            <li><strong>Tipos de Negócio:</strong> Ligar/Desligar Venda no Quilo, Mesas, Mensalistas, Balcão/Retirada e Anúncios.</li>
                        </ul>
                    </section>
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">2. Impressão Térmica Automática</h4>
                        <p className="text-sm text-gray-600">Para automatizar as comandas impressas, vá em <strong>Config</strong>, insira o <strong>nome exato</strong> da impressora configurada no Windows. Sempre que um pedido for aceito (e for do delivery) ou originar de Mesa, o sistema rodará a impressão diretamente. Lembre-se de instalar e rodar o QZ Tray.</p>
                    </section>
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">3. Fidelidade</h4>
                        <p className="text-sm text-gray-600">Ative o <strong>Clube de Fidelidade</strong> nas configurações. Estipule a conversão de gastos em pontos e a recompensa (Desconto percentual, fixo ou item grátis). Ao usar o telefone no fechamento da conta, os pontos do cliente sobem sozinhos.</p>
                    </section>
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">4. Funcionários (Garçons e Cozinha)</h4>
                        <p className="text-sm text-gray-600">Para separar responsabilidades, adicione <strong>Funcionários e Senhas (PINs)</strong>. Um garçom deve registrar seu PIN ao abrir mesas ou comandas. Uma Cozinha foca exclusivamente no painel "Cozinha", que você pode usar num tablet para mostrar apenas a aba "Em Preparo".</p>
                    </section>
                </div>
            )
        },
        {
            id: 'financeiro',
            title: 'Financeiro, Cupons e Caixa',
            icon: '💰',
            content: (
                <div className="space-y-6">
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">Cupons de Desconto e Banners promocionais</h4>
                        <p className="text-sm text-gray-600">Crie <strong>Cupons</strong> (fixos ou %). Os clientes inserem este código no momento do pagamento online ou o caixa informa. Para chamar a atenção na tela de menu principal, adicione <strong>Banners</strong> de <i>Ofertas e Novidades</i> ou Anúncios.</p>
                    </section>
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">Despesas Operacionais</h4>
                        <p className="text-sm text-gray-600">Na aba <strong>Finanças -&gt; Nova Despesa</strong>, registre saídas como Compras de Ingredientes, Conta de Luz, Embalagens, etc. Isso garantirá um relatório limpo do <i>Lucro Líquido</i> em vez de apenas Faturamento bruto longo do mês.</p>
                    </section>
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">Análise e Relatórios (Visão Geral)</h4>
                        <p className="text-sm text-gray-600">Todos os pedidos com status <strong>"Finalizado"</strong> alimentam os gráficos e faturamento mensal/diário no topo do Painel, deduzindo eventuais despesas inseridas. Pagamentos em Fiado (Mensalistas) só contam no dia em que a fatura do mensalista for paga e compensada na aba "Mensalistas".</p>
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
                        <h4 className="font-black text-gray-800 mb-2">1. Categorias</h4>
                        <p className="text-sm text-gray-600">Uma "Categoria" separa seu Menu. Ex: <i>Entradas, Bebidas, Pizzas</i>. Você escolhe ícones e personaliza para a melhor visualização.</p>
                    </section>
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">2. Itens do Cardápio (Produtos)</h4>
                        <p className="text-sm text-gray-600">Registre Nome, descrição clara, uma foto chamativa. Se você desmarcar a aba "Disponível", a plataforma avisa ao cliente a label <strong>"Esgotado!"</strong> bloqueando o botão de compra.</p>
                    </section>
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">3. Lógica Especial: Adicionais (Addons/Tamanhos)</h4>
                        <p className="text-sm text-gray-600">
                            <strong>Açaí / Marmitas Personalizáveis:</strong> Na criação de Addons você pode impor <i>limites e taxas</i>. Exemplo: Deixe os 4 primeiros acompanhamentos <i>grátis</i>; do 5º em diante, cobre R$ 2,00 adicionais. <br/><br/>
                            <strong>Pizzas (Meio a Meio):</strong> O sistema aceita a criação de categoria Pizzas com frações e gerenciará automaticamente o preço maior entre as metades e as frações dos acompanhamentos, como a adição de uma Borda Recheada.
                        </p>
                    </section>
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">4. Combos</h4>
                        <p className="text-sm text-gray-600">Agrupe Itens com um preço fechado. É obrigatório selecionar os produtos individuais participantes (ex. um Hambúrguer padrão e uma Coca lata em estoque) para compor o Combo. Assim o controle de esgotados funcionará e a cozinha entenderá o pedido em detalhes!</p>
                    </section>
                </div>
            )
        },
        {
            id: 'pedidos',
            title: 'KDS (Cozinha) e Caixa Rápido',
            icon: '📋',
            content: (
                <div className="space-y-6">
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">Automação de Pedidos Diários</h4>
                        <p className="text-sm text-gray-600">
                            A aba <strong>Pedidos</strong> é o coração da operação. Todo pedido novo (Delivery ou Mesa de Autoatendimento) entra tocando uma sineta na coluna <strong className="text-blue-800">Novo Pedido</strong>.
                        </p>
                    </section>
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">Transições de Colunas Kanban</h4>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-2 mt-2">
                            <li><strong className="text-orange-600">Em Preparo:</strong> A Cozinha bate o olho apenas nesta coluna. Exibe na tela do Tablet da Cozinha para o Chapeiro preparar.</li>
                            <li><strong className="text-green-600">Pronto/Embalado:</strong> Quando a cozinha clica em feito, o caixa já sabe que pode chamar o Motoboy ou o Garçom pode servir a Mesa.</li>
                            <li><strong className="text-purple-600">Saiu para Entrega / A Caminho:</strong> Status essencial de rastreio para pedidos Delivery.</li>
                            <li><strong className="text-gray-800">Finalizado (Caixa):</strong> Fim de linha. Pedido entregue, Motoboy voltou ou Pagamento na mesa já foi transacionado. <strong>Isso contabilizará faturamento.</strong></li>
                        </ul>
                    </section>
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">Lançamento Rápido no Balcão</h4>
                        <p className="text-sm text-gray-600">Fila na sua loja? Clique em <strong>"Novo Pedido" (ou Caixa)</strong>, adicione com agilidade os produtos na tela de Touchscreen do GuaráFood. No final, indique a taxa ou desconto, capture o nome e aplique a forma de Pagamento imediata (ex: Cartão ou Pix). Finalize ou jogue para "Em Preparo".</p>
                    </section>
                </div>
            )
        },
        {
            id: 'mesas',
            title: 'Mesas e Comandas Inteligentes',
            icon: '🪑',
            content: (
                <div className="space-y-6">
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">Mesas em Mapa de Cores</h4>
                        <p className="text-sm text-gray-600">Na aba <strong>"Mesas"</strong> preenchendo as configurações, você pode definir as numerações do seu salão. Ao usar o PIN, o garçom seleciona as posições do salão marcadas em Livre/Ocupada.</p>
                    </section>
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">Comandas Separadas na Mesma Mesa</h4>
                        <p className="text-sm text-gray-600">Grupo de amigos de trabalho? <strong>Esqueça a conta demorada de "racha"!</strong> O GuaráFood permite que o Caixa abra dentro da Mesa "04" três comandas distintas, onde cada item (O chopp do João, O prato do Pedro) fica amarrado àquela pessoa. No fechamento, o sistema apresenta a fatura unificada (Aba da Mesa) ou Faturas segmentadas por pessoa.</p>
                    </section>
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">Autoatendimento / Auto-Pedido por QR Code</h4>
                        <p className="text-sm text-gray-600">Gere um QR Code nas configurações da Mesa. Posicione esse acrílico na mesa. Cliente entra, aponta o celular, o cardápio abre. Ele mesmo faz o pedido. Aparece mágicamente no seu Kanban do Balcão como <strong className="text-blue-600">Pedido para preparo da Mesa X</strong>.</p>
                    </section>
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">Buffet Inteligente (Lançamento a Quilo)</h4>
                        <p className="text-sm text-gray-600">Utilizando Balança e a opção configurada "Preço por KG". Você coloca no caixa o valor por KG (ex: R$ 68,00), o sistema calcula a Tara e abate. Você clica na categoria de venda por KG e o guarafood emite a cobrança decimal perfeitinha ali na Comanda do usuário.</p>
                    </section>
                </div>
            )
        },
        {
            id: 'mensalistas',
            title: 'Mensalistas (Conta "Fiado")',
            icon: '🤝',
            content: (
                <div className="space-y-6">
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">Porquê e para que Mensalistas?</h4>
                        <p className="text-sm text-gray-600">Substitui completamente as cadernetas e fichas de vendas penduradas por donos de comércio nos entornos de sua loja. Ex: A faxineira do escritório ao lado come marmita aí todo dia e acerta de 15 em 15 dias.</p>
                    </section>
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">Como usar as Contas Fiado?</h4>
                        <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2">
                            <li>Acesse a aba <strong>Mensalistas</strong>.</li>
                            <li>Cadastre o perfil de Cliente do Contrato ou Cliente Especial estipulando um "Limite de Conta".</li>
                            <li>Nas próximas comandas do salão ou na emissão via Caixa de balcão (Delivery não aceita!), defina o método <strong className="text-blue-600">"Pagar como Mensalista"</strong>.</li>
                            <li>O valor da venda sobe e entra nas contas a receber (Não soma no faturamento do dia para você não furar o caixa de troco nem relatórios atuais).</li>
                            <li>No dia do Pagamento Acordado, abra o Perfil do Mensalista, olhe a Dívida e clique em <strong>Pagar Mês/Dívida (Baixa Manual)</strong>. Só assim os relatórios sumarizam o Faturamento desta Receita!</li>
                        </ol>
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
