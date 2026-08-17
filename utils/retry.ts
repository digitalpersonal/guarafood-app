export interface RetryOptions {
    maxRetries?: number; // Número de tentativas de repetição após a primeira falha (padrão: 4)
    initialDelayMs?: number; // Tempo inicial de espera em ms (padrão: 400ms)
    maxDelayMs?: number; // Tempo máximo de espera em ms (padrão: 4000ms)
    backoffFactor?: number; // Multiplicador exponencial (padrão: 2)
    jitter?: boolean; // Variação aleatória de ±20% para evitar concorrência de rede (padrão: true)
    timeoutMs?: number; // Timeout limite por tentativa em ms (padrão: 8000ms)
    onRetry?: (attempt: number, error: any, nextDelayMs: number) => void;
    shouldRetry?: (error: any) => boolean;
}

/**
 * Avalia se o erro ocorrido é temporário/de conectividade e deve sofrer nova tentativa.
 */
export const isDefaultRetryableError = (error: any): boolean => {
    if (!error) return false;

    const msg = (error.message || error.details || error.error_description || String(error)).toLowerCase();

    // Erros não recuperáveis por repetição (validações estritas de negócio)
    if (
        msg.includes('invalid password') ||
        msg.includes('jwt expired') ||
        msg.includes('user not found') ||
        msg.includes('violates foreign key constraint') ||
        msg.includes('duplicate key value')
    ) {
        return false;
    }

    // Erros típicos de oscilação de Wi-Fi, timeout e perda de pacotes em restaurantes
    if (
        msg.includes('failed to fetch') ||
        msg.includes('network') ||
        msg.includes('timeout') ||
        msg.includes('abort') ||
        msg.includes('connection') ||
        msg.includes('socket') ||
        msg.includes('err_internet_disconnected') ||
        msg.includes('err_connection_refused') ||
        msg.includes('err_connection_reset') ||
        msg.includes('err_name_not_resolved') ||
        msg.includes('offline') ||
        msg.includes('bad gateway') ||
        msg.includes('service unavailable') ||
        msg.includes('gateway timeout') ||
        msg.includes('502') ||
        msg.includes('503') ||
        msg.includes('504') ||
        msg.includes('429') ||
        msg.includes('408')
    ) {
        return true;
    }

    // Status code HTTP se presente
    const status = error.status || error.statusCode || error.code;
    if (typeof status === 'number') {
        if ([408, 429, 500, 502, 503, 504].includes(status)) {
            return true;
        }
    }

    // Padrão resiliente para conexões instáveis de Wi-Fi
    return true;
};

/**
 * Executa uma operação assíncrona com retry e backoff exponencial com jitter.
 * Projetado especialmente para o módulo de Pedidos e Cozinha do GuaraFood operando sob Wi-Fi instável.
 */
export async function retryWithExponentialBackoff<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const {
        maxRetries = 4,
        initialDelayMs = 400,
        maxDelayMs = 4000,
        backoffFactor = 2,
        jitter = true,
        timeoutMs = 8000,
        onRetry,
        shouldRetry = isDefaultRetryableError
    } = options;

    let attempt = 0;
    let delay = initialDelayMs;

    while (true) {
        attempt++;
        try {
            if (timeoutMs > 0) {
                let timeoutHandle: any;
                const timeoutPromise = new Promise<never>((_, reject) => {
                    timeoutHandle = setTimeout(() => {
                        reject(new Error(`Timeout de conexão (${timeoutMs}ms)`));
                    }, timeoutMs);
                });

                try {
                    const result = await Promise.race([operation(), timeoutPromise]);
                    clearTimeout(timeoutHandle);
                    return result;
                } catch (err) {
                    clearTimeout(timeoutHandle);
                    throw err;
                }
            } else {
                return await operation();
            }
        } catch (error: any) {
            const canRetry = attempt <= maxRetries && shouldRetry(error);

            if (!canRetry) {
                throw error;
            }

            // Cálculo do intervalo com backoff exponencial e jitter
            let currentDelay = Math.min(delay, maxDelayMs);
            if (jitter) {
                const jitterRatio = 0.8 + Math.random() * 0.4; // Variação entre 80% e 120%
                currentDelay = Math.round(currentDelay * jitterRatio);
            }

            console.warn(
                `[GuaraFood Wi-Fi Resilience] Tentativa ${attempt}/${maxRetries} falhou (${error?.message || error}). ` +
                `Reexecutando em ${currentDelay}ms com backoff exponencial...`
            );

            if (onRetry) {
                try {
                    onRetry(attempt, error, currentDelay);
                } catch (callbackErr) {
                    console.error("[GuaraFood Retry] Erro no callback onRetry:", callbackErr);
                }
            }

            await new Promise(resolve => setTimeout(resolve, currentDelay));
            delay = Math.min(delay * backoffFactor, maxDelayMs);
        }
    }
}
