
import React, { useState } from 'react';
import type { MenuItem, Addon, CartItem } from '../types';
import { useCart } from '../hooks/useCart';
import { useAnimation } from '../hooks/useAnimation';
import { useNotification } from '../hooks/useNotification';
import PizzaCustomizationModal from './PizzaCustomizationModal';
import AcaiCustomizationModal from './AcaiCustomizationModal';
import GenericCustomizationModal from './GenericCustomizationModal';
import OptimizedImage from './OptimizedImage';

// Mapa de imagens genéricas por categoria
const genericImages: Record<string, string> = {
  'Pastel': 'https://images.pexels.com/photos/1230931/pexels-photo-1230931.jpeg?auto=compress&cs=tinysrgb&w=400',
  'Pastelaria': 'https://images.pexels.com/photos/1230931/pexels-photo-1230931.jpeg?auto=compress&cs=tinysrgb&w=400',
  'Lanches': 'https://images.pexels.com/photos/1633578/pexels-photo-1633578.jpeg?auto=compress&cs=tinysrgb&w=400',
  'Sanduíche': 'https://images.pexels.com/photos/1633578/pexels-photo-1633578.jpeg?auto=compress&cs=tinysrgb&w=400',
  'Pizza': 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=400',
  'Bebidas': 'https://images.pexels.com/photos/4021983/pexels-photo-4021983.jpeg?auto=compress&cs=tinysrgb&w=400',
  'Açaí': 'https://images.pexels.com/photos/5945763/pexels-photo-5945763.jpeg?auto=compress&cs=tinysrgb&w=400',
  'Japonesa': 'https://images.pexels.com/photos/1148043/pexels-photo-1148043.jpeg?auto=compress&cs=tinysrgb&w=400',
  'Marmita': 'https://images.pexels.com/photos/10775799/pexels-photo-10775799.jpeg?auto=compress&cs=tinysrgb&w=400',
  'Brasileira': 'https://images.pexels.com/photos/10775799/pexels-photo-10775799.jpeg?auto=compress&cs=tinysrgb&w=400',
  'Doces': 'https://images.pexels.com/photos/1099680/pexels-photo-1099680.jpeg?auto=compress&cs=tinysrgb&w=400'
};

// Função para encontrar a imagem genérica correspondente
const getGenericImageUrl = (category?: string): string | undefined => {
    if (!category) return undefined;
    // Itera sobre as chaves do mapa para encontrar uma correspondência parcial
    for (const key in genericImages) {
        if (category.toLowerCase().includes(key.toLowerCase())) {
            return genericImages[key];
        }
    }
    return undefined;
};


interface MenuItemCardProps {
  item: MenuItem;
  allPizzas: MenuItem[];
  allAddons: Addon[];
  isOpen?: boolean;
  categoryName?: string;
}

const StarIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404.433 2.082-5.006z" clipRule="evenodd" />
  </svg>
);

const CalendarDaysIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25c0 1.242-1.008 2.25-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18.75Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M9 16.5h.008v.008H9V16.5Zm3 0h.008v.008H12V16.5Zm3 0h.008v.008H15V16.5Z" />
  </svg>
);


