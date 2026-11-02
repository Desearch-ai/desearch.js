import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetch } from 'undici';
import Desearch, {
  CompanyTaskConflictError,
  Desearch as DesearchNamed,
  PeopleTaskConflictError,
  unverifiedCriteria,
} from './index';
import type {
  Company,
  CompanyCompletionReason,
  CompanyEmail,
  CompanyRole,
  CompanyTask,
  CompanyTaskStage,
  InstagramSearchResultType,
  NetworkStatsResponse,
  NetworkStatsStreamEvent,
  PeopleCompletionReason,
  PeopleCriterionCheck,
  PeopleCriterionVerdict,
  PeopleTask,
  PeopleTaskWarning,
  Person,
  PersonAttributes,
  RedditTimeframe,
  SearchApiMode,
  ThreadsPostDetail,
  TikTokPost,
  YouTubeSearchType,
  YouTubeVideo,
} from './index';

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

  it('requests markdown', async () => {
    mockResponse({ body: '# Desearch', contentType: 'text/markdown' });

    const client = new Desearch('test-key');
    await expect(
      client.extract({ url: 'https://desearch.ai', format: 'markdown' })
    ).resolves.toBe('# Desearch');

    expect(mockedFetch.mock.calls[0]?.[0]).toBe(
      'https://api.desearch.ai/web/extract?url=https%3A%2F%2Fdesearch.ai&format=markdown'
    );
  });

  it('sends full_page for all visible text', async () => {
    mockResponse({ body: 'every section', contentType: 'text/plain' });

    const client = new Desearch('test-key');
    await expect(
      client.extract({ url: 'https://desearch.ai', format: 'text', full_page: true })
    ).resolves.toBe('every section');

    expect(mockedFetch.mock.calls[0]?.[0]).toBe(
      'https://api.desearch.ai/web/extract?url=https%3A%2F%2Fdesearch.ai&format=text&full_page=true'
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

const TASK_ID = '7f8c2a4e-1b2d-4c3e-9f00-123456789abc';

function peopleTask(overrides: Partial<PeopleTask> = {}): PeopleTask {
  return {
    task_id: TASK_ID,
    search_type: 'tiktok_creator_search',
    platform: 'tiktok',
    status: 'queued',
    stage: null,
    query: 'Skincare creators who review sunscreen',
    count: 25,
    result_count: 0,
    metadata: {},
    interpreted: null,
    progress: {},
    errors: [],
    reserved_cost_usd: 1.25,
    final_cost_usd: null,
    created_at: '2026-10-17T10:00:00+00:00',
    links: {
      self: `/desearch/people/tasks/${TASK_ID}`,
      results: `/desearch/people/tasks/${TASK_ID}/results`,
      export: `/desearch/people/tasks/${TASK_ID}/export`,
    },
    ...overrides,
  };
}

function person(handle: string): Person {
  return {
    id: `tiktok:${handle}`,
    platform: 'tiktok',
    handle,
    url: `https://www.tiktok.com/@${handle}`,
    metrics: { followers: 12000 },
    links: [],
    contacts: [{ type: 'email', value: `${handle}@example.com` }],
    evidence: [],
    score: {
      value: 82,
      matched_signals: [],
      profile_fit: [],
      buying_triggers: [],
      evidence: [],
      reasons: [],
      concerns: [],
    },
  };
}

function fetchCall(index: number) {
  const [url, init] = mockedFetch.mock.calls[index] as [
    string,
    { method: string; headers: Record<string, string>; body?: string }
  ];
  return { url, ...init };
}

describe('People Search', () => {
  const API = 'https://api.desearch.ai';

  beforeEach(() => {
    mockedFetch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts an X Profile Search with the Idempotency-Key header and returns the task with its reserved cost', async () => {
    const created = {
      ...peopleTask({ search_type: 'x_profile_search', platform: 'x' }),
      cost_usd: 1,
      usage_count: 25,
      service: 'x_profile_search',
      currency: 'USD',
    };
    mockResponse({ body: created, status: 202 });

    const client = new Desearch('test-key');
    const payload = {
      query: 'Indie hackers building in public who share their MRR',
      count: 25,
      min_score: 60,
      exclude: ['already_contacted'],
      filters: { min_followers: 200, verified_only: true, countries: ['US'] },
    };
    await expect(
      client.xProfileSearch(payload, { idempotencyKey: 'run-42' })
    ).resolves.toEqual(created);

    const call = fetchCall(0);
    expect(call.url).toBe(`${API}/desearch/people/search/x`);
    expect(call.method).toBe('POST');
    expect(call.headers).toEqual({
      Authorization: 'test-key',
      'Content-Type': 'application/json',
      'Idempotency-Key': 'run-42',
    });
    expect(JSON.parse(call.body!)).toEqual(payload);
  });

  it('posts YouTube, LinkedIn and TikTok searches to their routes without an Idempotency-Key by default', async () => {
    mockResponse({ body: peopleTask({ platform: 'youtube' }), status: 202 });
    mockResponse({ body: peopleTask({ platform: 'linkedin' }), status: 202 });
    mockResponse({ body: peopleTask(), status: 202 });

    const client = new Desearch('test-key');
    await client.youtubeCreatorSearch({
      query: 'Fitness creators who review supplements',
      filters: {
        min_subscribers: 10000,
        max_subscribers: 500000,
        require_contact: true,
      },
    });
    await client.linkedinProfileSearch({
      query: 'Heads of sales at fintech startups who post about outbound',
      filters: { countries: ['United States', 'United Kingdom'] },
    });
    await client.tiktokCreatorSearch({
      query: 'Skincare creators who review sunscreen',
      count: 10,
      filters: { min_followers: 10000, require_contact: true },
    });

    expect(mockedFetch.mock.calls.map(([url]) => url)).toEqual([
      `${API}/desearch/people/search/youtube`,
      `${API}/desearch/people/search/linkedin`,
      `${API}/desearch/people/search/tiktok`,
    ]);
    for (let i = 0; i < 3; i += 1) {
      const call = fetchCall(i);
      expect(call.method).toBe('POST');
      expect(call.headers).toEqual({
        Authorization: 'test-key',
        'Content-Type': 'application/json',
      });
    }
    expect(JSON.parse(fetchCall(1).body!)).toEqual({
      query: 'Heads of sales at fintech startups who post about outbound',
      filters: { countries: ['United States', 'United Kingdom'] },
    });
    expect(JSON.parse(fetchCall(2).body!)).toEqual({
      query: 'Skincare creators who review sunscreen',
      count: 10,
      filters: { min_followers: 10000, require_contact: true },
    });
  });

  it('returns search cost metadata from headers when opted in, alongside the Idempotency-Key', async () => {
    const created = peopleTask();
    mockResponse({
      body: created,
      status: 202,
      headers: {
        'X-Desearch-Cost-Usd': '1.25',
        'X-Desearch-Usage-Count': '25',
        'X-Desearch-Service': 'tiktok_creator_search',
        'X-Desearch-Currency': 'USD',
      },
    });

    const client = new Desearch('test-key');
    await expect(
      client.tiktokCreatorSearch(
        { query: 'Skincare creators who review sunscreen' },
        { includeMetadata: true, idempotencyKey: 'run-43' }
      )
    ).resolves.toEqual({
      data: created,
      metadata: {
        costUsd: 1.25,
        usageCount: 25,
        service: 'tiktok_creator_search',
        currency: 'USD',
      },
    });
    expect(fetchCall(0).headers['Idempotency-Key']).toBe('run-43');
  });

  it('surfaces a failed search as the standard HTTP error', async () => {
    mockResponse({
      body: '{"detail":"Not enough credits"}',
      ok: false,
      status: 402,
    });

    const client = new Desearch('test-key');
    await expect(
      client.xProfileSearch({ query: 'devtools founders' })
    ).rejects.toThrow('HTTP 402: {"detail":"Not enough credits"}');
  });

  it('lists tasks with platform, a comma-separated status list, limit and cursor', async () => {
    const list = { tasks: [peopleTask()], next_cursor: 'abc' };
    mockResponse({ body: list });
    mockResponse({ body: { tasks: [], next_cursor: null } });

    const client = new Desearch('test-key');
    await expect(
      client.listPeopleTasks({
        platform: 'tiktok',
        status: ['running', 'paused'],
        limit: 10,
        cursor: 'xyz',
      })
    ).resolves.toEqual(list);
    await client.listPeopleTasks();

    expect(fetchCall(0).url).toBe(
      `${API}/desearch/people/tasks?platform=tiktok&status=running%2Cpaused&limit=10&cursor=xyz`
    );
    expect(fetchCall(0).method).toBe('GET');
    expect(fetchCall(1).url).toBe(`${API}/desearch/people/tasks`);
  });

  it('sends metadata in the body of every search route and returns it on the task', async () => {
    const metadata = { workspace_id: 'ws_42', campaign: 'q4-outbound' };
    for (const platform of ['x', 'youtube', 'linkedin', 'tiktok'] as const) {
      mockResponse({ body: peopleTask({ platform, metadata }), status: 202 });
    }

    const client = new Desearch('test-key');
    const query = 'Heads of growth at devtools startups';
    const tasks = [
      await client.xProfileSearch({ query, metadata }),
      await client.youtubeCreatorSearch({ query, metadata }),
      await client.linkedinProfileSearch({ query, metadata }),
      await client.tiktokCreatorSearch({ query, count: 5, metadata }),
    ];

    for (const task of tasks) {
      expect(task.metadata).toEqual(metadata);
    }
    expect(mockedFetch.mock.calls.map(([url]) => url)).toEqual([
      `${API}/desearch/people/search/x`,
      `${API}/desearch/people/search/youtube`,
      `${API}/desearch/people/search/linkedin`,
      `${API}/desearch/people/search/tiktok`,
    ]);
    expect(JSON.parse(fetchCall(0).body!)).toEqual({ query, metadata });
    expect(JSON.parse(fetchCall(3).body!)).toEqual({
      query,
      count: 5,
      metadata,
    });
  });

  it('leaves metadata out of the search body when it is not given', async () => {
    mockResponse({ body: peopleTask(), status: 202 });

    const client = new Desearch('test-key');
    const task = await client.tiktokCreatorSearch({
      query: 'Skincare creators',
    });

    expect(JSON.parse(fetchCall(0).body!)).toEqual({
      query: 'Skincare creators',
    });
    expect(task.metadata).toEqual({});
  });

  it('lists tasks by metadata as metadata.<key>=<value> query params', async () => {
    const list = {
      tasks: [peopleTask({ metadata: { campaign: 'q4 outbound & more' } })],
      next_cursor: null,
    };
    mockResponse({ body: list });
    mockResponse({ body: { tasks: [], next_cursor: null } });

    const client = new Desearch('test-key');
    await expect(
      client.listPeopleTasks({
        platform: 'tiktok',
        status: ['completed', 'partial'],
        limit: 5,
        metadata: { campaign: 'q4 outbound & more', 'team.id': 't-1' },
      })
    ).resolves.toEqual(list);
    await client.listPeopleTasks({ metadata: {} });

    expect(fetchCall(0).url).toBe(
      `${API}/desearch/people/tasks?platform=tiktok&status=completed%2Cpartial&limit=5&metadata.campaign=q4+outbound+%26+more&metadata.team.id=t-1`
    );
    expect(fetchCall(1).url).toBe(`${API}/desearch/people/tasks`);
    const params = new URL(fetchCall(0).url).searchParams;
    expect(params.get('metadata.campaign')).toBe('q4 outbound & more');
    expect(params.has('metadata')).toBe(false);
  });

  it('surfaces a rejected metadata filter as the standard HTTP error', async () => {
    mockResponse({
      body: '{"detail":"At most 3 metadata filters"}',
      ok: false,
      status: 400,
    });

    const client = new Desearch('test-key');
    await expect(
      client.listPeopleTasks({
        metadata: { a: '1', b: '2', c: '3', d: '4' },
      })
    ).rejects.toThrow('HTTP 400: {"detail":"At most 3 metadata filters"}');
    expect(fetchCall(0).url).toBe(
      `${API}/desearch/people/tasks?metadata.a=1&metadata.b=2&metadata.c=3&metadata.d=4`
    );
  });

  it('gets one task by id', async () => {
    const task = peopleTask({ status: 'running', stage: 'searching' });
    mockResponse({ body: task });

    const client = new Desearch('test-key');
    await expect(client.getPeopleTask({ task_id: TASK_ID })).resolves.toEqual(
      task
    );

    const call = fetchCall(0);
    expect(call.url).toBe(`${API}/desearch/people/tasks/${TASK_ID}`);
    expect(call.method).toBe('GET');
    expect(call.body).toBeUndefined();
    expect(call.headers).toEqual({ Authorization: 'test-key' });
  });

  it('reads a results page with cursor and limit, keeping task_id in the path only', async () => {
    const page = {
      task_id: TASK_ID,
      status: 'running',
      results: [person('glowwithmia')],
      next_cursor: '7',
      has_more: false,
    };
    mockResponse({ body: page });

    const client = new Desearch('test-key');
    await expect(
      client.getPeopleResults({ task_id: TASK_ID, cursor: '3', limit: 50 })
    ).resolves.toEqual(page);
    expect(fetchCall(0).url).toBe(
      `${API}/desearch/people/tasks/${TASK_ID}/results?cursor=3&limit=50`
    );
  });

  it.each([
    ['pausePeopleTask', 'pause', 'paused'],
    ['resumePeopleTask', 'resume', 'queued'],
    ['cancelPeopleTask', 'cancel', 'cancelled'],
  ] as const)(
    '%s posts to the %s route without a body',
    async (method, action, status) => {
      const task = peopleTask({ status });
      mockResponse({ body: task });

      const client = new Desearch('test-key');
      await expect(client[method]({ task_id: TASK_ID })).resolves.toEqual(task);

      const call = fetchCall(0);
      expect(call.url).toBe(
        `${API}/desearch/people/tasks/${TASK_ID}/${action}`
      );
      expect(call.method).toBe('POST');
      expect(call.body).toBeUndefined();
      expect(call.headers).toEqual({ Authorization: 'test-key' });
    }
  );

  it('throws PeopleTaskConflictError with the current task when a control action is refused (409)', async () => {
    const current = peopleTask({ status: 'completed' });
    const body = JSON.stringify({
      detail: 'This search has already ended.',
      task: current,
    });
    mockResponse({ body, ok: false, status: 409 });

    const client = new Desearch('test-key');
    const error = await client
      .cancelPeopleTask({ task_id: TASK_ID })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(PeopleTaskConflictError);
    expect(error).toBeInstanceOf(Error);
    const conflict = error as PeopleTaskConflictError;
    expect(conflict.name).toBe('PeopleTaskConflictError');
    expect(conflict.status).toBe(409);
    expect(conflict.detail).toBe('This search has already ended.');
    expect(conflict.task).toEqual(current);
    expect(conflict.message).toBe(`HTTP 409: ${body}`);
  });

  it('keeps the plain HTTP error for other control failures', async () => {
    mockResponse({
      body: '{"detail":"Task not found"}',
      ok: false,
      status: 404,
    });
    mockResponse({ body: 'not json', ok: false, status: 409 });

    const client = new Desearch('test-key');
    const notFound = await client
      .pausePeopleTask({ task_id: TASK_ID })
      .catch((caught: unknown) => caught);
    expect(notFound).not.toBeInstanceOf(PeopleTaskConflictError);
    expect((notFound as Error).message).toBe(
      'HTTP 404: {"detail":"Task not found"}'
    );

    const unparsable = await client
      .resumePeopleTask({ task_id: TASK_ID })
      .catch((caught: unknown) => caught);
    expect(unparsable).not.toBeInstanceOf(PeopleTaskConflictError);
    expect((unparsable as Error).message).toBe('HTTP 409: not json');
  });

  it('exports task results as CSV text with result filters as query params', async () => {
    const csv =
      'handle,name,url,score\nglowwithmia,Mia,https://www.tiktok.com/@glowwithmia,82\n';
    mockResponse({ body: csv, contentType: 'text/csv; charset=utf-8' });

    const client = new Desearch('test-key');
    await expect(
      client.exportPeopleResults({
        task_id: TASK_ID,
        format: 'csv',
        has: ['email', 'instagram'],
        min_audience: 1000,
        max_audience: 500000,
        min_score: 60,
        location: 'united states',
        verified: true,
      })
    ).resolves.toBe(csv);
    expect(fetchCall(0).url).toBe(
      `${API}/desearch/people/tasks/${TASK_ID}/export?format=csv&has=email%2Cinstagram&min_audience=1000&max_audience=500000&min_score=60&location=united+states&verified=true`
    );
  });

  it('skips empty and null result filters', async () => {
    mockResponse({ body: '', contentType: 'application/x-ndjson' });

    const client = new Desearch('test-key');
    await client.exportPeopleResults({
      task_id: TASK_ID,
      format: 'jsonl',
      has: [],
      location: null,
      min_score: undefined,
    });
    expect(fetchCall(0).url).toBe(
      `${API}/desearch/people/tasks/${TASK_ID}/export?format=jsonl`
    );
  });

  it('lists the profiles library with search, sort, paging and filters', async () => {
    const page = {
      profiles: [
        {
          ...person('glowwithmia'),
          found_by: {
            task_id: TASK_ID,
            query: 'Skincare creators who review sunscreen',
            found_at: '2026-10-17T10:05:00+00:00',
            times_found: 2,
          },
        },
      ],
      total: 1,
      next_cursor: null,
    };
    mockResponse({ body: page });

    const client = new Desearch('test-key');
    await expect(
      client.listPeopleProfiles({
        platform: 'tiktok',
        q: 'sunscreen',
        sort: 'audience',
        limit: 20,
        cursor: '40',
        has: ['email'],
        min_score: 70,
      })
    ).resolves.toEqual(page);
    expect(fetchCall(0).url).toBe(
      `${API}/desearch/people/profiles?platform=tiktok&q=sunscreen&sort=audience&limit=20&cursor=40&has=email&min_score=70`
    );
    expect(fetchCall(0).method).toBe('GET');
  });

  it('exports the profiles library as JSON Lines text', async () => {
    const jsonl = '{"handle":"glowwithmia"}\n';
    mockResponse({ body: jsonl, contentType: 'application/x-ndjson' });

    const client = new Desearch('test-key');
    await expect(
      client.exportPeopleProfiles({
        platform: 'youtube',
        format: 'jsonl',
        sort: 'recent',
        has: ['email', 'website'],
        min_audience: 10000,
      })
    ).resolves.toBe(jsonl);
    expect(fetchCall(0).url).toBe(
      `${API}/desearch/people/profiles/export?platform=youtube&format=jsonl&sort=recent&has=email%2Cwebsite&min_audience=10000`
    );
  });

  it('waits for a task to end, reporting every poll', async () => {
    mockResponse({ body: peopleTask({ status: 'queued' }) });
    mockResponse({ body: peopleTask({ status: 'running', result_count: 4 }) });
    const done = peopleTask({
      status: 'completed',
      result_count: 9,
      final_cost_usd: 0.45,
    });
    mockResponse({ body: done });

    const client = new Desearch('test-key');
    const seen: string[] = [];
    await expect(
      client.waitForPeopleTask(peopleTask(), {
        intervalMs: 0,
        onProgress: (task) => seen.push(task.status),
      })
    ).resolves.toEqual(done);

    expect(seen).toEqual(['queued', 'running', 'completed']);
    expect(mockedFetch).toHaveBeenCalledTimes(3);
    expect(fetchCall(2).url).toBe(`${API}/desearch/people/tasks/${TASK_ID}`);
  });

  it.each(['partial', 'failed', 'cancelled', 'expired'] as const)(
    'stops waiting on %s',
    async (status) => {
      mockResponse({ body: peopleTask({ status }) });

      const client = new Desearch('test-key');
      await expect(
        client.waitForPeopleTask({ task_id: TASK_ID })
      ).resolves.toMatchObject({ status });
      expect(mockedFetch).toHaveBeenCalledTimes(1);
    }
  );

  it('polls on the interval and times out when the task does not end', async () => {
    vi.useFakeTimers();
    for (let i = 0; i < 4; i += 1) {
      mockResponse({ body: peopleTask({ status: 'paused' }) });
    }

    const client = new Desearch('test-key');
    const waiting = client.waitForPeopleTask(
      { task_id: TASK_ID },
      { intervalMs: 1000, timeoutMs: 2500 }
    );
    const assertion = expect(waiting).rejects.toThrow(
      `Timed out after 2500ms waiting for People Search task ${TASK_ID} (status: paused)`
    );
    await vi.advanceTimersByTimeAsync(3000);
    await assertion;

    // Polls at 0, 1000, 2000 and a last one at the 2500 ms deadline.
    expect(mockedFetch).toHaveBeenCalledTimes(4);
  });

  it('iterates over every results page by following next_cursor', async () => {
    const pages = [
      {
        task_id: TASK_ID,
        status: 'completed',
        results: [person('a'), person('b')],
        next_cursor: '2',
        has_more: true,
      },
      {
        task_id: TASK_ID,
        status: 'completed',
        results: [person('c'), person('d')],
        next_cursor: '4',
        has_more: true,
      },
      {
        task_id: TASK_ID,
        status: 'completed',
        results: [person('e')],
        next_cursor: '5',
        has_more: false,
      },
    ];
    for (const page of pages) {
      mockResponse({ body: page });
    }

    const client = new Desearch('test-key');
    const handles: string[] = [];
    let lastCursor = '';
    // A whole task object works: only cursor and limit go in the query.
    for await (const page of client.iterPeopleResultPages({
      ...peopleTask({ status: 'completed' }),
      limit: 2,
    })) {
      handles.push(...page.results.map((result) => result.handle));
      lastCursor = page.next_cursor;
    }

    expect(handles).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(lastCursor).toBe('5');
    expect(mockedFetch.mock.calls.map(([url]) => url)).toEqual([
      `${API}/desearch/people/tasks/${TASK_ID}/results?limit=2`,
      `${API}/desearch/people/tasks/${TASK_ID}/results?cursor=2&limit=2`,
      `${API}/desearch/people/tasks/${TASK_ID}/results?cursor=4&limit=2`,
    ]);
  });

  it('starts iterating from a saved cursor and stops after a page without more results', async () => {
    mockResponse({
      body: {
        task_id: TASK_ID,
        status: 'running',
        results: [],
        next_cursor: '5',
        has_more: false,
      },
    });

    const client = new Desearch('test-key');
    const pages = [];
    for await (const page of client.iterPeopleResultPages({
      task_id: TASK_ID,
      cursor: '5',
    })) {
      pages.push(page);
    }

    expect(pages).toHaveLength(1);
    expect(fetchCall(0).url).toBe(
      `${API}/desearch/people/tasks/${TASK_ID}/results?cursor=5`
    );
  });

  it('returns why a task ended, whether a budget limited it, and its warnings', async () => {
    const finished = peopleTask({
      search_type: 'linkedin_profile_search',
      platform: 'linkedin',
      status: 'completed',
      count: 5,
      result_count: 5,
      final_cost_usd: 0.25,
      completion_reason: 'count_reached',
      coverage_limited: false,
      warnings: [
        {
          code: 'partial_enrichment',
          platform: 'linkedin',
          attempted: 20,
          enriched: 13,
          failed: 7,
          by_reason: { not_found: 7 },
          message:
            '7 of 20 LinkedIn profiles could not be read after search; those candidates were scored on search data only, and results among them have attributes.enrichment = "failed".',
        },
      ],
    });
    const limited = peopleTask({
      status: 'completed',
      count: 50,
      result_count: 12,
      completion_reason: 'cost_limit',
      coverage_limited: true,
      warnings: [],
    });
    mockResponse({ body: finished });
    mockResponse({ body: { tasks: [limited], next_cursor: null } });

    const client = new Desearch('test-key');
    const task = await client.getPeopleTask({ task_id: TASK_ID });
    expect(task).toEqual(finished);
    expect(task.completion_reason).toBe('count_reached');
    expect(task.coverage_limited).toBe(false);
    const [warning] = task.warnings ?? [];
    expect(warning.code).toBe('partial_enrichment');
    expect(warning.by_reason).toEqual({ not_found: 7 });

    const { tasks } = await client.listPeopleTasks({ status: 'completed' });
    expect(tasks[0].completion_reason).toBe('cost_limit');
    expect(tasks[0].coverage_limited).toBe(true);
    expect(tasks[0].warnings).toEqual([]);
  });

  it('keeps a running task without a completion reason', async () => {
    const running = peopleTask({
      status: 'running',
      stage: 'processing',
      completion_reason: null,
      coverage_limited: false,
      warnings: [],
    });
    mockResponse({ body: running });

    const client = new Desearch('test-key');
    const task = await client.getPeopleTask({ task_id: TASK_ID });
    expect(task.completion_reason).toBeNull();
  });

  it('returns criteria checks, fully_verified and the enrichment flag on results', async () => {
    const verified: Person = {
      ...person('ana-khutsishvili'),
      platform: 'linkedin',
      attributes: {
        headline: 'Software Engineer at EPAM Systems',
        company: 'EPAM Systems',
        enrichment: 'ok',
      },
      score: {
        ...person('ana-khutsishvili').score!,
        criteria_checks: [
          {
            criterion: 'Profile fit: Software Engineer based in Georgia',
            verdict: 'met',
            quote: 'Software Engineer at EPAM Systems',
            source_url: 'https://www.linkedin.com/in/ana-khutsishvili',
            reason: 'Role and Tbilisi location supplied.',
          },
        ],
        fully_verified: true,
      },
    };
    const unread: Person = {
      ...person('nino'),
      platform: 'linkedin',
      attributes: { enrichment: 'failed', enrichment_error: 'not_found' },
      score: {
        ...person('nino').score!,
        criteria_checks: [
          {
            criterion: 'Profile fit: Software Engineer based in Georgia',
            verdict: 'unknown',
            quote: null,
            source_url: null,
            reason: 'No current location in the profile.',
          },
        ],
        fully_verified: false,
      },
    };
    const page = {
      task_id: TASK_ID,
      status: 'completed',
      results: [verified, unread],
      next_cursor: '2',
      has_more: false,
    };
    mockResponse({ body: page });

    const client = new Desearch('test-key');
    const { results } = await client.getPeopleResults({ task_id: TASK_ID });
    expect(results).toEqual(page.results);
    expect(results.map((r) => r.score?.fully_verified)).toEqual([true, false]);
    expect(results.map((r) => r.attributes?.enrichment)).toEqual([
      'ok',
      'failed',
    ]);
    expect(results[1].attributes?.enrichment_error).toBe('not_found');
    expect(
      unverifiedCriteria(results[1].score).map((check) => check.criterion)
    ).toEqual(['Profile fit: Software Engineer based in Georgia']);
    expect(unverifiedCriteria(results[0].score)).toEqual([]);
  });

  it('lists unverified criteria like the CSV column: unmet criteria and disqualifiers that apply', () => {
    const checks: PeopleCriterionCheck[] = [
      {
        criterion: 'Profile fit: Heads of sales at fintech startups',
        verdict: 'met',
        quote: 'Head of Sales at Ramp',
      },
      { criterion: 'Topic signal: outbound', verdict: 'unknown', reason: '' },
      {
        criterion: 'Evidence quality: posts about pipeline',
        verdict: 'not_met',
      },
      {
        criterion: 'Disqualifier: exclude agencies',
        verdict: 'met',
        quote: 'our agency',
      },
      { criterion: 'Disqualifier: exclude students', verdict: 'unknown' },
      { criterion: 'Disqualifier: recruiters', verdict: 'not_met' },
    ];
    const score = { ...person('a').score!, criteria_checks: checks };
    expect(unverifiedCriteria(score).map((check) => check.criterion)).toEqual([
      'Topic signal: outbound',
      'Evidence quality: posts about pipeline',
      'Disqualifier: exclude agencies',
    ]);
    expect(unverifiedCriteria(person('a').score)).toEqual([]);
    expect(unverifiedCriteria(null)).toEqual([]);
    expect(unverifiedCriteria(undefined)).toEqual([]);
  });

  it('uses is_disqualifier when the check has it, and the keyword rule when it does not', () => {
    const score = {
      ...person('a').score!,
      criteria_checks: [
        // The flag wins over the wording, both ways.
        {
          criterion: 'Profile fit: excluding agencies is fine',
          verdict: 'met',
          is_disqualifier: false,
        },
        {
          criterion: 'Agency owners',
          verdict: 'met',
          is_disqualifier: true,
        },
        {
          criterion: 'Disqualifier: students',
          verdict: 'unknown',
          is_disqualifier: true,
        },
        // No flag (scored before it existed) or null: the keyword rule.
        { criterion: 'Disqualifier: recruiters', verdict: 'met' },
        {
          criterion: 'Not qualified leads',
          verdict: 'met',
          is_disqualifier: null,
        },
        { criterion: 'Topic signal: excludes nothing', verdict: 'met' },
      ] as PeopleCriterionCheck[],
    };
    expect(unverifiedCriteria(score).map((check) => check.criterion)).toEqual([
      'Agency owners',
      'Disqualifier: recruiters',
      'Not qualified leads',
    ]);
  });

  it('reads results scored before criteria checks existed', async () => {
    const page = {
      task_id: TASK_ID,
      status: 'completed',
      results: [person('glowwithmia')],
      next_cursor: '1',
      has_more: false,
    };
    mockResponse({ body: page });

    const client = new Desearch('test-key');
    const [result] = (await client.getPeopleResults({ task_id: TASK_ID }))
      .results;
    expect(result.score?.criteria_checks).toBeUndefined();
    expect(result.score?.fully_verified).toBeUndefined();
    expect(result.attributes).toBeUndefined();
  });

  it('types the new task and result fields to the values the API returns', () => {
    // Type-only checks: compiled by `tsc --noEmit`, never run against the API.
    const reason: PeopleCompletionReason = 'candidate_budget';
    // @ts-expect-error stop_reason values such as no_more_queries are not completion reasons
    const internal: PeopleCompletionReason = 'no_more_queries';
    const check: PeopleCriterionCheck = {
      criterion: 'Topic signal: coding or development work',
      verdict: 'not_met',
      reason: 'Posts are about marketing.',
    };
    // @ts-expect-error verdicts are met, not_met or unknown
    const badVerdict: PeopleCriterionVerdict = 'maybe';
    const warning: PeopleTaskWarning = { code: 'partial_enrichment' };
    const attributes: PersonAttributes = {
      enrichment: 'failed',
      enrichment_error: 'rate_limited',
      region: 'US',
    };
    // @ts-expect-error enrichment is ok or failed
    const badEnrichment: PersonAttributes = { enrichment: 'partial' };
    expect([
      reason,
      internal,
      check,
      badVerdict,
      warning,
      attributes,
      badEnrichment,
    ]).toHaveLength(7);
  });

  it('types the has filter to the channels the API accepts', () => {
    const client = new Desearch('test-key');
    // Type-only checks: these calls are never awaited or sent.
    const typed = () =>
      client.exportPeopleResults({
        task_id: TASK_ID,
        // @ts-expect-error fax is not a People Search channel
        has: ['fax'],
      });
    const tiktok = () =>
      client.tiktokCreatorSearch({
        query: 'Skincare creators',
        // @ts-expect-error TikTok Creator Search has no countries filter
        filters: { countries: ['US'] },
      });
    expect(typeof typed).toBe('function');
    expect(typeof tiktok).toBe('function');
    expect(mockedFetch).not.toHaveBeenCalled();
  });
});

describe('Social routes (TikTok, Facebook, Instagram)', () => {
  const API = 'https://api.desearch.ai';
  const PAGE = { count: 3, cursor: 'c1' };

  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it.each([
    {
      name: 'tiktokSearch',
      call: (c: Desearch) =>
        c.tiktokSearch({ query: 'bittensor', count: 3, sort: 'latest' }),
      path: '/desearch/tiktok/search',
      body: { query: 'bittensor', count: 3, sort: 'latest' },
    },
    {
      name: 'facebookSearch',
      call: (c: Desearch) => c.facebookSearch({ query: 'running shoes' }),
      path: '/desearch/facebook/search',
      body: { query: 'running shoes' },
    },
    {
      name: 'instagramSearch',
      call: (c: Desearch) => c.instagramSearch({ query: 'nasa', count: 2 }),
      path: '/desearch/instagram/search',
      body: { query: 'nasa', count: 2 },
    },
  ])('$name posts its JSON body to $path', async ({ call, path, body }) => {
    mockResponse({ body: [] });

    const client = new Desearch('test-key');
    await expect(call(client)).resolves.toEqual([]);

    const sent = fetchCall(0);
    expect(sent.url).toBe(`${API}${path}`);
    expect(sent.method).toBe('POST');
    expect(sent.headers).toEqual({
      Authorization: 'test-key',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(sent.body!)).toEqual(body);
  });

  it.each([
    {
      name: 'tiktokPostById',
      call: (c: Desearch) => c.tiktokPostById({ id: '7637904247849372948' }),
      url: '/desearch/tiktok/post/7637904247849372948',
    },
    {
      name: 'tiktokProfile',
      call: (c: Desearch) => c.tiktokProfile({ username: 'tiktok' }),
      url: '/desearch/tiktok/profile/tiktok',
    },
    {
      name: 'tiktokProfilePosts',
      call: (c: Desearch) =>
        c.tiktokProfilePosts({ username: 'tiktok', ...PAGE }),
      url: '/desearch/tiktok/profile/tiktok/posts?count=3&cursor=c1',
    },
    {
      name: 'tiktokComments',
      call: (c: Desearch) =>
        c.tiktokComments({ video_id: '7637904247849372948', ...PAGE }),
      url: '/desearch/tiktok/comments/7637904247849372948?count=3&cursor=c1',
    },
    {
      name: 'tiktokHashtag',
      call: (c: Desearch) => c.tiktokHashtag({ tag: 'ai', ...PAGE }),
      url: '/desearch/tiktok/hashtag/ai?count=3&cursor=c1',
    },
    {
      name: 'tiktokTrending',
      call: (c: Desearch) => c.tiktokTrending({ region: 'GB', count: 2 }),
      url: '/desearch/tiktok/trending?region=GB&count=2',
    },
    {
      name: 'tiktokTrending (no params)',
      call: (c: Desearch) => c.tiktokTrending(),
      url: '/desearch/tiktok/trending',
    },
    {
      name: 'facebookPostById',
      call: (c: Desearch) => c.facebookPostById({ id: '1040495851972958' }),
      url: '/desearch/facebook/post/1040495851972958',
    },
    {
      name: 'facebookProfile',
      call: (c: Desearch) => c.facebookProfile({ profile_id: 'facebook' }),
      url: '/desearch/facebook/profile/facebook',
    },
    {
      name: 'facebookProfilePosts',
      call: (c: Desearch) =>
        c.facebookProfilePosts({ profile_id: 'facebook', ...PAGE }),
      url: '/desearch/facebook/profile/facebook/posts?count=3&cursor=c1',
    },
    {
      name: 'facebookComments',
      call: (c: Desearch) =>
        c.facebookComments({ post_id: '1040495851972958', ...PAGE }),
      url: '/desearch/facebook/comments/1040495851972958?count=3&cursor=c1',
    },
    {
      name: 'facebookHashtag',
      call: (c: Desearch) => c.facebookHashtag({ tag: 'ai', ...PAGE }),
      url: '/desearch/facebook/hashtag/ai?count=3&cursor=c1',
    },
    {
      name: 'instagramMedia',
      call: (c: Desearch) => c.instagramMedia({ id: 'DeuOR-CjKE9' }),
      url: '/desearch/instagram/media/DeuOR-CjKE9',
    },
    {
      name: 'instagramProfile',
      call: (c: Desearch) => c.instagramProfile({ username: 'instagram' }),
      url: '/desearch/instagram/profile/instagram',
    },
    {
      name: 'instagramProfilePosts',
      call: (c: Desearch) =>
        c.instagramProfilePosts({ username: 'instagram', ...PAGE }),
      url: '/desearch/instagram/profile/instagram/posts?count=3&cursor=c1',
    },
    {
      name: 'instagramComments',
      call: (c: Desearch) =>
        c.instagramComments({ shortcode: 'DeuOR-CjKE9', ...PAGE }),
      url: '/desearch/instagram/comments/DeuOR-CjKE9?count=3&cursor=c1',
    },
    {
      name: 'instagramHashtag',
      call: (c: Desearch) => c.instagramHashtag({ tag: 'ai', ...PAGE }),
      url: '/desearch/instagram/hashtag/ai?count=3&cursor=c1',
    },
  ])('$name sends GET $url', async ({ call, url }) => {
    const payload = { id: '1' };
    mockResponse({ body: payload });

    const client = new Desearch('test-key');
    await expect(call(client)).resolves.toEqual(payload);

    const sent = fetchCall(0);
    expect(sent.url).toBe(`${API}${url}`);
    expect(sent.method).toBe('GET');
    expect(sent.body).toBeUndefined();
    expect(sent.headers).toEqual({ Authorization: 'test-key' });
  });

  it('leaves unset count and cursor out of the query and the path params out of it entirely', async () => {
    mockResponse({ body: [] });
    mockResponse({ body: [] });

    const client = new Desearch('test-key');
    await client.instagramHashtag({ tag: 'ai' });
    await client.facebookComments({ post_id: '1', count: 5, cursor: null });

    expect(fetchCall(0).url).toBe(`${API}/desearch/instagram/hashtag/ai`);
    expect(fetchCall(1).url).toBe(
      `${API}/desearch/facebook/comments/1?count=5`
    );
  });

  it('URL-encodes path params, so IDs and post URLs that contain / reach the {id:path} routes as one value', async () => {
    for (let i = 0; i < 6; i += 1) {
      mockResponse({ body: {} });
    }

    const client = new Desearch('test-key');
    const fbId = 'Meta/posts/1040495851972958';
    const igUrl = 'https://www.instagram.com/reel/DYMavICJUCU/';
    const ttUrl = 'https://www.tiktok.com/@tiktok/video/7637904247849372948';
    await client.facebookPostById({ id: fbId });
    await client.facebookComments({ post_id: fbId });
    await client.instagramMedia({ id: igUrl });
    await client.tiktokPostById({ id: ttUrl });
    await client.tiktokComments({ video_id: ttUrl, count: 1 });
    await client.tiktokProfile({ username: 'a?b#c d' });

    expect(mockedFetch.mock.calls.map(([url]) => url)).toEqual([
      `${API}/desearch/facebook/post/Meta%2Fposts%2F1040495851972958`,
      `${API}/desearch/facebook/comments/Meta%2Fposts%2F1040495851972958`,
      `${API}/desearch/instagram/media/https%3A%2F%2Fwww.instagram.com%2Freel%2FDYMavICJUCU%2F`,
      `${API}/desearch/tiktok/post/https%3A%2F%2Fwww.tiktok.com%2F%40tiktok%2Fvideo%2F7637904247849372948`,
      `${API}/desearch/tiktok/comments/https%3A%2F%2Fwww.tiktok.com%2F%40tiktok%2Fvideo%2F7637904247849372948?count=1`,
      `${API}/desearch/tiktok/profile/a%3Fb%23c%20d`,
    ]);
    // The server decodes the path before routing: each value arrives unchanged.
    const lastSegment = (index: number) =>
      decodeURIComponent(
        new URL(fetchCall(index).url).pathname.split('/').pop()!
      );
    expect(lastSegment(0)).toBe(fbId);
    expect(lastSegment(2)).toBe(igUrl);
    expect(lastSegment(3)).toBe(ttUrl);
    expect(lastSegment(5)).toBe('a?b#c d');
    expect(new URL(fetchCall(5).url).search).toBe('');
  });

  it('sends a cursor back exactly as received, in the query of GET routes and the body of searches', async () => {
    const cursor =
      'eyJ2IjoxLCJyb3V0ZSI6Ii9kZXNlYXJjaC90aWt0b2svaGFzaHRhZyJ9.c2ln-_=';
    mockResponse({ body: [] });
    mockResponse({ body: [] });
    mockResponse({ body: [] });

    const client = new Desearch('test-key');
    await client.tiktokHashtag({ tag: 'ai', cursor });
    await client.tiktokSearch({ query: 'ai', count: 2, cursor });
    await client.facebookSearch({ query: 'ai', cursor });

    expect(new URL(fetchCall(0).url).searchParams.get('cursor')).toBe(cursor);
    expect(JSON.parse(fetchCall(1).body!)).toEqual({
      query: 'ai',
      count: 2,
      cursor,
    });
    expect(JSON.parse(fetchCall(2).body!).cursor).toBe(cursor);
  });

  it('returns the raw array by default even when a next cursor is present', async () => {
    const posts: TikTokPost[] = [{ id: '1', hashtags: ['ai'], mentions: [] }];
    mockResponse({
      body: posts,
      headers: { 'x-desearch-next-cursor': 'next-1' },
    });

    const client = new Desearch('test-key');
    await expect(client.tiktokHashtag({ tag: 'ai' })).resolves.toEqual(posts);
  });

  it('returns nextCursor and cost metadata from the headers when opted in', async () => {
    const posts = [{ id: '1' }, { id: '2' }];
    mockResponse({
      body: posts,
      headers: {
        'X-Desearch-Cost-Usd': '0.002',
        'X-Desearch-Usage-Count': '2',
        'X-Desearch-Service': 'tiktok',
        'X-Desearch-Currency': 'USD',
        'x-desearch-next-cursor': 'eyJ2IjoxfQ.c2ln',
      },
    });

    const client = new Desearch('test-key');
    await expect(
      client.tiktokProfilePosts(
        { username: 'tiktok', count: 2 },
        { includeMetadata: true }
      )
    ).resolves.toEqual({
      data: posts,
      metadata: {
        costUsd: 0.002,
        usageCount: 2,
        service: 'tiktok',
        currency: 'USD',
        nextCursor: 'eyJ2IjoxfQ.c2ln',
      },
    });
  });

  it('leaves nextCursor out on the last page and when the header is empty', async () => {
    mockResponse({ body: [], headers: { 'X-Desearch-Usage-Count': '0' } });
    mockResponse({ body: [], headers: { 'x-desearch-next-cursor': '' } });

    const client = new Desearch('test-key');
    const last = await client.instagramComments(
      { shortcode: 'DeuOR-CjKE9' },
      { includeMetadata: true }
    );
    const empty = await client.facebookHashtag(
      { tag: 'ai' },
      { includeMetadata: true }
    );

    expect(last.metadata).toEqual({ usageCount: 0 });
    expect('nextCursor' in last.metadata).toBe(false);
    expect(empty.metadata).toEqual({});
  });

  it('pages through a list route by following nextCursor until it is absent', async () => {
    mockResponse({
      body: [{ id: 'a' }, { id: 'b' }],
      headers: { 'x-desearch-next-cursor': 'cur-1' },
    });
    mockResponse({
      body: [{ id: 'c' }],
      headers: { 'x-desearch-next-cursor': 'cur-2' },
    });
    mockResponse({ body: [{ id: 'd' }] });

    const client = new Desearch('test-key');
    const ids: (string | null | undefined)[] = [];
    let cursor: string | undefined;
    do {
      const { data, metadata } = await client.instagramProfilePosts(
        { username: 'instagram', count: 2, cursor },
        { includeMetadata: true }
      );
      ids.push(...data.map((media) => media.id));
      cursor = metadata.nextCursor;
    } while (cursor);

    expect(ids).toEqual(['a', 'b', 'c', 'd']);
    expect(mockedFetch.mock.calls.map(([url]) => url)).toEqual([
      `${API}/desearch/instagram/profile/instagram/posts?count=2`,
      `${API}/desearch/instagram/profile/instagram/posts?count=2&cursor=cur-1`,
      `${API}/desearch/instagram/profile/instagram/posts?count=2&cursor=cur-2`,
    ]);
  });

  it('returns typed objects for the single-item routes', async () => {
    const profile = {
      id: '107955',
      username: 'tiktok',
      nickname: 'TikTok',
      verified: true,
      followers: 90000000,
      heart: 400000000,
    };
    const media = {
      id: '3234567890123456789',
      shortcode: 'DY79rTVS6OK',
      url: 'https://www.instagram.com/p/DY79rTVS6OK/',
      mediaType: 'image',
      author: { username: 'instagram', verified: true },
      stats: { likeCount: 5000, commentCount: 120 },
      hashtags: [],
      mentions: [],
      children: [],
    };
    mockResponse({ body: profile });
    mockResponse({ body: media });

    const client = new Desearch('test-key');
    const tt = await client.tiktokProfile({ username: 'tiktok' });
    const ig = await client.instagramMedia({ id: 'DY79rTVS6OK' });
    expect(tt.followers).toBe(90000000);
    expect(ig.author?.username).toBe('instagram');
    expect(ig.stats?.likeCount).toBe(5000);
  });

  it('surfaces an invalid cursor (422), a missing post (404) and a failed search as HTTP errors', async () => {
    mockResponse({
      body: '{"detail":"Invalid request parameters"}',
      ok: false,
      status: 422,
    });
    mockResponse({
      body: '{"detail":"Post not found"}',
      ok: false,
      status: 404,
    });
    mockResponse({
      body: '{"detail":"cursor is not supported on instagram search"}',
      ok: false,
      status: 422,
    });

    const client = new Desearch('test-key');
    await expect(
      client.tiktokComments({ video_id: '1', cursor: 'tampered' })
    ).rejects.toThrow('HTTP 422: {"detail":"Invalid request parameters"}');
    await expect(
      client.instagramComments({ shortcode: '3234567890123456789' })
    ).rejects.toThrow('HTTP 404: {"detail":"Post not found"}');
    await expect(client.instagramSearch({ query: 'nasa' })).rejects.toThrow(
      'HTTP 422: {"detail":"cursor is not supported on instagram search"}'
    );
  });

  it('wraps a transport failure as Unexpected Error', async () => {
    mockedFetch.mockRejectedValueOnce(new Error('socket hang up'));

    const client = new Desearch('test-key');
    await expect(
      client.facebookProfile({ profile_id: 'facebook' })
    ).rejects.toThrow('Unexpected Error: socket hang up');
  });

  it('types the social requests to what each route accepts', () => {
    const client = new Desearch('test-key');
    // Type-only checks: these calls are never awaited or sent.
    const igSearch = () =>
      client.instagramSearch({
        query: 'nasa',
        // @ts-expect-error Instagram search does not paginate
        cursor: 'c1',
      });
    const trending = () =>
      client.tiktokTrending({
        region: 'US',
        // @ts-expect-error TikTok trending has no cursor
        cursor: 'c1',
      });
    // @ts-expect-error a profile lookup needs its username
    const profile = () => client.tiktokProfile({});
    const kind: InstagramSearchResultType = 'hashtag';
    // @ts-expect-error result types are profile, hashtag or media
    const badKind: InstagramSearchResultType = 'reel';
    expect([igSearch, trending, profile, kind, badKind]).toHaveLength(5);
    expect(mockedFetch).not.toHaveBeenCalled();
  });
});

describe('YouTube, Reddit and Threads', () => {
  const API = 'https://api.desearch.ai';

  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it.each([
    {
      name: 'youtubeSearch',
      call: (c: Desearch) =>
        c.youtubeSearch({
          query: 'bittensor',
          type: 'videos',
          upload_date: 'this_month',
          sort_by: 'popular',
          duration: 'over_20_min',
          cursor: 'c1',
        }),
      path: '/desearch/youtube/search',
      body: {
        query: 'bittensor',
        type: 'videos',
        upload_date: 'this_month',
        sort_by: 'popular',
        duration: 'over_20_min',
        cursor: 'c1',
      },
    },
    {
      name: 'youtubeSearch (query only)',
      call: (c: Desearch) => c.youtubeSearch({ query: 'bittensor' }),
      path: '/desearch/youtube/search',
      body: { query: 'bittensor' },
    },
    {
      name: 'redditSearch',
      call: (c: Desearch) =>
        c.redditSearch({
          query: 'bittensor',
          sort: 'top',
          timeframe: 'week',
          cursor: 'c1',
        }),
      path: '/desearch/reddit/search',
      body: { query: 'bittensor', sort: 'top', timeframe: 'week', cursor: 'c1' },
    },
    {
      name: 'threadsSearch',
      call: (c: Desearch) =>
        c.threadsSearch({
          query: 'bittensor',
          start_date: '2026-01-01',
          end_date: '2026-10-30',
        }),
      path: '/desearch/threads/search',
      body: {
        query: 'bittensor',
        start_date: '2026-01-01',
        end_date: '2026-10-30',
      },
    },
    {
      name: 'threadsSearchUsers',
      call: (c: Desearch) => c.threadsSearchUsers({ query: 'zuck' }),
      path: '/desearch/threads/search/users',
      body: { query: 'zuck' },
    },
  ])('$name posts its JSON body to $path', async ({ call, path, body }) => {
    mockResponse({ body: [] });

    const client = new Desearch('test-key');
    await expect(call(client)).resolves.toEqual([]);

    const sent = fetchCall(0);
    expect(sent.url).toBe(`${API}${path}`);
    expect(sent.method).toBe('POST');
    expect(sent.headers).toEqual({
      Authorization: 'test-key',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(sent.body!)).toEqual(body);
  });

  it.each([
    {
      name: 'youtubeVideo',
      call: (c: Desearch) => c.youtubeVideo({ id: 'dQw4w9WgXcQ' }),
      url: '/desearch/youtube/video/dQw4w9WgXcQ',
    },
    {
      name: 'youtubeTranscript',
      call: (c: Desearch) =>
        c.youtubeTranscript({ video_id: 'dQw4w9WgXcQ', language: 'en' }),
      url: '/desearch/youtube/transcript/dQw4w9WgXcQ?language=en',
    },
    {
      name: 'youtubeComments',
      call: (c: Desearch) =>
        c.youtubeComments({
          video_id: 'dQw4w9WgXcQ',
          order: 'newest',
          cursor: 'c1',
        }),
      url: '/desearch/youtube/comments/dQw4w9WgXcQ?order=newest&cursor=c1',
    },
    {
      name: 'youtubeChannel',
      call: (c: Desearch) => c.youtubeChannel({ handle: 'MrBeast' }),
      url: '/desearch/youtube/channel/MrBeast',
    },
    {
      name: 'youtubeChannelVideos',
      call: (c: Desearch) =>
        c.youtubeChannelVideos({
          handle: 'UCX6OQ3DkcsbYNE6H8uQQuVA',
          sort: 'popular',
          cursor: 'c1',
        }),
      url: '/desearch/youtube/channel/UCX6OQ3DkcsbYNE6H8uQQuVA/videos?sort=popular&cursor=c1',
    },
    {
      name: 'redditSubreddit',
      call: (c: Desearch) => c.redditSubreddit({ name: 'AskReddit' }),
      url: '/desearch/reddit/subreddit/AskReddit',
    },
    {
      name: 'redditSubredditPosts',
      call: (c: Desearch) =>
        c.redditSubredditPosts({
          name: 'AskReddit',
          sort: 'top',
          timeframe: 'week',
          cursor: 'c1',
        }),
      url: '/desearch/reddit/subreddit/AskReddit/posts?sort=top&timeframe=week&cursor=c1',
    },
    {
      name: 'redditPostById',
      call: (c: Desearch) => c.redditPostById({ id: 't3_1q6pxwn' }),
      url: '/desearch/reddit/post/t3_1q6pxwn',
    },
    {
      name: 'redditComments',
      call: (c: Desearch) =>
        c.redditComments({ post_id: '1q6pxwn', cursor: 'c1' }),
      url: '/desearch/reddit/comments/1q6pxwn?cursor=c1',
    },
    {
      name: 'threadsProfile',
      call: (c: Desearch) => c.threadsProfile({ username: 'zuck' }),
      url: '/desearch/threads/profile/zuck',
    },
    {
      name: 'threadsProfilePosts',
      call: (c: Desearch) => c.threadsProfilePosts({ username: 'zuck' }),
      url: '/desearch/threads/profile/zuck/posts',
    },
    {
      name: 'threadsPostById',
      call: (c: Desearch) => c.threadsPostById({ id: 'DK-BydcJHkF' }),
      url: '/desearch/threads/post/DK-BydcJHkF',
    },
  ])('$name sends GET $url', async ({ call, url }) => {
    const payload = { id: '1' };
    mockResponse({ body: payload });

    const client = new Desearch('test-key');
    await expect(call(client)).resolves.toEqual(payload);

    const sent = fetchCall(0);
    expect(sent.url).toBe(`${API}${url}`);
    expect(sent.method).toBe('GET');
    expect(sent.body).toBeUndefined();
    expect(sent.headers).toEqual({ Authorization: 'test-key' });
  });

  it('leaves unset and null options out of the query and the body', async () => {
    for (let i = 0; i < 5; i += 1) {
      mockResponse({ body: [] });
    }

    const client = new Desearch('test-key');
    await client.youtubeTranscript({ video_id: 'dQw4w9WgXcQ' });
    await client.youtubeComments({ video_id: 'dQw4w9WgXcQ', cursor: null });
    await client.youtubeChannelVideos({ handle: 'MrBeast', sort: null });
    await client.redditSubredditPosts({ name: 'AskReddit', sort: 'hot' });
    await client.redditSearch({ query: 'ai', sort: undefined, cursor: null });

    expect(fetchCall(0).url).toBe(
      `${API}/desearch/youtube/transcript/dQw4w9WgXcQ`
    );
    expect(fetchCall(1).url).toBe(`${API}/desearch/youtube/comments/dQw4w9WgXcQ`);
    expect(fetchCall(2).url).toBe(
      `${API}/desearch/youtube/channel/MrBeast/videos`
    );
    expect(fetchCall(3).url).toBe(
      `${API}/desearch/reddit/subreddit/AskReddit/posts?sort=hot`
    );
    // JSON.stringify drops undefined; null is sent as null, which the API treats as unset.
    expect(JSON.parse(fetchCall(4).body!)).toEqual({ query: 'ai', cursor: null });
  });

  it('URL-encodes path params, so post and video URLs reach the API as one value', async () => {
    for (let i = 0; i < 6; i += 1) {
      mockResponse({ body: {} });
    }

    const client = new Desearch('test-key');
    const ytUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const redditUrl =
      'https://www.reddit.com/r/webscraping/comments/1q6pxwn/just_started/';
    const threadsUrl = 'https://www.threads.com/@zuck/post/DK-BydcJHkF';
    await client.youtubeVideo({ id: ytUrl });
    await client.youtubeTranscript({ video_id: 'https://youtu.be/dQw4w9WgXcQ' });
    await client.youtubeChannel({ handle: '@MrBeast' });
    await client.redditPostById({ id: redditUrl });
    await client.redditComments({ post_id: redditUrl, cursor: 'c1' });
    await client.threadsPostById({ id: threadsUrl });

    expect(mockedFetch.mock.calls.map(([url]) => url)).toEqual([
      `${API}/desearch/youtube/video/https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DdQw4w9WgXcQ`,
      `${API}/desearch/youtube/transcript/https%3A%2F%2Fyoutu.be%2FdQw4w9WgXcQ`,
      `${API}/desearch/youtube/channel/%40MrBeast`,
      `${API}/desearch/reddit/post/https%3A%2F%2Fwww.reddit.com%2Fr%2Fwebscraping%2Fcomments%2F1q6pxwn%2Fjust_started%2F`,
      `${API}/desearch/reddit/comments/https%3A%2F%2Fwww.reddit.com%2Fr%2Fwebscraping%2Fcomments%2F1q6pxwn%2Fjust_started%2F?cursor=c1`,
      `${API}/desearch/threads/post/https%3A%2F%2Fwww.threads.com%2F%40zuck%2Fpost%2FDK-BydcJHkF`,
    ]);
    const lastSegment = (index: number) =>
      decodeURIComponent(
        new URL(fetchCall(index).url).pathname.split('/').pop()!
      );
    expect(lastSegment(0)).toBe(ytUrl);
    expect(new URL(fetchCall(0).url).search).toBe('');
    expect(lastSegment(2)).toBe('@MrBeast');
    expect(lastSegment(3)).toBe(redditUrl);
    expect(lastSegment(5)).toBe(threadsUrl);
  });

  it('sends a cursor back exactly as received, in the body of searches and the query of GET routes', async () => {
    const cursor = 'eyJ2IjoxLCJyb3V0ZSI6Ii9kZXNlYXJjaC95b3V0dWJlIn0.c2ln-_=';
    for (let i = 0; i < 4; i += 1) {
      mockResponse({ body: [] });
    }

    const client = new Desearch('test-key');
    await client.youtubeSearch({ query: 'ai', cursor });
    await client.redditSearch({ query: 'ai', cursor });
    await client.youtubeChannelVideos({ handle: 'MrBeast', cursor });
    await client.redditSubredditPosts({ name: 'AskReddit', cursor });

    expect(JSON.parse(fetchCall(0).body!)).toEqual({ query: 'ai', cursor });
    expect(JSON.parse(fetchCall(1).body!)).toEqual({ query: 'ai', cursor });
    expect(new URL(fetchCall(2).url).searchParams.get('cursor')).toBe(cursor);
    expect(new URL(fetchCall(3).url).searchParams.get('cursor')).toBe(cursor);
  });

  it('returns nextCursor and cost metadata from the headers when opted in, and the raw array by default', async () => {
    const videos = [{ id: 'a', type: 'video' }];
    const headers = {
      'X-Desearch-Cost-Usd': '0.00207',
      'X-Desearch-Usage-Count': '1',
      'X-Desearch-Service': 'youtube_channel_videos',
      'X-Desearch-Currency': 'USD',
      'x-desearch-next-cursor': 'eyJ2IjoxfQ.c2ln',
    };
    mockResponse({ body: videos, headers });
    mockResponse({ body: videos, headers });

    const client = new Desearch('test-key');
    await expect(
      client.youtubeChannelVideos({ handle: 'MrBeast' })
    ).resolves.toEqual(videos);
    await expect(
      client.youtubeChannelVideos(
        { handle: 'MrBeast' },
        { includeMetadata: true }
      )
    ).resolves.toEqual({
      data: videos,
      metadata: {
        costUsd: 0.00207,
        usageCount: 1,
        service: 'youtube_channel_videos',
        currency: 'USD',
        nextCursor: 'eyJ2IjoxfQ.c2ln',
      },
    });
  });

  it('pages through Reddit comments by following nextCursor until it is absent', async () => {
    mockResponse({
      body: [{ id: 'a', depth: 0, replies: [{ id: 'a1', depth: 1 }] }],
      headers: { 'x-desearch-next-cursor': 'cur-1' },
    });
    mockResponse({ body: [{ id: 'b', depth: 0, replies: [] }] });

    const client = new Desearch('test-key');
    const ids: (string | null | undefined)[] = [];
    let cursor: string | undefined;
    do {
      const { data, metadata } = await client.redditComments(
        { post_id: '1q6pxwn', cursor },
        { includeMetadata: true }
      );
      for (const comment of data) {
        ids.push(comment.id, ...(comment.replies ?? []).map((r) => r.id));
      }
      cursor = metadata.nextCursor;
    } while (cursor);

    expect(ids).toEqual(['a', 'a1', 'b']);
    expect(mockedFetch.mock.calls.map(([url]) => url)).toEqual([
      `${API}/desearch/reddit/comments/1q6pxwn`,
      `${API}/desearch/reddit/comments/1q6pxwn?cursor=cur-1`,
    ]);
  });

  it('returns typed objects for the single-item routes', async () => {
    const video: YouTubeVideo = {
      id: 'dQw4w9WgXcQ',
      type: 'video',
      channel: { id: 'UCuAXFkgsw1L7xaCfnd5JJOw', handle: 'RickAstleyYT' },
      captionLanguages: [{ languageCode: 'en', autoGenerated: false }],
      keywords: [],
      chapters: [],
    };
    const post: ThreadsPostDetail = {
      code: 'DK-BydcJHkF',
      author: { username: 'zuck', verified: true },
      comments: [{ code: 'DK-reply', text: 'nice' }],
      threadItems: [],
    };
    mockResponse({ body: video, headers: { 'X-Desearch-Usage-Count': '1' } });
    mockResponse({ body: post });

    const client = new Desearch('test-key');
    const yt = await client.youtubeVideo(
      { id: 'dQw4w9WgXcQ' },
      { includeMetadata: true }
    );
    const th = await client.threadsPostById({ id: 'DK-BydcJHkF' });
    expect(yt.data.channel?.handle).toBe('RickAstleyYT');
    expect(yt.data.captionLanguages?.[0]?.languageCode).toBe('en');
    expect(yt.metadata).toEqual({ usageCount: 1 });
    expect(th.author?.username).toBe('zuck');
    expect(th.comments?.[0]?.text).toBe('nice');
  });

  it('surfaces an invalid cursor (422) and a video without captions (404) as HTTP errors', async () => {
    mockResponse({
      body: '{"detail":"Invalid request parameters"}',
      ok: false,
      status: 422,
    });
    mockResponse({
      body: '{"detail":"Transcript not found"}',
      ok: false,
      status: 404,
    });
    mockResponse({
      body: '{"detail":[{"loc":["body","query"],"msg":"String should have at least 1 character","type":"string_too_short"}]}',
      ok: false,
      status: 422,
    });

    const client = new Desearch('test-key');
    await expect(
      client.redditSearch({ query: 'ai', cursor: 'tampered' })
    ).rejects.toThrow('HTTP 422: {"detail":"Invalid request parameters"}');
    await expect(
      client.youtubeTranscript({ video_id: 'no-captions' })
    ).rejects.toThrow('HTTP 404: {"detail":"Transcript not found"}');
    await expect(client.threadsSearch({ query: '' })).rejects.toThrow(
      'HTTP 422:'
    );
  });

  it('types the requests to what each route accepts', () => {
    const client = new Desearch('test-key');
    // Type-only checks: these calls are never awaited or sent.
    const threads = () =>
      client.threadsSearch({
        query: 'ai',
        // @ts-expect-error Threads search does not paginate
        cursor: 'c1',
      });
    const threadsPosts = () =>
      client.threadsProfilePosts({
        username: 'zuck',
        // @ts-expect-error Threads profile posts do not paginate
        cursor: 'c1',
      });
    const comments = () =>
      client.youtubeComments({
        video_id: 'dQw4w9WgXcQ',
        // @ts-expect-error the YouTube and Reddit routes take no count
        count: 5,
      });
    const searchType: YouTubeSearchType = 'shorts';
    // @ts-expect-error search types are plural (videos, shorts, channels, playlists)
    const badType: YouTubeSearchType = 'video';
    const timeframe: RedditTimeframe = 'month';
    expect([threads, threadsPosts, comments, searchType, badType, timeframe])
      .toHaveLength(6);
    expect(mockedFetch).not.toHaveBeenCalled();
  });
});

describe('Search API', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  const response = {
    results: [
      {
        url: 'https://www.nobelprize.org/prizes/physics/2024/summary/',
        title: 'The Nobel Prize in Physics 2024',
        published_date: '2024-10-08',
        highlights: ['John J. Hopfield and Geoffrey Hinton'],
      },
    ],
    cost_usd: 0.004,
    usage_count: 1,
    service: 'search',
    currency: 'USD',
  };

  it('posts the request to /search and returns ranked results with their cost', async () => {
    mockResponse({ body: response });

    const client = new Desearch('test-key');
    const payload = {
      query: 'Who won the 2024 Nobel Prize in Physics?',
      mode: 'fast' as const,
      count: 15,
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      highlights: true,
      page_text: false,
    };
    const result = await client.searchApi(payload);
    expect(result).toEqual(response);
    expect(result.results[0].highlights).toEqual([
      'John J. Hopfield and Geoffrey Hinton',
    ]);

    const call = fetchCall(0);
    expect(call.url).toBe('https://api.desearch.ai/search');
    expect(call.method).toBe('POST');
    expect(call.headers).toEqual({
      Authorization: 'test-key',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(call.body!)).toEqual(payload);
  });

  it('returns header metadata when opted in and surfaces 503 as an HTTP error', async () => {
    mockResponse({
      body: response,
      headers: {
        'X-Desearch-Cost-Usd': '0.004',
        'X-Desearch-Service': 'search',
      },
    });
    mockResponse({
      body: '{"detail":"Search unavailable."}',
      ok: false,
      status: 503,
    });

    const client = new Desearch('test-key');
    await expect(
      client.searchApi({ query: 'desearch' }, { includeMetadata: true })
    ).resolves.toEqual({
      data: response,
      metadata: { costUsd: 0.004, service: 'search' },
    });
    await expect(client.searchApi({ query: 'desearch' })).rejects.toThrow(
      'HTTP 503: {"detail":"Search unavailable."}'
    );
  });

  it('types mode to fast or balanced', () => {
    const mode: SearchApiMode = 'balanced';
    // @ts-expect-error modes are fast or balanced
    const bad: SearchApiMode = 'deep';
    expect([mode, bad]).toHaveLength(2);
  });
});

function networkStats(updatedAt: string): NetworkStatsResponse {
  return {
    total_searchable_pages: 1024383856,
    searches_completed_today: 512895,
    urls_crawled_today: 25484231,
    rates_per_second: {
      total_searchable_pages: 184,
      searches_completed_today: 6,
      urls_crawled_today: 296,
    },
    started_at: '2026-09-16T07:04:12Z',
    updated_at: updatedAt,
    telemetry_kind: 'estimated',
    methodology: 'fixed_rate_projection',
  };
}

/** A ReadableStream body made of text or byte chunks; `open` keeps it from closing. */
function sseBody(
  chunks: (string | Uint8Array)[],
  { open = false }: { open?: boolean } = {}
) {
  const encoder = new TextEncoder();
  const state = {
    cancelled: false,
    controller: undefined as
      | ReadableStreamDefaultController<Uint8Array>
      | undefined,
  };
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      state.controller = controller;
      for (const chunk of chunks) {
        controller.enqueue(
          typeof chunk === 'string' ? encoder.encode(chunk) : chunk
        );
      }
      if (!open) {
        controller.close();
      }
    },
    cancel() {
      state.cancelled = true;
    },
  });
  return { stream, state };
}

function mockStreamResponse(
  body: ReadableStream<Uint8Array> | null,
  { ok = true, status = 200, text = '' } = {}
) {
  mockedFetch.mockResolvedValueOnce({
    ok,
    status,
    headers: { get: () => 'text/event-stream' },
    body,
    text: vi.fn().mockResolvedValue(text),
  } as any);
}

function sse(id: number, stats: NetworkStatsResponse) {
  return `id: ${id}\nevent: stats\ndata: ${JSON.stringify(stats)}\n\n`;
}

async function collect(
  iterator: AsyncIterable<NetworkStatsStreamEvent>
): Promise<NetworkStatsStreamEvent[]> {
  const events: NetworkStatsStreamEvent[] = [];
  for await (const event of iterator) {
    events.push(event);
  }
  return events;
}

describe('Network stats', () => {
  const API = 'https://api.desearch.ai';

  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it('gets the stats and the 20-minute history without sending the API key', async () => {
    const stats = networkStats('2026-10-28T10:00:00Z');
    const history = {
      window_seconds: 1200,
      interval_seconds: 1,
      window_started_at: '2026-10-28T09:40:00Z',
      window_ended_at: '2026-10-28T10:00:00Z',
      points: [
        {
          total_searchable_pages: 1024383856,
          searches_completed_today: 512895,
          urls_crawled_today: 25484231,
          observed_at: '2026-10-28T09:40:00Z',
          telemetry_kind: 'estimated',
          methodology: 'fixed_rate_projection',
        },
      ],
    };
    mockResponse({ body: stats });
    mockResponse({ body: history });

    const client = new Desearch('');
    await expect(client.networkStats()).resolves.toEqual(stats);
    await expect(client.networkStatsHistory()).resolves.toEqual(history);

    expect(fetchCall(0).url).toBe(`${API}/network/stats`);
    expect(fetchCall(1).url).toBe(`${API}/network/stats/history`);
    for (const index of [0, 1]) {
      expect(fetchCall(index).method).toBe('GET');
      expect(fetchCall(index).headers).toEqual({});
      expect(fetchCall(index).body).toBeUndefined();
    }
  });

  it('wraps network stats in { data, metadata } when opted in', async () => {
    const stats = networkStats('2026-10-28T10:00:00Z');
    mockResponse({ body: stats });
    mockResponse({ body: '{"detail":"Not Found"}', ok: false, status: 404 });

    const client = new Desearch('test-key');
    await expect(
      client.networkStats({ includeMetadata: true })
    ).resolves.toEqual({ data: stats, metadata: {} });
    await expect(client.networkStatsHistory()).rejects.toThrow(
      'HTTP 404: {"detail":"Not Found"}'
    );
  });

  it('streams stats events parsed from Server-Sent Events, across chunk boundaries', async () => {
    const first = networkStats('2026-10-28T10:00:00Z');
    const second = networkStats('2026-10-28T10:00:01Z');
    const third = networkStats('2026-10-28T10:00:02Z');
    const wire = `: keep-alive\n\n${sse(1761645600, first)}${sse(
      1761645601,
      second
    ).replace(/\n/g, '\r\n')}${sse(1761645602, third)}`;
    // Split the wire at awkward places: inside a field, inside a CRLF, between events.
    const crlf = wire.indexOf('\r\n');
    const { stream } = sseBody([
      wire.slice(0, 7),
      wire.slice(7, crlf + 1),
      wire.slice(crlf + 1, crlf + 40),
      wire.slice(crlf + 40),
    ]);
    mockStreamResponse(stream);

    const client = new Desearch('test-key');
    const events = await collect(client.streamNetworkStats());

    expect(events).toEqual([
      { id: '1761645600', data: first },
      { id: '1761645601', data: second },
      { id: '1761645602', data: third },
    ]);
    const call = fetchCall(0);
    expect(call.url).toBe(`${API}/network/stats/stream`);
    expect(call.method).toBe('GET');
    expect(call.headers).toEqual({ Accept: 'text/event-stream' });
  });

  it('joins multi-line data, decodes UTF-8 split across chunks, skips other events and drops an unfinished one', async () => {
    const stats = networkStats('2026-10-28T10:00:00Z');
    const json = JSON.stringify({ ...stats, methodology: 'café' });
    // Split the JSON after its first value, where a newline is only whitespace.
    const split = json.indexOf(',') + 1;
    const bytes = new TextEncoder().encode(
      `event: ping\ndata: {}\n\nid: 7\nevent: stats\ndata: ${json.slice(
        0,
        split
      )}\ndata:${json.slice(
        split
      )}\n\nretry: 1000\nevent: stats\ndata: {"partial":`
    );
    const accent = bytes.indexOf(0xc3);
    const { stream } = sseBody([
      bytes.slice(0, accent + 1),
      bytes.slice(accent + 1),
    ]);
    mockStreamResponse(stream);

    const client = new Desearch('test-key');
    const events = await collect(client.streamNetworkStats());

    // data lines join with \n, which JSON ignores between tokens.
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe('7');
    expect(events[0].data.methodology).toBe('café');
    expect(events[0].data.urls_crawled_today).toBe(stats.urls_crawled_today);
  });

  it('sends Last-Event-ID to replay missed snapshots', async () => {
    mockStreamResponse(sseBody([]).stream);
    mockStreamResponse(sseBody([]).stream);

    const client = new Desearch('test-key');
    await collect(client.streamNetworkStats({ lastEventId: 1761645600 }));
    await collect(client.streamNetworkStats({ lastEventId: '' }));

    expect(fetchCall(0).headers).toEqual({
      Accept: 'text/event-stream',
      'Last-Event-ID': '1761645600',
    });
    expect(fetchCall(1).headers).toEqual({ Accept: 'text/event-stream' });
  });

  it('closes the connection when the caller breaks out of the loop', async () => {
    const { stream, state } = sseBody(
      [
        sse(1, networkStats('2026-10-28T10:00:00Z')),
        sse(2, networkStats('2026-10-28T10:00:01Z')),
      ],
      { open: true }
    );
    mockStreamResponse(stream);

    const client = new Desearch('test-key');
    const seen: (string | null)[] = [];
    for await (const event of client.streamNetworkStats()) {
      seen.push(event.id);
      break;
    }

    expect(seen).toEqual(['1']);
    expect(state.cancelled).toBe(true);
  });

  it('ends without an error when the signal aborts, before or during the stream', async () => {
    const { stream, state } = sseBody(
      [sse(1, networkStats('2026-10-28T10:00:00Z'))],
      { open: true }
    );
    mockStreamResponse(stream);
    const controller = new AbortController();
    // undici errors the body when its request is aborted.
    controller.signal.addEventListener('abort', () =>
      state.controller?.error(new Error('This operation was aborted'))
    );

    const client = new Desearch('test-key');
    const iterator = client.streamNetworkStats({ signal: controller.signal });
    const first = await iterator.next();
    expect(first.value).toMatchObject({ id: '1' });
    controller.abort();
    await expect(iterator.next()).resolves.toEqual({
      done: true,
      value: undefined,
    });
    const init = mockedFetch.mock.calls[0][1] as { signal?: AbortSignal };
    expect(init.signal).toBe(controller.signal);

    const aborted = new AbortController();
    aborted.abort();
    mockedFetch.mockRejectedValueOnce(new Error('This operation was aborted'));
    await expect(
      collect(client.streamNetworkStats({ signal: aborted.signal }))
    ).resolves.toEqual([]);
  });

  it('throws HTTP and Unexpected errors like the other methods', async () => {
    mockStreamResponse(null, {
      ok: false,
      status: 503,
      text: '{"detail":"Service Unavailable"}',
    });
    mockedFetch.mockRejectedValueOnce(new Error('getaddrinfo ENOTFOUND'));
    mockStreamResponse(sseBody(['event: stats\ndata: {not json\n\n']).stream);

    const client = new Desearch('test-key');
    await expect(collect(client.streamNetworkStats())).rejects.toThrow(
      'HTTP 503: {"detail":"Service Unavailable"}'
    );
    await expect(collect(client.streamNetworkStats())).rejects.toThrow(
      'Unexpected Error: getaddrinfo ENOTFOUND'
    );
    await expect(collect(client.streamNetworkStats())).rejects.toThrow(
      /^Unexpected Error: /
    );
  });
});

const COMPANY_TASK_ID = '5b33f3ee-168b-4780-9c8e-63a626781872';

function companyTask(overrides: Partial<CompanyTask> = {}): CompanyTask {
  return {
    task_id: COMPANY_TASK_ID,
    search_type: 'company_search',
    platform: 'company',
    status: 'queued',
    stage: null,
    query:
      'Series A fintech startups in Berlin building payment infrastructure',
    count: 25,
    result_count: 0,
    request: {
      query:
        'Series A fintech startups in Berlin building payment infrastructure',
      count: 25,
      min_score: 60,
      exclude: ['stripe.com'],
      roles: ['ceo', 'founder', 'cto', 'cfo'],
      infer_emails: true,
      verify_emails: true,
      filters: { countries: ['DE'], require: ['email'] },
    },
    metadata: {},
    interpreted: null,
    progress: {},
    errors: [],
    completion_reason: null,
    coverage_limited: false,
    warnings: [],
    reserved_cost_usd: 2.25,
    final_cost_usd: null,
    created_at: '2026-10-28T10:00:00+00:00',
    links: {
      self: `/desearch/companies/tasks/${COMPANY_TASK_ID}`,
      results: `/desearch/companies/tasks/${COMPANY_TASK_ID}/results`,
      export: `/desearch/companies/tasks/${COMPANY_TASK_ID}/export`,
    },
    ...overrides,
  };
}

function enrichTask(overrides: Partial<CompanyTask> = {}): CompanyTask {
  return companyTask({
    search_type: 'company_enrich',
    platform: 'company_enrich',
    query: 'acme.com, beta.io',
    count: 2,
    request: {
      domains: ['acme.com', 'beta.io'],
      roles: ['ceo', 'cto'],
      infer_emails: true,
      verify_emails: true,
    },
    interpreted: null,
    reserved_cost_usd: 0.1,
    ...overrides,
  });
}

// Modeled on the result example of the API contract (docs/company-search.md).
function acme(): Company {
  const hello: CompanyEmail = {
    value: 'hello@acme.com',
    type: 'general',
    source: 'website',
    source_url: 'https://acme.com/impressum',
    on_domain: true,
    person: null,
    confidence: null,
    pattern: null,
    verification: {
      status: 'valid',
      checks: { syntax: true, mx: 'ok', smtp: 'skipped', web: 'skipped' },
      checked_at: '2026-10-28T10:00:00Z',
    },
  };
  return {
    id: 'company:acme.com',
    platform: 'company',
    handle: 'acme.com',
    domain: 'acme.com',
    url: 'https://acme.com/',
    name: 'Acme',
    description: 'Payment infrastructure for marketplaces.',
    logo_url: 'https://acme.com/logo.png',
    location: {
      country: 'DE',
      city: 'Berlin',
      address: 'Torstraße 1, 10119 Berlin',
    },
    industry: 'Fintech',
    emails: [hello],
    phones: [
      {
        value: '+493012345678',
        type: 'main',
        source: 'website',
        source_url: 'https://acme.com/impressum',
        raw: '+49 30 1234 5678',
      },
    ],
    socials: [
      {
        type: 'linkedin',
        url: 'https://www.linkedin.com/company/acme',
        handle: 'acme',
        source: 'website',
        source_url: 'https://acme.com/',
      },
    ],
    pages: [
      { type: 'home', url: 'https://acme.com/' },
      { type: 'imprint', url: 'https://acme.com/impressum' },
    ],
    people: [
      {
        name: 'Anna Schmidt',
        title: 'Co-founder & CEO',
        roles: ['ceo', 'founder'],
        linkedin_url: 'https://www.linkedin.com/in/annaschmidt',
        x_url: null,
        github_url: null,
        emails: [
          {
            value: 'anna.schmidt@acme.com',
            type: 'personal',
            source: 'inferred',
            source_url: null,
            on_domain: true,
            person: 'Anna Schmidt',
            confidence: 'high',
            pattern: 'first.last',
            verification: {
              status: 'valid',
              checks: {
                syntax: true,
                mx: 'ok',
                smtp: 'accepted',
                web: 'not_found',
              },
              checked_at: '2026-10-28T10:02:00Z',
            },
          },
        ],
        phones: [],
        evidence: {
          quote: 'Anna Schmidt, Geschäftsführerin',
          source_url: 'https://acme.com/impressum',
          source: 'website',
        },
        verified: true,
      },
    ],
    primary_email: hello,
    primary_contact: {
      name: 'Anna Schmidt',
      title: 'Co-founder & CEO',
      email: 'anna.schmidt@acme.com',
      linkedin_url: 'https://www.linkedin.com/in/annaschmidt',
      reason: "CEO, email inferred from the company's pattern and verified",
    },
    contact_coverage: {
      email: true,
      phone: true,
      linkedin: true,
      leader: true,
      leader_email: true,
    },
    enrichment: {
      status: 'complete',
      stages: {
        profile: 'done',
        contacts: 'done',
        people: 'done',
        email_patterns: 'done',
        email_check: 'done',
      },
      errors: [],
    },
    score: {
      value: 86,
      qualified: true,
      relevance: 'high',
      summary: 'Berlin payments infrastructure startup, Series A in 2025.',
      matched_signals: ['payment infrastructure', 'Berlin'],
      reasons: ['Builds payment APIs for marketplaces'],
      concerns: ['Funding stage not on its own site'],
      criteria_checks: [
        {
          criterion: 'Profile fit: payment infrastructure company',
          verdict: 'met',
          quote: 'Payment infrastructure for marketplaces.',
          source_url: 'https://acme.com/',
          reason: 'The homepage says so.',
          is_disqualifier: false,
        },
        {
          criterion: 'Stage: Series A',
          verdict: 'unknown',
          quote: null,
          source_url: null,
          reason: 'No funding round on its pages.',
          is_disqualifier: false,
        },
      ],
      fully_verified: false,
    },
    found_by: [
      {
        query: 'fintech payment infrastructure startup Berlin',
        url: 'https://acme.com/',
        title: 'Acme — Payments',
        kind: 'direct',
      },
    ],
  };
}

function resultsPage(results: Company[], overrides: object = {}) {
  return {
    task_id: COMPANY_TASK_ID,
    status: 'completed',
    results,
    next_cursor: String(results.length),
    has_more: false,
    ...overrides,
  };
}

describe('Company Search', () => {
  const API = 'https://api.desearch.ai';

  beforeEach(() => {
    mockedFetch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts a Company Search with the Idempotency-Key header and returns the task with its reserved cost', async () => {
    const created = {
      ...companyTask({ metadata: { campaign: 'q4' } }),
      cost_usd: 2.25,
      usage_count: 25,
      service: 'company',
      currency: 'USD',
    };
    mockResponse({ body: created, status: 202 });

    const client = new Desearch('test-key');
    const payload = {
      query:
        'Series A fintech startups in Berlin building payment infrastructure',
      count: 25,
      min_score: 60,
      exclude: ['stripe.com'],
      roles: ['ceo', 'founder', 'cto', 'cfo'] as CompanyRole[],
      infer_emails: true,
      verify_emails: true,
      filters: {
        countries: ['DE'],
        require: ['email' as const],
      },
      metadata: { campaign: 'q4' },
    };
    const task = await client.companySearch(payload, {
      idempotencyKey: 'run-42',
    });
    expect(task).toEqual(created);
    expect(task.search_type).toBe('company_search');
    expect(task.cost_usd).toBe(2.25);

    const call = fetchCall(0);
    expect(call.url).toBe(`${API}/desearch/companies/search`);
    expect(call.method).toBe('POST');
    expect(call.headers).toEqual({
      Authorization: 'test-key',
      'Content-Type': 'application/json',
      'Idempotency-Key': 'run-42',
    });
    expect(JSON.parse(call.body!)).toEqual(payload);
  });

  it('starts a Company Enrich without an Idempotency-Key by default and sends only the fields given', async () => {
    const created = enrichTask();
    mockResponse({ body: created, status: 202 });

    const client = new Desearch('test-key');
    const task = await client.companyEnrich({
      domains: ['acme.com', 'https://www.beta.io/about'],
      roles: ['ceo', 'cto'],
    });
    expect(task).toEqual(created);
    expect(task.platform).toBe('company_enrich');
    expect(task.query).toBe('acme.com, beta.io');

    const call = fetchCall(0);
    expect(call.url).toBe(`${API}/desearch/companies/enrich`);
    expect(call.method).toBe('POST');
    expect(call.headers).toEqual({
      Authorization: 'test-key',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(call.body!)).toEqual({
      domains: ['acme.com', 'https://www.beta.io/about'],
      roles: ['ceo', 'cto'],
    });
  });

  it('returns create cost metadata from headers when opted in, alongside the Idempotency-Key', async () => {
    const created = enrichTask();
    mockResponse({
      body: created,
      status: 202,
      headers: {
        'X-Desearch-Cost-Usd': '0.1',
        'X-Desearch-Usage-Count': '2',
        'X-Desearch-Service': 'company_enrich',
        'X-Desearch-Currency': 'USD',
      },
    });

    const client = new Desearch('test-key');
    await expect(
      client.companyEnrich(
        { domains: ['acme.com', 'beta.io'], metadata: { campaign: 'q4' } },
        { includeMetadata: true, idempotencyKey: 'run-43' }
      )
    ).resolves.toEqual({
      data: created,
      metadata: {
        costUsd: 0.1,
        usageCount: 2,
        service: 'company_enrich',
        currency: 'USD',
      },
    });
    expect(fetchCall(0).headers['Idempotency-Key']).toBe('run-43');
    expect(JSON.parse(fetchCall(0).body!)).toEqual({
      domains: ['acme.com', 'beta.io'],
      metadata: { campaign: 'q4' },
    });
  });

  it('surfaces a failed create as the standard HTTP error', async () => {
    mockResponse({
      body: '{"detail":"Company Search needs account credits."}',
      ok: false,
      status: 402,
    });

    const client = new Desearch('test-key');
    await expect(
      client.companySearch({ query: 'fintech startups in Berlin' })
    ).rejects.toThrow(
      'HTTP 402: {"detail":"Company Search needs account credits."}'
    );
  });

  it('lists tasks with type, a comma-separated status list, limit, cursor and metadata.<key>=<value> filters', async () => {
    const list = {
      tasks: [enrichTask({ metadata: { campaign: 'q4 outbound & more' } })],
      next_cursor: 'abc',
    };
    mockResponse({ body: list });
    mockResponse({ body: { tasks: [], next_cursor: null } });

    const client = new Desearch('test-key');
    await expect(
      client.listCompanyTasks({
        type: 'enrich',
        status: ['running', 'paused'],
        limit: 10,
        cursor: 'xyz',
        metadata: { campaign: 'q4 outbound & more', 'team.id': 't-1' },
      })
    ).resolves.toEqual(list);
    await client.listCompanyTasks();

    expect(fetchCall(0).url).toBe(
      `${API}/desearch/companies/tasks?type=enrich&status=running%2Cpaused&limit=10&cursor=xyz&metadata.campaign=q4+outbound+%26+more&metadata.team.id=t-1`
    );
    expect(fetchCall(0).method).toBe('GET');
    const params = new URL(fetchCall(0).url).searchParams;
    expect(params.get('metadata.campaign')).toBe('q4 outbound & more');
    expect(params.has('metadata')).toBe(false);
    expect(fetchCall(1).url).toBe(`${API}/desearch/companies/tasks`);
  });

  it('gets one task by id with its stage, completion reason and warnings', async () => {
    const enriching = companyTask({
      status: 'running',
      stage: 'enriching',
      result_count: 25,
      progress: {
        candidates_found: 140,
        candidates_processed: 60,
        qualified: 25,
        filtered: { unreachable: 4, not_a_company: 9, no_email: 5 },
        enrichment: { published: 25, complete: 18, pending: 7, failed: 0 },
      },
      warnings: [
        {
          code: 'linkedin_verification_unavailable',
          message:
            'Leaders found through LinkedIn search could not be checked.',
        },
      ],
    });
    const done = enrichTask({
      status: 'completed',
      result_count: 2,
      completion_reason: 'all_domains_processed',
      final_cost_usd: 0.1,
    });
    mockResponse({ body: enriching });
    mockResponse({ body: done });

    const client = new Desearch('test-key');
    const task = await client.getCompanyTask({ task_id: COMPANY_TASK_ID });
    expect(task).toEqual(enriching);
    expect(task.stage).toBe('enriching');
    expect(task.warnings?.[0].code).toBe('linkedin_verification_unavailable');
    expect(task.completion_reason).toBeNull();

    const call = fetchCall(0);
    expect(call.url).toBe(`${API}/desearch/companies/tasks/${COMPANY_TASK_ID}`);
    expect(call.method).toBe('GET');
    expect(call.body).toBeUndefined();
    expect(call.headers).toEqual({ Authorization: 'test-key' });

    const ended = await client.getCompanyTask(enrichTask());
    expect(ended.completion_reason).toBe('all_domains_processed');
    expect(ended.coverage_limited).toBe(false);
  });

  it('reads a results page with cursor and limit and parses the full company', async () => {
    const page = resultsPage([acme()], { next_cursor: '7', has_more: true });
    mockResponse({ body: page });

    const client = new Desearch('test-key');
    const read = await client.getCompanyResults({
      task_id: COMPANY_TASK_ID,
      cursor: '6',
      limit: 50,
    });
    expect(read).toEqual(page);
    expect(fetchCall(0).url).toBe(
      `${API}/desearch/companies/tasks/${COMPANY_TASK_ID}/results?cursor=6&limit=50`
    );

    const [company] = read.results;
    expect(company.domain).toBe('acme.com');
    expect(company.location?.city).toBe('Berlin');
    expect(company.primary_email?.value).toBe('hello@acme.com');
    expect(company.primary_email?.verification?.checks?.mx).toBe('ok');
    expect(company.phones[0].value).toBe('+493012345678');
    expect(company.socials.map((social) => social.type)).toEqual(['linkedin']);
    expect(company.pages.map((page) => page.type)).toEqual(['home', 'imprint']);

    const [ceo] = company.people;
    expect(ceo.roles).toEqual(['ceo', 'founder']);
    expect(ceo.verified).toBe(true);
    expect(ceo.evidence?.quote).toBe('Anna Schmidt, Geschäftsführerin');
    const [inferred] = ceo.emails;
    expect(inferred.source).toBe('inferred');
    expect(inferred.confidence).toBe('high');
    expect(inferred.pattern).toBe('first.last');
    expect(inferred.verification?.status).toBe('valid');
    expect(inferred.verification?.checks?.smtp).toBe('accepted');

    expect(company.primary_contact?.email).toBe('anna.schmidt@acme.com');
    expect(company.contact_coverage?.leader_email).toBe(true);
    expect(company.enrichment?.status).toBe('complete');
    expect(company.enrichment?.stages?.email_check).toBe('done');
    expect(company.score?.value).toBe(86);
    expect(company.score?.relevance).toBe('high');
    expect(company.score?.fully_verified).toBe(false);
    expect(company.found_by[0].kind).toBe('direct');
    expect(
      unverifiedCriteria(company.score).map((check) => check.criterion)
    ).toEqual(['Stage: Series A']);
  });

  it('reads a Company Enrich result without a score', async () => {
    const enriched: Company = {
      ...acme(),
      score: null,
      found_by: [
        { query: 'acme.com', url: 'https://acme.com/', kind: 'domain' },
      ],
    };
    mockResponse({ body: resultsPage([enriched]) });

    const client = new Desearch('test-key');
    const [company] = (
      await client.getCompanyResults({ task_id: COMPANY_TASK_ID })
    ).results;
    expect(company.score).toBeNull();
    expect(unverifiedCriteria(company.score)).toEqual([]);
    expect(company.found_by[0].kind).toBe('domain');
    expect(company.people[0].name).toBe('Anna Schmidt');
    expect(fetchCall(0).url).toBe(
      `${API}/desearch/companies/tasks/${COMPANY_TASK_ID}/results`
    );
  });

  it('reads a partial company that later stages have not filled in yet', async () => {
    const partial: Company = {
      id: 'company:beta.io',
      platform: 'company',
      handle: 'beta.io',
      domain: 'beta.io',
      url: 'https://beta.io/',
      name: 'Beta',
      description: null,
      logo_url: null,
      location: null,
      industry: null,
      emails: [
        {
          value: 'info@beta.io',
          type: 'general',
          source: 'website',
          source_url: 'https://beta.io/',
          on_domain: true,
          verification: null,
        },
      ],
      phones: [],
      socials: [],
      pages: [{ type: 'home', url: 'https://beta.io/' }],
      people: [],
      primary_email: null,
      primary_contact: null,
      contact_coverage: {
        email: false,
        phone: false,
        linkedin: false,
        leader: false,
        leader_email: false,
      },
      enrichment: {
        status: 'partial',
        stages: {
          profile: 'done',
          contacts: 'pending',
          people: 'pending',
          email_patterns: 'pending',
          email_check: 'pending',
        },
        errors: [],
      },
      score: null,
      found_by: [],
      // A field a newer worker adds is kept as is.
      tech_stack: ['stripe'],
    };
    const failed: Company = {
      ...partial,
      id: 'company:gamma.dev',
      handle: 'gamma.dev',
      domain: 'gamma.dev',
      enrichment: {
        status: 'complete',
        stages: {
          profile: 'done',
          contacts: 'failed',
          people: 'done',
          email_patterns: 'skipped',
          email_check: 'skipped',
        },
        errors: [{ stage: 'contacts', message: 'timeout' }],
      },
    };
    mockResponse({
      body: resultsPage([partial, failed], { status: 'running' }),
    });

    const client = new Desearch('test-key');
    const { status, results } = await client.getCompanyResults({
      task_id: COMPANY_TASK_ID,
    });
    expect(status).toBe('running');
    expect(results[0].enrichment?.status).toBe('partial');
    expect(results[0].enrichment?.stages?.people).toBe('pending');
    expect(results[0].emails[0].verification).toBeNull();
    expect(results[0].primary_email).toBeNull();
    expect(results[0].tech_stack).toEqual(['stripe']);
    expect(results[1].enrichment?.errors).toEqual([
      { stage: 'contacts', message: 'timeout' },
    ]);
  });

  it.each([
    ['pauseCompanyTask', 'pause', 'paused'],
    ['resumeCompanyTask', 'resume', 'queued'],
    ['cancelCompanyTask', 'cancel', 'cancelled'],
  ] as const)(
    '%s posts to the %s route without a body',
    async (method, action, status) => {
      const task = companyTask({ status });
      mockResponse({ body: task });

      const client = new Desearch('test-key');
      await expect(
        client[method]({ task_id: COMPANY_TASK_ID })
      ).resolves.toEqual(task);

      const call = fetchCall(0);
      expect(call.url).toBe(
        `${API}/desearch/companies/tasks/${COMPANY_TASK_ID}/${action}`
      );
      expect(call.method).toBe('POST');
      expect(call.body).toBeUndefined();
      expect(call.headers).toEqual({ Authorization: 'test-key' });
    }
  );

  it('throws CompanyTaskConflictError with the current task when a control action is refused (409)', async () => {
    const current = enrichTask({ status: 'completed' });
    const body = JSON.stringify({
      detail: 'This task has already ended.',
      task: current,
    });
    mockResponse({ body, ok: false, status: 409 });

    const client = new Desearch('test-key');
    const error = await client
      .cancelCompanyTask({ task_id: COMPANY_TASK_ID })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(CompanyTaskConflictError);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(PeopleTaskConflictError);
    const conflict = error as CompanyTaskConflictError;
    expect(conflict.name).toBe('CompanyTaskConflictError');
    expect(conflict.status).toBe(409);
    expect(conflict.detail).toBe('This task has already ended.');
    expect(conflict.task).toEqual(current);
    expect(conflict.task.platform).toBe('company_enrich');
    expect(conflict.message).toBe(`HTTP 409: ${body}`);
  });

  it('keeps the plain HTTP error for other control failures', async () => {
    mockResponse({
      body: '{"detail":"Task not found"}',
      ok: false,
      status: 404,
    });
    mockResponse({ body: 'not json', ok: false, status: 409 });

    const client = new Desearch('test-key');
    const notFound = await client
      .pauseCompanyTask({ task_id: COMPANY_TASK_ID })
      .catch((caught: unknown) => caught);
    expect(notFound).not.toBeInstanceOf(CompanyTaskConflictError);
    expect((notFound as Error).message).toBe(
      'HTTP 404: {"detail":"Task not found"}'
    );

    const unparsable = await client
      .resumeCompanyTask({ task_id: COMPANY_TASK_ID })
      .catch((caught: unknown) => caught);
    expect(unparsable).not.toBeInstanceOf(CompanyTaskConflictError);
    expect((unparsable as Error).message).toBe('HTTP 409: not json');
  });

  it('exports results as CSV by default and as JSON Lines text', async () => {
    const csv = 'domain,name,url,score\nacme.com,Acme,https://acme.com/,86\n';
    const jsonl = `${JSON.stringify(acme())}\n`;
    mockResponse({ body: csv, contentType: 'text/csv; charset=utf-8' });
    mockResponse({ body: jsonl, contentType: 'application/x-ndjson' });

    const client = new Desearch('test-key');
    await expect(
      client.exportCompanyResults({ task_id: COMPANY_TASK_ID })
    ).resolves.toBe(csv);
    await expect(
      client.exportCompanyResults({
        ...companyTask({ status: 'completed' }),
        format: 'jsonl',
      })
    ).resolves.toBe(jsonl);

    expect(fetchCall(0).url).toBe(
      `${API}/desearch/companies/tasks/${COMPANY_TASK_ID}/export`
    );
    // A whole task object works: only format goes in the query.
    expect(fetchCall(1).url).toBe(
      `${API}/desearch/companies/tasks/${COMPANY_TASK_ID}/export?format=jsonl`
    );
    expect(fetchCall(1).method).toBe('GET');
  });

  it('surfaces expired results as the standard HTTP error', async () => {
    mockResponse({
      body: '{"detail":"Results expired 30 days after the task ended"}',
      ok: false,
      status: 410,
    });

    const client = new Desearch('test-key');
    await expect(
      client.getCompanyResults({ task_id: COMPANY_TASK_ID })
    ).rejects.toThrow(
      'HTTP 410: {"detail":"Results expired 30 days after the task ended"}'
    );
  });

  it('waits for a task to end, reporting every poll through the enriching stage', async () => {
    mockResponse({ body: companyTask({ status: 'queued' }) });
    mockResponse({
      body: companyTask({
        status: 'running',
        stage: 'enriching',
        result_count: 25,
      }),
    });
    const done = companyTask({
      status: 'completed',
      stage: null,
      result_count: 25,
      completion_reason: 'count_reached',
      final_cost_usd: 2.25,
    });
    mockResponse({ body: done });

    const client = new Desearch('test-key');
    const seen: string[] = [];
    await expect(
      client.waitForCompanyTask(companyTask(), {
        intervalMs: 0,
        onProgress: (task) => seen.push(`${task.status}:${task.stage}`),
      })
    ).resolves.toEqual(done);

    expect(seen).toEqual([
      'queued:null',
      'running:enriching',
      'completed:null',
    ]);
    expect(mockedFetch).toHaveBeenCalledTimes(3);
    expect(fetchCall(2).url).toBe(
      `${API}/desearch/companies/tasks/${COMPANY_TASK_ID}`
    );
  });

  it.each(['partial', 'failed', 'cancelled', 'expired'] as const)(
    'stops waiting on %s',
    async (status) => {
      mockResponse({ body: enrichTask({ status }) });

      const client = new Desearch('test-key');
      await expect(
        client.waitForCompanyTask({ task_id: COMPANY_TASK_ID })
      ).resolves.toMatchObject({ status });
      expect(mockedFetch).toHaveBeenCalledTimes(1);
    }
  );

  it('polls on the interval and times out when the task does not end', async () => {
    vi.useFakeTimers();
    for (let i = 0; i < 4; i += 1) {
      mockResponse({ body: companyTask({ status: 'paused' }) });
    }

    const client = new Desearch('test-key');
    const waiting = client.waitForCompanyTask(
      { task_id: COMPANY_TASK_ID },
      { intervalMs: 1000, timeoutMs: 2500 }
    );
    const assertion = expect(waiting).rejects.toThrow(
      `Timed out after 2500ms waiting for Company Search task ${COMPANY_TASK_ID} (status: paused)`
    );
    await vi.advanceTimersByTimeAsync(3000);
    await assertion;

    // Polls at 0, 1000, 2000 and a last one at the 2500 ms deadline.
    expect(mockedFetch).toHaveBeenCalledTimes(4);
  });

  it('iterates over every company by following next_cursor', async () => {
    const company = (domain: string): Company => ({
      ...acme(),
      id: `company:${domain}`,
      handle: domain,
      domain,
    });
    const pages = [
      resultsPage([company('a.com'), company('b.com')], {
        next_cursor: '2',
        has_more: true,
      }),
      resultsPage([company('c.com'), company('d.com')], {
        next_cursor: '4',
        has_more: true,
      }),
      resultsPage([company('e.com')], { next_cursor: '5', has_more: false }),
    ];
    for (const page of pages) {
      mockResponse({ body: page });
    }

    const client = new Desearch('test-key');
    const domains: string[] = [];
    // A whole task object works: only cursor and limit go in the query.
    for await (const result of client.iterCompanyResults({
      ...companyTask({ status: 'completed' }),
      limit: 2,
    })) {
      domains.push(result.domain);
    }

    expect(domains).toEqual(['a.com', 'b.com', 'c.com', 'd.com', 'e.com']);
    expect(mockedFetch.mock.calls.map(([url]) => url)).toEqual([
      `${API}/desearch/companies/tasks/${COMPANY_TASK_ID}/results?limit=2`,
      `${API}/desearch/companies/tasks/${COMPANY_TASK_ID}/results?cursor=2&limit=2`,
      `${API}/desearch/companies/tasks/${COMPANY_TASK_ID}/results?cursor=4&limit=2`,
    ]);
  });

  it('starts iterating from a saved cursor and stops on a page without new companies', async () => {
    mockResponse({
      body: resultsPage([], {
        status: 'running',
        next_cursor: '5',
        has_more: true,
      }),
    });

    const client = new Desearch('test-key');
    const companies: Company[] = [];
    for await (const company of client.iterCompanyResults({
      task_id: COMPANY_TASK_ID,
      cursor: '5',
    })) {
      companies.push(company);
    }

    expect(companies).toEqual([]);
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(fetchCall(0).url).toBe(
      `${API}/desearch/companies/tasks/${COMPANY_TASK_ID}/results?cursor=5`
    );
  });

  it('types the requests and results to the values the API documents', () => {
    const client = new Desearch('test-key');
    // Type-only checks: compiled by `tsc --noEmit`; these calls are never awaited or sent.
    const badRole = () =>
      client.companyEnrich({
        domains: ['acme.com'],
        // @ts-expect-error vp is not a leader role
        roles: ['vp'],
      });
    const badRequirement = () =>
      client.companySearch({
        query: 'fintech startups',
        // @ts-expect-error fax is not a requirement
        filters: { require: ['fax'] },
      });
    // @ts-expect-error type is search or enrich
    const badType = () => client.listCompanyTasks({ type: 'people' });
    const reason: CompanyCompletionReason = 'all_domains_processed';
    // @ts-expect-error domains_done is a worker stop_reason, not a completion reason
    const internal: CompanyCompletionReason = 'domains_done';
    const stage: CompanyTaskStage = 'enriching';
    const email: CompanyEmail = {
      value: 'anna@acme.com',
      // @ts-expect-error verification status is valid, invalid, risky or unknown
      verification: { status: 'deliverable' },
    };
    expect([
      badRole,
      badRequirement,
      badType,
      reason,
      internal,
      stage,
      email,
    ]).toHaveLength(7);
    expect(mockedFetch).not.toHaveBeenCalled();
  });
});
