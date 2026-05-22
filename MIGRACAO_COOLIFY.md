# Migração para Coolify/Hetzner — Estado

> Documento vivo, fonte de verdade pra continuar a migração de qualquer máquina (casa ou trabalho). Após `git pull`, leia este arquivo.

**Status:** ✅ Migração concluída. App em produção no Coolify com dados reais. Railway continua rodando como fallback (sem auto-deploy, sem tráfego) — decisão de não desligar agora.

**Última atualização:** 2026-05-22

---

## Infra alvo

- **VPS Hetzner Cloud:** `5.78.42.251` (CPX51, Ubuntu 24.04, Hillsboro/OR — `alavank-server` / hostname `coolify-frotas`)
- **Coolify dashboard:** `http://5.78.42.251:8000`
- **Project no Coolify:** `geladinho` (environment: `production`)
- **Container Postgres do projeto:** `supabase-db-rtnlbe2fqtlotqdpyufwgwes`
- **Container PostgREST:** `supabase-rest-rtnlbe2fqtlotqdpyufwgwes`

### URLs sslip.io (prefixo: `geladinho`)

| Serviço | URL |
|---|---|
| App Next.js | `https://geladinho-app-5-78-42-251.sslip.io` |
| Supabase API (Kong) | `https://geladinho-api-5-78-42-251.sslip.io` |
| Supabase Studio | `https://geladinho-studio-5-78-42-251.sslip.io` |

---

## ✅ Checkpoints concluídos (1–7 + migração de dados)

| # | O que | Status |
|---|---|---|
| **A** | Código preparado (Dockerfile, docker-compose, .dockerignore, next.config standalone, .env.example) — commit `bdf00fb` | ✅ |
| **1** | Project Coolify + Service Supabase com domains sslip.io + env vars (Kong, Studio, GoTrue) | ✅ |
| **2** | 4 segredos coletados + 12 migrations rodadas no Studio em ordem | ✅ |
| **3** | Application via GitHub App (`alavank-coolify` Source) apontando pra `alavank/geladinho-be:main`, Docker Compose | ✅ |
| **4** | 10 env vars configuradas (com `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` como **Build Variable**) | ✅ |
| **5** | Smoke test: app carrega, login admin OK | ✅ |
| **6** | Auto-deploy on push via GitHub Source (testado e funcionando) | ✅ |
| **7** | Backup nightly (`backup-postgres-diario`, cron `0 2 * * *`) executado com sucesso | ✅ |
| **Extra** | **Dados reais do Supabase Cloud migrados** (48 pedidos, 830 itens, 13 clientes, 63 gastos, 55 production_batches) | ✅ |

### Commits relevantes nesta migração

- `bdf00fb` — containerização inicial (Dockerfile, docker-compose, .dockerignore)
- `2180073` — fix Supabase client lazy init (evita throw em build time)
- `b4e0b2d` — fix healthcheck (`wget --spider` → `node -e` http.get)
- `de3df75` — backlog: URLs separadas por persona (commit que testou auto-deploy)

---

## ⏸️ Checkpoint 8 — Cutover Railway (deferido)

**Decisão (2026-05-22):** deixar Railway rodando como fallback por enquanto. Sem urgência pra desligar — está sem auto-deploy e sem tráfego.

### Estado atual do Railway

- Service do `geladinho-be` continua rodando com a última versão pré-migração
- Auto Deploy desligado (decidido no início da migração)
- URL `geladinho.up.railway.app` ainda responde mas não é divulgada
- Conectado ao **Supabase Cloud antigo** (`bmueswaprjxllvagnbqv.supabase.co`) — esse Cloud também continua ativo
- Continua cobrando (Railway não tem mais opção de Pause na versão atual — só **Delete Service**)

### Quando decidir desligar

A versão atual do Railway só oferece **Delete Service** (não tem Pause). Caminho:
1. railway.app → projeto `geladinho-be` → service → aba **Settings** → final da página → **Delete service**
2. Project no Railway permanece (pode recriar service depois se precisar)
3. Depois, no Supabase Cloud (`supabase.com/dashboard/project/bmueswaprjxllvagnbqv`): **Pause** ou **Delete** o projeto também (release dos custos do Cloud)

