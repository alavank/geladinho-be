#!/bin/bash
set -e

CONTAINER=supabase-db-rtnlbe2fqtlotqdpyufwgwes
DUMP_FILE=/tmp/cloud-migration-20260522.sql

echo "=== Contagens ANTES do restore ==="
docker exec "$CONTAINER" psql -U postgres -d postgres -c "
SELECT 'orders' AS tabela, COUNT(*) FROM orders
UNION ALL SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL SELECT 'customers', COUNT(*) FROM customers
UNION ALL SELECT 'expenses', COUNT(*) FROM expenses
UNION ALL SELECT 'production_batches', COUNT(*) FROM production_batches
ORDER BY tabela;"

echo ""
echo "=== Copiando dump pro container ==="
docker cp "$DUMP_FILE" "$CONTAINER:/tmp/cloud-migration-20260522.sql"

echo "=== DROP + CREATE schema ==="
docker exec "$CONTAINER" psql -U postgres -d postgres -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;"

echo "=== Restore (mostra ultimas 10 linhas) ==="
docker exec "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=0 -f /tmp/cloud-migration-20260522.sql 2>&1 | tail -10

echo ""
echo "=== Aplicando GRANTs + NOTIFY ==="
docker exec "$CONTAINER" psql -U postgres -d postgres -c "
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';"

echo ""
echo "=== Contagens DEPOIS do restore ==="
docker exec "$CONTAINER" psql -U postgres -d postgres -c "
SELECT 'orders' AS tabela, COUNT(*) FROM orders
UNION ALL SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL SELECT 'customers', COUNT(*) FROM customers
UNION ALL SELECT 'expenses', COUNT(*) FROM expenses
UNION ALL SELECT 'production_batches', COUNT(*) FROM production_batches
ORDER BY tabela;"

echo ""
echo "=== Restart PostgREST ==="
docker restart supabase-rest-rtnlbe2fqtlotqdpyufwgwes
echo "Done."
