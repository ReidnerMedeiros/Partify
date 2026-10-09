#!/usr/bin/env bash
# Backup lógico diário do banco do Partify (Supabase) para rodar na VPS via cron.
#
# O plano gratuito do Supabase não faz backup automático, então este script é a
# única cópia do banco. Gera um dump compactado do schema "public" (tabelas do
# Partify, incluindo a extensão pgvector usada nos embeddings) e apaga os mais
# antigos. NÃO cobre os PDFs do Storage (o dump guarda só os caminhos dos arquivos).
#
# Configuração (uma vez, na VPS):
#   1. sudo apt install postgresql-client   (a versão do pg_dump deve ser igual ou
#      maior que a do Postgres do Supabase; confira com `pg_dump --version`)
#   2. No backend/.env da VPS, adicionar a linha (sem aspas):
#        BACKUP_DATABASE_URL=postgresql://USUARIO:SENHA@HOST_DO_POOLER:5432/postgres
#      Use a string do "Session pooler" (porta 5432) do painel do Supabase. NÃO use
#      a do "Transaction pooler" (6543): o pg_dump não funciona nela. A conexão
#      direta só funciona se a VPS tiver IPv6.
#   3. chmod +x ~/partify/scripts/backup-banco.sh
#   4. Testar uma vez: ~/partify/scripts/backup-banco.sh
#   5. Agendar (crontab -e), todo dia às 03:30:
#        30 3 * * * $HOME/partify/scripts/backup-banco.sh >> $HOME/backups/partify/backup.log 2>&1
#
# Restauração (em um banco vazio com a extensão vector disponível):
#   pg_restore --no-owner --no-privileges --dbname "URL_DO_BANCO_DESTINO" arquivo.dump
#
# Teste a restauração de vez em quando: backup nunca restaurado não é garantia.

set -euo pipefail

DIR_PROJETO="${DIR_PROJETO:-$HOME/partify}"
ARQUIVO_ENV="${ARQUIVO_ENV:-$DIR_PROJETO/backend/.env}"
DIR_BACKUPS="${DIR_BACKUPS:-$HOME/backups/partify}"
DIAS_RETENCAO="${DIAS_RETENCAO:-14}"

# Lê só a variável necessária (não carrega o .env inteiro no shell).
if [ -z "${BACKUP_DATABASE_URL:-}" ]; then
  BACKUP_DATABASE_URL="$(grep -E '^BACKUP_DATABASE_URL=' "$ARQUIVO_ENV" | head -n1 | cut -d= -f2- | tr -d '"'"'"'\r')"
fi

if [ -z "$BACKUP_DATABASE_URL" ]; then
  echo "$(date '+%F %T') ERRO: BACKUP_DATABASE_URL não definida em $ARQUIVO_ENV" >&2
  exit 1
fi

mkdir -p "$DIR_BACKUPS"
chmod 700 "$DIR_BACKUPS"

CARIMBO="$(date '+%Y%m%d-%H%M%S')"
DESTINO="$DIR_BACKUPS/partify-$CARIMBO.dump"
TEMPORARIO="$DESTINO.parcial"

# Formato custom (-Fc) já é compactado. Grava em arquivo temporário e só renomeia
# no fim, para nunca sobrar um dump incompleto com cara de válido.
pg_dump --format=custom --schema=public --no-owner --no-privileges \
  --dbname="$BACKUP_DATABASE_URL" --file="$TEMPORARIO"
mv "$TEMPORARIO" "$DESTINO"
chmod 600 "$DESTINO"

# Confere que o arquivo é legível pelo pg_restore antes de apagar os antigos.
pg_restore --list "$DESTINO" > /dev/null

find "$DIR_BACKUPS" -name 'partify-*.dump' -mtime +"$DIAS_RETENCAO" -delete
find "$DIR_BACKUPS" -name 'partify-*.parcial' -mtime +1 -delete

echo "$(date '+%F %T') OK: $DESTINO ($(du -h "$DESTINO" | cut -f1))"

# Cópia fora da VPS (recomendado): descomente e ajuste, por exemplo com rclone
# configurado para o Object Storage da Oracle ou outro destino:
# rclone copy "$DESTINO" oracle-bucket:partify-backups/
