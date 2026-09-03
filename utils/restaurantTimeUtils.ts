import type { Restaurant } from '../types';

// Helper to convert "HH:MM" string to minutes from midnight
export const timeToMinutes = (timeString: string): number => {
    if (!timeString || !timeString.includes(':')) return 0; // Guard against invalid format
    const [hours, minutes] = timeString.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return 0;
    return hours * 60 + minutes;
};

// This function is fine as it is. The calling logic needs to be fixed.
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
        try {
            const todaySchedule = operatingHours[currentDay];
            const yesterdayIndex = currentDay === 0 ? 6 : currentDay - 1;
            const yesterdaySchedule = operatingHours[yesterdayIndex];

            // 1. Check if we are currently within a shift that started TODAY.
            if (todaySchedule?.isOpen) {
                // Check shift 1 of today
                if (todaySchedule.opens && todaySchedule.closes) {
                    const openTime = timeToMinutes(todaySchedule.opens);
                    const closeTime = timeToMinutes(todaySchedule.closes);
                    if (closeTime > openTime) { // It's a same-day shift
                        if (currentTimeInMinutes >= openTime && currentTimeInMinutes < closeTime) {
                            return true;
                        }
                    } else { // It's an overnight shift that STARTS today
                        if (currentTimeInMinutes >= openTime) { // It's open from open time until midnight
                            return true;
                        }
                    }
                }
                // Check shift 2 of today
                if (todaySchedule.opens2 && todaySchedule.closes2) {
                    const openTime = timeToMinutes(todaySchedule.opens2);
                    const closeTime = timeToMinutes(todaySchedule.closes2);
                    if (closeTime > openTime) { // It's a same-day shift
                        if (currentTimeInMinutes >= openTime && currentTimeInMinutes < closeTime) {
                            return true;
                        }
                    } else { // It's an overnight shift that STARTS today
                        if (currentTimeInMinutes >= openTime) {
                            return true;
                        }
                    }
                }
            }

            // 2. Check if we are in the "spill-over" part of an overnight shift from YESTERDAY.
            if (yesterdaySchedule?.isOpen) {
                // Check shift 1 from yesterday
                if (yesterdaySchedule.opens && yesterdaySchedule.closes) {
                    const openTime = timeToMinutes(yesterdaySchedule.opens);
                    const closeTime = timeToMinutes(yesterdaySchedule.closes);
                    if (closeTime < openTime) { // Was it an overnight shift?
                        if (currentTimeInMinutes < closeTime) { // Are we in the early morning hours of it?
                            return true;
                        }
                    }
                }
                // Check shift 2 from yesterday
                if (yesterdaySchedule.opens2 && yesterdaySchedule.closes2) {
                    const openTime = timeToMinutes(yesterdaySchedule.opens2);
                    const closeTime = timeToMinutes(yesterdaySchedule.closes2);
                    if (closeTime < openTime) { // Was it an overnight shift?
                        if (currentTimeInMinutes < closeTime) { // Are we in the early morning hours of it?
                            return true;
                        }
                    }
                }
            }

            // If neither of the above conditions were met, the restaurant is closed.
            return false;

        } catch (e) {
            console.error("Error parsing detailed restaurant hours:", restaurant.name, e);
            return true; // Fallback to open on error
        }
    }

    // Fallback logic for old data structure (this part is correct because it uses the generic checkTimeRange)
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

export interface RestaurantOperatingStatus {
    isOpen: boolean;
    statusLabel: string;
    todayScheduleLabel: string;
    currentTimeStr: string;
    dayName: string;
}

/**
 * Retorna o status detalhado de funcionamento do restaurante no momento atual
 */
export const getRestaurantOperatingStatus = (restaurant: Restaurant): RestaurantOperatingStatus => {
    const now = new Date();
    let brazilDate: Date;
    try {
        brazilDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    } catch {
        brazilDate = new Date();
    }

    const currentDay = brazilDate.getDay();
    const currentTimeStr = `${String(brazilDate.getHours()).padStart(2, '0')}:${String(brazilDate.getMinutes()).padStart(2, '0')}`;
    const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const dayName = dayNames[currentDay];

    const isOpen = isRestaurantOpen(restaurant);

    let todayScheduleLabel = 'Horário não informado';
    if (restaurant.operatingHours && restaurant.operatingHours.length === 7) {
        const todaySchedule = restaurant.operatingHours[currentDay];
        if (todaySchedule?.isOpen) {
            const shift1 = todaySchedule.opens && todaySchedule.closes ? `${todaySchedule.opens} às ${todaySchedule.closes}` : '';
            const shift2 = todaySchedule.opens2 && todaySchedule.closes2 ? ` e ${todaySchedule.opens2} às ${todaySchedule.closes2}` : '';
            todayScheduleLabel = `${shift1}${shift2}`.trim() || 'Aberto';
        } else {
            todayScheduleLabel = 'Fechado hoje';
        }
    } else if (restaurant.openingHours && restaurant.closingHours) {
        todayScheduleLabel = `${restaurant.openingHours} às ${restaurant.closingHours}`;
    } else if (restaurant.openingHours) {
        todayScheduleLabel = restaurant.openingHours;
    }

    return {
        isOpen,
        statusLabel: isOpen ? 'Aberto agora' : 'Fechado agora',
        todayScheduleLabel,
        currentTimeStr,
        dayName,
    };
};

export const isAvailableByTime = (entity: { availableStartTime?: string; availableEndTime?: string }): { isAvailable: boolean; message?: string } => {
    const openStr = entity.availableStartTime?.trim() || '';
    const closeStr = entity.availableEndTime?.trim() || '';

    if (!openStr && !closeStr) {
        return { isAvailable: true };
    }

    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    if (openStr && closeStr) {
        const isAvailable = checkTimeRange(currentMins, openStr, closeStr);
        return {
            isAvailable,
            message: isAvailable ? undefined : `Disponível das ${openStr} às ${closeStr}`
        };
    } else if (openStr) {
        const openMins = timeToMinutes(openStr);
        const isAvailable = currentMins >= openMins;
        return {
            isAvailable,
            message: isAvailable ? undefined : `Disponível a partir das ${openStr}`
        };
    } else if (closeStr) {
        const closeMins = timeToMinutes(closeStr);
        const isAvailable = currentMins < closeMins;
        return {
            isAvailable,
            message: isAvailable ? undefined : `Disponível até às ${closeStr}`
        };
    }

    return { isAvailable: true };
};

