import { execFileSync } from "node:child_process";
import dns from "node:dns";

type LookupResult = {
  address?: string;
  error?: string;
  family?: number;
  host: string;
};

const host = "www.python.org";

function lookupInProcess(targetHost: string) {
  return new Promise<LookupResult>(resolve => {
    dns.lookup(targetHost, { all: false, hints: dns.ADDRCONFIG }, (error, address, family) => {
      resolve({
        address,
        error: error?.message,
        family,
        host: targetHost,
      });
    });
  });
}

function lookupInChildProcess(targetHost: string) {
  const script = `
    import dns from "node:dns";
    dns.lookup(${JSON.stringify(targetHost)}, { all: false, hints: dns.ADDRCONFIG }, (error, address, family) => {
      console.log(JSON.stringify({
        address,
        error: error?.message,
        family,
        host: ${JSON.stringify(targetHost)},
      }));
    });
    setTimeout(() => {}, 100);
  `;

  const output = execFileSync(process.execPath, ["-e", script], {
    encoding: "utf8",
  }).trim();

  return JSON.parse(output) as LookupResult;
}

const server = Bun.serve({
  fetch() {
    return lookupInProcess(host).then(result => Response.json(result));
  },
  port: 0,
});

const response = await fetch(`http://127.0.0.1:${server.port}`);
const inside = (await response.json()) as LookupResult;

server.stop(true);

const outside = lookupInChildProcess(host);

console.log(JSON.stringify({ inside, outside }, null, 2));

process.exit(inside.family === outside.family ? 0 : 1);

export {};
