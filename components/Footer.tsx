import React, { useState } from 'react';

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
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
);

const LockClosedIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
);

interface FooterProps {
    onLoginClick?: () => void;
}

const Footer: React.FC<FooterProps> = ({ onLoginClick }) => {
  const [showInstallModal, setShowInstallModal] = useState(false);

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
            {/* Botão Como Instalar */}
            <button 
              onClick={() => setShowInstallModal(true)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl hover:bg-white/20 transition-all text-sm font-bold shadow-xl"
            >
              <DevicePhoneMobileIcon className="w-5 h-5" />
              <span>Instalar Aplicativo</span>
            </button>

            {/* Botão WhatsApp Dev */}
            <a 
              href="https://wa.me/5535991048020" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl transition-all text-sm font-black shadow-xl shadow-green-900/20"
            >
              <WhatsAppIcon className="w-5 h-5" />
              <span>Falar com o desenvolvedor</span>
            </a>
          </div>

          <div className="space-y-2">
            <p className="text-lg font-black tracking-tight">
              GUARA<span className="text-orange-500">FOOD</span>
            </p>
            <p className="text-xs text-white/50 max-w-xs mx-auto">
              A única praça de alimentação digital de Guaranésia. Qualidade e rapidez em cada entrega.
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
              &copy; {new Date().getFullYear()} Todos os direitos reservados.
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

      {/* Modal de Instruções de Instalação */}
      {showInstallModal && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex justify-center items-center p-4 animate-fadeIn" 
          onClick={() => setShowInstallModal(false)}
        >
          <div 
            className="bg-white text-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-orange-600 p-5 flex justify-between items-center text-white">
              <h3 className="font-black text-lg uppercase tracking-tight">Instalar no Celular</h3>
              <button onClick={() => setShowInstallModal(false)} className="p-1 hover:bg-black/10 rounded-full">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-8">
              {/* Android Instructions */}
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <DevicePhoneMobileIcon className="w-6 h-6 text-green-600" />
                </div>
                <div>
                    <h4 className="font-black text-gray-900 mb-1">Android (Chrome)</h4>
                    <ol className="text-xs text-gray-600 space-y-2">
                        <li>1. Toque nos <strong>três pontos ⋮</strong> no canto superior.</li>
                        <li>2. Selecione <strong>"Instalar aplicativo"</strong>.</li>
                        <li>3. Confirme em <strong>Adicionar</strong>.</li>
                    </ol>
                </div>
              </div>

              <div className="flex gap-4 border-t pt-6">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <DevicePhoneMobileIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                    <h4 className="font-black text-gray-900 mb-1">iPhone (Safari)</h4>
                    <ol className="text-xs text-gray-600 space-y-2">
                        <li>1. Toque no ícone de <strong>Compartilhar</strong> <ShareIcon className="w-4 h-4 inline" />.</li>
                        <li>2. Role e toque em <strong>"Tela de Início"</strong>.</li>
                        <li>3. Toque em <strong>Adicionar</strong> no topo.</li>
                    </ol>
                </div>
              </div>

              <button 
                onClick={() => setShowInstallModal(false)}
                className="w-full bg-gray-900 text-white font-black py-4 rounded-xl hover:bg-black transition-all shadow-lg uppercase text-xs tracking-widest"
              >
                Pronto, entendi!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Footer;