### Backup pré-cutover (caso queira fazer)

Antes de deletar, gerar um pg_dump fresco do Cloud pra arquivo local (alguns minutos extras de cautela):

```powershell
ssh -i "$HOME\.ssh\coolify_localhost" root@5.78.42.251
# No SSH:
read -rs PG_PASS  # cola a senha do Cloud
docker run --rm \
  -e PGPASSWORD="$PG_PASS" \
  -e PGSSLMODE=require \
  -v /tmp:/dump \
  postgres:17 \
  pg_dump --schema=public --no-owner --format=plain \
  -f /dump/cloud-final-backup-$(date +%Y%m%d).sql \
  -h aws-0-us-west-2.pooler.supabase.com -p 5432 \
  -U postgres.bmueswaprjxllvagnbqv -d postgres
```

Daí `scp` o arquivo pra máquina local pra guardar offline.

---

## 🔜 Pós-migração (backlog)

### URLs separadas por persona

Hoje tudo está em `https://geladinho-app-5-78-42-251.sslip.io` (cliente em `/`, admin em `/admin`, revenda em `/revenda`).

Desejado:
- `https://pedir-geladinho-5-78-42-251.sslip.io` → cliente (`/`)
- `https://geladinho-magasin-5-78-42-251.sslip.io` → revenda (rewrite pra `/revenda`)
- `https://geladinho-5-78-42-251.sslip.io` → admin (rewrite pra `/admin`)

Como fazer:
1. No Coolify, adicionar os 3 domains no campo `Domains for app` (uma URL por linha, todas com `:3000`)
2. Estender `src/middleware.ts` pra ler `request.headers.get('host')` e fazer `NextResponse.rewrite()` baseado no host
3. Escopar cookie `admin_session` pelo host de admin (em `src/lib/auth.ts`)
4. Conferir se notificações Telegram têm links absolutos — ajustar pra host correto

### Cleanup local

A senha root nova gerada via Hetzner Console **não precisa** mais — usamos SSH com chave depois disso. Pode esquecer ou guardar como backup de emergência.

---

## 📚 Lições aprendidas (pra não repetir)

### 1. `--no-acl` no `pg_dump` quebra PostgREST

Usei `pg_dump --no-acl` pra evitar conflitos com OWNERs do Cloud. Mas isso **remove os GRANTs** das tabelas, e PostgREST conecta com role `service_role` que sem GRANT dá 500 silencioso (PostgREST não loga esses erros).

**Fix aplicado** (rodar via `docker exec supabase-db-... psql -U postgres -d postgres -c "..."`):

```sql
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
```

Pra migrations futuras: **omitir `--no-acl`** e usar `--no-owner` apenas, ou aplicar esses GRANTs como passo final do restore.

### 2. `pg_dump` cross-version: usar `--format=plain` em vez de `-Fc`

Supabase Cloud roda Postgres 17.6, mas o container no Coolify roda 15.8. `pg_dump 17` gera dump custom v1.16 que `pg_restore 15` não lê (`unsupported version (1.16)`).

**Solução**: usar `--format=plain` (SQL puro) — compatível com qualquer versão. Pode usar `ON_ERROR_STOP=0` no psql pra ignorar comandos novos como `\unrestrict` (inofensivos).

### 3. Schema cache do PostgREST

Após DROP SCHEMA + restore, o PostgREST tem cache antigo. Reiniciar OU enviar `NOTIFY pgrst, 'reload schema';` no banco.

### 4. Healthcheck no docker-compose

`wget --spider` faz HEAD request que Next.js standalone às vezes responde diferente de GET. Trocado por:
```yaml
test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/', (r) => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"]
```

### 5. Coolify Domain field

Não pode estar vazio. Sem o domínio com `:3000`, Traefik não tem regra de roteamento → 503 "no available server" mesmo com container healthy.

---

## 🔑 Como recuperar acesso SSH ao servidor (de outra máquina)

Se você está numa máquina nova (ex: trabalho), a chave SSH local **não está lá**. Pra recuperar:

### 1. Pegar a chave do Coolify

