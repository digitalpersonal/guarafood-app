// Geolocation and Multi-City Service for GuaraFood
import type { Restaurant } from '../types';

export interface CityInfo {
    name: string;
    state: string;
    lat: number;
    lon: number;
}

// Cidades de referência regional e polos atendidos
export const KNOWN_CITIES: CityInfo[] = [
    { name: 'Guaranésia', state: 'MG', lat: -21.3000, lon: -46.8000 },
    { name: 'Guaxupé', state: 'MG', lat: -21.3044, lon: -46.7119 },
    { name: 'Monte Santo de Minas', state: 'MG', lat: -21.1906, lon: -46.9786 },
    { name: 'Muzambinho', state: 'MG', lat: -21.3708, lon: -46.5278 },
    { name: 'Arceburgo', state: 'MG', lat: -21.3653, lon: -46.9381 },
    { name: 'Juruaia', state: 'MG', lat: -21.2464, lon: -46.5367 },
    { name: 'São Pedro da União', state: 'MG', lat: -21.0856, lon: -46.6192 },
    { name: 'Mococa', state: 'SP', lat: -21.4647, lon: -47.0044 },
    { name: 'Passos', state: 'MG', lat: -20.7189, lon: -46.6097 },
    { name: 'São Sebastião do Paraíso', state: 'MG', lat: -20.9272, lon: -46.9928 },
    { name: 'Cabo Verde', state: 'MG', lat: -21.4722, lon: -46.3889 },
    { name: 'Nova Resende', state: 'MG', lat: -21.1219, lon: -46.4231 },
    { name: 'Alpinópolis', state: 'MG', lat: -20.8639, lon: -46.3861 },
    { name: 'Poços de Caldas', state: 'MG', lat: -21.7892, lon: -46.5625 },
    { name: 'Ribeirão Preto', state: 'SP', lat: -21.1775, lon: -47.8103 },
];

export const DEFAULT_CITY = 'Guaranésia';

const STORAGE_KEY = 'guarafood-selected-city';
const GPS_PROMPT_DISMISSED_KEY = 'guarafood-gps-prompt-dismissed';

// Fórmula de Haversine para cálculo preciso de distância em km
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Normaliza nome de cidade para comparação insensível a acentos e maiúsculas
export function normalizeCityName(cityName: string): string {
    if (!cityName) return DEFAULT_CITY;
    return cityName
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

// Obtém a cidade atualmente selecionada pelo usuário
export function getSavedSelectedCity(): string {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && saved.trim().length > 0) {
            return saved.trim();
        }
    } catch (e) {
        console.warn("Falha ao ler cidade do localStorage:", e);
    }
    return DEFAULT_CITY;
}

export const getSelectedCity = getSavedSelectedCity;

// Salva a cidade selecionada
export function saveSelectedCity(city: string): void {
    try {
        if (city && city.trim().length > 0) {
            localStorage.setItem(STORAGE_KEY, city.trim());
        }
    } catch (e) {
        console.warn("Falha ao salvar cidade no localStorage:", e);
    }
}

export function isGpsPromptDismissed(): boolean {
    try {
        return localStorage.getItem(GPS_PROMPT_DISMISSED_KEY) === 'true';
    } catch {
        return false;
    }
}

export function setGpsPromptDismissed(): void {
    try {
        localStorage.setItem(GPS_PROMPT_DISMISSED_KEY, 'true');
    } catch {
        // Ignora
    }
}

// Encontra a cidade conhecida mais próxima das coordenadas
export function findNearestKnownCity(lat: number, lon: number, maxDistanceKm = 35): CityInfo | null {
    let nearest: CityInfo | null = null;
    let minDistance = Infinity;

    for (const city of KNOWN_CITIES) {
        const dist = calculateDistanceKm(lat, lon, city.lat, city.lon);
        if (dist < minDistance) {
            minDistance = dist;
            nearest = city;
        }
    }

    if (nearest && minDistance <= maxDistanceKm) {
        return nearest;
    }

    return nearest; // Retorna a mais próxima se não houver exata
}

