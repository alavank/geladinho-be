# Playbook: Deploy de App + Supabase no Coolify (Hetzner)

> Replicável entre projetos. Mantém-se 1 VPS Hetzner única com Coolify v4 orquestrando todos os apps; cada app vira 1 Project Coolify com 1 Application + 1 Service Supabase self-hosted dedicados.
>
> **Para outros agentes / Claudes lendo:** este arquivo é um passo-a-passo. Siga em ordem; armadilhas conhecidas estão sinalizadas com ⚠️.

---

## Arquitetura

- **VPS única** (ex.: Hetzner CPX31 4vCPU/8GB/40GB) gerenciada por **Coolify v4**.
- **Por app**: 1 Project Coolify contendo:
  - **Application** apontando para o repo no GitHub (Build Pack: Docker Compose).
  - **Service Supabase** (template oficial do Coolify) — Postgres + GoTrue + PostgREST + Storage + Realtime + Studio + Kong + MinIO + Imgproxy + Logflare.
- **Domínio sem custo** via `sslip.io`: `<prefixo>-<IP-com-traços>.sslip.io` (ex.: `meuapp-app-5-78-42-251.sslip.io`).
- **TLS automático** via Let's Encrypt (gerenciado pelo Traefik embutido no Coolify).

---

## Pré-requisitos no código (commit antes de subir no Coolify)

### 1. `Dockerfile` na raiz

App com frontend (Vite/Next) + backend Node (Express):

```Dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server/index.js"]
```

SPA puro sem backend: use `nginx:alpine` no stage final servindo `dist/` (ver `controle-frotas-qr` para referência).

> ⚠️ Vars `VITE_*` precisam estar como **ARG** + **ENV** no estágio de build porque o Vite as inlinea no bundle em build time, não em runtime.

### 2. `docker-compose.yml` na raiz

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        VITE_SUPABASE_URL: ${VITE_SUPABASE_URL}
        VITE_SUPABASE_ANON_KEY: ${VITE_SUPABASE_ANON_KEY}
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3000
      VITE_SUPABASE_URL: ${VITE_SUPABASE_URL}
      SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY}
    expose:
      - "3000"
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 20s
```

> ⚠️ **USE `expose:`, NÃO `ports:`**. `ports:` cria binding pro host e conflita com Traefik do Coolify. `expose:` apenas declara a porta dentro da rede Docker — Traefik conecta nela.

### 3. `.dockerignore`

```
node_modules
dist
.env*
.git
.github
.vscode
logs
```

### 4. `vite.config.ts` — sem URLs hardcoded

Em particular, o Workbox/PWA não pode ter URL fixa do Supabase Cloud. Deriva de `loadEnv`:

```ts
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const supabaseHost = new URL(env.VITE_SUPABASE_URL).host
  return {
    // ...
    plugins: [VitePWA({
      workbox: {
        runtimeCaching: [{
          urlPattern: new RegExp(`^https://${supabaseHost.replace('.', '\\.')}/`),
          handler: 'NetworkFirst',
          // ...
        }],
      },
    })],
  }
})
```

### 5. `.env.example` documentando todas as vars

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## Setup no Coolify (UI)

### Passo 1 — Criar Project

Coolify Dashboard → sidebar **Projects** → **+ Add** → nome igual ao slug do repo (ex.: `meuapp`).

Dentro do project você terá um environment **production** já criado.

### Passo 2 — Add Resource: Supabase

`+ Add Resource` → **Databases / Services** → **Supabase** (template oficial).

Vai abrir a Configuration. **Não clica Deploy ainda** — ajusta antes:

#### 2a. Hostnames dos sub-serviços (Kong + Studio)

Role até a seção **Services** → para cada um (Kong e Studio), clica **Settings**:

- **Supabase Kong** → campo `Domains`:
  ```
  https://meuapp-api-<IP-traços>.sslip.io:8000
  ```
- **Supabase Studio** → campo `Domains`:
  ```
  https://meuapp-studio-<IP-traços>.sslip.io:3000
  ```

> ⚠️ **Sempre inclua `:8000` no Kong e `:3000` no Studio** no campo do Coolify (a porta do container alvo). Traefik internamente traduz 443 externo → essas portas internas. Externamente os URLs finais não terão porta (a aba **Links** no topo da Configuration mostra os URLs finais corretos).

> ⚠️ Coolify mostra um warning "https + sslip.io não é recomendado" pelo rate limit teórico do Let's Encrypt. **Pode ignorar** — cada subdomínio único do sslip.io conta separadamente no LE; funciona na prática.

#### 2b. Environment Variables (aba esquerda)

Clica **Developer view**. Substitua as seguintes linhas pelos valores corretos:

```
API_EXTERNAL_URL=https://meuapp-api-<IP-traços>.sslip.io
GOTRUE_SITE_URL=https://meuapp-app-<IP-traços>.sslip.io
DISABLE_SIGNUP=true
ENABLE_EMAIL_SIGNUP=true
ENABLE_EMAIL_AUTOCONFIRM=true
ENABLE_PHONE_SIGNUP=false
ENABLE_PHONE_AUTOCONFIRM=false
```

> ⚠️ **ARMADILHA CRÍTICA: `ENABLE_EMAIL_SIGNUP` deve ser `true`** (não false, apesar do nome enganoso). Esse flag controla o **provider de email inteiro** — se for `false`, **bloqueia LOGIN também**, não só signup. O flag certo pra bloquear cadastro público é `DISABLE_SIGNUP=true`. Login com email continua funcionando.

> ⚠️ `GOTRUE_SITE_URL` deve apontar pro **app frontend**, não pro Kong/API. É o destino padrão pós-auth.

> ⚠️ `API_EXTERNAL_URL` deve ser o URL público sem porta (Traefik roteia 443 → 8000).

> ⚠️ O botão **"Save All Environment Variables"** no rodapé do Developer view é **persistente** — sempre fica visível. Não indica pendência de salvamento. Pra confirmar que salvou, observa o toast/aviso após o clique.

**NÃO mexa** nas vars `SERVICE_*` (auto-geradas), `JWT_SECRET`, `POSTGRES_*`, `MINIO_*`, ou qualquer var com `${SERVICE_URL_SUPABASEKONG}` no valor.

Save → **Deploy** (botão amarelo no topo). Aguarda ~3-8min (~10 containers subindo em sequência).

#### 2c. Coletar segredos gerados

Quando ficar `Running (healthy)`, copia e guarda no 1Password/KeePass:

- **Dashboard User** / **Dashboard Password** → login do Studio
- **SERVICE_SUPABASEANON_KEY** → ANON_KEY (usado pelo frontend)
- **SERVICE_SUPABASESERVICE_KEY** → SERVICE_ROLE_KEY (usado pelo backend)
- **PostgreSQL Password** (caso queira conectar direto)
- **MinIO Admin Password**

URLs ficam acessíveis pela aba **Links** no topo (sem porta).

### Passo 3 — Aplicar schema SQL no Studio

Abre `https://meuapp-studio-<IP-traços>.sslip.io` → loga com Dashboard User/Password → **SQL Editor** → **+ New query**.

