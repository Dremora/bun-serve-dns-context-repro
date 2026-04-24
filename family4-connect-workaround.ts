import net from "node:net";

const server = Bun.serve({
  fetch() {
    return new Promise<Response>((resolve, reject) => {
      const socket = net.createConnection({
        autoSelectFamily: false,
        family: 4,
        host: "www.python.org",
        port: 443,
      });

      socket.setTimeout(2000, () => {
        socket.destroy(new Error("timeout"));
      });

      socket.on("connect", () => {
        socket.destroy();
        resolve(new Response("connected"));
      });

      socket.on("error", reject);
    });
  },
  idleTimeout: 2,
  port: 0,
});

try {
  const response = await fetch(`http://127.0.0.1:${server.port}`);
  const body = await response.text();
  console.log(`status=${response.status} body=${body}`);
  process.exit(response.ok && body === "connected" ? 0 : 1);
} catch (error) {
  console.error(error);
  process.exit(1);
} finally {
  server.stop(true);
}

export {};
