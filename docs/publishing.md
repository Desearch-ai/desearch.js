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
   - Installs dependencies (`npm ci`), upgrades the npm CLI to a version that
     supports Trusted Publishing, and builds the package (`npm run build`).
   - Publishes with `npm publish --access public --provenance`. Authentication
     happens via OIDC against npm's Trusted Publisher configuration; no
     long-lived token is involved.
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

## Authentication

The workflow authenticates to npm using
[Trusted Publishing](https://docs.npmjs.com/trusted-publishers), an OIDC-based
flow that binds publish rights to a specific GitHub repository and workflow
file. No long-lived `NPM_TOKEN` is stored anywhere; each publish negotiates a
short-lived credential at job runtime.

The repository requires no secrets for publishing. The built-in `GITHUB_TOKEN`
is used to push the release tag, and no additional configuration is required
for tagging.

### Trusted Publisher configuration

The trust relationship is configured once on npm and does not need to be
re-applied per release. The current configuration for the `desearch-js`
package is:

| Field | Value |
| --- | --- |
| Repository | `Desearch-ai/desearch.js` |
| Workflow filename | `publish.yml` |
| Environment | `prod` |

To reconfigure (for example, after renaming the workflow file or moving the
repository):

1. Sign in to <https://www.npmjs.com> as a user with **owner** access to the
   `desearch-js` package.
2. Open the package settings → **Publishing access** → **Trusted Publisher**.
3. Select **GitHub Actions** and enter the values from the table above.
4. Under **Publishing access**, leave the default
   _"Require two-factor authentication and disallow tokens (recommended)"_
   selected. This permits OIDC-based publishes (used by CI) and 2FA-confirmed
   manual publishes, and blocks token-based publishes entirely.
5. Optional but recommended: enable **Required reviewers** on the GitHub
   `prod` environment so that the publish job pauses for human approval before
   running.

If the workflow filename, repository name, or environment name in
[`publish.yml`](../.github/workflows/publish.yml) changes, the Trusted
Publisher configuration on npm must be updated to match or publishes will
fail.

## Manual publishing

The automated workflow is the canonical release path. Manual publishing is
supported for emergency releases or when GitHub Actions is unavailable. It
requires the publisher to be logged in to npm locally
(`npm login`) and to have publish access to the `desearch-js` package; npm
will prompt for a 2FA code at publish time.

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

**`E403 Forbidden` or `Trusted Publisher` errors from npm.** The OIDC claim
presented by the workflow does not match the Trusted Publisher configuration
on npm. Confirm that the values in
[`publish.yml`](../.github/workflows/publish.yml) — repository, workflow
filename, and `environment:` — exactly match what is registered under the
package's Trusted Publisher settings on npmjs.com.

**`Unsupported URL Type "workspace:"` or unrecognised `--provenance` flag.**
The runner's bundled npm CLI is too old to handle Trusted Publishing. The
workflow includes an `npm install -g npm@latest` step before publishing; if
this is removed or fails, publishes will break. Re-run the workflow after
restoring the upgrade step.

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
