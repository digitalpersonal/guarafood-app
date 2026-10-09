import type { FeaturedPromo, Promotion } from '../types';

export const DAYS_OF_WEEK = [
    { index: 0, name: 'Domingo', abbr: 'Dom', short: 'Dom' },
    { index: 1, name: 'Segunda-feira', abbr: 'Seg', short: 'Seg' },
    { index: 2, name: 'Terça-feira', abbr: 'Ter', short: 'Ter' },
    { index: 3, name: 'Quarta-feira', abbr: 'Qua', short: 'Qua' },
    { index: 4, name: 'Quinta-feira', abbr: 'Qui', short: 'Qui' },
    { index: 5, name: 'Sexta-feira', abbr: 'Sex', short: 'Sex' },
    { index: 6, name: 'Sábado', abbr: 'Sáb', short: 'Sáb' },
];

export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
export const MON_TO_THU = [1, 2, 3, 4];
export const MON_TO_FRI = [1, 2, 3, 4, 5];
export const FRI_TO_SUN = [5, 6, 0];
export const WEEKEND_DAYS = [0, 6];

/**
 * Normaliza e formata os dias da semana de uma promoção de forma amigável
 * Ex: [1, 2, 3, 4] -> "Segunda a Quinta"
 */
export const formatPromoDays = (availableDays?: number[] | null): string => {
    if (!availableDays || !Array.isArray(availableDays) || availableDays.length === 0 || availableDays.length === 7) {
        return 'Todos os dias';
    }

    const sorted = [...new Set(availableDays)].sort((a, b) => a - b);
    const key = sorted.join(',');

    if (key === '1,2,3,4') return 'Segunda a Quinta';
    if (key === '1,2,3,4,5') return 'Segunda a Sexta';
    if (key === '0,5,6' || key === '5,6,0') return 'Sexta a Domingo';
    if (key === '0,6') return 'Finais de Semana (Sáb e Dom)';

    // Lista formatada amigável (ex: "Seg, Qua e Sex")
    return sorted.map(d => DAYS_OF_WEEK[d]?.abbr || `${d}`).join(', ');
};

/**
 * Verifica se a promoção está ativa hoje com base no dia da semana atual
 */
export const isPromoActiveToday = (
    promo?: { active?: boolean; availableDays?: number[] | null } | null,
    targetDate: Date = new Date()
): boolean => {
    if (!promo) return false;
    if (promo.active === false) return false;

    const days = promo.availableDays;
    // Se não tiver dias definidos ou tiver todos os 7 dias, é válida todos os dias
    if (!days || !Array.isArray(days) || days.length === 0 || days.length === 7) {
        return true;
    }

    const currentDay = targetDate.getDay(); // 0 = Domingo, 1 = Segunda, etc.
    return days.includes(currentDay);
};

/**
 * Codifica dias no final da descrição de forma limpa caso a coluna SQL ainda não exista
 */
export const encodeDaysInDescription = (description: string = '', days?: number[] | null): string => {
    const cleanDesc = description.replace(/\s*<!--days:[0-9,]+-->/g, '').trim();
    if (!days || !Array.isArray(days) || days.length === 0 || days.length === 7) {
        return cleanDesc;
    }
    return `${cleanDesc} <!--days:${[...new Set(days)].sort((a, b) => a - b).join(',')}-->`.trim();
};

/**
 * Decodifica dias da descrição caso existam
 */
export const decodeDaysFromDescription = (description: string = ''): { cleanDescription: string; availableDays?: number[] } => {
    const match = description.match(/<!--days:([0-9,]+)-->/);
    const cleanDescription = description.replace(/\s*<!--days:[0-9,]+-->/g, '').trim();
    
    if (match && match[1]) {
        const days = match[1].split(',').map(Number).filter(n => !isNaN(n) && n >= 0 && n <= 6);
        if (days.length > 0) {
            return { cleanDescription, availableDays: days };
        }
    }

    return { cleanDescription, availableDays: undefined };
};

/**
 * Embaralha um array usando o algoritmo Fisher-Yates para ordem aleatória justa e uniforme
 */
export const shuffleArray = <T,>(array: T[]): T[] => {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
};

/**
 * Converte string "HH:MM" em minutos desde o início do dia
 */
export const timeToMinutes = (timeStr?: string | null): number | null => {
    if (!timeStr) return null;
    const parts = timeStr.trim().split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
};

/**
 * Verifica se o horário atual está dentro do intervalo configurado (ex: 13:00 às 18:00)
 */
export const isTimeWithinRange = (
    startTime?: string | null,
    endTime?: string | null,
    targetDate: Date = new Date()
): boolean => {
    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);

    // Se nenhum horário foi definido, está disponível o dia todo
    if (startMin === null && endMin === null) return true;

    const currentMin = targetDate.getHours() * 60 + targetDate.getMinutes();

    if (startMin !== null && endMin !== null) {
        if (startMin <= endMin) {
            // Mesmo dia (ex: 13:00 até 18:00)
            return currentMin >= startMin && currentMin <= endMin;
        } else {
            // Vira a noite (ex: 18:00 até 02:00)
            return currentMin >= startMin || currentMin <= endMin;
        }
    }

    if (startMin !== null) return currentMin >= startMin;
    if (endMin !== null) return currentMin <= endMin;

    return true;
};

/**
 * Verifica disponibilidade completa de um produto ou combo considerando estoque, dias da semana e horário
 */
