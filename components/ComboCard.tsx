

import React, { useMemo, useState } from 'react';
import type { Combo, MenuItem } from '../types.ts';
import { useCart } from '../hooks/useCart.ts';
import { useAnimation } from '../hooks/useAnimation.ts';
import OptimizedImage from './OptimizedImage.tsx';

interface ComboCardProps {
  combo: Combo;
  menuItems: MenuItem[];
}

const ComboDetailsModal: React.FC<{ combo: Combo; items: MenuItem[]; onClose: () => void }> = ({ combo, items, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose} aria-modal="true" role="dialog" aria-labelledby="combo-details-modal-title">
        <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-3 mb-4">
                <h2 id="combo-details-modal-title" className="text-xl font-bold text-gray-800">{combo.name}</h2>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl font-bold" aria-label="Fechar">&times;</button>
            </div>
            <div className="overflow-y-auto space-y-4 pr-2 -mr-2">
                <div className="w-full h-48 mb-2">
                    <OptimizedImage src={combo.imageUrl} alt={combo.name} className="w-full h-full rounded-md" />
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
                            <OptimizedImage src={item.imageUrl} alt={item.name} className="w-14 h-14 rounded-md flex-shrink-0" />
                            <div className="flex-grow">
                                <p className="font-semibold text-gray-800">{item.name}</p>
                                <p className="text-sm text-gray-500 line-clamp-1">{item.description}</p>
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

const ComboCard: React.FC<ComboCardProps> = ({ combo, menuItems }) => {
  const { addToCart } = useCart();
  const { addFlyingItem } = useAnimation();
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);

  const includedItems = useMemo(() => {
    return combo.menuItemIds
      .map(id => menuItems.find(item => item.id === id))
      .filter((item): item is MenuItem => !!item);
  }, [combo.menuItemIds, menuItems]);
  
  const handleAddToCart = (event: React.MouseEvent<HTMLButtonElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      addFlyingItem(combo.imageUrl, rect);
      addToCart(combo);
  };
  
  const tagText = combo.activePromotion ? 'PROMO' : 'COMBO';

  return (
    <>
      <div className={`rounded-lg overflow-hidden flex p-3 space-x-4 border-2 shadow-lg relative ${combo.activePromotion ? 'bg-orange-50 border-orange-400' : 'bg-amber-50 border-yellow-400'}`}>
        <div className={`absolute top-0 -left-2 transform -rotate-45 text-black text-xs font-extrabold px-4 py-1 rounded-br-lg rounded-tl-sm shadow-md ${combo.activePromotion ? 'bg-orange-500 text-white' : 'bg-yellow-400'}`}>
            {tagText}
        </div>
        <div className="flex-grow flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-md text-gray-800 mt-2">{combo.name}</h4>
            <div className="text-xs text-gray-500 my-1 space-y-0.5">
                {includedItems.map(item => (
                    <p key={item.id} className="truncate">+ {item.name}</p>
                ))}
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <div>
              {combo.originalPrice ? (
                <div className="flex items-baseline gap-2">
                    <p className="font-bold text-orange-600 text-md">R$ {combo.price.toFixed(2)}</p>
                    <p className="text-sm text-gray-500 line-through">R$ {combo.originalPrice.toFixed(2)}</p>
                </div>
              ) : (
                <p className="font-bold text-orange-600 text-md">R$ {combo.price.toFixed(2)}</p>
              )}
            </div>
            <button onClick={() => setIsDetailsVisible(true)} className="text-xs font-semibold text-blue-600 hover:underline px-2 py-1 rounded-md hover:bg-blue-50">
                Ver Detalhes
            </button>
          </div>
        </div>
        <div className="flex-shrink-0 relative w-24 h-24">
          <OptimizedImage src={combo.imageUrl} alt={combo.name} className="w-full h-full rounded-md" />
          <button 
            onClick={handleAddToCart}
            className="absolute -bottom-2 -right-2 bg-gray-800 text-white rounded-full w-9 h-9 flex items-center justify-center text-xl font-bold shadow-lg hover:bg-orange-600 transition-colors z-10"
            aria-label={`Adicionar ${combo.name} ao carrinho`}
          >
            +
          </button>
        </div>
      </div>
      {isDetailsVisible && <ComboDetailsModal combo={combo} items={includedItems} onClose={() => setIsDetailsVisible(false)} />}
    </>
  );
};

export default ComboCard;