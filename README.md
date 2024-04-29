# Mouthwash.GG
Mouthwash.GG is the code-name for Polus.GG: Rewritten, a rewrite of the Polus.GG client _and_ server.

The entire codebase has been completely revised with no stone left unturned. [SkeldJS](https://github.com/skeldjs/SkeldJS) was used for the Among Us implementation for the server, [Hindenburg](https://github.com/skeldjs/Hindenburg) for the server itself with support for SaaH (Server-as-a-Host) and [Reactor](https://github.com/NuclearPowered/Reactor) being used for the client mod.

# Setup Guide

## Files
Create a `.env` in the root directory to store passwords and other credentials. It can be empty for now.

## Dependencies
### Supabase (Required)
**Website:** https://supabase.com

Supabase is a free Firebase alternative that has a CDN/file storage bucket feature. Mouthwash uses the storage bucket to host assets for peoplpe to download, for example assets relating to Town of Polus (custom buttons, audio, etc.), as well as Launcher and Client mod releases.

It's very straight forward to create an account + project.

#### Storage Buckets
Once you've made a project, you'll also need to create **2** storage buckets:
![](<media/storage buckets.png>)

- `MouthwashAssets`
- `Downloads` (for storing the Launcher + client releases).

> Make sure to create BOTH buckets as "public buckets":

![](<media/public bucket.png>)

### Postgres (Required)
Postgres is the database of choice for Mouthwash, used for accounts, logging and storing asset information.

#### Docker
The recommended way to use Postgres locally (especially if you're on Windows) is to use it with [Docker](https://docker.com).

In your `.env` file, choose a password for your database:
```env
POSTGRES_PASWORD=Mouthwash123
```
(Replacing `Mouthwash123` with your password)

Create a folder `./data/pg` at the root of the repository.

##### Docker Compose
Using Docker compose, you can start the database with the following command in a terminal of your choice:
```sh
docker compose -f db.compose.yml -p mwgg-db up -d
```

Next, you'll need to setup the database with all of the tables and indexes that Mouthwash uses. You can use `docker exec` to run this inside the container for you:
```sh
cp misc/db.sql data/pg
docker exec -e PGPASSWORD="Mouthwash123" -i mwgg-db-mwgg-postgres-1 psql --username=postgres -d Mouthwash -f /var/lib/postgresql/data/db.sql
```

> Remember to replace `Mouthwash123` in the `PGPASSWORD` parameter with your actual database password.

##### Docker Run
If you don't want to use Docker compose, you can start the database manually with:
```sh
docker run --network host --env-file ./.env -e POSTGRES_USER=postgres -e POSTGRES_DB=Mouthwash -d -v ./data/pg:/var/lib/postgresql/data --name mwgg-postgres postgres
```

Then, to setup the database you can use the following commands:
```sh
cp misc/db.sql data/pg
docker exec -e PGPASSWORD="Mouthwash123" -i mwgg-postgres psql --username=postgres -d Mouthwash -f /var/lib/postgresql/data/db.sql
```

### Redis (Optional)
Redis is entirely optional, however can be helpful if you want to have some basic metrics on the server, or if you want to use the Mouthwash load balancer for multiple nodes.

Create a file in `redis-conf/redis.conf` with the following contents:
```redis
requirepass Mouthwash123
```

> Replace `Mouthwash123` with your own password to secure the database.

#### Docker
The recommended way to use Redis with Mouthwash is to use it with Docker.

##### Docker
```sh
docker run --network host -v ./redis-conf:/usr/local/etc/redis -p 6379:6379/tcp -d --name mwgg-redis redis redis-server /usr/local/etc/redis/redis.conf
```

## Configure the Server
### Asset Upload
There are two assets that need to be uploaded to your Supabase storage bucket that are necessary for Mouthwash and its gamemodes to function: the Global asset and the Town Of Polus asset.

All of these assets can be found at https://github.com/edqx/MouthwashUnity/releases (under gamemode-assets.zip).

Simply upload all of the files in this zip file onto your MouthwashAssets bucket in your Supabase project.

### Launcher
#### Auto Updating Releases
If you want 

### Client

### Node