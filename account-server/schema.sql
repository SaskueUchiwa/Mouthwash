-- Active: 1713709353971@@aws-0-us-east-1.pooler.supabase.com@5432@postgres
create table users
(
    id             uuid    not null
        constraint user_pkey
            primary key,
    email          varchar not null,
    password_hash  varchar not null,
    created_at     timestamp(0),
    banned_until   timestamp(0),
    muted_until    timestamp(0),
    game_settings  json    not null,
    email_verified boolean not null,
    cosmetic_hat   uuid    not null,
    cosmetic_pet   uuid    not null,
    cosmetic_skin  uuid    not null,
    display_name   varchar not null
);

alter table users
    owner to postgres;

create table session
(
    id           uuid    not null
        constraint session_pk
            primary key,
    user_id      uuid    not null
        constraint session_user_id_foreign
            references users,
    client_token varchar not null
        constraint session_client_token_unique
            unique,
    ip           varchar not null
);

alter table session
    owner to postgres;

create index session_user_id_ip_index
    on session (user_id, ip);

create table lobby
(
    id             uuid         not null
        primary key,
    creator_id     uuid         not null
        constraint lobby_creator_id_foreign
            references users,
    created_at     timestamp(0) not null,
    host_server_id integer      not null
);

alter table lobby
    owner to postgres;

create table game
(
    id            uuid not null
        primary key,
    lobby_id      uuid not null
        constraint game_lobby_id_foreign
            references lobby,
    started_by    uuid not null,
    game_settings json not null
);

alter table game
    owner to postgres;

create table bundle
(
    id                uuid         not null
        primary key,
    name              varchar      not null,
    bundle_asset_path varchar      not null,
    thumbnail_url     varchar      not null,
    author_id         uuid         not null
        constraint bundle_author_id_foreign
            references users,
    base_resource_id  integer      not null,
    price_usd         integer      not null,
    added_at          timestamp(0) not null
);

alter table bundle
    owner to postgres;

create table bundle_item
(
    id            uuid    not null
        primary key,
    bundle_id     uuid    not null
        constraint bundle_item_bundle_id_foreign
            references bundle,
    name          varchar not null,
    among_us_id   bigint  not null,
    resource_path varchar not null,
    type          varchar not null,
    resource_id   integer not null
);

alter table bundle_item
    owner to postgres;

create table player_infraction
(
    id         uuid         not null
        primary key,
    user_id    uuid         not null
        constraint player_infraction_user_id_foreign
            references users,
    lobby_id   uuid         not null
        constraint player_infraction_lobby_id_foreign
            references lobby,
    game_id    uuid
        constraint player_infraction_game_id_foreign
            references game,
    created_at timestamp(0) not null
);

alter table player_infraction
    owner to postgres;

create table player
(
    id      uuid not null
        primary key,
    game_id uuid not null
        constraint player_game_id_foreign
            references game,
    user_id uuid not null
        constraint player_user_id_foreign
            references users
);

alter table player
    owner to postgres;

create table email_verification
(
    id          varchar      not null
        primary key,
    user_id     uuid         not null
        constraint email_verification_user_id_foreign
            references users,
    last_sent   timestamp(0) not null,
    num_retries integer      not null,
    verified_at timestamp(0)
);

alter table email_verification
    owner to postgres;

create index email_verification_user_id_index
    on email_verification (user_id);

create table user_owned_item
(
    id        uuid         not null
        primary key,
    item_id   uuid
        constraint user_owned_item_item_id_foreign
            references bundle_item,
    user_id   uuid         not null
        constraint user_owned_item_user_id_foreign
            references users,
    owned_at  timestamp(0) not null,
    bundle_id uuid
        constraint user_owned_item_bundle_id_foreign
            references bundle
);

alter table user_owned_item
    owner to postgres;

create table user_perk
(
    id            uuid    not null
        primary key,
    user_id       uuid    not null
        constraint user_perk_user_id_foreign
            references users,
    perk_id       varchar not null,
    perk_settings json    not null
);

alter table user_perk
    owner to postgres;

