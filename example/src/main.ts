import { app, BrowserWindow, ipcMain } from "electron";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { registerHandlers } from "../../main.ts";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const exampleRoot = path.resolve(currentDirectory, "..");
const distDirectory = path.resolve(exampleRoot, "dist");
const htmlPath = path.resolve(exampleRoot, "index.html");
const isSmokeTest = process.env.ELECTRON_FETCH_SMOKE_TEST === "1";

let disposeHandlers: () => void = () => undefined;
let server: ReturnType<typeof createServer> | null = null;
let smokeTimer: ReturnType<typeof setTimeout> | undefined;

async function main() {
  disposeHandlers = registerHandlers();
  server = createServer(handleRequest);

  await app.whenReady();

  if (isSmokeTest && process.platform === "darwin") {
    app.dock?.hide();
  }

  await listen(server);

  const serverAddress = server.address();

  if (serverAddress === null || typeof serverAddress === "string") {
    throw new Error("Failed to determine the example server port.");
  }

  const baseUrl = `http://127.0.0.1:${serverAddress.port}`;
  const window = new BrowserWindow({
    width: 980,
    height: 760,
    backgroundColor: "#fffaf3",
    show: !isSmokeTest,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.resolve(distDirectory, "preload.js"),
    },
  });

  if (isSmokeTest) {
    smokeTimer = setTimeout(() => {
      void app.exit(1);
    }, 15_000);

    ipcMain.once("example:smoke-result", (_event, payload: unknown) => {
      clearTimeout(smokeTimer);
      const isOk =
        typeof payload === "object" &&
        payload !== null &&
        "ok" in payload &&
        payload.ok === true;
      app.exit(isOk ? 0 : 1);
    });
  }

  window.webContents.on("did-finish-load", () => {
    window.webContents.send("example:base-url", baseUrl);
  });

  await window.loadFile(htmlPath);
}

void main();

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    void app.quit();
  }
});

app.on("before-quit", () => {
  clearTimeout(smokeTimer);
  disposeHandlers();
  server?.close();
});

function handleRequest(request: IncomingMessage, response: ServerResponse) {
  if (request.url === "/json") {
    const body = JSON.stringify({
      ok: true,
      message: "Hello from the Electron main-process fetch bridge.",
      timestamp: new Date().toISOString(),
    });

    response.writeHead(200, {
      "content-length": Buffer.byteLength(body).toString(),
      "content-type": "application/json",
      "x-example-source": "local-server",
    });
    response.end(body);
    return;
  }

  if (request.url === "/nobody") {
    response.writeHead(204, {
      "x-example-source": "local-server",
    });
    response.end();
    return;
  }

  response.writeHead(404, {
    "content-type": "text/plain; charset=utf-8",
  });
  response.end("Not found");
}

function listen(httpServer: ReturnType<typeof createServer>): Promise<void> {
  return new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(0, "127.0.0.1", () => {
      httpServer.off("error", reject);
      resolve();
    });
  });
}