Roda os arquivos da pasta `supabase/` (ou equivalente) **em ordem**, um por vez. Após cada um, espera "Success" antes do próximo.

**Armadilhas comuns em migrations** (se você reutilizar arquivos de outro projeto):

- `DROP COLUMN x` falha se há view dependente → adicione **`CASCADE`** (`DROP COLUMN x CASCADE`).
- `CREATE OR REPLACE VIEW` falha se você está **removendo** colunas (Postgres só permite adicionar) → adicione **`DROP VIEW IF EXISTS nome CASCADE;`** antes do CREATE.
- Funções referenciadas por policies (`get_my_role()`, etc.) precisam existir **antes** das migrations que as usam.

### Passo 4 — Add Resource: Application

Volta para o Project → `+ Add Resource` → **Application** → **Public Repository** (ou via GitHub Source se já configurada).

Preenche:

- **Repository URL**: `https://github.com/<user>/<repo>`
- **Branch**: `main`
- **Build Pack**: `Docker Compose`
- **Base Directory**: `/`
- **Docker Compose Location**: `/docker-compose.yml` *(não `.yaml`)*

Após criar, abre **Configuration**:

#### 4a. Domains

Campo `Domains for app`:
```
https://meuapp-app-<IP-traços>.sslip.io:3000
```
(`:3000` é a porta do container — Traefik traduz pra 443 externo)

#### 4b. Environment Variables

Coolify auto-cria vars vazias quando vê `${...}` no compose. Preenche:

| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://meuapp-api-<IP-traços>.sslip.io` |
| `VITE_SUPABASE_ANON_KEY` | *(copiado do Supabase)* |
| `SUPABASE_SERVICE_ROLE_KEY` | *(copiado do Supabase)* |

Save All → **Deploy**.

### Passo 5 — Smoke test

- App carrega em `https://meuapp-app-...sslip.io`
- Console do navegador sem erros
- DevTools → Application → Service Worker ativo apontando pro Supabase certo

### Passo 6 — Criar primeiro admin (com `DISABLE_SIGNUP=true`)

No Studio → SQL Editor (cria múltiplos users via SQL é muito mais rápido que clicar manual em Authentication):

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
  'authenticated', 'authenticated',
  'admin.sistema@meuapp.local',
  crypt('SenhaTemp123@', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"nome":"Admin Sistema","login":"admin.sistema","role":"admin"}'::jsonb,
  now(), now(),
  '', '', '', ''
);

-- Promover pra admin (trigger handle_new_user defaulta pra vereador/user comum)
UPDATE public.perfis
  SET role='admin', deve_trocar_senha=FALSE
  WHERE email='admin.sistema@meuapp.local';