export const checkItemAvailability = (
    item?: {
        available?: boolean;
        availableDays?: number[] | null;
        availableStartTime?: string | null;
        availableEndTime?: string | null;
    } | null,
    targetDate: Date = new Date()
): { isAvailable: boolean; badgeText?: string; reason?: string } => {
    if (!item) return { isAvailable: true };

    if (item.available === false) {
        return { isAvailable: false, badgeText: 'Indisponível', reason: 'Produto temporariamente esgotado' };
    }

    // Validação de dias da semana
    if (item.availableDays && item.availableDays.length > 0 && item.availableDays.length < 7) {
        const currentDay = targetDate.getDay();
        if (!item.availableDays.includes(currentDay)) {
            const formattedDays = formatPromoDays(item.availableDays);
            return {
                isAvailable: false,
                badgeText: `Válido: ${formattedDays}`,
                reason: `Este item é exclusivo para: ${formattedDays}`
            };
        }
    }

    // Validação de horário (ex: 13:00 às 18:00)
    if (item.availableStartTime || item.availableEndTime) {
        const inTime = isTimeWithinRange(item.availableStartTime, item.availableEndTime, targetDate);
        const timeText = item.availableStartTime && item.availableEndTime
            ? `${item.availableStartTime} às ${item.availableEndTime}`
            : item.availableStartTime ? `A partir das ${item.availableStartTime}` : `Até às ${item.availableEndTime}`;

        if (!inTime) {
            return {
                isAvailable: false,
                badgeText: `Disponível ${timeText}`,
                reason: `Este item só pode ser pedido no horário das ${timeText}`
            };
        } else {
            return {
                isAvailable: true,
                badgeText: `⏰ Válido até ${item.availableEndTime || 'o fechamento'}`
            };
        }
    }

    return { isAvailable: true };
};

/**
 * Codifica metadados especiais de promoções (Upsell, horários, etc) na descrição para persistência universal
 */
export const encodePromoMetadata = (
    description: string = '',
    meta: {
        type?: 'PERCENTAGE' | 'FIXED' | 'UPSELL';
        upsellTitle?: string;
        upsellDescription?: string;
        upsellPrice?: number;
        upsellOptions?: string[];
        upsellMaxSelections?: number;
        availableStartTime?: string;
        availableEndTime?: string;
        availableDays?: number[];
    }
): string => {
    let clean = description
        .replace(/\s*<!--promo_meta:[^>]+-->/g, '')
        .replace(/\s*<!--days:[0-9,]+-->/g, '')
        .trim();

    const cleanMeta: Record<string, any> = {};
    if (meta.type === 'UPSELL') cleanMeta.t = 'UPSELL';
    if (meta.upsellTitle) cleanMeta.ut = meta.upsellTitle;
    if (meta.upsellDescription) cleanMeta.ud = meta.upsellDescription;
    if (meta.upsellPrice !== undefined && meta.upsellPrice !== null) cleanMeta.up = meta.upsellPrice;
    if (meta.upsellOptions && meta.upsellOptions.length > 0) cleanMeta.uo = meta.upsellOptions;
    if (meta.upsellMaxSelections !== undefined && meta.upsellMaxSelections !== null) cleanMeta.um = meta.upsellMaxSelections;
    if (meta.availableStartTime) cleanMeta.st = meta.availableStartTime;
    if (meta.availableEndTime) cleanMeta.et = meta.availableEndTime;

    if (Object.keys(cleanMeta).length > 0) {
        clean = `${clean} <!--promo_meta:${JSON.stringify(cleanMeta)}-->`.trim();
    }

    if (meta.availableDays && meta.availableDays.length > 0 && meta.availableDays.length < 7) {
        clean = encodeDaysInDescription(clean, meta.availableDays);
    }

    return clean;
};

/**
 * Decodifica metadados de promoção da descrição
 */
export const decodePromoMetadata = (description: string = ''): {
    cleanDescription: string;
    type?: 'PERCENTAGE' | 'FIXED' | 'UPSELL';
    upsellTitle?: string;
    upsellDescription?: string;
    upsellPrice?: number;
    upsellOptions?: string[];
    upsellMaxSelections?: number;
    availableStartTime?: string;
    availableEndTime?: string;
    availableDays?: number[];
} => {
    let clean = description;
    let type: 'PERCENTAGE' | 'FIXED' | 'UPSELL' | undefined = undefined;
    let upsellTitle: string | undefined = undefined;
    let upsellDescription: string | undefined = undefined;
    let upsellPrice: number | undefined = undefined;
    let upsellOptions: string[] | undefined = undefined;
    let upsellMaxSelections: number | undefined = undefined;
    let availableStartTime: string | undefined = undefined;
    let availableEndTime: string | undefined = undefined;

    const metaMatch = clean.match(/<!--promo_meta:(.+?)-->/);
    if (metaMatch && metaMatch[1]) {
        try {
            const parsed = JSON.parse(metaMatch[1]);
            if (parsed.t === 'UPSELL') type = 'UPSELL';
            if (parsed.ut) upsellTitle = parsed.ut;
            if (parsed.ud) upsellDescription = parsed.ud;
            if (parsed.up !== undefined) upsellPrice = Number(parsed.up);
            if (Array.isArray(parsed.uo)) upsellOptions = parsed.uo;
            if (parsed.um !== undefined) upsellMaxSelections = Number(parsed.um);
            if (parsed.st) availableStartTime = parsed.st;
            if (parsed.et) availableEndTime = parsed.et;
        } catch {}
        clean = clean.replace(/\s*<!--promo_meta:[^>]+-->/g, '').trim();
    }

    const { cleanDescription, availableDays } = decodeDaysFromDescription(clean);

    return {
        cleanDescription,
        type,
        upsellTitle,
        upsellDescription,
        upsellPrice,
        upsellOptions,
        upsellMaxSelections,
        availableStartTime,
        availableEndTime,
        availableDays
    };
};

