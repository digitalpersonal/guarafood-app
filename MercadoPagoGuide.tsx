import React, { useState } from 'react';
import { SUPABASE_URL } from '../config';

const MercadoPagoGuide: React.FC<{ restaurantId: number }> = ({ restaurantId }) => {
    const [currentStep, setCurrentStep] = useState(1);
    
    // Fallback to a placeholder if the restaurant id isn't valid or we are still loading, though it should be
    const webhookUrl = restaurantId ? `${SUPABASE_URL}/functions/v1/payment-webhook?restaurantId=${restaurantId}` : 'Carregando URL...';

    const handleCopyWebhook = () => {
        navigator.clipboard.writeText(webhookUrl);
        alert('URL copiada para a área de transferência!');
    };

    return (
        <div className="mt-6 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-gray-50 border-b border-gray-200 p-4">
                <h4 className="font-black text-gray-800 text-sm uppercase tracking-wider flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                    </svg>
                    Guia de Configuração do Pix (Mercado Pago)
                </h4>
                <p className="text-xs text-gray-500 mb-0 mt-1">Conclua estes 3 passos simples para o seu PIX funcionar de forma automática via Mercado Pago.</p>
            </div>
            
            <div className="p-5">
                <div className="relative border-l-2 border-orange-200 ml-3 pl-6 space-y-8">
                    
                    {/* Passo 1 - Gerar Token */}
                    <div className={`relative transition-all duration-300 ${currentStep === 1 ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}>
                        <div className={`absolute -left-[35px] flex items-center justify-center w-6 h-6 rounded-full border-2 text-xs font-bold bg-white cursor-pointer ${currentStep === 1 ? 'border-orange-500 text-orange-500' : currentStep > 1 ? 'border-green-500 text-green-500' : 'border-gray-300 text-gray-400'}`} onClick={() => setCurrentStep(1)}>
                            {currentStep > 1 ? '✓' : '1'}
                        </div>
                        <div>
                            <h5 className={`font-bold text-sm ${currentStep === 1 ? 'text-gray-900' : 'text-gray-600'}`}>Gerar credenciais de produção</h5>
                            <ol className="list-decimal ml-4 mt-2 text-xs text-gray-600 space-y-1">
                                <li>Acesse o painel para desenvolvedores do Mercado Pago.</li>
                                <li>Crie uma nova aplicação (ou abra uma existente).</li>
                                <li>No menu à esquerda, vá em <strong>Credenciais de produção</strong>.</li>
                                <li>Copie o <strong>Access Token</strong> e cole no campo "Token Mercado Pago" acima.</li>
                            </ol>
                            {currentStep === 1 && (
                                <button onClick={() => setCurrentStep(2)} className="mt-3 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold py-1.5 px-4 rounded-lg">Próximo Passo</button>
                            )}
                        </div>
                    </div>

                    {/* Passo 2 - Webhooks */}
                    <div className={`relative transition-all duration-300 ${currentStep === 2 ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}>
                        <div className={`absolute -left-[35px] flex items-center justify-center w-6 h-6 rounded-full border-2 text-xs font-bold bg-white cursor-pointer ${currentStep === 2 ? 'border-orange-500 text-orange-500' : currentStep > 2 ? 'border-green-500 text-green-500' : 'border-gray-300 text-gray-400'}`} onClick={() => setCurrentStep(2)}>
                            {currentStep > 2 ? '✓' : '2'}
                        </div>
                        <div>
                            <h5 className={`font-bold text-sm ${currentStep === 2 ? 'text-gray-900' : 'text-gray-600'}`}>Configurar Webhooks (Notificações)</h5>
                            <p className="text-xs text-gray-600 mt-1">Isso avisa o sistema automaticamente quando o cliente pagar o PIX.</p>
                            <ol className="list-decimal ml-4 mt-2 text-xs text-gray-600 space-y-1">
                                <li>Ainda no painel da sua aplicação no Mercado Pago, clique em <strong>Notificações Webhooks</strong>.</li>
                                <li>Cole a URL exclusiva do seu restaurante:</li>
                                <li className="list-none mt-2">
                                    <div className="flex items-center gap-2 bg-gray-100 p-2 rounded border">
                                        <code className="text-[10px] text-gray-800 break-all flex-1">{webhookUrl}</code>
                                        <button onClick={handleCopyWebhook} className="bg-white border rounded px-2 py-1 text-xs hover:bg-gray-50 uppercase font-bold text-gray-600 shrink-0">Copiar</button>
                                    </div>
                                </li>
                                <li>Na seção <strong>Eventos</strong>, marque APENAS a opção <strong>Pagamentos (payments)</strong>.</li>
                                <li>Salve as configurações.</li>
                            </ol>
                            {currentStep === 2 && (
                                <button onClick={() => setCurrentStep(3)} className="mt-3 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold py-1.5 px-4 rounded-lg">Próximo Passo</button>
                            )}
                        </div>
                    </div>

                    {/* Passo 3 - Chave Pix */}
                    <div className={`relative transition-all duration-300 ${currentStep === 3 ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}>
                        <div className={`absolute -left-[35px] flex items-center justify-center w-6 h-6 rounded-full border-2 text-xs font-bold bg-white cursor-pointer ${currentStep === 3 ? 'border-orange-500 text-orange-500' : 'border-gray-300 text-gray-400'}`} onClick={() => setCurrentStep(3)}>
                            3
                        </div>
                        <div>
                            <h5 className={`font-bold text-sm ${currentStep === 3 ? 'text-gray-900' : 'text-gray-600'}`}>Habilitar a Chave PIX (Importante!)</h5>
                            <p className="text-xs text-gray-600 mt-1">Sem isso, o Mercado Pago vai recusar a geração dos pagamentos.</p>
                            <ol className="list-decimal ml-4 mt-2 text-xs text-gray-600 space-y-1">
                                <li>Abra o <strong>aplicativo do Mercado Pago</strong> no celular ou acesse sua conta pelo site principal (não o painel de desenvolvedores).</li>
                                <li>Acesse a área de <strong>Seu Negócio</strong>  &gt; <strong>Configurações</strong> &gt; <strong>Recebimentos com Pix</strong> (pode variar de acordo com a conta).</li>
                                <li>Ou vá em <strong>Pix</strong> e certifique-se de que existe uma chave (CPF/CNPJ, E-mail, Celular ou Aleatória) cadastrada na conta vinculada ao Access Token.</li>
                            </ol>
                            {currentStep === 3 && (
                                <div className="mt-3 flex gap-2">
                                    <button onClick={() => setCurrentStep(1)} className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold py-1.5 px-4 rounded-lg">Voltar ao Início</button>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default MercadoPagoGuide;
