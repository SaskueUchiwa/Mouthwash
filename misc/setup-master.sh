#!/bin/bash
mkdir -p data/prometheus
chown 65534:65534 data/prometheus

mkdir -p redis-conf
export $(cat .env | xargs)
echo "requirepass $REDIS_PASSWORD" > redis-conf/redis.conf

docker build -f Dockerfile.Master . --tag mouthwashgg-master