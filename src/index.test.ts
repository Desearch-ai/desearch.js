import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetch } from 'undici';
import Desearch, {
  Desearch as DesearchNamed,
  PeopleTaskConflictError,
  unverifiedCriteria,
} from './index';
import type {
  PeopleCompletionReason,
  PeopleCriterionCheck,
  PeopleCriterionVerdict,
  PeopleTask,
  PeopleTaskWarning,
  Person,
  PersonAttributes,
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
