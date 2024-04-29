export interface SpriteFileReference {
    file: string;
    pivot: { x: number; y: number; };
}

export interface AssetsListingMetadataAsset {
    type: "HAT"|"SKIN"|"VISOR";
    chip_offset: { x: number; y: number; };
    use_player_color: boolean;
    product_id: string;
    in_front: boolean;
    main?: SpriteFileReference|null;
    back?: SpriteFileReference|null;
    left_main?: SpriteFileReference|null;
    left_back?: SpriteFileReference|null;
    climb?: SpriteFileReference|null;
    floor?: SpriteFileReference|null;
    left_climb?: SpriteFileReference|null;
    left_floor?: SpriteFileReference|null;
    thumb?: SpriteFileReference|null;
}

export interface AssetsListingMetadata {
    assets: AssetsListingMetadataAsset[];
}

export interface LoadedCosmeticImage {
    img: HTMLImageElement;
    material: "default"|"player";
    pivot: { x: number; y: number; };
    scale: number;
}

export interface LoadedBaseCosmeticImages {
    asset: AssetsListingMetadataAsset;
}

export interface LoadedCosmeticImages extends LoadedBaseCosmeticImages {
    asset: AssetsListingMetadataAsset;
    main?: LoadedCosmeticImage;
    back?: LoadedCosmeticImage;
    left_main?: LoadedCosmeticImage;
    left_back?: LoadedCosmeticImage;
    climb?: LoadedCosmeticImage;
    floor?: LoadedCosmeticImage;
    left_climb?: LoadedCosmeticImage;
    left_floor?: LoadedCosmeticImage;
    thumb?: LoadedCosmeticImage;
}