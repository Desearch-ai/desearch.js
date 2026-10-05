import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetch } from 'undici';
import Desearch, { Desearch as DesearchNamed } from './index';
import type { TwitterScraperCard, TwitterScraperTweet } from './index';

vi.mock('undici', () => ({
  fetch: vi.fn(),
}));

const mockedFetch = vi.mocked(fetch);

function mockResponse({
  body,
  contentType = 'application/json',
  headers = {},
  ok = true,
  status = 200,
}: {
  body: unknown;
  contentType?: string;
  headers?: Record<string, string>;
  ok?: boolean;
  status?: number;
}) {
  const responseHeaders = new Map<string, string>([
    ['content-type', contentType],
  ]);
  for (const [key, value] of Object.entries(headers)) {
    responseHeaders.set(key.toLowerCase(), value);
  }

  mockedFetch.mockResolvedValueOnce({
    ok,
    status,
    headers: {
      get: (name: string) => responseHeaders.get(name.toLowerCase()) ?? null,
    },
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(String(body)),
  } as any);
}

describe('public exports', () => {
  it('exposes Desearch as both the default and a named export', () => {
    expect(DesearchNamed).toBe(Desearch);
    expect(typeof Desearch).toBe('function');
    expect(new DesearchNamed('test-key')).toBeInstanceOf(Desearch);
  });

  it('bounds undici to the 6.x and 7.x lines that load on Node 20', () => {
    const pkg = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf8')
    );
    expect(pkg.dependencies.undici).toBe('^6.28.1 || ^7.29.1');
    expect(pkg.engines.node).toBe('>=20.18.1');
  });
});

