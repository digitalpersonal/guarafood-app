
import type { Restaurant } from '../types';

// Helper to convert "HH:MM" string to minutes from midnight
export const timeToMinutes = (timeString: string): number => {
    if (!timeString) return 0;
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
};

export const checkTimeRange = (currentTime: number, openStr: string, closeStr: string): boolean => {
    if (!openStr || !closeStr) return false;
    const openTime = timeToMinutes(openStr);
    const closeTime = timeToMinutes(closeStr);

    if (closeTime < openTime) {
        // Overnight shift (e.g. 18:00 to 02:00)
        return currentTime >= openTime || currentTime < closeTime;
    }
    return currentTime >= openTime && currentTime < closeTime;
};

export const isRestaurantOpen = (restaurant: Restaurant): boolean => {
    const status = getRestaurantStatusInfo(restaurant);
    return status.isOpen;
};

// NEW: Check specifically for Lunch Window
export const isLunchTime = (restaurant: Restaurant): boolean => {
    const { operatingHours } = restaurant;
    const now = new Date();
    const currentDay = now.getDay(); 
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
    
    // Safety cutoff for lunch if no specific shifts are defined: 15:00 (3 PM)
    const LUNCH_CUTOFF = 15 * 60; 

    // If using detailed operating hours
    if (operatingHours && operatingHours.length === 7) {
        const todayHours = operatingHours[currentDay];
        
        // If restaurant has a second shift (Split Shift), Shift 1 is strictly Lunch
        if (todayHours.opens2 && todayHours.closes2) {
             return checkTimeRange(currentTimeInMinutes, todayHours.opens, todayHours.closes);
        }
        
        // If continuous hours (e.g., 11:00 to 23:00), we enforce the 15:00 cutoff for Marmitas
        if (todayHours.isOpen) {
             const isOpen = checkTimeRange(currentTimeInMinutes, todayHours.opens, todayHours.closes);
             return isOpen && currentTimeInMinutes <= LUNCH_CUTOFF;
        }
    }
    
    // Fallback for simple legacy hours
    if (restaurant.openingHours && restaurant.closingHours) {
         const isOpen = checkTimeRange(currentTimeInMinutes, restaurant.openingHours, restaurant.closingHours);
         return isOpen && currentTimeInMinutes <= LUNCH_CUTOFF;
    }

    return false;
};

interface RestaurantStatus {
    isOpen: boolean;
    statusText: string;
    colorClass: string; // Tailwind class
    nextOpenTime?: string;
}

const daysOfWeekNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export const getRestaurantStatusInfo = (restaurant: Restaurant): RestaurantStatus => {
    const { operatingHours, openingHours, closingHours } = restaurant;
    const now = new Date();
    const currentDay = now.getDay(); 
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

    // 1. Fallback for legacy data (simple hours)
    if (!operatingHours || operatingHours.length !== 7) {
        if (!openingHours || !closingHours) {
            return { isOpen: true, statusText: 'Aberto', colorClass: 'bg-green-600' };
        }
        const isOpen = checkTimeRange(currentTimeInMinutes, openingHours, closingHours);
        return {
            isOpen,
            statusText: isOpen ? `Aberto até ${closingHours}` : 'Fechado',
            colorClass: isOpen ? 'bg-green-600' : 'bg-gray-500'
        };
    }

    // 2. Advanced Logic (Detailed Operating Hours with Splits)
    
    // Check Previous Day (for overnight shifts extending into today)
    const prevDayIndex = currentDay === 0 ? 6 : currentDay - 1;
    const prevDayHours = operatingHours[prevDayIndex];
    if (prevDayHours && prevDayHours.isOpen) {
        // Shift 1 overflow check
        if (prevDayHours.closes && prevDayHours.opens) {
            const openMins = timeToMinutes(prevDayHours.opens);
            const closeMins = timeToMinutes(prevDayHours.closes);
            if (closeMins < openMins && currentTimeInMinutes < closeMins) {
                return { isOpen: true, statusText: `Aberto até ${prevDayHours.closes}`, colorClass: 'bg-green-600' };
            }
        }
        // Shift 2 overflow check
        if (prevDayHours.closes2 && prevDayHours.opens2) {
            const openMins = timeToMinutes(prevDayHours.opens2);
            const closeMins = timeToMinutes(prevDayHours.closes2);
            if (closeMins < openMins && currentTimeInMinutes < closeMins) {
                return { isOpen: true, statusText: `Aberto até ${prevDayHours.closes2}`, colorClass: 'bg-green-600' };
            }
        }
    }

    // Check Today
    const todayHours = operatingHours[currentDay];
    
    if (!todayHours.isOpen) {
        // Find next open day
        return { isOpen: false, statusText: 'Fechado hoje', colorClass: 'bg-red-600' };
    }

    const open1 = todayHours.opens ? timeToMinutes(todayHours.opens) : -1;
    const close1 = todayHours.closes ? timeToMinutes(todayHours.closes) : -1;
    const open2 = todayHours.opens2 ? timeToMinutes(todayHours.opens2) : -1;
    const close2 = todayHours.closes2 ? timeToMinutes(todayHours.closes2) : -1;

    // Check Shift 1 (Usually Lunch)
    if (open1 !== -1 && close1 !== -1) {
        const isOpenS1 = checkTimeRange(currentTimeInMinutes, todayHours.opens, todayHours.closes);
        if (isOpenS1) {
            return { isOpen: true, statusText: `Aberto até ${todayHours.closes}`, colorClass: 'bg-green-600' };
        }
    }

    // Check Shift 2 (Usually Dinner)
    if (open2 !== -1 && close2 !== -1) {
        const isOpenS2 = checkTimeRange(currentTimeInMinutes, todayHours.opens2!, todayHours.closes2!);
        if (isOpenS2) {
            return { isOpen: true, statusText: `Aberto até ${todayHours.closes2}`, colorClass: 'bg-green-600' };
        }
    }

    // If we are here, it's closed, but we need to see WHEN it opens next.
    
    // Case A: Before Shift 1
    if (open1 !== -1 && currentTimeInMinutes < open1) {
        return { isOpen: false, statusText: `Abre às ${todayHours.opens}`, colorClass: 'bg-orange-500' };
    }

    // Case B: Between Shift 1 and Shift 2 (The "Siesta")
    if (close1 !== -1 && open2 !== -1 && currentTimeInMinutes >= close1 && currentTimeInMinutes < open2) {
        return { isOpen: false, statusText: `Abre às ${todayHours.opens2}`, colorClass: 'bg-orange-500' };
    }

    // Case C: After all shifts today -> Check Tomorrow
    // For simplicity, just say "Fechado" or verify tomorrow
    let nextDayIndex = (currentDay + 1) % 7;
    let nextDayHours = operatingHours[nextDayIndex];
    let daysChecked = 0;
    
    while (!nextDayHours.isOpen && daysChecked < 7) {
        nextDayIndex = (nextDayIndex + 1) % 7;
        nextDayHours = operatingHours[nextDayIndex];
        daysChecked++;
    }

    if (nextDayHours.isOpen) {
        const dayName = nextDayIndex === (currentDay + 1) % 7 ? 'amanhã' : daysOfWeekNames[nextDayIndex];
        return { isOpen: false, statusText: `Abre ${dayName} às ${nextDayHours.opens}`, colorClass: 'bg-gray-500' };
    }

    return { isOpen: false, statusText: 'Fechado', colorClass: 'bg-gray-500' };
};
