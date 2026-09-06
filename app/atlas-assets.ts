import type {Atlas} from './anatomy';

/** Keep every local asset inside this viewer's directory, including nested hosts. */
function localAssetUrl(asset: string, entryUrl: string, directory: 'models' | 'homer'): string {
  const relative = asset.startsWith('/') ? asset.slice(1) : asset;
  const segments = relative.split('/');
  if (segments[0] !== directory || segments.length < 2 ||
      segments.some(segment => !segment || segment === '.' || segment === '..') ||
      /[\\%?#:\u0000-\u0020]/.test(relative)) {
    throw new Error(`The atlas contains an invalid ${directory} asset path.`);
  }
  return new URL(relative, new URL('.', entryUrl)).href;
}

/** Geometry/catalogue files retain their model-only contract. */
export function atlasAssetUrl(asset: string, entryUrl: string): string {
  return localAssetUrl(asset, entryUrl, 'models');
}

/** Portraits are presentation assets, not model geometry. */
export function homerAssetUrl(asset: string, entryUrl: string): string {
  return localAssetUrl(asset, entryUrl, 'homer');
}

export function withAtlasAssetBase(atlas: Atlas, entryUrl: string): Atlas {
  return {
    ...atlas,
    chunks: atlas.chunks.map(chunk => ({
      ...chunk,
      url: atlasAssetUrl(chunk.url, entryUrl),
      ...(chunk.gzip ? {gzip: atlasAssetUrl(chunk.gzip, entryUrl)} : {}),
    })),
  };
}
