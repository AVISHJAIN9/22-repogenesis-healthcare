#!/usr/bin/env bash
set -euo pipefail

MONGO_URI="${MONGODB_URI:-mongodb://localhost:27017/hospital_info}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"

mongodump --uri="$MONGO_URI" --out="$BACKUP_DIR/hospital_info-$STAMP"
printf '\nBackup created at %s\n' "$BACKUP_DIR/hospital_info-$STAMP"
