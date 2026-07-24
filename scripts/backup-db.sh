#!/bin/bash
# Script untuk membackup database produksi manual

# Pastikan SUPABASE_DB_URL diset di environment
if [ -z "$SUPABASE_DB_URL" ]; then
  echo "Error: SUPABASE_DB_URL environment variable is not set."
  echo "Usage: SUPABASE_DB_URL='postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres' ./backup-db.sh"
  exit 1
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="pelangi_backup_${TIMESTAMP}.sql.gz"

echo "Memulai backup database..."
pg_dump "$SUPABASE_DB_URL" | gzip > "$FILENAME"

if [ $? -eq 0 ]; then
  echo "Backup berhasil disimpan di: $FILENAME"
else
  echo "Backup gagal!"
  exit 1
fi