1. Coolify → **Keys & Tokens** (sidebar) → aba **Private Keys**
2. Clica em **`localhost's key`** (descrição: "The private key for the Coolify host machine (localhost)")
3. Clica no **olhinho** 👁️ pra revelar a chave privada
4. Seleciona TUDO (BEGIN até END) e copia (Ctrl+C)

### 2. Salvar localmente (PowerShell)

```powershell
# Cria pasta .ssh se não existe
New-Item -ItemType Directory -Path "$HOME\.ssh" -Force | Out-Null

# Salva clipboard no arquivo
[System.IO.File]::WriteAllText("$HOME\.ssh\coolify_localhost", (Get-Clipboard -Raw))
```

### 3. ⚠️ Coolify mostra a chave em UMA linha só (sem newlines)

O paste perde as quebras. Pra reconstruir:

```powershell
$path = "$HOME\.ssh\coolify_localhost"
$raw = [System.IO.File]::ReadAllText($path)
$header = "-----BEGIN OPENSSH PRIVATE KEY-----"
$footer = "-----END OPENSSH PRIVATE KEY-----"
$startIdx = $raw.IndexOf($header) + $header.Length
$endIdx = $raw.IndexOf($footer)
$body = $raw.Substring($startIdx, $endIdx - $startIdx).Trim()
$lines = @()
for ($i = 0; $i -lt $body.Length; $i += 70) {
  $end = [Math]::Min($i + 70, $body.Length)
  $lines += $body.Substring($i, $end - $i)
}
$fixed = $header + "`n" + ($lines -join "`n") + "`n" + $footer + "`n"
[System.IO.File]::WriteAllText($path, $fixed)
```

### 4. Permissões + teste

```powershell
$path = "$HOME\.ssh\coolify_localhost"
icacls $path /inheritance:r
icacls $path /grant:r "$($env:USERNAME):F"
ssh -i $path root@5.78.42.251 "whoami"
# Deve retornar: root
```

---

## 🧰 Comandos de referência

### SSH no servidor
```powershell
ssh -i "$HOME\.ssh\coolify_localhost" root@5.78.42.251
```

### Pg_dump do Cloud (quando precisar refazer)
```bash
# Dentro do SSH:
read -rs PG_PASS  # cola senha e Enter

docker run --rm \
  -e PGPASSWORD="$PG_PASS" \
  -e PGSSLMODE=require \
  -v /tmp:/dump \
  postgres:17 \
  pg_dump --schema=public --no-owner --no-acl --format=plain \
  -f /dump/cloud-migration.sql \
  -h aws-0-us-west-2.pooler.supabase.com -p 5432 \
  -U postgres.bmueswaprjxllvagnbqv -d postgres
```

### Restore no self-hosted
```bash
CONTAINER=supabase-db-rtnlbe2fqtlotqdpyufwgwes
docker cp /tmp/cloud-migration.sql $CONTAINER:/tmp/cloud-migration.sql
docker exec $CONTAINER psql -U postgres -d postgres -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;"
docker exec $CONTAINER psql -U postgres -d postgres -v ON_ERROR_STOP=0 -f /tmp/cloud-migration.sql 2>&1 | tail -30
# Aplicar GRANTs (importante!)
docker exec $CONTAINER psql -U postgres -d postgres -c "GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role; GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role; GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role; GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role; NOTIFY pgrst, 'reload schema';"
```

### Backup manual (restauração se algo der errado)
```bash
# Dump local do self-hosted
docker exec supabase-db-rtnlbe2fqtlotqdpyufwgwes pg_dump -U postgres -Fc postgres > /var/lib/postgresql/data/backups/backup-manual-$(date +%Y%m%d-%H%M%S).dump

# Restore
docker exec supabase-db-rtnlbe2fqtlotqdpyufwgwes pg_restore -U postgres -d postgres --clean --if-exists /var/lib/postgresql/data/backups/backup-YYYYMMDD-HHMMSS.dump
```

---

## Referências

- [PLAYBOOK_COOLIFY.md](PLAYBOOK_COOLIFY.md) — playbook completo (armadilhas, decisões, motivações)
- Repo no GitHub: `https://github.com/alavank/geladinho-be`
- IP da VPS: `5.78.42.251` (Hetzner Cloud `alavank-server`)
- Supabase Cloud antigo (será desligado): projeto ref `bmueswaprjxllvagnbqv`
