
import React, { useState } from 'react';
import type { MenuItem, Addon, CartItem } from '../types';
import { useCart } from '../hooks/useCart';
import { useAnimation } from '../hooks/useAnimation';
import PizzaCustomizationModal from './PizzaCustomizationModal';
import AcaiCustomizationModal from './AcaiCustomizationModal';
import GenericCustomizationModal from './GenericCustomizationModal';
import OptimizedImage from './OptimizedImage';

interface MenuItemCardProps {
  item: MenuItem;
  allPizzas: MenuItem[];
  allAddons: Addon[];
}

const StarIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M10.868 2.884c.321-.662 1.215-.662 1.536 0l1.82 3.745 4.13.602c.73.107 1.02.998.494 1.506l-2.988 2.91.705 4.114c.124.726-.635 1.28-1.288.943L10 15.158l-3.69 1.94c-.653.337-1.412-.217-1.288-.943l.705-4.114-2.988-2.91c-.525-.508-.236-1.399.494-1.506l4.13-.602 1.82-3.745z" clipRule="evenodd" />
  </svg>
);

const CalendarDaysIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25c0 1.242-1.008 2.25-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18.75Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M9 16.5h.008v.008H9V16.5Zm3 0h.008v.008H12V16.5Zm3 0h.008v.008H15V16.5Z" />
  </svg>
);


const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, allPizzas, allAddons }) => {
  const { addToCart } = useCart();
  const { addFlyingItem } = useAnimation();
  const [isPizzaModalOpen, setIsPizzaModalOpen] = useState(false);
  const [isAcaiModalOpen, setIsAcaiModalOpen] = useState(false);
  const [isGenericModalOpen, setIsGenericModalOpen] = useState(false);


  const handleAddToCartClick = (event: React.MouseEvent<HTMLButtonElement>) => {
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
      addFlyingItem(item.imageUrl, rect);
      addToCart(item);
    }
  };

  const handleCustomizedItemAddToCart = (customizedItem: CartItem) => {
    // For now, add to cart without animation from the modal, as getting the button rect is complex.
    addToCart(customizedItem);
    setIsPizzaModalOpen(false);
    setIsAcaiModalOpen(false);
    setIsGenericModalOpen(false);
  };

  return (
    <>
      <div className="bg-white rounded-lg overflow-hidden flex p-3 space-x-4 relative shadow-sm hover:shadow-md transition-shadow">
          {item.isDailySpecial && (
            <div className="absolute top-0 left-0 bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-br-lg z-10 flex items-center gap-1">
                <StarIcon className="w-3 h-3" />
                <span>DESTAQUE DO DIA</span>
            </div>
          )}
          {item.activePromotion && !item.isDailySpecial && (
            <div className="absolute top-0 left-0 bg-orange-600 text-white text-xs font-bold px-2 py-0.5 rounded-br-lg z-10">
                PROMO
            </div>
        )}
        <div className="flex-grow">
          <h4 className="font-bold text-md text-gray-800">{item.name}</h4>
          {item.availableDays && item.availableDays.length > 0 && !item.isDailySpecial && (
              <div className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 rounded-full px-2 py-0.5 w-fit my-1" title="Disponível apenas em dias específicos da semana">
                  <CalendarDaysIcon className="w-3 h-3" />
                  <span>Menu do Dia</span>
              </div>
          )}
          <p className="text-sm text-gray-500 my-1 line-clamp-2">{item.description}</p>
          {item.isMarmita && item.marmitaOptions && item.marmitaOptions.length > 0 && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-300 rounded-lg">
                <p className="text-xs font-bold text-yellow-800">Composição de Hoje:</p>
                <ul className="text-sm text-yellow-900 list-disc list-inside space-y-1 mt-1">
                    {item.marmitaOptions.map((option, index) => (
                        <li key={index}>{option}</li>
                    ))}
                </ul>
              </div>
            )}
           {item.originalPrice ? (
               <div className="flex items-baseline gap-2">
                  <p className="font-bold text-orange-600 text-md">R$ {item.price.toFixed(2)}</p>
                  <p className="text-sm text-gray-500 line-through">R$ {item.originalPrice.toFixed(2)}</p>
              </div>
          ) : (
            <div>
                {item.sizes && item.sizes.length > 0 ? (
                    <p className="font-bold text-orange-600 text-md">
                        A partir de R$ {item.price.toFixed(2)}
                    </p>
                ) : (
                    <p className="font-bold text-orange-600 text-md">
                        R$ {item.price.toFixed(2)}
                    </p>
                )}
            </div>
          )}
        </div>
        <div className="flex-shrink-0 relative w-24 h-24">
          <OptimizedImage src={item.imageUrl} alt={item.name} className="w-full h-full rounded-md" />
          <button 
            onClick={handleAddToCartClick}
            className="absolute -bottom-2 -right-2 bg-gray-800 text-white rounded-full w-9 h-9 flex items-center justify-center text-xl font-bold shadow-lg hover:bg-orange-600 transition-colors z-10"
          >
            +
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