-- Dar permissões totais (se o app tiver tabela user_permissions)
INSERT INTO user_permissions (user_id, modulo, pode_ver, pode_criar, pode_editar, pode_excluir)
SELECT p.id, m.modulo, TRUE, TRUE, TRUE, TRUE
FROM perfis p
CROSS JOIN (VALUES ('demandas'), ('usuarios'), ('auditoria') /* ... */) AS m(modulo)
WHERE p.email='admin.sistema@meuapp.local'
ON CONFLICT (user_id, modulo) DO NOTHING;
```

Ajusta nome/email/módulos pro seu app.

### Passo 7 — Auto-deploy on push (GitHub App)

Coolify → sidebar **Sources** → **+ Add** → **GitHub** → instala a App no seu account/org → autoriza os repos que quer no Coolify.

Depois, na sua Application, troque a Source de "Public Repository" pra a GitHub Source criada. Garante o toggle **Auto Deploy on Git Push** = ON.

A mesma Source serve pra todos os apps do mesmo account/org — basta autorizar o repo novo dentro do GitHub.

### Passo 8 — Backup via Scheduled Task

> ⚠️ **O Service Supabase não tem aba "Backups" nativa no Coolify v4.** A feature nativa só existe pra Resources do tipo Database standalone (Postgres/MySQL/etc). Como o Supabase é um template multi-container, o Coolify não sabe qual container é o "banco" — precisamos automatizar manualmente via Scheduled Task.

Service Supabase → aba **Scheduled Tasks** → **+ Add**:

- **Name**: `backup-postgres-diario`
- **Frequency**: `0 3 * * *` (daily 03:00 UTC; ajustar pro fuso desejado)
- **Timeout (seconds)**: `1200` (20min, margem pra bancos maiores)
- **Container name**: `supabase-db` (o container do Postgres dentro do template)
- **Command**:

```bash
mkdir -p /var/lib/postgresql/data/backups && pg_dump -U postgres -Fc postgres > /var/lib/postgresql/data/backups/backup-$(date +%Y%m%d-%H%M%S).dump && find /var/lib/postgresql/data/backups/ -name "backup-*.dump" -mtime +30 -delete
```

O comando: cria pasta de backup → roda `pg_dump` no formato custom (binário, comprimido, mais eficiente que SQL puro pra restore) → deleta dumps com >30 dias.

Save → clica **Execute Now** uma vez pra validar (output em "Recent executions").

**Restore (quando necessário)**:
```bash
pg_restore -U postgres -d postgres --clean --if-exists /var/lib/postgresql/data/backups/backup-YYYYMMDD-HHMMSS.dump
```

> ⚠️ Esse backup fica no **mesmo disco** da VPS — se a VPS pegar fogo, os dumps queimam junto. Pra produção crítica (dados de cidadãos, financeiro, etc.), adicione backup off-site: Hetzner Storage Box (~€3.50/mês por 100GB) com `rclone` ou `restic` num segundo Scheduled Task que envia os `.dump` pra lá.

---

## Checklist final

- [ ] App `Running (healthy)` no Coolify
- [ ] Supabase `Running (healthy)` no Coolify
- [ ] Studio acessível e logando com Dashboard User/Password
- [ ] App carregando, tela de login aparece
- [ ] Login com admin funciona e dashboard abre
- [ ] Console do navegador limpo (sem 404 do service worker, sem CORS)
- [ ] Auto-deploy testado (push trivial dispara build)
- [ ] Backup nightly habilitado
- [ ] Credenciais salvas em gerenciador de senhas
- [ ] `MIGRACAO_COOLIFY.md` (ou equivalente) no repo documentando os passos específicos deste projeto

---

## Armadilhas conhecidas (resumo rápido)

| Armadilha | Sintoma | Solução |
|---|---|---|
| `ENABLE_EMAIL_SIGNUP=false` | 422 `email_provider_disabled` no login | `ENABLE_EMAIL_SIGNUP=true` + `DISABLE_SIGNUP=true` |
| `API_EXTERNAL_URL=http://supabase-kong:8000` | Links em emails de recovery quebrados | Trocar pro URL público `https://...sslip.io` (sem porta) |
| `GOTRUE_SITE_URL` apontando pro Kong | Redirects pós-auth quebrados | Apontar pro URL do **app**, não da API |
| Falta `:8000`/`:3000` no campo Domains | 502/404 no Traefik | Sempre incluir porta do container no Coolify (URL externo final fica sem porta) |
| `ports:` em vez de `expose:` no compose | Conflito com Traefik / 404 | Usa só `expose:` |
| `CREATE OR REPLACE VIEW` removendo coluna | `42P16: cannot drop columns from view` | `DROP VIEW IF EXISTS x CASCADE;` antes |
| `DROP COLUMN` com view dependente | `2BP01: cannot drop column ... because other objects depend` | Adicionar `CASCADE` |
| Save All Environment Variables sempre visível | Confusão "será que salvei?" | Botão é persistente, ignora — confirma pelo toast |
| Coolify GitHub App em vez de webhook manual | Repo privado quebra clone via webhook | Configurar GitHub App pra ter PR previews e funcionar com repo privado |
| Service Supabase sem aba "Backups" | Não acha onde habilitar backup nativo | Backup nativo só existe pra Resource Database standalone — pra Service template, usar Scheduled Task com `pg_dump` (ver Passo 8) |
