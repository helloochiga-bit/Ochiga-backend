import app from "./app";
import { PORT } from "./config/env";

const DEFAULT_PORT = 5000;

const port = PORT || DEFAULT_PORT;

const server = app.listen(port, () => {
  console.log(`Ochiga backend running on http://localhost:${port}`);
});

server.on("error", (err: any) => {
  if (err.code === "EADDRINUSE") {
    console.warn(`Port ${port} is in use, trying a random free port...`);
    server.listen(0); // 0 tells Node to pick a free port automatically
  } else {
    console.error(err);
  }
});
