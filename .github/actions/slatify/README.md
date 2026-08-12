# Slatify

Slack notification action for GitHub Actions.

Forked from [lazy-actions/slatify](https://github.com/lazy-actions/slatify) (MIT — see [LICENSE](./LICENSE)). Upstream has been unmaintained since March 2024 and still declares the removed `node12` runtime; this fork runs on `node24` against current dependencies.

## Usage

```yaml
- name: Slack Notification
  uses: defold/github-actions-common/.github/actions/slatify@<ref>
  if: always()
  with:
    type: ${{ job.status }}
    job_name: '*Test*'
    channel: '#random'
    url: ${{ secrets.SLACK_WEBHOOK }}
```

Including the latest commit information:

```yaml
- name: Slack Notification
  uses: defold/github-actions-common/.github/actions/slatify@<ref>
  if: always()
  with:
    type: ${{ job.status }}
    job_name: '*Lint Check*'
    mention: 'here'
    mention_if: 'failure'
    channel: '#random'
    url: ${{ secrets.SLACK_WEBHOOK }}
    commit: true
    token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| input | required | default | description |
| --- | --- | --- | --- |
| `type` | required | — | Job result: `success`, `failure` or `cancelled`. Use `${{ job.status }}`. |
| `job_name` | required | — | Slack notification title. |
| `url` | required | — | Slack Incoming Webhook URL. May instead be supplied as the `SLACK_WEBHOOK` environment variable. |
| `mention` | optional | — | Slack mention target, e.g. `here`, `channel`. |
| `mention_if` | optional | — | When to mention: `success`, `failure`, `cancelled` or `always`. An invalid value drops the mention and logs a warning. |
| `icon_emoji` | optional | webhook config | Slack icon. |
| `username` | optional | webhook config | Slack username. |
| `channel` | optional | webhook config | Slack channel name. |
| `commit` | optional | `false` | If `true`, include the latest commit message and author. |
| `token` | case by case | — | Required when `commit` is `true`. `${{ secrets.GITHUB_TOKEN }}` is recommended. |

## Differences from upstream

The input surface is unchanged, so this is a drop-in replacement apart from the `uses:` line. Behaviour differs in three places:

- **The `workflow` field links to the run.** Upstream linked to `…/commit/<sha>/checks` or `…/pull/<n>/checks`, which never identified the run that sent the message. It now points at `…/actions/runs/<run_id>`.
- **`GITHUB_SERVER_URL` is honoured**, so URLs are correct on GitHub Enterprise. Upstream hardcoded `https://github.com`.
- **The invalid-`mention_if` warning reports the offending value.** Upstream cleared the variable before formatting the message, so it always printed an empty value.

## Development

Requires the Node version in [`.nvmrc`](./.nvmrc) — building on a different Node can produce a `dist/` that fails CI.

```bash
cd .github/actions/slatify
npm ci --ignore-scripts
npm test
npm run build          # regenerates dist/index.js and dist/package.json
```

`dist/` is committed because GitHub runs the bundle directly; `.github/workflows/slatify-build.yml` fails the build if it is stale.

Every dependency is pinned to an exact version, and `package-lock.json` is committed — it is what actually pins the transitive tree, with an integrity hash per package. `.npmrc` sets `save-exact=true` so `npm install <pkg>` cannot reintroduce a caret range.

**Dependabot PRs for this directory will fail CI on arrival.** Dependabot updates `package.json` and the lockfile but cannot rebuild the bundle, so each npm bump needs `npm run build` and an amended commit before it can merge.
