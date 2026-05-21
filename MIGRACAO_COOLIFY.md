# Migração para Coolify/Hetzner — Estado

> Documento vivo, fonte de verdade pra continuar a migração de qualquer máquina (casa ou trabalho). Após `git pull`, leia este arquivo.

**Status:** ⏸️ Pausado no Checkpoint 2 (coletar segredos + rodar migrations)

**Última atualização:** 2026-05-20

---

## Infra alvo

- **VPS Hetzner:** `5.78.42.251`
- **Coolify dashboard:** `http://5.78.42.251:8000`
- **Project no Coolify:** `geladinho-be` (environment: `production`)

### URLs sslip.io (prefixo: `geladinho`)

| Serviço | URL |
|---|---|
| App Next.js | `https://geladinho-app-5-78-42-251.sslip.io` |
| Supabase API (Kong) | `https://geladinho-api-5-78-42-251.sslip.io` |
| Supabase Studio | `https://geladinho-studio-5-78-42-251.sslip.io` |

---

## ✅ Parte A — Código preparado

Commit `bdf00fb` em `origin/main`. Arquivos adicionados/editados:

- `Dockerfile` — multi-stage com Next.js `output: 'standalone'`
- `docker-compose.yml` — `expose: 3000` (não `ports:`) + 10 env vars
- `.dockerignore`
- `next.config.js` — `output: 'standalone'` + remoção de `experimental.serverActions` (não usado)
- `.env.example` — adiciona `GEMINI_API_KEY`, remove `NEXTAUTH_URL` obsoleto
- `PLAYBOOK_COOLIFY.md` — playbook de referência

### ⚠️ Atenção Railway

O commit acima foi pro repo oficial. **Railway pode tentar buildar com o Dockerfile novo e quebrar.** Recomendado **desligar Auto Deploy no Railway** (Settings → Service) até a migração terminar. O serviço em produção continua rodando normal enquanto o auto-deploy estiver desligado.

---

## ✅ Checkpoint 1 — Project + Supabase Service

Concluído. Supabase rodando `Running (healthy)` no Coolify com:

- Domínios sslip.io configurados (Kong `:8000`, Studio `:3000`)
- Env vars ajustadas: `API_EXTERNAL_URL`, `GOTRUE_SITE_URL`, `DISABLE_SIGNUP=true`, `ENABLE_EMAIL_SIGNUP=true`, `ENABLE_EMAIL_AUTOCONFIRM=true`, `ENABLE_PHONE_SIGNUP=false`, `ENABLE_PHONE_AUTOCONFIRM=false`

---

## ⏸️ Checkpoint 2 — Próximo passo ao retomar

### 2a. Coletar 4 segredos do Service Supabase

No Service Supabase → **Environment Variables** → **Developer view**, copia pra gerenciador de senhas:

| Variável no Supabase | Onde será usada |
|---|---|
| `SERVICE_SUPABASESERVICE_KEY` | ⭐ Será `SUPABASE_SERVICE_ROLE_KEY` da Application (Checkpoint 4) |
| `SERVICE_USER_SUPABASEDASHBOARD` | Login do Studio |
| `SERVICE_PASSWORD_SUPABASEDASHBOARD` | Senha do Studio |
| `SERVICE_PASSWORD_POSTGRES` | Conexão direta ao Postgres (se necessário) |

> Nomes podem variar levemente entre versões. Procurar palavras-chave: `SERVICE_KEY`, `DASHBOARD`, `POSTGRES_PASSWORD`.

### 2b. Rodar 12 migrations em ordem no Studio

1. Acessar `https://geladinho-studio-5-78-42-251.sslip.io`
2. Login com `SERVICE_USER_SUPABASEDASHBOARD` / `SERVICE_PASSWORD_SUPABASEDASHBOARD`
3. **SQL Editor** → **+ New query**

Pra cada arquivo abaixo: abrir Raw, copiar tudo, colar no SQL Editor, Run, esperar "Success" antes do próximo:

| # | Arquivo | Link Raw |
|---|---|---|
| 1 | `migration.sql` | https://raw.githubusercontent.com/alavank/geladinho-be/main/supabase/migration.sql |
| 2 | `migration_v2.sql` | https://raw.githubusercontent.com/alavank/geladinho-be/main/supabase/migration_v2.sql |
| 3 | `migration_v3.sql` | https://raw.githubusercontent.com/alavank/geladinho-be/main/supabase/migration_v3.sql |
| 4 | `migration_v4.sql` | https://raw.githubusercontent.com/alavank/geladinho-be/main/supabase/migration_v4.sql |
| 5 | `migration_v5.sql` | https://raw.githubusercontent.com/alavank/geladinho-be/main/supabase/migration_v5.sql |
| 6 | `migration_v6_expenses.sql` | https://raw.githubusercontent.com/alavank/geladinho-be/main/supabase/migration_v6_expenses.sql |
| 7 | `migration_v7_geocoding.sql` | https://raw.githubusercontent.com/alavank/geladinho-be/main/supabase/migration_v7_geocoding.sql |
| 8 | `migration_v8_expense_receipts.sql` | https://raw.githubusercontent.com/alavank/geladinho-be/main/supabase/migration_v8_expense_receipts.sql |
| 9 | `migration_v9_admin_registry.sql` | https://raw.githubusercontent.com/alavank/geladinho-be/main/supabase/migration_v9_admin_registry.sql |
| 10 | `migration_v10_stock.sql` | https://raw.githubusercontent.com/alavank/geladinho-be/main/supabase/migration_v10_stock.sql |
| 11 | `migration_v11_custom_statuses.sql` | https://raw.githubusercontent.com/alavank/geladinho-be/main/supabase/migration_v11_custom_statuses.sql |
| 12 | `migration_v12_saved_routes.sql` | https://raw.githubusercontent.com/alavank/geladinho-be/main/supabase/migration_v12_saved_routes.sql |

