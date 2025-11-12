
import React from 'react';
import type { Restaurant } from '../types';

interface RestaurantCardProps {
  restaurant: Restaurant;
  onClick: () => void;
  isOpen: boolean;
}

const StarIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M10.868 2.884c.321-.662 1.215-.662 1.536 0l1.82 3.745 4.13.602c.73.107 1.02.998.494 1.506l-2.988 2.91.705 4.114c.124.726-.635 1.28-1.288.943L10 15.158l-3.69 1.94c-.653.337-1.412-.217-1.288-.943l.705-4.114-2.988-2.91c-.525-.508-.236-1.399.494-1.506l4.13-.602 1.82-3.745z" clipRule="evenodd" />
  </svg>
);

const CreditCardIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.25 6.75v10.5A2.25 2.25 0 004.5 19.5z" />
  </svg>
);

const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const WhatsAppIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01s-.521.074-.792.372c-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
  </svg>
);


const RestaurantCard: React.FC<RestaurantCardProps> = ({ restaurant, onClick, isOpen }) => {

  const cleanedPhone = restaurant.phone.replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/55${cleanedPhone}`;

  return (
    <div 
      className={`bg-white rounded-lg shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col relative ${!isOpen ? 'opacity-60' : ''}`}
      onClick={onClick}
    >
      {!isOpen && (
        <div className="absolute top-0 right-0 bg-gray-700 text-white text-xs font-bold px-2 py-0.5 rounded-bl-lg z-10">
            FECHADO
        </div>
      )}
      <div className="bg-orange-600 text-white text-sm font-bold px-4 py-1 text-center">
        {restaurant.category}
      </div>
      <div className="flex items-center space-x-4 p-3 flex-grow">
        <img src={restaurant.imageUrl} alt={restaurant.name} className="w-20 h-20 rounded-md object-cover flex-shrink-0" loading="lazy" />
        <div className="flex-grow min-w-0">
          <h3 className="text-lg font-bold text-gray-800 truncate">{restaurant.name}</h3>
          <div className="flex items-center text-sm text-gray-500 mt-1 flex-wrap">
            <StarIcon className="w-4 h-4 text-yellow-500 mr-1" />
            <span className="font-bold text-yellow-600">{restaurant.rating.toFixed(1)}</span>
            <span className="mx-2">&bull;</span>
            <span>{restaurant.deliveryTime}</span>
            <span className="mx-2">&bull;</span>
            <span>{restaurant.deliveryFee > 0 ? `R$ ${restaurant.deliveryFee.toFixed(2)}` : 'Grátis'}</span>
            {restaurant.openingHours && restaurant.closingHours && (
              <>
                <span className="mx-2">&bull;</span>
                <div className="flex items-center">
                  <ClockIcon className="w-4 h-4 mr-1 flex-shrink-0" />
                  <span>{restaurant.openingHours} - {restaurant.closingHours}</span>
                </div>
              </>
            )}
          </div>
          {restaurant.paymentGateways && restaurant.paymentGateways.length > 0 && (
            <div className="flex items-center text-xs text-gray-500 mt-2" title={`Aceita: ${restaurant.paymentGateways.join(', ')}`}>
              <CreditCardIcon className="w-4 h-4 mr-1.5 flex-shrink-0" />
              <span className="truncate">{restaurant.paymentGateways.join(', ')}</span>
            </div>
          )}
           {restaurant.phone && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center text-xs text-green-600 mt-2 group"
                aria-label={`Conversar com ${restaurant.name} no WhatsApp`}
              >
                  <WhatsAppIcon className="w-4 h-4 mr-1.5 flex-shrink-0" />
                  <span className="group-hover:underline font-semibold">{restaurant.phone}</span>
              </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default RestaurantCard;