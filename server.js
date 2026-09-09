// Custom production server.
//
// Why this exists: managed Node hosts (Hostinger/Passenger, Plesk, etc.) run
// your app behind a reverse proxy and tell it where to listen via the PORT
// environment variable — which may be a TCP port number OR a Unix socket path.
// Plain `next start` only binds TCP :3000 and ignores that, so the proxy can
// never reach the app → 503 + a restart loop. Node's server.listen() accepts
// both a number and a socket path, so binding to process.env.PORT works
// everywhere. Locally (PORT unset) it falls back to 3000.

// One-line startup log: proves the file ran and shows the port the platform
// assigned. Deliberately does NOT log DATABASE_URL or any credential.
console.log(`starting: node ${process.version}, NODE_ENV=${process.env.NODE_ENV}, PORT=${JSON.stringify(process.env.PORT)}`);

const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

// Force production: a deployed build has no dev server, and `next dev` would
// fail without dev dependencies. We always serve the prebuilt `.next` output.
const dev = false;
const hostname = "0.0.0.0";
// Passenger passes a socket path here; most PaaS pass a numeric port.
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const server = createServer((req, res) => {
      handle(req, res, parse(req.url, true));
    });

    server.on("error", (err) => {
      console.error("HTTP server error:", err);
    });

    // listen() takes a numeric port or a Unix-socket path string — let the host decide.
    server.listen(port, () => {
      console.log(`> ready, listening on ${JSON.stringify(port)}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });

process.on("uncaughtException", (err) => {
  console.error("uncaughtException:", err);
});
process.on("unhandledRejection", (err) => {
  console.error("unhandledRejection:", err);
});
