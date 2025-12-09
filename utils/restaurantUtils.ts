
import type { Restaurant } from '../types';

// Helper to convert "HH:MM" string to minutes from midnight
export const timeToMinutes = (timeString: string): number => {
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
    const { operatingHours, openingHours, closingHours } = restaurant;
    const now = new Date();
    const currentDay = now.getDay(); // 0 for Sunday
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

    // New logic using detailed operating hours
    if (operatingHours && operatingHours.length === 7) {
        
        // 1. Check Previous Day for Overnight shifts that extend into today
        const prevDayIndex = currentDay === 0 ? 6 : currentDay - 1;
        const prevDayHours = operatingHours[prevDayIndex];
        
        if (prevDayHours && prevDayHours.isOpen) {
             // Check Shift 1 overflow
             if (prevDayHours.closes && prevDayHours.opens) {
                 const openMins = timeToMinutes(prevDayHours.opens);
                 const closeMins = timeToMinutes(prevDayHours.closes);
                 if (closeMins < openMins && currentTimeInMinutes < closeMins) {
                     return true;
                 }
             }
             // Check Shift 2 overflow
             if (prevDayHours.closes2 && prevDayHours.opens2) {
                 const openMins = timeToMinutes(prevDayHours.opens2);
                 const closeMins = timeToMinutes(prevDayHours.closes2);
                 if (closeMins < openMins && currentTimeInMinutes < closeMins) {
                     return true;
                 }
             }
        }

        // 2. Check Today's Hours
        const todayHours = operatingHours[currentDay];
        if (!todayHours || !todayHours.isOpen) {
            return false;
        }
        
        try {
            // Check Shift 1
            const isOpenShift1 = checkTimeRange(currentTimeInMinutes, todayHours.opens, todayHours.closes);
            
            // Check Shift 2 (if exists)
            const isOpenShift2 = todayHours.opens2 && todayHours.closes2 
                ? checkTimeRange(currentTimeInMinutes, todayHours.opens2, todayHours.closes2)
                : false;

            return isOpenShift1 || isOpenShift2;

        } catch (e) {
            console.error("Error parsing detailed restaurant hours:", restaurant.name, e);
            return true; // Fallback to open
        }
    }

    // Fallback logic for old data structure
    if (!openingHours || !closingHours) {
        return true; // Assume open if data is missing
    }
    try {
       return checkTimeRange(currentTimeInMinutes, openingHours, closingHours);
    } catch (e) {
        console.error("Error parsing simple restaurant hours:", restaurant.name, e);
        return true;
    }
};
