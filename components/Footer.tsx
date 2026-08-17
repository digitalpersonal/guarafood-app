import React, { useState, useEffect } from 'react';
import { APP_VERSION } from './VersionChecker';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useNotification } from '../hooks/useNotification';

// Icons
const DevicePhoneMobileIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
  </svg>
);

const WhatsAppIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01s-.521.074-.792.372c-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
  </svg>
);

const XMarkIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ShareIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
);

const PlusSquareIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const EllipsisVerticalIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
    </svg>
);

const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.74-5.25z" clipRule="evenodd" />
    </svg>
);

const LockClosedIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
);

interface FooterProps {
    onLoginClick?: () => void;
    onHelpClick?: () => void;
}

const Footer: React.FC<FooterProps> = ({ onLoginClick, onHelpClick }) => {
  const [showInstallModal, setShowInstallModal] = useState(false);
  const { isInstalled, isIOS, isAndroid, canPromptDirectly, triggerInstall } = usePWAInstall();
  const { addToast } = useNotification();
  const [activeTab, setActiveTab] = useState<'ios' | 'android'>('android');

  // Ajusta a aba padrão com base no aparelho detectado
  useEffect(() => {
    if (isIOS) {
      setActiveTab('ios');
    } else {
      setActiveTab('android');
    }
  }, [isIOS]);

  const handleInstallClick = async () => {
    if (isInstalled) {
      addToast({
        type: 'info',
        message: 'O GuaraFood já está instalado no seu aparelho! Acesse direto pelo ícone na sua tela inicial.',
        duration: 4000
      });
      setShowInstallModal(true);
      return;
    }

    // Se estiver no Android/Chrome e o prompt direto estiver pronto
    if (canPromptDirectly) {
      const result = await triggerInstall();
      if (result === 'accepted') {
        addToast({
          type: 'success',
          message: 'Aplicativo adicionado à sua tela inicial com sucesso! 🎉',
          duration: 4000
        });
        return;
      }
    }

    // Caso contrário (iOS, ou Android sem prompt ativo), abre o modal visual
    setShowInstallModal(true);
  };

  const handleDirectInstallFromModal = async () => {
    const result = await triggerInstall();
    if (result === 'accepted') {
      addToast({
        type: 'success',
        message: 'Aplicativo adicionado à sua tela inicial com sucesso! 🎉',
        duration: 4000
      });
      setShowInstallModal(false);
    }
  };

  return (
    <>
      <footer className="relative w-full py-12 mt-auto text-white overflow-hidden bg-gray-900">
        {/* Background Image Container */}
        <div className="absolute inset-0 z-0">
            <img 
                src="https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" 
                alt="Footer Background" 
                className="w-full h-full object-cover opacity-30"
            />
            {/* Dark Overlays for Readability */}
            <div className="absolute inset-0 bg-black/60"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black/80"></div>
        </div>

        <div className="relative z-10 container mx-auto flex flex-col items-center justify-center px-4 text-center space-y-8">
          
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center">
            {/* Botão Como Instalar / Adicionar à Tela Inicial */}
            <button 
              onClick={handleInstallClick}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl hover:bg-white/20 transition-all text-sm font-bold shadow-xl active:scale-95 group"
            >
              <DevicePhoneMobileIcon className="w-5 h-5 text-orange-400 group-hover:scale-110 transition-transform" />
              <span>{isInstalled ? 'App Já Instalado' : 'Instalar Aplicativo'}</span>
            </button>

            {/* Botão Central de Ajuda */}
            {onHelpClick && (
              <button 
                onClick={onHelpClick}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl transition-all text-sm font-black shadow-xl shadow-orange-900/20 active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                </svg>
                <span>Central de Ajuda</span>
              </button>
            )}

            {/* Botão WhatsApp Dev */}
            <a 
              href="https://wa.me/5535991048020" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl transition-all text-sm font-black shadow-xl shadow-green-900/20 active:scale-95"
            >
              <WhatsAppIcon className="w-5 h-5" />
              <span>Suporte Técnico</span>
            </a>
          </div>

          <div className="space-y-2">
            <p className="text-lg font-black tracking-tight">
              GUARA<span className="text-orange-500">FOOD</span>
            </p>
            <p className="text-xs text-white/50 max-w-xs mx-auto">
              A sua praça de alimentação digital. Qualidade e rapidez em cada entrega.
            </p>
          </div>

          <div className="pt-4 border-t border-white/10 w-full max-w-lg space-y-4">
            <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold">
              Desenvolvido por Multiplus
            </p>
            <p className="text-sm font-bold text-white/80">
              Sílvio T. de Sá Filho
            </p>
            <p className="text-[10px] text-white/30">
              &copy; {new Date().getFullYear()} Todos os direitos reservados. • v{APP_VERSION}
            </p>
          </div>

          {/* Botão de Acesso Restrito (Discreto) */}
          {onLoginClick && (
            <button 
              onClick={onLoginClick}
              className="mt-6 flex items-center gap-1.5 text-[9px] text-white/20 hover:text-white/60 transition-colors uppercase font-black tracking-widest p-2 border border-white/5 rounded-lg hover:bg-white/5"
              title="Acesso Restrito para Lojistas"
            >
              <LockClosedIcon className="w-3 h-3" />
              <span>Portal do Parceiro</span>
            </button>
          )}
        </div>
      </footer>

      {/* Modal Inteligente de Instalação no Celular */}
      {showInstallModal && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex justify-center items-end sm:items-center p-0 sm:p-4 animate-fadeIn" 
          onClick={() => setShowInstallModal(false)}
        >
          <div 
            className="bg-white text-gray-800 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-600 to-orange-500 p-5 flex justify-between items-center text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <DevicePhoneMobileIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-lg uppercase tracking-tight leading-tight">Adicionar à Tela Inicial</h3>
                  <p className="text-[11px] text-orange-100 font-medium">Acesse o GuaraFood como um App nativo</p>
                </div>
              </div>
              <button 
                onClick={() => setShowInstallModal(false)} 
                className="p-2 hover:bg-white/20 rounded-full transition-colors active:scale-90"
                aria-label="Fechar"
              >
                <XMarkIcon className="w-6 h-6 text-white" />
              </button>
            </div>

            {/* Aviso se já estiver instalado */}
            {isInstalled && (
              <div className="bg-emerald-50 border-b border-emerald-100 p-3.5 flex items-center gap-2.5 text-emerald-800 text-xs font-bold">
                <CheckCircleIcon className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span>O aplicativo já está instalado no seu aparelho!</span>
              </div>
            )}

            {/* Seletor de Abas (iPhone vs Android) */}
            <div className="grid grid-cols-2 p-2 bg-gray-100 border-b border-gray-200 gap-1 text-xs font-black">
              <button
                type="button"
                onClick={() => setActiveTab('android')}
                className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'android' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <span>🤖 Android</span>
                {isAndroid && <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ios')}
                className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'ios' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <span>🍏 iPhone (iOS)</span>
                {isIOS && <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>}
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto">
              {activeTab === 'android' ? (
                /* Conteúdo Android */
                <div className="space-y-4">
                  {canPromptDirectly && (
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl text-center space-y-3">
                      <p className="text-xs font-bold text-orange-900">
                        Seu navegador é compatível com a instalação automática em 1 toque:
                      </p>
                      <button
                        onClick={handleDirectInstallFromModal}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-3.5 px-4 rounded-xl transition-all shadow-md shadow-orange-600/30 text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95"
                      >
                        <DevicePhoneMobileIcon className="w-5 h-5" />
                        <span>Instalar no Celular Agora</span>
                      </button>
                    </div>
                  )}

                  <div className="space-y-3">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider">
                      Passo a passo no Google Chrome / Samsung Internet:
                    </p>

                    <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                      <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 font-black text-xs flex items-center justify-center flex-shrink-0">
                        1
                      </div>
                      <div className="text-xs">
                        <p className="font-bold text-gray-900">Abra o menu do navegador</p>
                        <p className="text-gray-600 mt-0.5 flex items-center gap-1">
                          Toque nos <strong>três pontos</strong> <EllipsisVerticalIcon className="w-4 h-4 inline text-gray-700" /> no canto superior direito.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                      <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 font-black text-xs flex items-center justify-center flex-shrink-0">
                        2
                      </div>
                      <div className="text-xs">
                        <p className="font-bold text-gray-900">Selecione a opção de instalar</p>
                        <p className="text-gray-600 mt-0.5">
                          Toque em <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                      <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 font-black text-xs flex items-center justify-center flex-shrink-0">
                        3
                      </div>
                      <div className="text-xs">
                        <p className="font-bold text-gray-900">Confirme a criação do atalho</p>
                        <p className="text-gray-600 mt-0.5">
                          Clique em <strong>"Instalar"</strong>. O ícone do GuaraFood aparecerá na sua tela inicial!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Conteúdo iPhone (iOS Safari) */
                <div className="space-y-4">
                  <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-2xl text-xs text-blue-900">
                    <p className="font-bold">📱 No iPhone (Safari):</p>
                    <p className="text-blue-700 text-[11px] mt-0.5">
                      A Apple requer que o atalho seja adicionado através do botão de compartilhamento do Safari.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center flex-shrink-0">
                        1
                      </div>
                      <div className="text-xs">
                        <p className="font-bold text-gray-900">Toque em Compartilhar</p>
                        <p className="text-gray-600 mt-0.5 flex items-center gap-1.5 flex-wrap">
                          Na barra inferior do Safari, toque no ícone 
                          <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-gray-200 font-bold text-blue-600">
                            <ShareIcon className="w-3.5 h-3.5 inline" /> Compartilhar
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center flex-shrink-0">
                        2
                      </div>
                      <div className="text-xs">
                        <p className="font-bold text-gray-900">Adicionar à Tela de Início</p>
                        <p className="text-gray-600 mt-0.5 flex items-center gap-1.5 flex-wrap">
                          Role as opções para baixo e toque em
                          <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-gray-200 font-bold text-gray-800">
                            <PlusSquareIcon className="w-3.5 h-3.5 inline" /> Tela de Início
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center flex-shrink-0">
                        3
                      </div>
                      <div className="text-xs">
                        <p className="font-bold text-gray-900">Conclua no topo</p>
                        <p className="text-gray-600 mt-0.5">
                          Toque em <strong>"Adicionar"</strong> no canto superior direito. Pronto!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button 
                onClick={() => setShowInstallModal(false)}
                className="w-full bg-gray-900 hover:bg-black text-white font-black py-3.5 rounded-xl transition-all shadow-lg uppercase text-xs tracking-widest active:scale-95"
              >
                Entendi, fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Footer;
