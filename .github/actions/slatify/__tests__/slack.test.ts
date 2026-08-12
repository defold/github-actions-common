import * as fs from 'fs';
// Under ESM, jest does not inject the `jest` object as a global the way it does
// describe/test/expect — it has to be imported.
import {jest} from '@jest/globals';
import * as github from '@actions/github';
import {Block, Slack} from '../src/slack.js';
import {
  commonContext,
  pullUrl,
  repoUrl,
  runUrl,
  setupContext,
  stubFetch
} from './helpers.js';

setupContext();

describe('Base Field Tests', () => {
  function generateExpectedBaseField(eventBlockText: string): object[] {
    return [
      {
        type: 'mrkdwn',
        text: `*repository*\n<${repoUrl}|${commonContext.owner}/${commonContext.repo}>`
      },
      {
        type: 'mrkdwn',
        text: `*ref*\n${commonContext.ref}`
      },
      {
        type: 'mrkdwn',
        text: `*event name*\n${eventBlockText}`
      },
      {
        type: 'mrkdwn',
        text: `*workflow*\n<${runUrl}|${commonContext.workflow}>`
      }
    ];
  }

  test('With event link', () => {
    github.context.eventName = 'pull_request';
    expect(Block.getBaseField()).toEqual(
      generateExpectedBaseField(`<${pullUrl}|${github.context.eventName}>`)
    );
  });

  test('Without event link', () => {
    github.context.eventName = 'push';
    expect(Block.getBaseField()).toEqual(
      generateExpectedBaseField(github.context.eventName)
    );
  });
});

describe('Commit Field Tests', () => {
  test('Commit field with author', () => {
    const context = {
      url: 'https://this.is.test',
      message: 'this is test',
      author: {
        url: 'https://lazy-actions',
        name: 'lazy-actions'
      }
    };
    expect(Block.getCommitField(context)).toEqual([
      {
        type: 'mrkdwn',
        text: `*commit*\n<${context.url}|${context.message}>`
      },
      {
        type: 'mrkdwn',
        text: `*author*\n<${context.author.url}|${context.author.name}>`
      }
    ]);
  });

  test('Commit field without author', () => {
    const context = {
      url: 'https://this.is.test',
      message: 'this is test'
    };
    expect(Block.getCommitField(context)).toEqual([
      {
        type: 'mrkdwn',
        text: `*commit*\n<${context.url}|${context.message}>`
      }
    ]);
  });

  test('Only the first line of a multi-line commit message is used', () => {
    expect(
      Block.getCommitField({
        url: 'https://this.is.test',
        message: 'Hello World\nYEAH!!!!!'
      })[0].text
    ).toBe('*commit*\n<https://this.is.test|Hello World>');
  });
});

describe('Payload Tests', () => {
  const context = {
    jobName: 'test',
    status: 'success',
    mention: 'bot',
    mentionCondition: 'always',
    commit: {
      message: 'Hello World\nYEAH!!!!!',
      url: 'https://this.is.test',
      author: {
        name: 'lazy-actions',
        url: 'https://lazy-actions'
      }
    }
  } as const;

  test('Mention needs always', () => {
    expect(Slack.isMention('always', 'test')).toBe(true);
  });

  test('Mention needs when failed', () => {
    expect(Slack.isMention('failure', 'failure')).toBe(true);
  });

  test('No mention because condition and actual status are different', () => {
    expect(Slack.isMention('success', 'failure')).toBe(false);
  });

  test('Generate slack payload', () => {
    github.context.eventName = 'pull_request';

    const expectedPayload = {
      text: `<!${context.mention}> ${context.jobName} ${Block.status[context.status].result}`,
      attachments: [
        {
          color: Block.status[context.status].color,
          blocks: [
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `*repository*\n<${repoUrl}|${commonContext.owner}/${commonContext.repo}>`
                },
                {
                  type: 'mrkdwn',
                  text: `*ref*\n${commonContext.ref}`
                },
                {
                  type: 'mrkdwn',
                  text: `*event name*\n<${pullUrl}|${github.context.eventName}>`
                },
                {
                  type: 'mrkdwn',
                  text: `*workflow*\n<${runUrl}|${commonContext.workflow}>`
                },
                {
                  type: 'mrkdwn',
                  text: `*commit*\n<${context.commit.url}|${
                    context.commit.message.split('\n')[0]
                  }>`
                },
                {
                  type: 'mrkdwn',
                  text: `*author*\n<${context.commit.author.url}|${context.commit.author.name}>`
                }
              ]
            }
          ]
        }
      ],
      unfurl_links: true
    };

    expect(
      Slack.generatePayload(
        context.jobName,
        context.status,
        context.mention,
        context.mentionCondition,
        context.commit
      )
    ).toEqual(expectedPayload);
  });

  test('No mention prefix when the condition does not match', () => {
    github.context.eventName = 'push';
    const payload = Slack.generatePayload(
      context.jobName,
      'success',
      'here',
      'failure'
    );
    expect(payload.text).toBe(`${context.jobName} Succeeded`);
  });
});

describe('Post Message Tests', () => {
  const url = 'https://this.is.test/webhook';
  const options = {
    username: 'lazy-actions',
    channel: 'test',
    icon_emoji: 'pray'
  };
  const payload = JSON.parse(
    fs.readFileSync(new URL('./payload.json', import.meta.url), {
      encoding: 'utf8'
    })
  );

  test('Post successfully', async () => {
    const fetch = stubFetch({
      ok: true,
      status: 200,
      statusText: 'OK',
      body: 'ok'
    });
    await expect(
      Slack.notify(url, {...options, fetch}, payload)
    ).resolves.toBeUndefined();
  });

  test('Throw error on a non-2xx response', async () => {
    const fetch = stubFetch({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      body: JSON.stringify({error: 'channel_not_found'})
    });
    const notify = Slack.notify(url, {...options, fetch}, payload);
    await expect(notify).rejects.toThrow('Failed to post message to Slack');
    // The underlying cause has to survive into the message, since this is the
    // only place it is reported.
    await expect(notify).rejects.toThrow('404');
  });

  test('Throw error when Slack answers 200 with a non-ok body', async () => {
    const fetch = stubFetch({
      ok: true,
      status: 200,
      statusText: 'OK',
      body: 'invalid_payload'
    });
    await expect(
      Slack.notify(url, {...options, fetch}, payload)
    ).rejects.toThrow('Failed to post message to Slack');
  });

  // Regression guard: core.error() writes a ::error:: workflow command, which
  // GitHub turns into a red annotation on the run even when the test passes.
  // A handled failure must stay silent on stdout.
  test('Emits no ::error:: annotation when the failure is handled', async () => {
    const write = jest.spyOn(process.stdout, 'write').mockReturnValue(true);
    try {
      const fetch = stubFetch({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        body: 'nope'
      });
      await expect(
        Slack.notify(url, {...options, fetch}, payload)
      ).rejects.toThrow('Failed to post message to Slack');

      const emitted = write.mock.calls.map(c => String(c[0])).join('');
      expect(emitted).not.toContain('::error::');
    } finally {
      write.mockRestore();
    }
  });
});
