#!/usr/bin/env bash
set -euo pipefail

RESTORE_DIR="${1:-}"
if [[ -z "$RESTORE_DIR" ]]; then
  echo "Usage: ./restore-db.sh <backup-directory>" >&2
  exit 1
fi

MONGO_URI="${MONGODB_URI:-mongodb://localhost:27017/hospital_info}"
mongorestore --uri="$MONGO_URI" --drop "$RESTORE_DIR"
