// ncc emits an ESM bundle (because @actions/core and @actions/github are
// ESM-only), so dist/ needs its own package.json declaring type: module.
// Without it Node resolves dist/index.js against the nearest package.json and
// the action fails to load on the runner.
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const target = fileURLToPath(new URL('../dist/package.json', import.meta.url));
writeFileSync(target, `${JSON.stringify({type: 'module'}, null, 2)}\n`);
