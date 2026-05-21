import { createServer } from "https";
import { readFileSync } from "fs";
import { parse } from "url";
import next from "next";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev, hostname: "0.0.0.0", port: 3000 });
const handle = app.getRequestHandler();

const certDir = path.join(__dirname, "certs");

app.prepare().then(() => {
  createServer(
    {
      key: readFileSync(path.join(certDir, "key.pem")),
      cert: readFileSync(path.join(certDir, "cert.pem")),
    },
    (req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    }
  ).listen(3000, "0.0.0.0", (err) => {
    if (err) throw err;
    console.log("> Ready on https://0.0.0.0:3000");
  });
});
