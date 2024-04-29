# docker compose -f accounts.compose.yml -p mwgg-accounts up -d

docker run -d --env-file ./account-server/.env --network host mouthwashgg-account-server