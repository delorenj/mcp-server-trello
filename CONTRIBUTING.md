# Contributing to MCP Server Trello

Thanks for considering a contribution. This server is open to:

- Bug reports and reproductions
- Feature proposals (open an issue first for anything non-trivial)
- Documentation improvements
- Pull requests that fix bugs or add small, well-scoped features

## Before you start work

For anything beyond a typo fix or a small bug repair, **open an issue first**
and confirm the direction is welcome. Large PRs that arrive without prior
discussion are likely to be closed without merge, regardless of code quality —
this isn't about gatekeeping, it's about respecting your time.

In particular:

- New runtime dependencies require strong justification. The dependency
  surface is intentionally small.
- New tools should map cleanly to an existing Trello API endpoint and
  serve a real user workflow.
- Speculative architectural rewrites (caching layers, message buses,
  pluggable backends) are out of scope.

## Local development

This project uses [Bun](https://bun.sh) as the runtime and
[Vitest](https://vitest.dev) for tests. Bun 1.0 or newer is required.

```bash
# Install dependencies
bun install

# Run the server in watch mode
bun run dev

# Build the production bundle
bun run build

# Run the full test suite
bun run test

# Run only unit tests
bun run test:unit

# Format and lint
bun run format
bun run lint
```

## Submitting a pull request

1. **Fork** the repository and create a topic branch from `main`.
2. **Make your change.** Keep the scope tight — one PR, one concern.
3. **Add tests** for new behavior in `tests/unit/`. The vitest setup picks them
   up automatically.
4. **Update documentation** when you change a public tool's signature or add
   a new one. The README's tools section is the source of truth users read.
5. **Run the checks locally** before pushing:
   ```bash
   bun run lint
   bun run format:check
   bun run test
   bun run build
   ```
6. **Open the PR** against `main` with a clear title, a description that
   explains _why_ as much as _what_, and a checklist of what you tested.

## Pull request review

PRs go through automated checks (build, tests, CodeQL) and at least one human
review. Expect feedback that asks for narrower scope, smaller diffs, or extra
tests — none of that is personal; small reviewable PRs ship faster.

## Reporting bugs

Open an issue at
[delorenj/mcp-server-trello/issues](https://github.com/delorenj/mcp-server-trello/issues)
using the bug report template. Great bug reports include:

- A short summary of the unexpected behavior
- Exact reproduction steps (with a minimal config when possible)
- What you expected vs. what happened
- Your Bun and Node.js versions, and the MCP client you were using
- Relevant logs (redacted of any tokens)

## Security disclosures

Do **not** open public issues for security vulnerabilities. See
[`SECURITY.md`](SECURITY.md) for the private disclosure process.

## Code of conduct

Participation is governed by the
[Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).

## License

By contributing, you agree that your contributions will be licensed under the
project's [MIT License](LICENSE).
