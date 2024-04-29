create table users
(
    id                 uuid    not null
        constraint user_pkey
            primary key,
    email              varchar not null,
    password_hash      varchar not null,
    created_at         timestamp with time zone,
    banned_until       timestamp with time zone,
    muted_until        timestamp with time zone,
    game_settings      json    not null,
    email_verified     boolean not null,
    display_name       varchar not null,
    cosmetic_hat       varchar not null,
    cosmetic_pet       varchar not null,
    cosmetic_skin      varchar not null,
    cosmetic_color     integer not null,
    cosmetic_visor     varchar not null,
    cosmetic_nameplate varchar not null,
    stripe_customer_id varchar
);

alter table users
    owner to postgres;

create index users_display_name_index
    on users (display_name);

create index users_email_index
    on users (email);

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
            unique
);

alter table session
    owner to postgres;

create table lobby
(
    id             uuid                     not null
        primary key,
    creator_id     uuid                     not null
        constraint lobby_creator_id_foreign
            references users,
    created_at     timestamp with time zone not null,
    host_server_id integer                  not null,
    destroyed_at   timestamp,
    game_code      varchar                  not null
);

alter table lobby
    owner to postgres;

create table game
(
    id            uuid                     not null
        primary key,
    lobby_id      uuid                     not null
        constraint game_lobby_id_foreign
            references lobby,
    started_by    uuid,
    game_settings json                     not null,
    started_at    timestamp with time zone not null,
    ended_at      timestamp with time zone
);

alter table game
    owner to postgres;

create index game_started_at_index
    on game (started_at desc);

create table player_infraction
(
    id                 uuid                     not null
        primary key,
    user_id            uuid                     not null
        constraint player_infraction_user_id_foreign
            references users,
    lobby_id           uuid
        constraint player_infraction_lobby_id_foreign
            references lobby,
    game_id            uuid
        constraint player_infraction_game_id_foreign
            references game,
    created_at         timestamp with time zone not null,
    player_ping        integer,
    infraction_name    varchar                  not null,
    additional_details json                     not null,
    severity           varchar                  not null
);

alter table player_infraction
    owner to postgres;

create table player
(
    id             uuid not null
        primary key,
    game_id        uuid not null
        constraint player_game_id_foreign
            references game,
    user_id        uuid not null
        constraint player_user_id_foreign
            references users,
    did_win        boolean,
    role_name      varchar,
    cosmetic_color integer,
    cosmetic_name  varchar,
    role_alignment varchar
);

alter table player
    owner to postgres;

create index "player_game_Id_user_id_index"
    on player (game_id, user_id);

create table email_verification
(
    id          varchar                  not null
        primary key,
    user_id     uuid                     not null
        constraint email_verification_user_id_foreign
            references users,
    last_sent   timestamp with time zone not null,
    num_retries integer                  not null,
    verified_at timestamp with time zone
);

alter table email_verification
    owner to postgres;

create index email_verification_user_id_index
    on email_verification (user_id);

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

create table asset_bundle
(
    id                    uuid    not null
        constraint asset_bundle_pk
            primary key,
    url                   varchar not null,
    hash                  varchar not null,
    preview_contents_url  varchar,
    preview_contents_hash varchar
);

alter table asset_bundle
    owner to postgres;

create table checkout_session
(
    id                       uuid                     not null
        constraint checkout_session_pk
            primary key,
    user_id                  uuid                     not null
        constraint checkout_session_users_id_fk
            references users,
    stripe_price_id          varchar                  not null,
    bundle_id                varchar,
    created_at               timestamp with time zone not null,
    canceled_at              timestamp with time zone,
    stripe_payment_intent_id varchar                  not null,
    completed_at             timestamp with time zone
);

alter table checkout_session
    owner to postgres;

create table stripe_item
(
    id                uuid not null
        constraint stripe_item_pk
            primary key,
    stripe_price_id   varchar,
    stripe_product_id varchar
);

alter table stripe_item
    owner to postgres;

create table bundle
(
    id               uuid                     not null
        primary key,
    name             varchar                  not null,
    thumbnail_url    varchar                  not null,
    author_id        uuid                     not null
        constraint bundle_author_id_foreign
            references users,
    base_resource_id integer                  not null,
    price_usd        integer                  not null,
    added_at         timestamp with time zone not null,
    asset_bundle_id  uuid
        constraint bundle_asset_bundle_id_fk
            references asset_bundle,
    stripe_item_id   uuid
        constraint bundle_stripe_item_id_fk
            references stripe_item,
    valuation        varchar                  not null,
    tags             varchar                  not null,
    description      varchar                  not null,
    feature_tags     varchar                  not null
);

alter table bundle
    owner to postgres;

create index bundle_search_term_idx
    on bundle using gin (to_tsvector('english'::regconfig,
                                     (((name::text || ' '::text) || description::text) || ' '::text) || tags::text));

create index bundle_valuation_index
    on bundle (valuation);

create table bundle_item
(
    id            uuid    not null
        primary key,
    bundle_id     uuid    not null
        constraint bundle_item_bundle_id_foreign
            references bundle,
    name          varchar not null,
    among_us_id   varchar not null,
    resource_path varchar not null,
    type          varchar not null,
    resource_id   integer not null,
    valuation     varchar not null
);

alter table bundle_item
    owner to postgres;

create index bundle_item__index
    on bundle_item (among_us_id);

create table user_owned_item
(
    id        uuid                     not null
        primary key,
    item_id   uuid
        constraint user_owned_item_item_id_foreign
            references bundle_item,
    user_id   uuid                     not null
        constraint user_owned_item_user_id_foreign
            references users,
    owned_at  timestamp with time zone not null,
    bundle_id uuid
        constraint user_owned_item_bundle_id_foreign
            references bundle
);

alter table user_owned_item
    owner to postgres;

create table password_reset
(
    id          uuid                     not null
        constraint password_reset_pk
            primary key,
    user_id     uuid                     not null
        constraint password_reset_users_id_fk
            references users,
    code        varchar                  not null,
    sent_at     timestamp with time zone not null,
    accepted_at timestamp with time zone
);

alter table password_reset
    owner to postgres;

create index password_reset_code_index
    on password_reset (code);

