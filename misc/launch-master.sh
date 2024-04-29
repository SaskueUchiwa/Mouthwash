# docker compose -f master.compose.yml -p mwgg up -d

docker run -d --network host -v ./redis-conf:/usr/local/etc/redis redis redis-server /usr/local/etc/redis/redis.conf
docker run -d --network host --env-file ./.env -e REDIS_ADDR=127.0.0.1:6379 -e REDIS_EXPORTER_COUNT_KEYS=ROOM:*,CLIENT:* oliver006/redis_exporter
docker run -d --network host -v ./prom-conf:/etc/prometheus -v ./data/prometheus:/prometheus prom/prometheus
docker run -d --network host -e HINDENBURG_CLI_ARGS="--socket.ip 'auto' --plugins[hbplugin-mouthwashgg-auth].baseUrl 'http://127.0.0.1:8000'" --cpus 1 --env-file ./.env mouthwashgg-master