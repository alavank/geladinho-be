# 🧊 Geladinho BE — Sistema de Pedidos

MVP completo de pedidos de geladinho para a comunidade brasileira na Bélgica.

**Stack:** Next.js 14 (App Router) · TypeScript · TailwindCSS · Supabase (Postgres, self-hosted) · Telegram Bot · Coolify v4 + Hetzner Cloud

---

## 📋 Funcionalidades

- 🍭 Cardápio com 30 sabores em cards com stepper +/−
- 💰 Cálculo de total em tempo real (€ 1,70/un., mínimo 50 unidades)
- 📱 Mobile-first com rodapé sticky (resumo + botão finalizar)
- 🖥️ Desktop com coluna lateral fixa de resumo
- ✅ Modal de confirmação antes de enviar
- 💾 Salva pedido no Supabase (Postgres)
- 📨 Notificação automática no Telegram ao receber pedido
- 🔐 Painel admin protegido com login via ENV
- 📊 Tabela de pedidos com status e detalhes completos
- 🔄 Alteração de status do pedido pelo admin
- 🗺️ Google Places Autocomplete (opcional, ativa automaticamente se KEY existir)

---

## 🚀 Setup Rápido

### 1. Clone e instale dependências

```bash
git clone <seu-repositório>
cd geladinho-be
npm install
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env.local
# edite .env.local com suas credenciais
```

---

## 🗄️ Configurar Supabase

### Criar projeto

