
const WEBHOOK_URL = 'https://xfousvlrhinlvrpryscy.supabase.co/functions/v1/whatsapp-webhook';
const VERIFY_TOKEN = 'guarafood_whatsapp_2026';

async function testWebhook() {
    console.log('--- Iniciando teste do Webhook ---');

    // 1. Teste de Verificação (GET)
    console.log('\n[1/2] Testando Verificação (GET)...');
    const getUrl = `${WEBHOOK_URL}?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=challenge123`;
    const getRes = await fetch(getUrl);
    const getBody = await getRes.text();
    console.log(`Status: ${getRes.status}`);
    console.log(`Body: ${getBody}`);
    if (getRes.status === 200 && getBody === 'challenge123') {
        console.log('✅ Verificação GET bem-sucedida!');
    } else {
        console.error('❌ Falha na verificação GET!');
    }

    // 2. Teste de Recebimento de Mensagem (POST)
    console.log('\n[2/2] Testando Recebimento de Mensagem (POST)...');
    const postPayload = {
        object: 'whatsapp_business_account',
        entry: [{
            id: 'waba_id_123',
            changes: [{
                field: 'messages',
                value: {
                    messaging_product: 'whatsapp',
                    metadata: { phone_number_id: 'phone_id_123', display_phone_number: '1234567890' },
                    messages: [{
                        from: '5511999999999',
                        id: 'meta_msg_id_123',
                        text: { body: 'Olá, gostaria de ver o cardápio.' },
                        type: 'text'
                    }]
                }
            }]
        }]
    };

    const postRes = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postPayload)
    });
    const postBody = await postRes.text();
    console.log(`Status: ${postRes.status}`);
    console.log(`Body: ${postBody}`);
    if (postRes.status === 200) {
        console.log('✅ POST processado com sucesso!');
    } else {
        console.error('❌ Falha no processamento POST!');
    }
}

testWebhook().catch(console.error);
