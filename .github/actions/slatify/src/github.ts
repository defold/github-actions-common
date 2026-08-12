import {context, getOctokit} from '@actions/github';

export interface WorkflowUrl {
  repo: string;
  action: string;
  event?: string;
}

export interface CommitContext {
  message: string;
  url: string;
  author?: {
    name: string;
    url: string;
  };
}

export async function getCommit(token: string): Promise<CommitContext> {
  const {owner, repo} = context.repo;
  const ref: string = process.env.GITHUB_HEAD_REF
    ? process.env.GITHUB_HEAD_REF.replace(/refs\/heads\//, '')
    : context.sha;
  const client = getOctokit(token);
  // `client.repos` was dropped in @actions/github v5; REST endpoints now live
  // under `client.rest`.
  const {data: commit} = await client.rest.repos.getCommit({
    owner,
    repo,
    ref
  });

  const result: CommitContext = {
    message: commit.commit.message,
    url: commit.html_url
  };

  if (commit.author) {
    result.author = {
      name: commit.author.login,
      url: commit.author.html_url
    };
  }

  return result;
}

function isPullRequest(): boolean {
  return context.eventName === 'pull_request';
}

export function getWorkflowUrls(): WorkflowUrl {
  const {owner, repo} = context.repo;
  // serverUrl rather than a hardcoded github.com, so GHES works.
  const repoUrl = `${context.serverUrl}/${owner}/${repo}`;
  const result: WorkflowUrl = {
    repo: repoUrl,
    // Link straight at the run that is sending this notification. Upstream
    // pointed at the commit/PR checks tab, which never identified the run.
    action: `${repoUrl}/actions/runs/${context.runId}`
  };

  if (isPullRequest()) {
    result.event = `${repoUrl}/pull/${context.issue.number}`;
  }

  return result;
}
