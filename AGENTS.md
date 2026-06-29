# Project Instructions

## Stack

- Runtime: TypeScript packages targeting Node.js, browser-capable code, and Fetch-compatible runtimes where package boundaries allow it.
- Package manager: pnpm workspace.
- Build tool: tsdown for publishable packages.
- Test runner: Vitest for packages with behavior tests.
- Release workflow: Changesets with a generated root changelog and documentation changelog page.

## Repository Layout

- `apps/document`: Documentation content workspace, including the published changelog page.
- `packages/utils`: Shared utility package with runtime-neutral root helpers and explicit `web` / `node` subpaths.
- `packages/canon`: Shared contract primitives for HTTP status, response, error, and pagination shapes.
- `packages/oh-my-fetch`: Fetch client built on `ky`, with explicit client, error, validation, JSON, dedupe, status, and plugin subpaths.
- `scripts/changesets`: Root tooling for changelog generation.

## Codex Surface Rules

- Put durable project rules in `AGENTS.md` files. Put one-off constraints in the prompt.
- Add closer `AGENTS.md` files when a package or subpath needs stricter local rules. Closer files override or refine this root file.
- Keep package-level guidance in the package that owns the behavior.

## Monorepo Coding Rules

- Prefer existing workspace packages, helpers, types, and patterns before introducing new logic.
- Keep dependency direction clear: low-level shared packages must not import app workspaces or higher-level package behavior.
- Follow the referenced folder's architecture, naming, file layout, export shape, tests, and documentation style when the user asks to reference or borrow from a folder.
- Use structured parsers and typed APIs instead of ad hoc string manipulation when practical.
- Avoid duplicating behavior that already exists in `packages/*`; extract shared logic only when the ownership boundary is clear.

## Workspace Semantic Ownership

- Treat workspace package names as ownership boundaries.
- Use `@unimolecule/utils` for reusable runtime-neutral helpers, JSON helpers, type guards, trees, timers, random values, dates, strings, and explicit browser or Node helpers.
- Use `@unimolecule/canon` for shared HTTP contract primitives such as status constants, response envelopes, error envelopes, and pagination response shapes.
- Use `@unimolecule/oh-my-fetch` for outbound HTTP client behavior, request/response parsing, validation adapters, normalized request errors, JSON security, dedupe, and optional plugins.
- Keep schema factories, OpenAPI metadata, route handlers, business query parsing, and app-specific pagination policies in business packages or applications, not in `canon`.
- When adding a package-owned concept, update package entrypoints, README examples, and nearby package guidance when needed.

## Type And Utility Organization

- Put reusable public types near their subsystem, following existing `types.ts` or focused module patterns.
- Put stable constants in `constants.ts` or focused constant modules when they are part of a package API.
- Keep one-off helpers close to their caller.
- Export through package or folder `index.ts` files according to the existing package style.

## README And Docs

- Keep the root README navigational and architectural.
- Package READMEs must follow library documentation style: purpose, import paths, public API, usage examples, gotchas, and runtime notes.
- Use `README.md` for English and `README.zh-CN.md` for Chinese when both are present.
- Keep localized README variants structurally aligned with the English README.
- Do not document schema-library or framework behavior in `canon` unless that behavior is actually owned by `canon`.
- Do not fix lint or type diagnostics that only come from code blocks in `*.md` files unless explicitly requested; treat them as documentation examples and report any remaining warnings.

## Generated Files And Secrets

- Do not commit secrets or print secret values in final answers.
- Treat `.env.*`, tokens, registry credentials, private keys, and release credentials as sensitive.
- Do not hand-edit generated changelog output unless the user is intentionally debugging generated content.
- `scripts/changesets` owns changelog synchronization between `CHANGELOG.md` and `apps/document/content/changelog.md`.

## Development Commands

- Install: `pnpm install`
- Workspace build: `pnpm build`
- Workspace test: `pnpm test`
- Workspace lint: `pnpm lint`
- Workspace format: `pnpm format`
- Generate changeset: `pnpm changeset:generate`
- Regenerate changelog: `pnpm changeset:changelog`
- Version packages: `pnpm changeset:version`
- Publish packages: `pnpm changeset:publish`

Prefer package-scoped commands for focused work, for example:

```bash
pnpm -F @unimolecule/utils test
pnpm -F @unimolecule/canon build
pnpm -F @unimolecule/oh-my-fetch test
```

## Verification

- Run the narrowest relevant lint, test, type, or build command before claiming work is complete.
- For package code changes, run that package's test or build script when present.
- For export or package metadata changes, run that package's build.
- For documentation-only changes, run Prettier on the touched Markdown files.
- If a full workspace command is noisy or unrelated, state the narrower command that was run and why.
