import React, { useMemo, useState } from 'react';
import type { Combo, MenuItem } from '../types';
import { useCart } from '../hooks/useCart';
import { useAnimation } from '../hooks/useAnimation';
import { useNotification } from '../hooks/useNotification';
import OptimizedImage from './OptimizedImage';

interface ComboCardProps {
  combo: Combo;
  menuItems: MenuItem[];
  isOpen?: boolean;
}

const ComboDetailsModal: React.FC<{ combo: Combo; items: MenuItem[]; onClose: () => void }> = ({ combo, items, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose} aria-modal="true" role="dialog" aria-labelledby="combo-details-modal-title">
        <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-3 mb-4">
                <h2 id="combo-details-modal-title" className="text-xl font-bold text-gray-800">{combo.name}</h2>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl font-bold" aria-label="Fechar">&times;</button>
            </div>
            <div className="overflow-y-auto space-y-4 pr-2 -mr-2">
                <div className="w-full h-48 mb-2">
                    <OptimizedImage src={combo.imageUrl} alt={combo.name} className="w-full h-full rounded-xl object-cover" />
                </div>
                {combo.originalPrice ? (
                    <div className="flex items-baseline gap-2">
                        <p className="font-bold text-orange-600 text-2xl">R$ {combo.price.toFixed(2)}</p>
                        <p className="text-lg text-gray-500 line-through">R$ {combo.originalPrice.toFixed(2)}</p>
                    </div>
                ) : (
                    <p className="font-bold text-orange-600 text-2xl">R$ {combo.price.toFixed(2)}</p>
                )}
                <p className="text-gray-600">{combo.description || 'Este combo delicioso inclui uma seleção especial de nossos melhores itens.'}</p>
                
                <h3 className="font-bold text-gray-700 border-b pb-1 mb-2">Itens Inclusos:</h3>
                <ul className="space-y-3">
                    {items.map(item => (
                        <li key={item.id} className="flex items-center space-x-4 p-2 bg-gray-50 rounded-lg">
                            <OptimizedImage src={item.imageUrl} alt={item.name} className="w-14 h-14 rounded-md flex-shrink-0 object-cover" />
                            <div className="flex-grow">
                                <p className="font-semibold text-gray-800">{item.name}</p>
                                <p className="text-sm text-gray-500">{item.description}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="mt-6 pt-4 border-t flex justify-end">
                <button onClick={onClose} className="px-6 py-2 rounded-lg bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300">
                    Fechar
                </button>
            </div>
        </div>
    </div>
);

const ComboCard: React.FC<ComboCardProps> = ({ combo, menuItems, isOpen = true }) => {
  const { addToCart } = useCart();
  const { addFlyingItem } = useAnimation();
  const { addToast } = useNotification();
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);

  const includedItems = useMemo(() => {
    return combo.menuItemIds
      .map(id => menuItems.find(item => item.id === id))
      .filter((item): item is MenuItem => !!item);
  }, [combo.menuItemIds, menuItems]);
  
  const handleAddToCart = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (!isOpen) {
          addToast({ message: "Este restaurante está fechado agora.", type: 'warning' });
          return;
      }
      const rect = event.currentTarget.getBoundingClientRect();
      addFlyingItem(combo.imageUrl, rect);
      addToCart(combo);
  };
  
  const tagText = combo.activePromotion ? 'PROMO' : 'COMBO';

  return (
    <>
      <div className={`rounded-2xl overflow-hidden flex flex-col p-4 border-2 shadow-lg relative ${combo.activePromotion ? 'bg-orange-50 border-orange-400' : 'bg-white border-gray-100'} ${!isOpen ? 'grayscale opacity-75' : ''}`}>
        <div className={`absolute top-0 left-0 text-black text-xs font-extrabold px-4 py-1 rounded-br-lg rounded-tl-xl shadow-md ${combo.activePromotion ? 'bg-orange-500 text-white' : 'bg-yellow-400'}`}>
            {tagText}
        </div>
        
        <div className="flex gap-4 mb-4 mt-4">
            <OptimizedImage src={combo.imageUrl} alt={combo.name} className="w-20 h-20 rounded-xl flex-shrink-0 object-cover" />
            <div className="flex-grow">
                <h4 className="font-black text-lg text-gray-800 leading-tight">{combo.name}</h4>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{combo.description}</p>
            </div>
        </div>

        {/* Horizontal scrollable list of items */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
            {includedItems.map(item => (
                <div key={item.id} className="flex-shrink-0 flex flex-col items-center w-16">
                    <OptimizedImage src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded-lg object-cover shadow-sm" />
                    <span className="text-[10px] text-gray-600 mt-1 text-center truncate w-full">{item.name}</span>
                </div>
            ))}
        </div>

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
            <div>
              {combo.originalPrice ? (
                <div className="flex items-baseline gap-2">
                    <p className="font-bold text-orange-600 text-lg">R$ {combo.price.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 line-through">R$ {combo.originalPrice.toFixed(2)}</p>
                </div>
              ) : (
                <p className="font-bold text-orange-600 text-lg">R$ {combo.price.toFixed(2)}</p>
              )}
            </div>
            <div className="flex gap-2">
                <button onClick={() => setIsDetailsVisible(true)} className="text-xs font-semibold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                    Detalhes
                </button>
                <button 
                    onClick={handleAddToCart}
                    className={`rounded-lg px-4 py-1.5 font-bold text-sm transition-all ${isOpen ? 'bg-gray-800 text-white hover:bg-orange-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                >
                    Adicionar
                </button>
            </div>
        </div>
      </div>
      {isDetailsVisible && <ComboDetailsModal combo={combo} items={includedItems} onClose={() => setIsDetailsVisible(false)} />}
    </>
  );
};

export default ComboCard;