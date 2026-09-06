import type {Atlas} from './anatomy';

/** Resolve model files beside this viewer, never against the host site's root. */
export function atlasAssetUrl(asset: string, entryUrl: string): string {
  const relative = asset.replace(/^\/+/, '');
  if (!relative.startsWith('models/') || relative.split('/').includes('..') || /[\\?#]/.test(relative)) {
    throw new Error('The atlas contains an invalid model asset path.');
  }
  return new URL(relative, new URL('.', entryUrl)).href;
}

/** Copy the catalogue so the scene can use its existing model-loading code. */
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
