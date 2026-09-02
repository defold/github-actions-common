# Install LLVM and Clang

Downloads and installs LLVM and Clang binaries, adds them to `PATH`, and exports `LLVM_PATH`,
`LD_LIBRARY_PATH` and `DYLD_LIBRARY_PATH` (optionally `CC` and `CXX`).

Forked from [KyleMayes/install-llvm-action](https://github.com/KyleMayes/install-llvm-action) at
[`ebc0426`](https://github.com/KyleMayes/install-llvm-action/commit/ebc0426251bc40c7cd31162802432c68818ab8f0)
(`v2.0.9`), Apache-2.0 — see [LICENSE.txt](./LICENSE.txt) and [NOTICE](./NOTICE). Upstream has had no
maintainer activity since January 2026 and still declares the `node20` runtime, with three separate
unmerged Node 24 migrations open; this fork runs on `node24` against current dependencies. Upstream also
force-moves its `v2` tag on every release, so pinning to `@v2` pins to nothing.

## Usage

```yaml
- name: Install LLVM and Clang
  uses: defold/github-actions-common/.github/actions/install-llvm@<ref>
  with:
    version: '21'
    env: true
```

Pinning an exact version and installing to a specific directory:

```yaml
- name: Install LLVM and Clang
  uses: defold/github-actions-common/.github/actions/install-llvm@<ref>
  with:
    version: '21.1.8'
    directory: ${{ runner.temp }}/llvm
```

Restoring from a cache — pass `cached: true` on a hit and the action skips the download but still exports
the environment:

```yaml
- name: Cache LLVM and Clang
  id: cache-llvm
  uses: actions/cache@<sha> # vX.Y.Z
  with:
    path: ${{ runner.temp }}/llvm
    key: llvm-21.1.8-${{ runner.os }}-${{ runner.arch }}

- name: Install LLVM and Clang
  uses: defold/github-actions-common/.github/actions/install-llvm@<ref>
  with:
    version: '21.1.8'
    directory: ${{ runner.temp }}/llvm
    cached: ${{ steps.cache-llvm.outputs.cache-hit }}
```

## Inputs

| input | required | default | description |
| --- | --- | --- | --- |
| `version` | required | — | LLVM version to install. A major (`21`) resolves to the newest matching release; an exact version (`21.1.8`) is used as given. |
| `arch` | optional | `process.arch` | Architecture to install for: `x64` or `arm64`. |
| `force-url` | optional | — | Full download URL. Bypasses manifest lookup entirely, so `version` is used verbatim as the reported version. |
| `directory` | optional | `./llvm`, or `C:/Program Files/LLVM` on Windows | Install directory. |
| `cached` | optional | `false` | If `true`, skip the download and only export the environment. Pair with `actions/cache`. |
| `mirror-url` | optional | — | Base URL to download from instead of GitHub releases. |
| `auth` | optional | — | `Authorization` header value for the download. |
| `env` | optional | `false` | If `true`, export `CC` and `CXX` pointing at `clang` / `clang++`. |

## Outputs

| output | description |
| --- | --- |
| `version` | The full resolved version installed, e.g. `21.1.8` for `version: '21'`. |

## Supported versions

Resolution is driven by [`src/assets.json`](./src/assets.json), a manifest of LLVM release assets
generated from the `llvm/llvm-project` releases. Current coverage:

| platform | newest version |
| --- | --- |
| `linux/x64`, `linux/arm64` | 23.1.0 |
| `darwin/arm64` | 22.1.8 |
| `win32/x64`, `win32/arm64` | 22.1.8 |
| `darwin/x64` | 20.1.7 — upstream LLVM no longer ships x86-64 macOS builds |

This manifest has been regenerated since the fork point, so it is **ahead of upstream**, which still tops
out at 21.1.8 (upstream's own LLVM 22 PR is unmerged).

Refresh it with `npm run generate` (see Development). Because the manifest is inlined into the bundle,
adding versions requires a rebuild — the build workflow enforces that.

## Differences from upstream

The input surface, the output and the message shape are unchanged, so this is a drop-in replacement apart
from the `uses:` line. What differs:

- **Runtime is `node24`**, not `node20`.
- **The asset manifest is inlined into `dist/index.js`** at build time. Upstream's bundle does a runtime
  `readFileSync` of `<action-root>/assets.json`, which relies on `__dirname` and therefore cannot work in
  an ESM bundle. The trade-off: upstream could ship a new LLVM version by editing JSON alone, whereas here
  a manifest change needs `npm run build`.
- **Built with `@vercel/ncc`, not parcel**, and dependency management is npm with a committed lockfile
  rather than yarn. This matches the `slatify` action next door.
- **Dependencies are on current majors**, all of which are ESM-only — which is what forces the ESM bundle
  and the `dist/package.json` shim.
- **The asset generator drops its `lodash` dependency** in favour of a plain loop.
- **Upstream's `test.ts`** was a CLI that downloaded real archives to check them. It is replaced by offline
  unit tests over `getAsset`, plus a cross-platform smoke test job that installs LLVM for real.
- A typo in upstream's `arch` input description ("archtecture") is corrected. Descriptions are not part of
  the compatibility contract.

This fork keeps **upstream's `.prettierrc`** rather than the repo's other formatting conventions,
deliberately: adopting a different style would reformat every ported line and destroy the ability to diff
against future upstream releases.

### Known upstream behaviour, kept as-is

Two upstream quirks are preserved deliberately, so the fork stays a faithful drop-in. Both are candidates
for a future opt-in divergence:

- **Version sorting is lexicographic.** `getSpecificVersions` sorts with `.sort().reverse()` on strings, so
  once LLVM publishes a two-digit patch release in a series (e.g. `21.1.10`), asking for `21` would
  resolve to `21.1.8` rather than `21.1.10`. No such version exists in the manifest today.
- **`DYLD_LIBRARY_PATH` picks up a literal `undefined`.** `LD_LIBRARY_PATH` is built with
  `process.env.LD_LIBRARY_PATH ?? ""`, but the `DYLD_LIBRARY_PATH` line omits the `?? ""`, so when the
  variable is unset the exported value ends in the string `undefined`. It is a non-existent path entry and
  therefore harmless, but it is visible in logs on macOS.

## Development

Requires the Node version in [`.nvmrc`](./.nvmrc) — building on a different Node can produce a `dist/`
that fails CI.

```bash
cd .github/actions/install-llvm
npm ci --ignore-scripts
npm test
npm run build          # regenerates dist/index.js and dist/package.json
```

Refreshing the LLVM asset manifest (needs a token; it paginates every `llvm/llvm-project` release):

```bash
GH_TOKEN=$(gh auth token) npm run generate
npm run build          # the manifest is inlined, so always rebuild after generating
```

`dist/` is committed because GitHub runs the bundle directly;
[`.github/workflows/install-llvm-build.yml`](../../workflows/install-llvm-build.yml) fails the build if it
is stale.

[`.github/workflows/install-llvm-assets.yml`](../../workflows/install-llvm-assets.yml) does the refresh
weekly and opens a PR. **It requires "Allow GitHub Actions to create and approve pull requests" under
Settings → Actions → General**; without that setting `gh pr create` fails with *"GitHub Actions is not
permitted to create or approve pull requests"* and the scheduled run goes red every week.

Every dependency is pinned to an exact version, and `package-lock.json` is committed — it is what actually
pins the transitive tree, with an integrity hash per package. `.npmrc` sets `save-exact=true` so
`npm install <pkg>` cannot reintroduce a caret range. `typescript` is capped at 6.x on purpose: TypeScript
7 is the native Go port and breaks both ts-jest and ncc.

**Dependabot PRs for this directory will fail CI on arrival.** Dependabot updates `package.json` and the
lockfile but cannot rebuild the bundle, so each npm bump needs `npm run build` and an amended commit
before it can merge.
