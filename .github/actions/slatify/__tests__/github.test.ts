import * as github from '@actions/github';
import {getWorkflowUrls} from '../src/github.js';
import {pullUrl, repoUrl, runUrl, setupContext} from './helpers.js';

setupContext();

describe('Workflow URL Tests', () => {
  test('Pull Request event', () => {
    github.context.eventName = 'pull_request';
    expect(getWorkflowUrls()).toEqual({
      repo: repoUrl,
      event: pullUrl,
      action: runUrl
    });
  });

  test('Push event', () => {
    github.context.eventName = 'push';
    expect(getWorkflowUrls()).toEqual({
      repo: repoUrl,
      action: runUrl
    });
  });

  test('Action URL points at the run, not the checks tab', () => {
    github.context.eventName = 'push';
    expect(getWorkflowUrls().action).not.toContain('/checks');
  });

  test('Honors a GitHub Enterprise server URL', () => {
    github.context.eventName = 'push';
    github.context.serverUrl = 'https://ghe.example.com';
    try {
      const urls = getWorkflowUrls();
      expect(urls.repo).toBe('https://ghe.example.com/lazy-actions/slatify');
      expect(urls.action).toBe(
        'https://ghe.example.com/lazy-actions/slatify/actions/runs/99'
      );
    } finally {
      setupContext();
    }
  });
});
