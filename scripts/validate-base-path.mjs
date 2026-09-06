import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../app/atlas-assets.ts', import.meta.url), 'utf8');
const {outputText} = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022}});
const {atlasAssetUrl, withAtlasAssetBase} = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
for (const entry of ['https://example.test/courtroom-atlas/', 'https://example.test/courtroom-atlas/index.html', 'https://example.test/courtroom-atlas/index.html?preview=1']) {
  assert.equal(atlasAssetUrl('/models/atlas.json', entry), 'https://example.test/courtroom-atlas/models/atlas.json');
  assert.equal(atlasAssetUrl('models/anatomy-0.bin.gz', entry), 'https://example.test/courtroom-atlas/models/anatomy-0.bin.gz');
}
assert.equal(atlasAssetUrl('/models/atlas.json', 'http://localhost:3016/'), 'http://localhost:3016/models/atlas.json');
const input = {chunks: [{url: '/models/a.bin', gzip: '/models/a.bin.gz', bytes: 100}, {url: '/models/b.bin', bytes: 50}]};
const copy = withAtlasAssetBase(input, 'https://example.test/courtroom-atlas/index.html');
assert.equal(copy.chunks[0].url, 'https://example.test/courtroom-atlas/models/a.bin');
assert.equal(copy.chunks[0].gzip, 'https://example.test/courtroom-atlas/models/a.bin.gz');
assert.equal(copy.chunks[1].gzip, undefined);
assert.equal(input.chunks[0].url, '/models/a.bin');
assert.notEqual(copy.chunks, input.chunks);
for (const invalid of ['https://other.test/model.bin', '/models/../private', '/models/a?x=1', '/models/a\\b']) {
  assert.throws(() => atlasAssetUrl(invalid, 'https://example.test/courtroom-atlas/index.html'));
}
console.log('PASS: root and nested hosting, compressed/uncompressed assets, immutable catalogue, invalid paths');
