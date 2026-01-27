
# 🏁 Roteiro Final: Colocando o GuaraFood no Ar

## Passo 1: Preparar o Banco de Dados
Acesse o [Supabase Dashboard](https://supabase.com/dashboard), vá em **SQL Editor** e rode o script inicial (`schema.sql`).

## Passo 2: Publicar as Funções de Pagamento e Gestão (CRÍTICO)
Para que o Pix Automático funcione e para que você possa **criar ou corrigir logins de lojistas**, você **precisa** enviar o código para o servidor do Supabase.

No seu terminal, rode:
```bash
npx supabase functions deploy create-payment --project-ref xfousvlrhinlvrpryscy --no-verify-jwt
npx supabase functions deploy payment-webhook --project-ref xfousvlrhinlvrpryscy --no-verify-jwt
npx supabase functions deploy create-restaurant-with-user --project-ref xfousvlrhinlvrpryscy --no-verify-jwt
```

## Passo 3: Corrigir o acesso da "Pastelaria Renovação"
Se você não consegue acessar a Pastelaria Renovação, siga estes passos:
1. Certifique-se de ter feito o **Passo 2** acima.
2. Entre no App como **Admin** (admin@guarafood.com.br).
3. Vá em **Restaurantes**.
4. Clique no ícone de **Lápis (Editar)** na Pastelaria Renovação.
5. Marque a caixa **"Criar/Alterar Login"**.
6. Digite o e-mail: `renovacao@guarafood.com.br`
7. Digite a senha: `renovacao4048`
8. Clique em **SALVAR**. 

O sistema agora está programado para detectar que o usuário já existe e forçar a atualização da senha e do vínculo com o restaurante correto.

## Passo 4: Configurar Chave Pix Manual
No painel de cada lojista, em **Configurações**, preencha a **Chave Pix Manual**. Isso serve como segurança caso a automação do Mercado Pago falhe ou não esteja configurada.
