# 🏁 Roteiro Final: Colocando o GuaraFood no Ar

## Passo 1: Preparar o Banco de Dados
Acesse o [Supabase Dashboard](https://supabase.com/dashboard), vá em **SQL Editor** e rode o script inicial.

## Passo 2: Publicar as Funções de Pagamento (PIX)
Para que o Pix Automático funcione e os pedidos pendentes fiquem ocultos, você **precisa** enviar o código para o servidor do Supabase.

No seu terminal, rode:
**Certifique-se de rodar o comando de deploy das funções (npx supabase functions deploy ...) após estas atualizações para que as mudanças no servidor entrem em vigor.**

```bash
npx supabase functions deploy create-payment --project-ref xfousvlrhinlvrpryscy --no-verify-jwt
npx supabase functions deploy payment-webhook --project-ref xfousvlrhinlvrpryscy --no-verify-jwt
```

## Passo 3: Configurar Chave Pix Manual
No seu painel do lojista, vá em **Configurações** e preencha a **Chave Pix Manual**. Isso serve como segurança caso a automação falhe.