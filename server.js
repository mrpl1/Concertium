// Custom production server for Concertium.
//
// Why this exists: managed Node hosts (Hostinger/Passenger, Plesk, etc.) run
// your app behind a reverse proxy and tell it where to listen via the PORT
// environment variable — which may be a TCP port number OR a Unix socket path.
// Plain `next start` only binds TCP :3000 and ignores that, so the proxy can
// never reach the app → 503 + a restart loop. Node's server.listen() accepts
// both a number and a socket path, so binding to process.env.PORT works
// everywhere. Locally (PORT unset) it falls back to 3000.

const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
// Passenger passes a socket path here; most PaaS pass a numeric port.
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res, parse(req.url, true));
  });

  // listen() takes a numeric port or a Unix-socket path string — let the host decide.
  server.listen(port, () => {
    console.log(`> Concertium ready, listening on ${port}`);
  });
}).catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
