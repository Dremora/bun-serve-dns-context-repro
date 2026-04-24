Suggested title: `dns.lookup(..., { hints: dns.ADDRCONFIG })` returns IPv6 inside `Bun.serve` but IPv4 in a plain Bun process

### What version of Bun is running?

`1.3.13+bf2e2cecf`

### What platform is your computer?

`Darwin 25.4.0 arm64 arm`

### What steps can reproduce the bug?

I made a small standalone repro repo with no dependencies.

Core repro:

```bash
bun dns-lookup-context-repro.ts
```

That script compares the same call:

```ts
dns.lookup("www.python.org", { all: false, hints: dns.ADDRCONFIG }, callback)
```

in two contexts:

1. inside a `Bun.serve` request handler
2. in a separate plain Bun process spawned with `process.execPath`

On my machine it consistently prints output like:

```json
{
  "inside": {
    "address": "2a04:4e42:600::223",
    "family": 6,
    "host": "www.python.org"
  },
  "outside": {
    "address": "151.101.64.223",
    "family": 4,
    "host": "www.python.org"
  }
}
```

The exact IPs can vary, but the family mismatch has been stable.

Optional follow-on repro:

```bash
bun https-connect-context-repro.ts
```

That script only does:

```ts
const server = Bun.serve({
  fetch() {
    return fetch("https://www.python.org/");
  },
});
```

and then makes one request to itself.

### What is the expected behavior?

`dns.lookup()` should not return a different first-family result just because the call happens inside a `Bun.serve` request handler.

For the same host and the same options, I would expect the `inside` and `outside` results to agree, or at least for Bun's outbound client behavior not to depend on that context.

### What do you see instead?

Inside `Bun.serve`, the lookup returns IPv6. In a separate plain Bun process, the same lookup returns IPv4.

The optional HTTPS repro then fails from inside `Bun.serve` with:

```text
error: The socket connection was closed unexpectedly. For more information, pass `verbose: true` in the second argument to fetch()
  code: "ECONNRESET"
```

I also attached a small workaround demo:

```bash
bun family4-connect-workaround.ts
```

That uses:

```ts
net.createConnection({
  host: "www.python.org",
  port: 443,
  family: 4,
  autoSelectFamily: false,
})
```

from inside `Bun.serve`, and that succeeds for me.

### Additional information

This does not look Firebase-specific or Google-specific anymore. I originally hit it while doing Firebase auth calls, but the smaller repro above gets rid of all of that.

I suspect the issue is somewhere in Bun's DNS/address-ordering path rather than the application code. The most suspicious source files I found were:

- `src/bun.js/api/bun/dns.zig`
- `src/js/node/dns.ts`

In particular, `processResults()` in `dns.zig` appears to interleave mixed-family answers starting with `AF_INET6`, while `node:dns` reports `verbatim` ordering. That might explain why the same lookup behaves differently across contexts, but I have not proven that part yet.
