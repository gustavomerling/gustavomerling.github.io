/**
 * Base URL for all static assets in the game.
 * This allows us to host assets separately or on a CDN.
 */
export const ASSET_BASE_URL = "https://gustavomerling.github.io/perpetual-break/game/assets";

/**
 * Generates the full URL for a given asset path.
 * 
 * @param path - The relative path to the asset (e.g., "icons/play.svg")
 * @returns The complete URL to the asset
 * 
 * @example
 * getAssetUrl("icons/play.svg")
 * // Returns "https://gustavomerling.github.io/perpetual-break/game/assets/icons/play.svg"
 */
export const getAssetUrl = (path: string): string => {
    if (!path) return "";

    // Check if it's already a full URL
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }

    // Remove leading slash if present to avoid double slashes
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;

    return `${ASSET_BASE_URL}/${cleanPath}`;
};
