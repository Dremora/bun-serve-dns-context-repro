const server = Bun.serve({
  fetch() {
    return fetch("https://www.python.org/");
  },
  idleTimeout: 2,
  port: 0,
});

try {
  await fetch(`http://127.0.0.1:${server.port}`);
  console.log("unexpected success");
  process.exit(1);
} catch (error) {
  console.error(error);
  process.exit(1);
} finally {
  server.stop(true);
}

export {};