// Reversa Geocodificação usando BigDataCloud ou Nominatim
export async function reverseGeocodeCity(lat: number, lon: number): Promise<string | null> {
    // 1. Tenta API BigDataCloud (Rápida, sem CORS e sem chave)
    try {
        const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=pt`,
            { signal: AbortSignal.timeout(4000) }
        );
        if (response.ok) {
            const data = await response.json();
            const cityName = data.city || data.locality || data.principalSubdivision;
            if (cityName && typeof cityName === 'string' && cityName.trim().length > 0) {
                // Checa se corresponde a alguma cidade conhecida para padronizar acentuação
                const matched = KNOWN_CITIES.find(k => normalizeCityName(k.name) === normalizeCityName(cityName));
                return matched ? matched.name : cityName.trim();
            }
        }
    } catch (e) {
        console.warn("Tentativa BigDataCloud reverse geocode falhou:", e);
    }

    // 2. Fallback: OpenStreetMap Nominatim
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
            { 
                headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' },
                signal: AbortSignal.timeout(4000) 
            }
        );
        if (response.ok) {
            const data = await response.json();
            const addr = data.address || {};
            const cityName = addr.city || addr.town || addr.municipality || addr.village || addr.county;
            if (cityName && typeof cityName === 'string' && cityName.trim().length > 0) {
                const matched = KNOWN_CITIES.find(k => normalizeCityName(k.name) === normalizeCityName(cityName));
                return matched ? matched.name : cityName.trim();
            }
        }
    } catch (e) {
        console.warn("Tentativa Nominatim reverse geocode falhou:", e);
    }

    return null;
}

export interface GeolocationResult {
    success: boolean;
    city: string;
    lat?: number;
    lon?: number;
    error?: string;
}

// Detecta a localização GPS nativa do cliente e resolve a cidade correspondente
export function getCurrentUserCity(): Promise<GeolocationResult> {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve({
                success: false,
                city: getSavedSelectedCity(),
                error: 'Geolocalização não é suportada por este navegador ou dispositivo.'
            });
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                
                // Primeiro tenta a cidade conhecida por proximidade rápida
                const nearest = findNearestKnownCity(latitude, longitude, 30);
                
                if (nearest) {
                    saveSelectedCity(nearest.name);
                    resolve({
                        success: true,
                        city: nearest.name,
                        lat: latitude,
                        lon: longitude
                    });
                    return;
                }

                // Se estiver fora do raio de 30km de cidades conhecidas, faz geocodificação reversa
                const reverseCity = await reverseGeocodeCity(latitude, longitude);
                const finalCity = reverseCity || (nearest ? nearest.name : DEFAULT_CITY);
                
                saveSelectedCity(finalCity);
                resolve({
                    success: true,
                    city: finalCity,
                    lat: latitude,
                    lon: longitude
                });
            },
            (err) => {
                let errorMsg = 'Não foi possível obter sua localização.';
                if (err.code === err.PERMISSION_DENIED) {
                    errorMsg = 'Permissão de localização negada. Se desejar usar a localização automática, autorize o acesso à localização nas configurações do seu navegador.';
                } else if (err.code === err.POSITION_UNAVAILABLE) {
                    errorMsg = 'Sinal de GPS indisponível. Verifique se o serviço de localização está ativado no seu dispositivo.';
                } else if (err.code === err.TIMEOUT) {
                    errorMsg = 'Tempo limite esgotado ao buscar sua localização GPS.';
                }

                resolve({
                    success: false,
                    city: getSavedSelectedCity(),
                    error: errorMsg
                });
            },
            {
                enableHighAccuracy: false,
                timeout: 8000,
                maximumAge: 300000 // Cache de 5 minutos da posição
            }
        );
    });
}

// Lista todas as cidades com restaurantes cadastrados + cidades principais
export function getDistinctCities(restaurants: Restaurant[] = []): string[] {
    const citySet = new Set<string>();
    
    // Sempre inclui Guaranésia e Guaxupé como cidades padrão
    citySet.add('Guaranésia');
    citySet.add('Guaxupé');
    citySet.add('Monte Santo de Minas');
    citySet.add('Muzambinho');

    // Adiciona todas as cidades presentes nos restaurantes cadastrados
    restaurants.forEach(r => {
        if (r.city && r.city.trim().length > 0) {
            citySet.add(r.city.trim());
        }
    });

    return Array.from(citySet).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
