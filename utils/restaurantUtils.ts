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
