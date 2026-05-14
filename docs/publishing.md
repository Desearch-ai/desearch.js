# Publishing `desearch-js`

This document describes how new versions of `desearch-js` are released to the
[npm registry](https://www.npmjs.com/package/desearch-js). Releases are
automated by the [`Publish to npm`](../.github/workflows/publish.yml) GitHub
Actions workflow; the standard path requires no local credentials.

## Release flow

1. **Open a pull request** that targets `main` and bumps the `version` field in
   [`package.json`](../package.json) following [Semantic Versioning](https://semver.org):
   - `patch` (`1.3.0` → `1.3.1`) — bug fixes, internal cleanups, doc updates
     shipped together with code.
   - `minor` (`1.3.0` → `1.4.0`) — new endpoints, new optional parameters,
     additive type changes.
   - `major` (`1.3.0` → `2.0.0`) — breaking changes to public API surface,
     removed exports, required parameter changes.

   Keep `package.json` and `package-lock.json` in sync (`npm install` after the
   version edit regenerates the lockfile).

2. **Describe the change** in the PR body. Call out user-visible changes,
   migration steps for breaking changes, and any deprecations.

3. **Merge to `main`** once approved. The workflow runs automatically on push
   to `main` and performs the following steps:
   - Reads the version from `package.json`.
   - Checks whether that version already exists on npm. If it does, the job
     exits successfully without publishing — this allows non-release commits
     (docs, refactors) to land on `main` without churn.
   - Installs dependencies (`npm ci`), builds the package (`npm run build`),
     and publishes with `npm publish --access public --provenance`.
   - Tags the release commit as `vX.Y.Z` and pushes the tag.

4. **Verify the release**:
   - <https://www.npmjs.com/package/desearch-js> shows the new version.
   - `npm view desearch-js version` returns the expected version.
   - The `v<version>` tag is visible under
     <https://github.com/Desearch-ai/desearch.js/tags>.

## Versioning policy

`desearch-js` follows [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).
The public API surface is the set of values exported from `src/index.ts`. Any
change that requires consumers to modify their code constitutes a breaking
change and must be released as a `major` bump.

Pre-release versions use the `beta` dist-tag (e.g. `1.4.0-beta.0`). Install
with `npm install desearch-js@beta`. See the `version:beta` and `publish:beta`
scripts in `package.json` for the local helper commands.

## Required secrets

The publish workflow runs inside the `prod` GitHub Actions environment and
requires the following repository configuration:

| Secret | Where | Purpose |
| --- | --- | --- |
| `NPM_TOKEN` | `prod` environment | Authenticates `npm publish` against the public npm registry. |

The built-in `GITHUB_TOKEN` is used to push the release tag; no additional
configuration is required for tagging.

### Provisioning `NPM_TOKEN`

1. Sign in to <https://www.npmjs.com> as a user with publish access to the
   `desearch-js` package.
2. Open **Access Tokens** → **Generate New Token**.
3. Choose **Granular Access Token** (preferred) with the following scope:
   - Packages and scopes: `desearch-js` — `Read and write`.
   - Expiration: per organisation policy (recommended: 90–365 days).
   - If granular tokens are not available for the account, fall back to a
     **Classic Token** of type **Automation** — this type bypasses 2FA prompts
     during CI.
4. In the GitHub repository, open **Settings** → **Environments** → **prod**
   (create the environment if it does not exist) and add `NPM_TOKEN` as a
   secret with the value copied from npm.
5. Optional but recommended: enable **Required reviewers** on the `prod`
   environment so that the publish job pauses for human approval before
   running.

Rotate the token before its expiration and revoke it immediately if the
repository or its workflows are compromised.

## Manual publishing

The automated workflow is the canonical release path. Manual publishing is
supported for emergency releases or when GitHub Actions is unavailable; it
requires npm credentials in the local environment and direct write access to
the registry.

```sh
# From a clean checkout of the commit you intend to publish:
npm ci
npm run build
npm publish --access public
```

If you publish manually, also create and push the matching tag:

```sh
git tag "v$(node -p "require('./package.json').version")"
git push origin --tags
```

## Beta releases

Beta releases are intended for internal validation and early adopters. They
must not be promoted as the default install. The standard flow:

```sh
npm run version:beta    # bumps to e.g. 1.4.0-beta.0 and creates a git tag
npm run publish:beta    # builds and publishes under the `beta` dist-tag
```

When a beta cycle is complete, run a normal release (bump to the corresponding
stable version) which will be published under the `latest` dist-tag.

## Troubleshooting

**`E403 Forbidden` from npm.** The token in `NPM_TOKEN` does not have publish
access to the `desearch-js` package, or the token has expired. Regenerate the
token and update the secret in the `prod` environment.

**Workflow ran but no new version on npm.** The version in `package.json` is
already published. Bump the version in a new PR and merge again.

**Tag push step fails with permission error.** The workflow needs
`contents: write` permission. This is set at the top of `publish.yml`; if the
repository has stricter organisation-level defaults, grant the
`github-actions[bot]` user write access in **Settings** → **Actions** →
**General** → **Workflow permissions**.

**Provenance attestation fails.** `--provenance` requires `id-token: write`
permission (already set in the workflow) and a public repository. If the
repository is later made private, remove the `--provenance` flag from the
publish step.
