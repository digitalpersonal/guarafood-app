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
