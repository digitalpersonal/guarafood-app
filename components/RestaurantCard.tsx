
import React from 'react';
import type { Restaurant } from '../types';
import OptimizedImage from './OptimizedImage';
import { timeToMinutes } from '../utils/restaurantUtils';

interface RestaurantCardProps {
  restaurant: Restaurant;
  onClick: (restaurant: Restaurant) => void;
  isOpen: boolean;
}

const WhatsAppIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01s-.521.074-.792.372c-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
  </svg>
);

const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const RestaurantCard: React.FC<RestaurantCardProps> = ({ restaurant, onClick, isOpen }) => {
  const todayIndex = new Date().getDay();
  const todayHours = restaurant.operatingHours?.find(h => h.dayOfWeek === todayIndex);
  const now = new Date();
  const currentTimeMins = now.getHours() * 60 + now.getMinutes();

  // URL WhatsApp
  const cleanedPhone = restaurant.phone.replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/55${cleanedPhone}`;
  
  // Lógica de exibição de horário de hoje
  let hoursDisplay = "Horário não disponível";
  let statusMessage = isOpen ? "Aberto" : "Fechado";

  if (todayHours && todayHours.isOpen) {
      hoursDisplay = `${todayHours.opens} às ${todayHours.closes}`;
      if (todayHours.opens2 && todayHours.closes2) {
          hoursDisplay += ` e ${todayHours.opens2} às ${todayHours.closes2}`;
      }

      if (!isOpen) {
          const open1 = timeToMinutes(todayHours.opens);
          const open2 = todayHours.opens2 ? timeToMinutes(todayHours.opens2) : null;
          
          if (currentTimeMins < open1) {
              statusMessage = `Abre às ${todayHours.opens}`;
          } else if (open2 && currentTimeMins < open2) {
              statusMessage = `Abre às ${todayHours.opens2}`;
          } else {
              statusMessage = "Fechado por hoje";
          }
      }
  } else if (todayHours && !todayHours.isOpen) {
      statusMessage = "Fechado hoje";
  }

  return (
    <div 
      className={`bg-white rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col relative border border-gray-100 ${!isOpen ? 'grayscale opacity-70' : ''}`}
      onClick={() => onClick(restaurant)}
    >
      {/* Badge de Status Superior */}
      {!isOpen && (
        <div className="absolute top-0 right-0 bg-gray-900/90 backdrop-blur-sm text-white text-[10px] font-black px-3 py-1 rounded-bl-xl z-20 uppercase tracking-widest shadow-lg">
            {statusMessage}
        </div>
      )}
      
      <div className="flex items-center gap-4 p-4 flex-grow">
        <OptimizedImage 
          src={restaurant.imageUrl} 
          alt={restaurant.name} 
          className="w-20 h-20 rounded-2xl flex-shrink-0 shadow-sm border border-gray-50"
        />
        <div className="flex-grow min-w-0">
          <h3 className="text-lg font-black text-gray-800 truncate leading-tight mb-0.5">{restaurant.name}</h3>
          
          {restaurant.description && (
             <p className="text-xs text-gray-500 line-clamp-1 mb-2 font-medium">{restaurant.description}</p>
          )}

          {/* Exibição do horário de hoje abaixo da descrição */}
          <div className="flex items-center gap-1.5 mb-2">
            <ClockIcon className={`w-3.5 h-3.5 ${isOpen ? 'text-green-600' : 'text-gray-400'}`} />
            <span className={`text-[11px] font-bold ${isOpen ? 'text-gray-600' : 'text-gray-500'}`}>
                {isOpen ? `Hoje: ${hoursDisplay}` : statusMessage}
            </span>
          </div>

          <div className="flex items-center text-[11px] font-bold text-gray-400 gap-2 flex-wrap">
            <span className="text-orange-600">★ {restaurant.rating || 'Novo'}</span>
            <span className="text-gray-300">•</span>
            <span>{restaurant.category.split(',')[0]}</span>
            <span className="text-gray-300">•</span>
            <span>{restaurant.deliveryTime}</span>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 bg-gray-50/50 border-t border-gray-100 flex justify-between items-center">
        <div className="flex items-center gap-1.5">
            <span className={`text-xs font-black ${restaurant.deliveryFee === 0 ? 'text-emerald-600' : 'text-gray-700'}`}>
                {restaurant.deliveryFee > 0 ? `Entrega R$ ${restaurant.deliveryFee.toFixed(2)}` : 'Entrega Grátis'}
            </span>
        </div>
        
        {restaurant.phone && (
            <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-[10px] font-black text-green-600 uppercase tracking-wider"
            >
                <WhatsAppIcon className="w-3.5 h-3.5" />
                Contato
            </a>
        )}
      </div>
    </div>
  );
};

export default RestaurantCard;
