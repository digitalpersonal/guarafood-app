import type { Order } from '../types';

export type OrderFiscalBadgeState =
    | 'authorized'
    | 'processing'
    | 'error'
    | 'marked_only'
    | 'not_issued';

export interface OrderFiscalVerificationInfo {
    state: OrderFiscalBadgeState;
    label: string;
    isEmitted: boolean;
    logText: string;
    updatedAt?: string;
    key?: string;
    protocol?: string;
    number?: string;
    simulated?: boolean;
}

export const getOrderFiscalVerification = (order: Order): OrderFiscalVerificationInfo => {
    const fiscalMeta = order.payment_details?.fiscal;
    const raw = order as any;
    const rawStatus = String(order.fiscalStatus || raw.fiscal_status || fiscalMeta?.status || '').toLowerCase();
    const key = String(order.fiscalKey || raw.fiscal_key || fiscalMeta?.chave || '').trim();
    const protocol = String(order.fiscalProtocol || raw.fiscal_protocol || fiscalMeta?.protocolo || '').trim();
    const nfNumber = String(order.fiscalNumber || raw.fiscal_number || fiscalMeta?.numero || '').trim();
    const errorMsg = String(order.fiscalMessage || raw.fiscal_error || fiscalMeta?.mensagem || '').trim();
    const updatedAt = fiscalMeta?.updated_at ? String(fiscalMeta.updated_at) : undefined;
    const simulated = Boolean(fiscalMeta?.simulated);

    if (rawStatus === 'rejeitado' || rawStatus === 'erro_autorizacao' || rawStatus === 'cancelado') {
        const isCanceled = rawStatus === 'cancelado';
        return {
            state: 'error',
            label: isCanceled ? 'NF Cancelada' : 'Rejeitada / Erro',
            isEmitted: false,
            logText: errorMsg || (isCanceled ? 'Nota fiscal cancelada.' : 'Transmissão rejeitada pela SEFAZ.'),
            updatedAt,
            key: key || undefined,
            protocol: protocol || undefined,
            number: nfNumber || undefined,
            simulated,
        };
    }

    if (rawStatus === 'processando') {
        return {
            state: 'processing',
            label: 'Processando SEFAZ',
            isEmitted: false,
            logText: protocol
                ? `Aguardando retorno SEFAZ • Prot: ${protocol}`
                : (errorMsg || 'Enviada à SEFAZ, aguardando autorização.'),
            updatedAt,
            key: key || undefined,
            protocol: protocol || undefined,
            number: nfNumber || undefined,
            simulated,
        };
    }

    if (rawStatus === 'autorizado' || Boolean(key)) {
        const parts: string[] = [];
        if (nfNumber) parts.push(`NF #${nfNumber}`);
        if (protocol) parts.push(`Prot: ${protocol}`);
        if (key) parts.push(`Chave: ...${key.slice(-8)}`);
        if (simulated) parts.push('Modo Teste/Simulação');
        if (parts.length === 0 && errorMsg) parts.push(errorMsg);

        return {
            state: 'authorized',
            label: 'NF Emitida',
            isEmitted: true,
            logText: parts.join(' • ') || 'Autorizada pela SEFAZ',
            updatedAt,
            key: key || undefined,
            protocol: protocol || undefined,
            number: nfNumber || undefined,
            simulated,
        };
    }

    if (order.fiscalExport) {
        return {
            state: 'marked_only',
            label: 'Marcado (Não Emitida)',
            isEmitted: false,
            logText: 'Marcado como "NF: Sim" no pedido, sem transmissão SEFAZ registrada.',
        };
    }

    return {
        state: 'not_issued',
        label: 'Não Emitida',
        isEmitted: false,
        logText: 'Nenhuma emissão fiscal registrada para este pedido.',
    };
};

export const formatFiscalTimestamp = (iso?: string): string => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};