const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, allPizzas, allAddons, isOpen = true, categoryName }) => {
  const { addToCart } = useCart();
  const { addFlyingItem } = useAnimation();
  const { addToast } = useNotification();
  const [isPizzaModalOpen, setIsPizzaModalOpen] = useState(false);
  const [isAcaiModalOpen, setIsAcaiModalOpen] = useState(false);
  const [isGenericModalOpen, setIsGenericModalOpen] = useState(false);

  // Lógica para determinar a URL da imagem final
  const finalImageUrl = item.imageUrl || getGenericImageUrl(categoryName) || '';

  const handleAddToCartClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!isOpen) {
        addToast({ message: "Este restaurante está fechado agora.", type: 'warning' });
        return;
    }

    if (item.isPizza) {
      setIsPizzaModalOpen(true);
    } else if (item.isAcai) {
      setIsAcaiModalOpen(true);
    } else if (item.availableAddonIds && item.availableAddonIds.length > 0) {
      setIsGenericModalOpen(true);
    } else if (item.sizes && item.sizes.length > 0) {
        setIsGenericModalOpen(true); // Also open for items that just have sizes
    }
    else {
      const rect = event.currentTarget.getBoundingClientRect();
      addFlyingItem(finalImageUrl, rect);
      addToCart(item);
    }
  };

  const handleCustomizedItemAddToCart = (customizedItem: CartItem) => {
    addToCart(customizedItem);
    setIsPizzaModalOpen(false);
    setIsAcaiModalOpen(false);
    setIsGenericModalOpen(false);
  };

  const containerClasses = item.isDailySpecial 
    ? "bg-yellow-50 border border-yellow-200 shadow-md" 
    : "bg-white shadow-sm hover:shadow-md";

  return (
    <>
      <div className={`${containerClasses} rounded-lg overflow-hidden flex p-3 space-x-4 relative transition-all duration-300 group ${!isOpen ? 'opacity-75' : ''}`}>
          
          {/* Badge: Destaque do Dia */}
          {item.isDailySpecial && (
            <div className="absolute top-0 left-0 bg-yellow-500 text-white text-[10px] font-extrabold px-2 py-1 rounded-br-lg z-10 flex items-center gap-1 shadow-sm">
                <StarIcon className="w-3 h-3 text-white" />
                <span>DESTAQUE</span>
            </div>
          )}

          {/* Badge: Promoção */}
          {item.activePromotion && !item.isDailySpecial && (
            <div className="absolute top-0 left-0 bg-orange-600 text-white text-[10px] font-bold px-2 py-1 rounded-br-lg z-10">
                PROMO
            </div>
          )}

          {/* Badge: Menu do Dia (Disponibilidade Limitada) */}
          {item.availableDays && item.availableDays.length > 0 && !item.isDailySpecial && (
             <div className="absolute top-0 left-0 bg-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded-br-lg z-10 flex items-center gap-1">
                <CalendarDaysIcon className="w-3 h-3" />
                <span>HOJE</span>
             </div>
          )}

        <div className="flex-grow pt-4"> 
          <h4 className="font-bold text-md text-gray-800 flex items-center gap-1">
              {item.name}
              {item.isDailySpecial && <StarIcon className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
          </h4>
          
          {item.availableDays && item.availableDays.length > 0 && !item.isDailySpecial && (
              <div className="flex items-center gap-1 text-[10px] text-purple-700 font-semibold bg-purple-50 rounded-full px-2 py-0.5 w-fit my-1 border border-purple-100">
                  <CalendarDaysIcon className="w-3 h-3" />
                  <span>Menu do Dia</span>
              </div>
          )}

          <p className="text-sm text-gray-500 my-1 line-clamp-2">{item.description}</p>
          
          {item.isMarmita && item.marmitaOptions && item.marmitaOptions.length > 0 && (
              <div className="mt-2 p-2 bg-yellow-100/50 border border-yellow-200 rounded-lg">
                <p className="text-xs font-bold text-yellow-800">Composição de Hoje:</p>
                <ul className="text-xs text-yellow-900 list-disc list-inside mt-1">
                    {item.marmitaOptions.map((option, index) => (
                        <li key={index}>{option}</li>
                    ))}
                </ul>
              </div>
            )}

           {item.originalPrice ? (
               <div className="flex items-baseline gap-2 mt-2">
                  <p className="font-bold text-orange-600 text-md">R$ {item.price.toFixed(2)}</p>
                  <p className="text-xs text-gray-400 line-through">R$ {item.originalPrice.toFixed(2)}</p>
              </div>
          ) : (
            <div className="mt-2">
                <p className="font-bold text-orange-600 text-md">
                    R$ {item.price.toFixed(2)}
                </p>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 relative w-24 h-24 self-center">
          <OptimizedImage src={finalImageUrl} alt={item.name} className={`w-full h-full rounded-md shadow-sm ${!isOpen ? 'grayscale' : ''}`} />
          <button 
            onClick={handleAddToCartClick}
            className={`absolute -bottom-2 -right-2 rounded-full w-9 h-9 flex items-center justify-center text-xl font-bold shadow-lg transition-all z-10 transform ${isOpen ? 'bg-gray-800 text-white hover:bg-orange-600 group-hover:scale-110' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
            title={isOpen ? "Adicionar" : "Restaurante Fechado"}
          >
            {isOpen ? '+' : '×'}
          </button>
        </div>
      </div>
      {isPizzaModalOpen && (
        <PizzaCustomizationModal
          isOpen={isPizzaModalOpen}
          onClose={() => setIsPizzaModalOpen(false)}
          onAddToCart={handleCustomizedItemAddToCart}
          initialPizza={item}
          allPizzas={allPizzas}
          allAddons={allAddons}
        />
      )}
       {isAcaiModalOpen && (
        <AcaiCustomizationModal
          isOpen={isAcaiModalOpen}
          onClose={() => setIsAcaiModalOpen(false)}
          onAddToCart={handleCustomizedItemAddToCart}
          initialItem={item}
          allAddons={allAddons}
        />
      )}
       {isGenericModalOpen && (
        <GenericCustomizationModal
          isOpen={isGenericModalOpen}
          onClose={() => setIsGenericModalOpen(false)}
          onAddToCart={handleCustomizedItemAddToCart}
          initialItem={item}
          allAddons={allAddons}
        />
      )}
    </>
  );
};

export default MenuItemCard;
