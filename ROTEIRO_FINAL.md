
# 🏁 Roteiro Final: Colocando o GuaraFood no Ar

## Passo 1: Preparar o Banco de Dados
Acesse o [Supabase Dashboard](https://supabase.com/dashboard), vá em **SQL Editor** e rode o script inicial (`schema.sql`).

## Passo 2: Publicar as Funções (CRÍTICO)
No seu terminal, rode:
```bash
npx supabase functions deploy create-payment --project-ref xfousvlrhinlvrpryscy --no-verify-jwt
npx supabase functions deploy payment-webhook --project-ref xfousvlrhinlvrpryscy --no-verify-jwt
npx supabase functions deploy create-restaurant-with-user --project-ref xfousvlrhinlvrpryscy --no-verify-jwt
```

## Passo 3: Resolver o erro "Database error" na Pastelaria Renovação
Siga EXATAMENTE esta ordem:
1. Vá ao **SQL Editor** do Supabase.
2. Copie e cole o conteúdo do arquivo `supabase/deep_clean_auth.sql` e clique em **RUN**.
3. Agora, entre no App GuaraFood como **Admin** (admin@guarafood.com.br).
4. Vá em **Restaurantes** -> **Editar** na Pastelaria Renovação.
5. No final da página, marque **"Criar/Alterar Login"**.
6. Digite o e-mail: `renovacao@guarafood.com.br`
7. Digite a senha: `renovacao4048`
8. Clique em **SALVAR**.

O erro de banco agora deve desaparecer pois o e-mail foi completamente "limpo" do sistema antes da tentativa.

## Passo 4: Configurações Adicionais
No painel de cada lojista, em **Configurações**, preencha a **Chave Pix Manual**. Isso serve como segurança caso a automação do Mercado Pago falhe ou não esteja configurada.
