import React, { useState } from 'react';
import { APP_VERSION } from './VersionChecker';

interface HelpSection {
    id: string;
    title: string;
    icon: string;
    badge?: string;
    content: React.ReactNode;
}

const HelpCenter: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [activeSection, setActiveSection] = useState('como-usar');
    const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

    const handleCopyCommand = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopiedCommand(label);
        setTimeout(() => setCopiedCommand(null), 2500);
    };

    const sections: HelpSection[] = [
        {
            id: 'como-usar',
            title: 'Como usar o GuaraFood',
            icon: '🚀',
            badge: 'Iniciante',
            content: (
                <div className="space-y-8">
                    <div className="bg-gradient-to-r from-orange-600 to-amber-500 p-8 rounded-3xl text-white shadow-2xl">
                        <h3 className="text-3xl font-black mb-3">Bem-vindo ao GuaraFood!</h3>
                        <p className="text-lg opacity-90 leading-relaxed">
                            Vamos transformar a operação do seu restaurante? Aqui está um guia prático para você dominar as funcionalidades essenciais e faturar mais com o nosso sistema.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white border-2 border-orange-100 p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
                            <span className="text-4xl mb-4 block">📦</span>
                            <h4 className="font-black text-gray-900 text-lg mb-2">1. Gestão de Pedidos (Delivery e Salão)</h4>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Acompanhe tudo em tempo real. No painel de pedidos, aceite novas solicitações, monitore o tempo de preparo na cozinha (KDS) e despache para entrega ou mesa. Mantenha o cliente sempre atualizado.
                            </p>
                        </div>
                        <div className="bg-white border-2 border-emerald-100 p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
                            <span className="text-4xl mb-4 block">🍕</span>
                            <h4 className="font-black text-gray-900 text-lg mb-2">2. Configuração do Cardápio</h4>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Mantenha seu menu irresistível! Vá em <em>Menu</em> para cadastrar pratos com fotos, preços, tamanhos e adicionais. Pause itens indisponíveis instantaneamente para evitar pedidos frustrados.
                            </p>
                        </div>
                        <div className="bg-white border-2 border-blue-100 p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
                            <span className="text-4xl mb-4 block">📢</span>
                            <h4 className="font-black text-gray-900 text-lg mb-2">3. Ativar Promoções</h4>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Aumente as vendas! Em <em>Marketing</em> &rarr; <em>Banners</em>, suba artes de promoções que aparecem no topo do cardápio online do cliente. Use cupons de desconto para fidelizar.
                            </p>
                        </div>
                        <div className="bg-white border-2 border-purple-100 p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
                            <span className="text-4xl mb-4 block">💰</span>
                            <h4 className="font-black text-gray-900 text-lg mb-2">4. Controle Financeiro</h4>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Veja o que entra e sai. Monitore as vendas por canal, controle o fluxo de caixa, lance despesas diárias e entenda seu lucro líquido real ao final de cada dia.
                            </p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'mesas',
            title: 'Gestão de Mesas, Comandas e Garçons',
            icon: '🪑',
            badge: 'Completo',
            content: (
                <div className="space-y-8">
                    {/* Destaque Inicial */}
                    <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 p-6 rounded-2xl text-white shadow-lg">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-3xl">📱</span>
                            <h3 className="text-xl font-black tracking-tight">Módulo Salão & Comandas na Palma da Mão</h3>
                        </div>
                        <p className="text-orange-50 text-sm leading-relaxed">
                            O módulo de Mesas do <strong>GuaraFood</strong> foi desenhado para operar com máxima velocidade e agilidade em <strong>smartphones de garçons, tablets de salão e computadores de caixa</strong>. Garçons lançam pedidos diretamente na mesa do cliente, enviam para a cozinha sem papel e fecham contas com divisão de pagamentos em segundos.
                        </p>
                    </div>

                    {/* 1. Como Funciona para os Garçons */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center font-black text-orange-600 text-sm">1</div>
                            <h4 className="font-black text-gray-800 text-lg">Acesso e Uso no Celular do Garçom</h4>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            Os garçons podem acessar o sistema diretamente pelo navegador de seus celulares (ou instalando o aplicativo PWA). O sistema possui um <strong>Modo Garçom dedicado</strong> que simplifica a interface:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                                <h5 className="font-black text-gray-800 text-sm mb-1 flex items-center gap-1.5">
                                    <span>🔐</span>
                                    <span>PIN de Acesso Rápido</span>
                                </h5>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Cada garçom pode ter seu código PIN individual de 4 dígitos. Ao digitar o PIN, o garçom assume a comanda e todos os pedidos lançados ficam registrados com seu nome para fins de comissão e controle.
                                </p>
                            </div>
                            <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                                <h5 className="font-black text-gray-800 text-sm mb-1 flex items-center gap-1.5">
                                    <span>⚡</span>
                                    <span>Sem Papel ou Erros de Letra</span>
                                </h5>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    O garçom não precisa mais de bloco de notas ou caneta. O pedido é digitado com opções claras de sabores, adicionais e observações, evitando erros de interpretação na cozinha.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* 2. Mapa de Mesas em Tempo Real */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center font-black text-orange-600 text-sm">2</div>
                            <h4 className="font-black text-gray-800 text-lg">Mapa Visual do Salão em Tempo Real</h4>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            Ao acessar a aba <strong>Mesas</strong>, o salão é exibido em um grid intuitivo com mesas numeradas. O status de cada mesa é identificado por cores dinâmicas:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                            <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <span className="font-black text-xs text-emerald-800 uppercase">Mesa Livre (Verde)</span>
                                </div>
                                <p className="text-xs text-emerald-700 font-medium">Mesa desocupada e pronta para receber novos clientes com 1 clique.</p>
                            </div>
                            <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-xl">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="w-3.5 h-3.5 rounded-full bg-orange-500"></span>
                                    <span className="font-black text-xs text-orange-800 uppercase">Mesa Ocupada (Laranja)</span>
                                </div>
                                <p className="text-xs text-orange-700 font-medium">Contém comanda aberta. Mostra o tempo de permanência e o total consumido em tempo real.</p>
                            </div>
                            <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="w-3.5 h-3.5 rounded-full bg-blue-500"></span>
                                    <span className="font-black text-xs text-blue-800 uppercase">Conta Solicitada (Azul)</span>
                                </div>
                                <p className="text-xs text-blue-700 font-medium">Cliente pediu a pré-conta ou está aguardando fechamento e pagamento.</p>
                            </div>
                        </div>
                    </section>

                    {/* 3. Abertura de Mesas e Múltiplas Comandas */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center font-black text-orange-600 text-sm">3</div>
                            <h4 className="font-black text-gray-800 text-lg">Abertura de Mesas e Múltiplas Comandas por Mesa</h4>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            O garçom pode abrir uma mesa de forma rápida e organizar o atendimento mesmo em grupos grandes:
                        </p>
                        <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl space-y-3 text-sm text-gray-700">
                            <div className="flex items-start gap-2">
                                <span className="font-bold text-orange-600">✓</span>
                                <div><strong>Abrir Mesa com 1 Toque:</strong> Basta clicar sobre o número da mesa vazia. A comanda é criada instantaneamente.</div>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="font-bold text-orange-600">✓</span>
                                <div><strong>Identificação do Cliente / Garçom:</strong> Opcionalmente, adicione o nome do cliente ou o número de pessoas para facilitar o atendimento.</div>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="font-bold text-orange-600">✓</span>
                                <div><strong>Múltiplas Comandas na Mesma Mesa (Comanda Individual):</strong> Uma mesma mesa pode conter várias comandas separadas (ex: <em>Mesa 04 - Comanda Lucas</em> e <em>Mesa 04 - Comanda Juliana</em>). Isso permite que cada amigo acompanhe e pague apenas o que consumiu!</div>
                            </div>
                        </div>
                    </section>

                    {/* 4. Lançamento Ágil de Itens e Venda por Quilo */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center font-black text-orange-600 text-sm">4</div>
                            <h4 className="font-black text-gray-800 text-lg">Lançamento de Pedidos, Observações e Venda por Peso</h4>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            Ao tocar em <strong>"Adicionar Itens"</strong> na comanda aberta:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                                <h5 className="font-black text-gray-800 text-sm mb-1">🔍 Busca Ágil e Complementos</h5>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Encontre produtos em milissegundos digitando qualquer parte do nome ou filtrando por categoria. Personalize tamanhos, sabores múltiplos de pizza (meia a meia) e adicionais extras.
                                </p>
                            </div>
                            <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                                <h5 className="font-black text-gray-800 text-sm mb-1">📝 Observações Especiais para a Cozinha</h5>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Adicione notas detalhadas em cada item com facilidade (ex: <em>"sem cebola"</em>, <em>"ao ponto para mal"</em>, <em>"copo com gelo e limão"</em>).
                                </p>
                            </div>
                            <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm md:col-span-2">
                                <h5 className="font-black text-gray-800 text-sm mb-1">⚖️ Venda por Peso / Balança (Self-Service e Marmitex)</h5>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    O GuaraFood possui suporte nativo a comida por quilo. Ao selecionar itens configurados por peso, basta digitar a quantidade em gramas (ex: <strong>480g</strong>) e o sistema calcula o valor monetário exato automaticamente.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* 5. Envio Inteligente para a Cozinha */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center font-black text-orange-600 text-sm">5</div>
                            <h4 className="font-black text-gray-800 text-lg">Disparo Inteligente para Cozinha e Bar (Impressão Sem Duplicidade)</h4>
                        </div>
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm leading-relaxed space-y-2">
                            <div className="flex items-center gap-2 font-black text-amber-800">
                                <span>👨‍🍳</span>
                                <span>Como Funciona o Envio Diferencial de Itens:</span>
                            </div>
                            <p className="text-xs text-amber-800 leading-relaxed">
                                Quando o garçom clica em <strong>"Enviar para Cozinha"</strong>, o GuaraFood filtra e envia para a impressora ou tela KDS <strong>apenas os itens que foram adicionados nesta nova rodada</strong>.
                            </p>
                            <p className="text-xs text-amber-800 leading-relaxed">
                                Itens de rodadas anteriores que já foram preparados <strong>nunca saem duplicados</strong>, mantendo a cozinha 100% organizada e economizando bobina de papel!
                            </p>
                        </div>
                    </section>

                    {/* 6. Fechamento, Divisão de Pagamentos e Mensalistas */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center font-black text-orange-600 text-sm">6</div>
                            <h4 className="font-black text-gray-800 text-lg">Fechamento de Conta, Divisão de Pagamentos e Mensalistas</h4>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            O processo de fechamento e cobrança foi projetado para ser flexível e seguro:
                        </p>
                        <div className="space-y-2 text-sm">
                            <div className="p-3 bg-gray-50 border rounded-xl">
                                <strong>📄 Conferência de Mesa (Pré-Conta):</strong> Clique no botão <em>"Imprimir Conta"</em> para gerar o cupom detalhado de conferência e levar à mesa do cliente com todos os itens consumidos, subtotal e chave Pix QR Code.
                            </div>
                            <div className="p-3 bg-gray-50 border rounded-xl">
                                <strong>💳 Pagamentos Múltiplos e Parciais:</strong> Se a conta der R$ 120,00, a mesa pode pagar R$ 50 no Pix, R$ 40 no Cartão e R$ 30 em Dinheiro. O sistema abate os valores e exibe o saldo devedor restante em tempo real até zerar a conta.
                            </div>
                            <div className="p-3 bg-gray-50 border rounded-xl">
                                <strong>💵 Cálculo de Troco Automático:</strong> Digite o valor entregue pelo cliente em dinheiro e o sistema calcula instantaneamente o troco exato a ser devolvido.
                            </div>
                            <div className="p-3 bg-gray-50 border rounded-xl">
                                <strong>🤝 Transferência para Mensalista ("Fiado" Corporativo):</strong> Se o cliente for mensalista ou empresa cadastrada, o saldo da mesa pode ser transferido diretamente para a conta dele pelo telefone/nome, acumulando no extrato mensal.
                            </div>
                            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800">
                                <strong>🔒 Trava de Segurança:</strong> O sistema não permite encerrar a mesa se ainda houver saldo pendente, prevenindo perdas financeiras no salão.
                            </div>
                        </div>
                    </section>

                    {/* 7. Autoatendimento por QR Code na Mesa */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center font-black text-orange-600 text-sm">7</div>
                            <h4 className="font-black text-gray-800 text-lg">Autoatendimento por QR Code na Mesa</h4>
                        </div>
                        <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl text-purple-900 text-sm leading-relaxed">
                            Coloque um display acrílico ou adesivo com o QR Code na mesa. O cliente aponta a câmera do celular, o cardápio abre automaticamente identificado com o número daquela mesa, e os pedidos enviados entram direto na comanda do salão e na tela do KDS/Cozinha!
                        </div>
                    </section>
                </div>
            )
        },
        {
            id: 'impressao',
            title: 'Impressão Térmica Automática (Chrome Kiosk-Printing)',
            icon: '🖨️',
            badge: 'Essencial',
            content: (
                <div className="space-y-8">
                    {/* Destaque Inicial */}
                    <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 rounded-2xl text-white shadow-xl">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-3xl">⚡</span>
                            <h3 className="text-xl font-black tracking-tight">Impressão Silenciosa e Instantânea via Chrome Kiosk-Printing</h3>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed">
                            O <strong>GuaraFood</strong> utiliza o recurso nativo de <strong>Kiosk Printing do Google Chrome</strong>. Isso significa que você <strong>NÃO precisa instalar programas intermediários pesados ou de terceiros (como QZ Tray ou PrintNode)</strong>.
                            <br/><br/>
                            Com o parâmetro <code className="bg-orange-600/30 text-orange-300 px-2 py-0.5 rounded font-mono">--kiosk-printing</code> configurado no atalho do Chrome, os cupons são enviados <strong>diretamente para a impressora padrão em milissegundos, sem abrir nenhuma janela ou pop-up de confirmação na tela!</strong>
                        </p>
                    </div>

                    {/* Vantagens */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                            <p className="font-black text-xs text-orange-800 uppercase mb-1">🚀 100% Automático</p>
                            <p className="text-xs text-orange-700">Novos pedidos saem sozinhos na impressora térmica assim que chegam.</p>
                        </div>
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                            <p className="font-black text-xs text-emerald-800 uppercase mb-1">🔇 Zero Pop-ups</p>
                            <p className="text-xs text-emerald-700">Não abre caixas de diálogo do Windows para confirmar a impressão.</p>
                        </div>
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                            <p className="font-black text-xs text-blue-800 uppercase mb-1">📶 Centralizado</p>
                            <p className="text-xs text-blue-700">Garçons pedem no celular e o computador do caixa imprime na hora.</p>
                        </div>
                    </div>

                    {/* Passo a Passo de Configuração */}
                    <section className="space-y-4">
                        <h4 className="font-black text-gray-800 text-lg">Guia Passo a Passo de Configuração no Computador do Caixa</h4>

                        {/* Passo 1 */}
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-orange-600 text-white font-black text-xs flex items-center justify-center">1</span>
                                <h5 className="font-black text-gray-800 text-sm">Definir a Impressora Térmica como Padrão no Windows</h5>
                            </div>
                            <p className="text-xs text-gray-600 leading-relaxed ml-8">
                                Conecte sua impressora térmica (USB, Rede Ethernet ou Bluetooth) ao computador. No Windows:
                                <br/><span className="font-semibold text-gray-800">Menu Iniciar &rarr; Configurações &rarr; Dispositivos (ou Bluetooth e dispositivos) &rarr; Impressoras e Scanners</span>.
                                <br/>Clique sobre a sua impressora térmica e escolha <strong>"Definir como Padrão"</strong>.
                            </p>
                        </div>

                        {/* Passo 2 */}
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-orange-600 text-white font-black text-xs flex items-center justify-center">2</span>
                                <h5 className="font-black text-gray-800 text-sm">Configurar o Parâmetro --kiosk-printing no Atalho do Chrome</h5>
                            </div>
                            <p className="text-xs text-gray-600 leading-relaxed ml-8">
                                Na Área de Trabalho do seu computador:
                                <br/>1. Clique com o <strong>botão direito</strong> no ícone do <strong>Google Chrome</strong> e selecione <strong>Propriedades</strong>.
                                <br/>2. Na aba <strong>Atalho</strong>, localize o campo <strong>Destino (Target)</strong>.
                                <br/>3. Vá até o final da linha (após as aspas finais <code className="bg-gray-200 px-1 rounded text-gray-800">...chrome.exe"</code>), dê <strong>um espaço</strong> e adicione o parâmetro:
                            </p>

                            <div className="ml-8 bg-gray-900 text-orange-400 p-3 rounded-xl font-mono text-xs flex items-center justify-between">
                                <span>--kiosk-printing</span>
                                <button
                                    onClick={() => handleCopyCommand('--kiosk-printing', 'flag')}
                                    className="bg-orange-600 hover:bg-orange-500 text-white px-3 py-1 rounded text-[11px] font-sans font-bold transition-all"
                                >
                                    {copiedCommand === 'flag' ? 'Copiado!' : 'Copiar'}
                                </button>
                            </div>

                            <div className="ml-8 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
                                <p className="font-bold mb-1">📌 Exemplo de como deve ficar o campo "Destino":</p>
                                <code className="block bg-white p-2 rounded border border-blue-200 font-mono text-[11px] text-gray-800 overflow-x-auto">
                                    "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk-printing
                                </code>
                            </div>

                            <p className="text-xs text-gray-500 ml-8">
                                4. Clique em <strong>Aplicar</strong> e depois em <strong>OK</strong>.
                                <br/>5. <strong>IMPORTANTE:</strong> Feche todas as janelas abertas do Google Chrome antes de abrir pelo novo atalho para que a configuração entre em vigor.
                            </p>
                        </div>

                        {/* Passo 3 */}
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-orange-600 text-white font-black text-xs flex items-center justify-center">3</span>
                                <h5 className="font-black text-gray-800 text-sm">Ajustar Margens e Cabeçalhos na Primeira Impressão</h5>
                            </div>
                            <p className="text-xs text-gray-600 leading-relaxed ml-8">
                                Na primeira vez que for imprimir um cupom pelo Chrome:
                            </p>
                            <ul className="list-disc list-inside text-xs text-gray-600 space-y-1 ml-8">
                                <li>Em <strong>Destino</strong>: Verifique se sua impressora térmica está selecionada.</li>
                                <li>Em <strong>Mais Definições</strong>:
                                    <ul className="list-circle list-inside ml-4 mt-0.5 space-y-0.5">
                                        <li>Defina <strong>Margens</strong> como: <strong>Nenhuma</strong> (ou Mínima).</li>
                                        <li>Desmarque a caixa <strong>"Cabeçalhos e rodapés"</strong> (para não imprimir data e URL no topo/rodapé da bobina).</li>
                                    </ul>
                                </li>
                            </ul>
                        </div>

                        {/* Passo 4 */}
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-orange-600 text-white font-black text-xs flex items-center justify-center">4</span>
                                <h5 className="font-black text-gray-800 text-sm">Ativar o "Modo Servidor de Impressão" no GuaraFood</h5>
                            </div>
                            <p className="text-xs text-gray-600 leading-relaxed ml-8">
                                Abra o GuaraFood pelo atalho configurado e acesse o menu <strong>Configurações (Config)</strong>:
                            </p>
                            <ul className="list-disc list-inside text-xs text-gray-600 space-y-1 ml-8">
                                <li>Selecione a largura correta da sua bobina: <strong>80mm</strong> (padrão de balcão) ou <strong>58mm</strong> (bobina portátil).</li>
                                <li>Ative a chave <strong>"Modo Servidor de Impressão"</strong> (ative apenas no computador conectado à impressora).</li>
                                <li>Clique no botão <strong>"Imprimir Cupom de Teste"</strong> para validar a saída automática imediata do papel.</li>
                            </ul>
                        </div>
                    </section>

                    {/* Dica para Modo Totem / Tela Cheia */}
                    <div className="p-4 bg-gray-900 text-white rounded-2xl space-y-2 shadow-md">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">💡</span>
                            <h5 className="font-bold text-sm text-orange-400">Dica Pro: Modo Quiosque em Tela Cheia (Caixa/Totem)</h5>
                        </div>
                        <p className="text-xs text-gray-300 leading-relaxed">
                            Se você deseja que o Chrome abra o sistema em tela cheia sem barras de endereço ou abas (ideal para terminais de caixa dedicados), adicione também o parâmetro <code className="text-orange-300 font-mono">--kiosk</code>:
                        </p>
                        <div className="bg-black/50 p-2.5 rounded-lg font-mono text-[11px] text-orange-300 flex items-center justify-between">
                            <span className="overflow-x-auto">--kiosk --kiosk-printing</span>
                            <button
                                onClick={() => handleCopyCommand('--kiosk --kiosk-printing', 'kiosk')}
                                className="bg-orange-600 hover:bg-orange-500 text-white px-2 py-0.5 rounded text-[10px] font-sans font-bold ml-2 shrink-0"
                            >
                                {copiedCommand === 'kiosk' ? 'Copiado!' : 'Copiar'}
                            </button>
                        </div>
                        <p className="text-[11px] text-gray-400">
                            Para fechar o modo quiosque em tela cheia no teclado do computador, basta pressionar <strong>Alt + F4</strong>.
                        </p>
                    </div>

                    {/* Dúvidas Frequentes da Impressão */}
                    <section className="space-y-3">
                        <h4 className="font-black text-gray-800 text-base">Solução de Dúvidas Frequentes</h4>
                        <div className="space-y-2 text-xs">
                            <div className="p-3 bg-gray-50 border rounded-xl">
                                <p className="font-bold text-gray-800">P: A tela de visualização de impressão ainda está aparecendo?</p>
                                <p className="text-gray-600 mt-1">R: Certifique-se de que fechou completamente o Google Chrome (inclusive no ícone ao lado do relógio do Windows) antes de abrir pelo atalho com o parâmetro <code className="bg-gray-200 px-1 rounded">--kiosk-printing</code>.</p>
                            </div>
                            <div className="p-3 bg-gray-50 border rounded-xl">
                                <p className="font-bold text-gray-800">P: O texto está saindo cortado nas laterais do papel?</p>
                                <p className="text-gray-600 mt-1">R: No painel do GuaraFood (Configurações), altere a largura do papel para <strong>58mm</strong> ou <strong>80mm</strong> de acordo com a sua impressora física.</p>
                            </div>
                        </div>
                    </section>
                </div>
            )
        },
        {
            id: 'configuracoes',
            title: 'Configurações e Otimização',
            icon: '⚙️',
            content: (
                <div className="space-y-6">
                    <div className="bg-gradient-to-r from-gray-800 to-gray-700 p-6 rounded-2xl text-white shadow-xl mb-8">
                        <h3 className="text-lg font-black mb-2">O que o GuaraFood faz por você?</h3>
                        <p className="text-sm text-gray-300 leading-relaxed">
                            O GuaraFood centraliza toda a gestão do seu restaurante: desde o recebimento de pedidos via delivery e QR Code nas mesas, até o controle financeiro, gestão de estoque e fidelização de clientes. O menu de <strong>Configurações</strong> é o coração operacional onde você molda o sistema para o seu modelo de negócio.
                        </p>
                    </div>
                    
                    <h4 className="font-black text-gray-800 mb-4 text-lg">Central de Configurações Operacionais</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Alertas Sonoros */}
                        <div className="bg-orange-100 border-l-4 border-orange-500 p-4 rounded-r-xl shadow-sm">
                            <h5 className="font-black text-orange-900 text-sm mb-1">🔔 Alertas Sonoros</h5>
                            <p className="text-xs text-orange-800 mb-2">Ative o som de campainha para não perder nenhum pedido novo.</p>
                            <p className="text-[11px] text-orange-800"><strong>Uso:</strong> Ideal para cozinhas ou caixas movimentados que não podem ficar olhando a tela o tempo todo.</p>
                        </div>

                        {/* Pagamentos */}
                        <div className="bg-emerald-100 border-l-4 border-emerald-500 p-4 rounded-r-xl shadow-sm">
                            <h5 className="font-black text-emerald-900 text-sm mb-1">💳 Pagamentos (Pix Dinâmico)</h5>
                            <p className="text-xs text-emerald-800 mb-2">Configure sua chave Pix ou gateway (Mercado Pago/Asaas) para receber pagamentos automáticos.</p>
                            <p className="text-[11px] text-emerald-800"><strong>Uso:</strong> O sistema gera o QR Code Pix automático no checkout online e nos cupons impressos.</p>
                        </div>

                        {/* Impressora */}
                        <div className="bg-blue-100 border-l-4 border-blue-500 p-4 rounded-r-xl shadow-sm">
                            <h5 className="font-black text-blue-900 text-sm mb-1">🖨️ Impressora Térmica</h5>
                            <p className="text-xs text-blue-800 mb-2">Ajuste a largura (58mm/80mm) e ative a impressão automática para cozinha.</p>
                            <p className="text-[11px] text-blue-800"><strong>Dica:</strong> Use o modo "Servidor de Impressão" no PC do caixa para imprimir pedidos de celulares dos garçons.</p>
                        </div>

                        {/* Banners Promocionais */}
                        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 rounded-r-xl shadow-sm">
                            <h5 className="font-black text-yellow-900 text-sm mb-1">📢 Banners Promocionais</h5>
                            <p className="text-xs text-yellow-800 mb-2">Configure banners de destaque que aparecem no topo do cardápio online do cliente.</p>
                            <p className="text-[11px] text-yellow-800"><strong>Como configurar:</strong> Vá em <em>Marketing</em> &rarr; <em>Banners</em>. Suba uma imagem atraente, coloque um título e um link (opcional) para aumentar a conversão de ofertas.</p>
                        </div>

                        {/* Mensalistas */}
                        <div className="bg-purple-100 border-l-4 border-purple-500 p-4 rounded-r-xl shadow-sm">
                            <h5 className="font-black text-purple-900 text-sm mb-1">🤝 Mensalistas</h5>
                            <p className="text-xs text-purple-800 mb-2">Gerencie clientes fiéis, funcionários ou empresas que pagam mensalmente.</p>
                            <p className="text-[11px] text-purple-800"><strong>Exemplo:</strong> Clientes que almoçam todo dia e acertam a conta no fim do mês.</p>
                        </div>
                        
                        {/* Venda por Peso */}
                        <div className="bg-rose-100 border-l-4 border-rose-500 p-4 rounded-r-xl shadow-sm">
                            <h5 className="font-black text-rose-900 text-sm mb-1">⚖️ Venda por Peso</h5>
                            <p className="text-xs text-rose-800 mb-2">Habilite a venda por peso para buffets ou marmitas personalizadas.</p>
                            <p className="text-[11px] text-rose-800"><strong>Uso:</strong> Garçom digita "480g" e o sistema calcula o valor baseado no preço do kg configurado.</p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'operacao',
            title: 'Operação (KDS e Cozinha)',
            icon: '📋',
            content: (
                <div className="space-y-6">
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">Painel de Pedidos (KDS em Tempo Real)</h4>
                        <p className="text-sm text-gray-600 mb-4">
                            Substitua o papel pelo digital. Coloque uma tela, monitor ou tablet na cozinha para acompanhar os pedidos em colunas organizadas:
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                                <p className="text-[10px] font-black text-blue-800 uppercase">1. Pendentes</p>
                                <p className="text-xs text-blue-600 font-bold">Aceite o pedido.</p>
                            </div>
                            <div className="p-3 bg-orange-50 rounded-xl border border-orange-100">
                                <p className="text-[10px] font-black text-orange-800 uppercase">2. Em Preparo</p>
                                <p className="text-xs text-orange-600 font-bold">Foco na produção.</p>
                            </div>
                            <div className="p-3 bg-green-50 rounded-xl border border-green-100">
                                <p className="text-[10px] font-black text-green-800 uppercase">3. Pronto / Despacho</p>
                                <p className="text-xs text-green-600 font-bold">Aguardando entrega.</p>
                            </div>
                            <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                                <p className="text-[10px] font-black text-purple-800 uppercase">4. Finalizado</p>
                                <p className="text-xs text-purple-600 font-bold">Entregue com sucesso.</p>
                            </div>
                        </div>
                    </section>
                </div>
            )
        },
        {
            id: 'cardapio',
            title: 'Gestão de Cardápio e Preços',
            icon: '🍕',
            content: (
                <div className="space-y-6">
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">1. Categorias, Pizzas e Complementos</h4>
                        <p className="text-sm text-gray-600">Organize seu menu por categorias (Bebidas, Lanches, Sobremesas). Em cada produto, configure:</p>
                        <ul className="list-disc list-inside text-xs text-gray-500 space-y-1 mt-2">
                            <li><strong>Fotos Atraentes:</strong> Imagens de qualidade aumentam em até 40% a taxa de conversão dos clientes.</li>
                            <li><strong>Pausar Item (Esgotado):</strong> Desmarque "Disponível" para que o item suma do cardápio online imediatamente em caso de falta no estoque.</li>
                            <li><strong>Pizzas e Tamanhos:</strong> Configure múltiplos tamanhos (Brotinho, Média, Grande, Família) com precificação dinâmica.</li>
                            <li><strong>Marmitex e Açaís:</strong> Crie grupos de complementos com limites de escolhas gratuitas e valores adicionais para itens extras.</li>
                        </ul>
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
                        <h4 className="font-black text-gray-800 mb-2">Mensalistas ("Fiado" Profissional e Controlado)</h4>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            Cadastre empresas, funcionários ou clientes fiéis que pagam quinzenalmente ou no fim do mês. O sistema acumula as compras automaticamente e permite emitir um extrato completo com data, hora, itens e valores para conferência e quitação rápida.
                        </p>
                    </section>
                    <section>
                        <h4 className="font-black text-gray-800 mb-2">Clube de Fidelidade Automático</h4>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            Habilite nas configurações. O cliente acumula pontos a cada pedido identificado pelo telefone. Ao atingir a meta estipulada, o próprio sistema concede a recompensa (desconto ou item grátis) no Checkout.
                        </p>
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
                        <h4 className="font-black text-gray-800 mb-2">Fechamento de Caixa e Lucro Líquido</h4>
                        <p className="text-sm text-gray-600 mb-4">
                            O GuaraFood separa as vendas por canal (Delivery vs Salão/Mesas) e por modalidade de pagamento (Dinheiro, Pix, Cartão de Crédito, Cartão de Débito, Mensalista).
                        </p>
                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                            <h5 className="text-emerald-800 font-bold text-xs uppercase mb-2">💡 Gestão de Despesas</h5>
                            <p className="text-xs text-emerald-700">
                                Lance suas contas a pagar e despesas diárias (fornecedores, gás, embalagens, folha de pagamento) na aba <strong>Financeiro &rarr; Despesas</strong> para obter o <strong>Lucro Líquido Real</strong> do restaurante.
                            </p>
                        </div>
                    </section>
                </div>
            )
        }
    ];

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header */}
            <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-gray-100 sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        title="Voltar ao Painel"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 text-gray-700">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">Manual & Central de Ajuda</h1>
                        <p className="text-xs text-gray-400 font-medium">Instruções completas de operação e configurações do GuaraFood</p>
                    </div>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                    <span className="px-3 py-1 bg-orange-100 text-orange-800 font-bold text-xs rounded-full">
                        GuaraFood v{APP_VERSION}
                    </span>
                </div>
            </div>

            <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
                {/* Sidebar Navigation */}
                <div className="w-full md:w-80 bg-white border-r border-gray-100 overflow-y-auto p-4 space-y-1.5 flex-shrink-0">
                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-3 mb-2">Tópicos do Sistema</p>
                    {sections.map(section => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition-all text-left ${
                                activeSection === section.id 
                                ? 'bg-orange-600 text-white shadow-md shadow-orange-200 translate-x-1' 
                                : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600'
                            }`}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <span className="text-xl flex-shrink-0">{section.icon}</span>
                                <span className="truncate">{section.title}</span>
                            </div>
                            {section.badge && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase flex-shrink-0 ${
                                    activeSection === section.id 
                                    ? 'bg-white/20 text-white' 
                                    : 'bg-orange-100 text-orange-800'
                                }`}>
                                    {section.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-grow overflow-y-auto p-6 md:p-10 bg-white">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100">
                            <div className="w-16 h-16 bg-orange-100 rounded-3xl flex items-center justify-center text-3xl shadow-inner">
                                {sections.find(s => s.id === activeSection)?.icon}
                            </div>
                            <div>
                                <h2 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight">
                                    {sections.find(s => s.id === activeSection)?.title}
                                </h2>
                                <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">Guia Prático & Operacional</p>
                            </div>
                        </div>

                        <div className="prose prose-orange max-w-none">
                            {sections.find(s => s.id === activeSection)?.content}
                        </div>

                        {/* Footer Help */}
                        <div className="mt-16 pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6 bg-gray-50 p-6 rounded-2xl">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 flex-shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="font-black text-gray-800 text-sm">Precisa de assistência técnica ou treinamento?</h4>
                                    <p className="text-xs text-gray-500">Nosso time de suporte está disponível para ajudar no seu estabelecimento.</p>
                                </div>
                            </div>
                            <a 
                                href="https://wa.me/5535999999999" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="w-full md:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl shadow-md hover:scale-105 transition-all text-center"
                            >
                                Falar no WhatsApp
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HelpCenter;
