import * as github from '@actions/github';
import type {FetchFunction} from '@slack/webhook';

// @slack/webhook re-exports FetchFunction but not FetchResponse, so derive it.
type FetchResponse = Awaited<ReturnType<FetchFunction>>;

export const commonContext = {
  workflow: 'test',
  ref: '1',
  sha: '2',
  owner: 'lazy-actions',
  repo: 'slatify',
  number: 3,
  runId: 99,
  serverUrl: 'https://github.com'
};

export const repoUrl = `${commonContext.serverUrl}/${commonContext.owner}/${commonContext.repo}`;
export const runUrl = `${repoUrl}/actions/runs/${commonContext.runId}`;
export const pullUrl = `${repoUrl}/pull/${commonContext.number}`;

/**
 * Pin @actions/github's context singleton to the fixture above.
 *
 * `context.repo` reads GITHUB_REPOSITORY in preference to the payload, so it
 * has to be unset — otherwise these tests resolve the *real* repository when
 * they run on a GitHub Actions runner and every URL assertion fails.
 */
export function setupContext(): void {
  delete process.env.GITHUB_REPOSITORY;

  github.context.workflow = commonContext.workflow;
  github.context.ref = commonContext.ref;
  github.context.sha = commonContext.sha;
  github.context.runId = commonContext.runId;
  github.context.serverUrl = commonContext.serverUrl;
  github.context.payload = {
    issue: {
      number: commonContext.number
    },
    repository: {
      owner: {
        login: commonContext.owner
      },
      name: commonContext.repo
    }
  };
}

/**
 * Minimal stand-in for a fetch Response. @slack/webhook only reads `ok`,
 * `status`, `statusText` and `text()`, so injecting this via the webhook's
 * `fetch` option exercises the real send path with no HTTP interception.
 */
export function stubFetch(response: {
  ok: boolean;
  status: number;
  statusText: string;
  body: string;
}): FetchFunction {
  return async () =>
    ({
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      text: async () => response.body
    }) as unknown as FetchResponse;
}
