# ADR 0001: Thin Node SDK transport

- Status: accepted
- Date: 2026-04-10

## Context

The current repository exposes a small public SDK surface from `src/index.ts`, with most of the package value coming from typed request and response contracts in `src/types.ts`.

The codebase currently makes a few strong choices:
- one `Desearch` client class
- one shared `handleRequest<T>()` helper
- a fixed production base URL
- direct use of `undici` for HTTP transport
- content-type-based parsing between JSON and text
- `aiSearch()` forcing `streaming: false`

Those choices shape both package ergonomics and current limitations.

## Decision

Keep the SDK as a thin, Node-oriented transport wrapper over the hosted Desearch public API.

Concretely, that means:
- one public client class instead of multiple service-specific clients
- one shared request helper instead of per-endpoint transport logic
- `https://api.desearch.ai` as the built-in target
- `undici` as the runtime HTTP transport
- compile-time typing in `src/types.ts` rather than runtime schema validation
- fully buffered request-response handling instead of streaming support in `aiSearch()`

## Alternatives considered

### 1. Configurable transport and base URL

This would allow staging, local, browser, and custom retry behavior through constructor options.

Why not chosen now:
- it would expand the public API surface immediately
- it would require stability decisions around timeouts, retries, aborts, and environment configuration
- the current repo is intentionally minimal

### 2. Browser-first SDK design

This would avoid a direct `undici` dependency and optimize for web app consumption first.

Why not chosen now:
- package metadata and current implementation are Node-focused
- the repo already works as a server-side SDK without extra transport abstraction

### 3. Rich runtime validation and typed error classes

This would improve ergonomics and failure handling.

Why not chosen now:
- it would increase implementation weight substantially
- the current package prefers thin mapping to upstream behavior

## Consequences

Positive:
- small implementation surface
- easy source auditability
- clear mapping from SDK methods to HTTP endpoints
- low packaging complexity for Node consumers

Negative:
- no first-class non-production targets
- no streaming response support
- no runtime validation or rich error classes
- browser consumers are not the primary target
