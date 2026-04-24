# Bun `Bun.serve` DNS context repro

This repository reproduces a Bun bug where the same `dns.lookup()` call returns a different address family inside a `Bun.serve` request handler than it does in a separate plain Bun process.

## Environment

- Bun revision: `1.3.13+bf2e2cecf`
- Platform: `Darwin 25.4.0 arm64 arm`

## Core repro

```bash
bun dns-lookup-context-repro.ts
```

Expected repro outcome:

- the process exits with code `1`
- the JSON output shows `family: 6` inside `Bun.serve`
- the same lookup in a separate plain Bun process returns `family: 4`

Expected behavior after a fix:

- the process exits with code `0`
- the `inside` and `outside` lookups agree on the address family for the same host and options

## Optional impact repro

```bash
bun https-connect-context-repro.ts
```

Expected repro outcome:

- the process exits with an error
- the self-request fails with `The socket connection was closed unexpectedly`

Expected behavior after a fix:

- the process should complete successfully instead of failing with `ECONNRESET`

## Optional workaround demo

```bash
bun family4-connect-workaround.ts
```

Expected repro outcome:

- the process exits with code `0`
- the `family: 4` hostname connect succeeds from inside `Bun.serve`

Expected behavior after a fix:

- this workaround should still succeed, but it should no longer be necessary to force `family: 4`

## Why this matters

The DNS mismatch appears to feed into hostname-based outbound connection failures from inside `Bun.serve`, which later surface as:

- `The socket connection was closed unexpectedly`
- request hangs
- Bun request timeouts
