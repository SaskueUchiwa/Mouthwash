mkdir -p data/pg
docker compose -f db.compose.yml -p mwgg-db up -d
export $(cat .env | xargs)
wait-until "docker exec -e PGPASSWORD=$POSTGRES_PASSWORD -i mwgg-db-mwgg-postgres-1 psql --username=postgres -d Mouthwash -c 'select 1'"
cp misc/db.sql data/pg
docker exec -e PGPASSWORD=$POSTGRES_PASSWORD -i mwgg-db-mwgg-postgres-1 psql --username=postgres -d Mouthwash -f /var/lib/postgresql/data/db.sql
rm data/pg/db.sql
docker compose -p mwgg-db down