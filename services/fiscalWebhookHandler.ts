import { Request, Response } from 'express';
import { supabase } from './api';
import { FISCAL_WEBHOOK_SECRET } from '../config';

/**
 * Handler para o Webhook da API Fiscal (Focus NFe)
 * Endpoint: POST /api/fiscal/webhook
 * Proteção: via token secreto na URL (ex: /api/fiscal/webhook?token=SEGREDO)
 */
export const handleFiscalWebhook = async (req: Request, res: Response) => {
    try {
        // 1. Validação de Segurança
        const providedToken = req.query.token;
        if (!FISCAL_WEBHOOK_SECRET || providedToken !== FISCAL_WEBHOOK_SECRET) {
            console.error('[Fiscal Webhook] Tentativa de acesso não autorizada.');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // 2. Extração dos dados da nota fiscal
        const { status, referencia, caminho_danfe, caminho_xml, chave_nfe, mensagem_sefaz } = req.body;
        
        console.log(`[Fiscal Webhook] Recebido status ${status} para pedido ${referencia}`);

        if (!referencia) {
            return res.status(400).json({ error: "Referência (order_id) ausente no webhook." });
        }

        // 3. Atualização no Supabase
        if (status === 'autorizado') {
            await supabase.from('orders').update({
                fiscal_status: 'autorizado',
                fiscal_danfe_url: caminho_danfe,
                fiscal_xml_url: caminho_xml,
                fiscal_key: chave_nfe
            }).eq('id', referencia);

            // 4. Disparo de evento de notificação
            // Placeholder para o sistema de notificações
            console.log(`[Notificação] Nota fiscal do pedido #${referencia} autorizada com sucesso.`);
            
        } else {
            await supabase.from('orders').update({
                fiscal_status: 'rejeitado',
                fiscal_error: mensagem_sefaz || "Erro desconhecido na SEFAZ"
            }).eq('id', referencia);
            
            console.error(`[Notificação] Erro na emissão da nota do pedido #${referencia}: ${mensagem_sefaz}`);
        }

        return res.status(200).json({ success: true });
    } catch (err: any) {
        console.error("Error in /api/fiscal/webhook:", err);
        return res.status(500).json({ error: "Erro interno processando webhook." });
    }
};