1. Acesse [supabase.com](https://supabase.com) → "New Project"
2. Dê um nome ao projeto (ex: `geladinho-be`) e defina uma senha forte para o banco
3. Aguarde o projeto ser criado (~1 min)

### Pegar as credenciais

1. No painel do projeto → **Settings → API**
2. Copie:
   - **Project URL** → `SUPABASE_URL`
   - **service_role (secret)** → `SUPABASE_SERVICE_ROLE_KEY`
   
> ⚠️ Use sempre a `service_role` key no servidor, nunca a `anon` key no frontend

### Rodar a migration SQL

1. No painel Supabase → **SQL Editor**
2. Abra o arquivo `supabase/migration.sql`
3. Cole todo o conteúdo e clique em **Run**

Isso cria:
- Tabela `orders` com RLS ativo (bloqueio de acesso público direto)
- Tabela `order_items` com FK para `orders`
- Índices de performance
- Políticas RLS negando acesso anon/authenticated direto (acesso só via `service_role`)

---

## 🤖 Configurar Bot Telegram

### Criar o bot

1. Abra o Telegram → busque **@BotFather**
2. Envie `/newbot`
3. Escolha um nome e username para o bot
4. Copie o **token** → `TELEGRAM_BOT_TOKEN`

### Pegar o Chat ID

**Para chat pessoal:**
1. Inicie uma conversa com seu bot (envie `/start`)
2. Acesse: `https://api.telegram.org/bot<SEU_TOKEN>/getUpdates`
3. O `chat.id` na resposta é o seu `TELEGRAM_CHAT_ID`

**Para grupo/canal:**
1. Adicione o bot ao grupo e conceda permissão de enviar mensagens
2. Acesse a URL acima após enviar uma mensagem no grupo
3. O `chat.id` começa com `-` para grupos (ex: `-1001234567890`)

---

## 🖥️ Rodar localmente

```bash
npm run dev
```

Acesse:
- **Site público:** http://localhost:3000
- **Admin:** http://localhost:3000/admin
- **Login admin:** http://localhost:3000/admin/login

---

## 🌍 Google Places Autocomplete (Opcional)

1. Acesse [Google Cloud Console](https://console.cloud.google.com)
2. Crie um projeto e ative a **Places API**
3. Crie uma API Key e adicione no `.env.local`:

```
GOOGLE_PLACES_API_KEY=AIza...
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=AIza...  # mesma key, exposta ao browser
```

> Se a key não existir, o formulário funciona normalmente com campos manuais.

---

## 🚀 Deploy em produção (Coolify + Hetzner)

Produção atual roda em **Coolify v4 em VPS Hetzner Cloud** com Supabase self-hosted no mesmo cluster. Auto-deploy on push pra branch `main` via GitHub App.

URLs:
- App: `https://geladinho-app-5-78-42-251.sslip.io`
- Supabase Studio: `https://geladinho-studio-5-78-42-251.sslip.io`

### Como deployar uma alteração

Basta push pra `main` — Coolify rebuilda e redeploya automaticamente:
```bash
git push origin main
```

Acompanhe em `http://5.78.42.251:8000` → project **geladinho** → Application → aba **Deployments**.

### Como provisionar do zero / replicar em outro projeto

Toda a documentação está em dois arquivos:

- **[PLAYBOOK_COOLIFY.md](PLAYBOOK_COOLIFY.md)** — passo-a-passo replicável para qualquer app Next.js + Supabase no Coolify (armadilhas conhecidas, decisões de config, valores recomendados)
- **[MIGRACAO_COOLIFY.md](MIGRACAO_COOLIFY.md)** — histórico desta migração específica (Cloud → self-hosted, lições aprendidas, comandos de referência)

### Build local com Docker (smoke test antes de pushar)

```bash
docker compose build
docker compose up
# Acessa http://localhost:3000
```

---

## 📁 Estrutura do Projeto

```
geladinho-be/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Página principal (cardápio + pedido)
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── admin/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                # Lista de pedidos
│   │   │   ├── login/page.tsx          # Login admin
│   │   │   └── pedidos/[id]/page.tsx   # Detalhe do pedido
│   │   └── api/
│   │       ├── orders/route.ts         # POST /api/orders
│   │       └── admin/
│   │           ├── login/route.ts      # POST/DELETE /api/admin/login
│   │           └── orders/
│   │               ├── route.ts        # GET /api/admin/orders
│   │               └── [id]/
│   │                   ├── route.ts    # GET /api/admin/orders/:id
│   │                   └── status/route.ts  # PATCH /api/admin/orders/:id/status
│   ├── components/
│   │   ├── FlavorCard.tsx
│   │   ├── OrderForm.tsx               # Formulário com Google Places opcional
│   │   ├── ConfirmModal.tsx
│   │   ├── SuccessScreen.tsx
│   │   ├── StickyCart.tsx              # Rodapé fixo mobile
│   │   └── DesktopSidebar.tsx          # Coluna lateral desktop
│   ├── lib/
│   │   ├── supabase.ts                 # Supabase server client (service_role)
│   │   ├── telegram.ts                 # Envio de notificações Telegram
│   │   ├── phone.ts                    # Validação/normalização E.164 Bélgica
│   │   ├── auth.ts                     # Auth admin via cookie
│   │   ├── schemas.ts                  # Zod schemas
│   │   └── flavors.ts                  # Catálogo de 30 sabores
│   ├── types/index.ts                  # Tipos TypeScript
│   └── middleware.ts                   # Proteção de rotas admin
├── supabase/
│   └── migration.sql                   # Schema SQL completo
├── .env.example
├── next.config.js
├── tailwind.config.ts
└── package.json
```

---

## 🔐 Segurança

- `SUPABASE_SERVICE_ROLE_KEY` só é usada server-side (nunca exposta ao browser)
- RLS no Supabase bloqueia acesso direto ao banco pelo cliente
- Admin autenticado via cookie `httpOnly` (não acessível por JS)
- Middleware Next.js protege todas as rotas `/admin/*`
- Validação de payload com Zod antes de qualquer operação

---

## 💳 Preços e Regras

| Configuração | Valor |
|---|---|
| Preço unitário | € 1,70 |
| Pedido mínimo | 50 unidades |
| Moeda | EUR |
| Armazenamento | centavos (int) |

---

## 🆘 Troubleshooting

**"Supabase connection error"**
→ Verifique `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no `.env.local`

**"Admin não autenticado" mesmo após login**
→ Verifique `ADMIN_USER` e `ADMIN_PASS` nas env vars

**Telegram não recebe mensagens**
→ Certifique-se que enviou `/start` para o bot antes de testar
→ Verifique se `TELEGRAM_CHAT_ID` está correto (grupos têm `-` no início)

**Google Places não aparece**
→ Adicione `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` (com prefixo `NEXT_PUBLIC_`) além de `GOOGLE_PLACES_API_KEY`
