import React, { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UpdateNotificationProps {
  registration: ServiceWorkerRegistration | null;
  onUpdating?: () => void;
}

const UpdateNotification: React.FC<UpdateNotificationProps> = ({ registration, onUpdating }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (registration && registration.waiting) {
      setShow(true);
    }
  }, [registration]);

  const updateApp = () => {
    if (registration && registration.waiting) {
      if (onUpdating) onUpdating();
      
      // Envia comando para o SW pular a espera
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Escuta quando o novo SW assume o controle e recarrega
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-24 left-4 right-4 z-[9999] md:left-auto md:right-8 md:w-96"
        >
          <div className="bg-orange-600 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 border border-orange-500/30 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <RefreshCw className="w-5 h-5 animate-spin-slow" />
              </div>
              <div>
                <h4 className="font-black text-sm uppercase tracking-tight">Nova Versão!</h4>
                <p className="text-[10px] font-bold opacity-90 uppercase tracking-widest">Atualize para as novidades</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={updateApp}
                className="bg-white text-orange-600 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-tighter hover:bg-orange-50 transition-colors active:scale-95 shadow-lg"
              >
                Atualizar
              </button>
              <button
                onClick={() => setShow(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UpdateNotification;