describe('Desearch response metadata', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it('returns the raw JSON object payload by default even when cost headers are present', async () => {
    const payload = {
      data: [
        {
          title: 'Desearch',
          snippet: 'AI search',
          link: 'https://desearch.ai',
        },
      ],
    };
    mockResponse({
      body: payload,
      headers: {
        'X-Desearch-Cost-Usd': '2.5',
        'X-Desearch-Usage-Count': '3',
      },
    });

    const client = new Desearch('test-key');
    await expect(client.webSearch({ query: 'desearch' })).resolves.toEqual(
      payload
    );
  });

  it('returns the raw JSON array payload by default even when cost headers are present', async () => {
    const payload = [
      {
        id: '1',
        text: 'hello',
        reply_count: 0,
        retweet_count: 0,
        like_count: 0,
        quote_count: 0,
        bookmark_count: 0,
        created_at: '2026-01-01T00:00:00Z',
      },
    ];
    mockResponse({
      body: payload,
      headers: {
        'X-Desearch-Cost-Usd': '1',
        'X-Desearch-Usage-Count': '1',
      },
    });

    const client = new Desearch('test-key');
    await expect(
      client.xPostsByUrls({ urls: ['https://x.com/desearch/status/1'] })
    ).resolves.toEqual(payload);
  });

  it('returns the tweet card', async () => {
    const card: TwitterScraperCard = {
      type: 'summary_large_image',
      url: 'https://t.co/hVHgyxtOZ9',
      title: 'Starship | Starlink Group 31-1 (Starship Flight 14)',
      domain: 'www.missionstatus.com',
      image:
        'https://pbs.twimg.com/card_img/2104931127370690560/nssO7aWi?format=jpg&name=800x419',
    };
    const payload: TwitterScraperTweet[] = [
      {
        id: '2101254595058024720',
        text: 'Starship Flight 14',
        reply_count: 37,
        retweet_count: 1,
        like_count: 13,
        quote_count: 1,
        bookmark_count: 1,
        created_at: 'Sat Sep 19 10:18:29 +0000 2026',
        card,
      },
    ];
    mockResponse({ body: payload });

    const client = new Desearch('test-key');
    const tweets = (await client.xPostsByUrls({
      urls: ['https://x.com/ARealRocketMan/status/2101254595058024720'],
    })) as TwitterScraperTweet[];

    expect(tweets[0].card?.title).toBe(card.title);
    expect(tweets[0].card?.domain).toBe('www.missionstatus.com');
  });

  it('returns the raw text payload by default even when cost headers are present', async () => {
    mockResponse({
      body: 'plain crawled page',
      contentType: 'text/plain',
      headers: {
        'X-Desearch-Cost-Usd': '0.25',
        'X-Desearch-Usage-Count': '1',
      },
    });

    const client = new Desearch('test-key');
    await expect(
      client.webCrawl({ url: 'https://desearch.ai', format: 'text' })
    ).resolves.toBe('plain crawled page');
  });

  it('uses the canonical Extract route while preserving the legacy webCrawl route', async () => {
    mockResponse({ body: 'canonical content', contentType: 'text/plain' });
    mockResponse({ body: 'legacy content', contentType: 'text/plain' });

    const client = new Desearch('test-key');
    await expect(
      client.extract({
        url: 'https://desearch.ai',
        format: 'text',
        js: true,
        wait: 250,
      })
    ).resolves.toBe('canonical content');
    await expect(
      client.webCrawl({ url: 'https://desearch.ai', format: 'text' })
    ).resolves.toBe('legacy content');

    expect(mockedFetch.mock.calls[0]?.[0]).toBe(
      'https://api.desearch.ai/web/extract?url=https%3A%2F%2Fdesearch.ai&format=text&js=true&wait=250'
    );
    expect(mockedFetch.mock.calls[1]?.[0]).toBe(
      'https://api.desearch.ai/web/crawl?url=https%3A%2F%2Fdesearch.ai&format=text'
    );
  });

  it('returns data and parsed cost metadata when explicitly opted in', async () => {
    const payload = {
      data: [
        {
          title: 'Desearch',
          snippet: 'AI search',
          link: 'https://desearch.ai',
        },
      ],
    };
    mockResponse({
      body: payload,
      headers: {
        'X-Desearch-Cost-Usd': '2.5',
        'X-Desearch-Usage-Count': '3',
        'X-Desearch-Service': 'web-search',
        'X-Desearch-Currency': 'USD',
      },
    });

    const client = new Desearch('test-key');
    await expect(
      client.webSearch({ query: 'desearch' }, { includeMetadata: true })
    ).resolves.toEqual({
      data: payload,
      metadata: {
        costUsd: 2.5,
        usageCount: 3,
        service: 'web-search',
        currency: 'USD',
      },
    });
  });

  it('returns metadata wrappers for JSON array endpoints when explicitly opted in', async () => {
    const payload = [
      {
        id: '1',
        text: 'hello',
        reply_count: 0,
        retweet_count: 0,
        like_count: 0,
        quote_count: 0,
        bookmark_count: 0,
        created_at: '2026-01-01T00:00:00Z',
      },
    ];
    mockResponse({
      body: payload,
      headers: {
        'X-Desearch-Cost-Usd': '1.75',
        'X-Desearch-Usage-Count': '2',
        'X-Desearch-Service': 'twitter-urls',
        'X-Desearch-Currency': 'USD',
      },
    });

    const client = new Desearch('test-key');
    await expect(
      client.xPostsByUrls(
        { urls: ['https://x.com/desearch/status/1'] },
        { includeMetadata: true }
      )
    ).resolves.toEqual({
      data: payload,
      metadata: {
        costUsd: 1.75,
        usageCount: 2,
        service: 'twitter-urls',
        currency: 'USD',
      },
    });
  });

  it('returns undefined metadata fields for missing or malformed headers without breaking successful calls', async () => {
    mockResponse({
      body: 'plain crawled page',
      contentType: 'text/plain',
      headers: {
        'X-Desearch-Cost-Usd': 'not-a-number',
        'X-Desearch-Usage-Count': 'NaN',
        'X-Desearch-Service': '',
      },
    });

    const client = new Desearch('test-key');
    await expect(
      client.webCrawl({ url: 'https://desearch.ai' }, { includeMetadata: true })
    ).resolves.toEqual({
      data: 'plain crawled page',
      metadata: {},
    });
  });
});