**Armadilhas conhecidas:**

- `cannot drop columns from view` → adicionar `DROP VIEW IF EXISTS nome_da_view CASCADE;` antes do `CREATE OR REPLACE VIEW`
- `cannot drop column ... because other objects depend` → mudar `DROP COLUMN x` para `DROP COLUMN x CASCADE`

---

## 🔜 Checkpoint 3 — Criar Application

No project `geladinho-be` → **+ Add Resource**:

**Se ainda não tem GitHub App configurada no Coolify:**
1. Sidebar **Sources** → **+ Add** → **GitHub** → instalar GitHub App → autorizar repo `alavank/geladinho-be`
2. Voltar ao project → **+ Add Resource** → **Private Repository (with GitHub App)**

**Caso contrário:** **+ Add Resource** → **Public Repository** (depois trocamos pra GitHub Source no Checkpoint 6).

Configurações:

- **Repository URL:** `https://github.com/alavank/geladinho-be`
- **Branch:** `main`
- **Build Pack:** `Docker Compose`
- **Base Directory:** `/`
- **Docker Compose Location:** `/docker-compose.yml`

**Domains** (Configuration):
```
https://geladinho-app-5-78-42-251.sslip.io:3000
```

---

## 🔜 Checkpoint 4 — Env Vars da Application

Coolify pré-cria as vars vazias a partir do `docker-compose.yml`. Preencher:

| Key | Value | Notas |
|---|---|---|
| `SUPABASE_URL` | `https://geladinho-api-5-78-42-251.sslip.io` | |
| `SUPABASE_SERVICE_ROLE_KEY` | (`SERVICE_SUPABASESERVICE_KEY` do Checkpoint 2a) | |
| `ADMIN_USER` | `admin` | |
| `ADMIN_PASS` | (do gerenciador de senhas — gerado em sessão anterior) | Se perdeu, peça novo |
| `JWT_SECRET` | (do gerenciador de senhas — gerado em sessão anterior) | Se perdeu, peça novo |
| `TELEGRAM_BOT_TOKEN` | (do Railway atual ou BotFather) | |
| `TELEGRAM_CHAT_ID` | (do Railway atual) | |
| `GOOGLE_PLACES_API_KEY` | (do Railway atual) | |
| `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` | (mesma do Google Places acima) | ⚠️ **MARCAR como Build Variable** |
| `GEMINI_API_KEY` | (sua key) | |

⚠️ **Crítico:** `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` precisa estar marcada como **Build Variable** na UI do Coolify. Sem isso, o autocomplete de endereço fica vazio no front (Vite/Next inlina vars `NEXT_PUBLIC_*` em build time, não em runtime).

Save All → **Deploy**.

---

## 🔜 Checkpoint 5 — Smoke test

- `https://geladinho-app-5-78-42-251.sslip.io` carrega o cardápio
- DevTools console limpo (sem 404/CORS)
- Adicionar 50+ unidades ao carrinho → submeter pedido → notificação Telegram chega
- `/admin/login` aceita `ADMIN_USER`/`ADMIN_PASS` → dashboard `/admin` abre
- Rota admin sem login → redireciona pra `/admin/login` (middleware OK)
- Quick-scan de nota fiscal funciona (testa `GEMINI_API_KEY`)

---

## 🔜 Checkpoint 6 — Auto-deploy on push

Se ainda não fez no Checkpoint 3:
1. **Sources** → **+ Add** → **GitHub** → instalar GitHub App → autorizar repo
2. Na Application: trocar source de "Public Repository" pra a GitHub Source criada
3. Toggle **Auto Deploy on Git Push** = ON

Teste: `git commit --allow-empty -m "chore: trigger deploy" && git push` → Coolify rebuilda automaticamente.

---

## 🔜 Checkpoint 7 — Backup nightly

Service Supabase → aba **Scheduled Tasks** → **+ Add**:

- **Name:** `backup-postgres-diario`
- **Frequency:** `0 2 * * *` (02:00 UTC ≈ 03:00 Bruxelas inverno / 04:00 verão)
- **Timeout (seconds):** `1200`
- **Container name:** `supabase-db`
- **Command:**

```bash
mkdir -p /var/lib/postgresql/data/backups && pg_dump -U postgres -Fc postgres > /var/lib/postgresql/data/backups/backup-$(date +%Y%m%d-%H%M%S).dump && find /var/lib/postgresql/data/backups/ -name "backup-*.dump" -mtime +30 -delete
```

Save → **Execute Now** uma vez pra validar (output em "Recent executions").

**Restore (quando necessário):**
```bash
pg_restore -U postgres -d postgres --clean --if-exists /var/lib/postgresql/data/backups/backup-YYYYMMDD-HHMMSS.dump
```

---

## 🔜 Checkpoint 8 — Cutover (desligar Railway)

Quando tudo estiver verde no Coolify:

1. Atualizar DNS (se houver domínio próprio apontando pro Railway) → apontar pro IP `5.78.42.251`
2. Desligar serviço/projeto no Railway
3. Reativar Auto Deploy no Railway? **Não** — pode deletar o projeto Railway se quiser, ou só deixar parado como fallback
4. Atualizar `README.md`: substituir seção "🚂 Deploy no Railway" por nova seção apontando pro `PLAYBOOK_COOLIFY.md` e este arquivo

---

## Referências

- [PLAYBOOK_COOLIFY.md](PLAYBOOK_COOLIFY.md) — playbook completo (armadilhas, decisões, motivações)
- Repo no GitHub: `https://github.com/alavank/geladinho-be`
- IP da VPS: `5.78.42.251`
