# docker compose -f db.compose.yml -p mwgg-db up -d

docker run -d --network host --env-file ./.env -e POSTGRES_USER=postgres -e POSTGRES_DB=Mouthwash -v ./data/pg:/var/lib/postgresql/data postgres