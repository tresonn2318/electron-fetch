export {};

declare global {
  interface Window {
    electronFetch?: (
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => Promise<Response>;
    example?: {
      onBaseUrl(listener: (value: string) => void): () => void;
      reportSmokeResult(payload: unknown): void;
    };
  }
}

const summaryElement = getElement<HTMLPreElement>("#summary");
const detailsElement = getElement<HTMLPreElement>("#details");
const runButton = getElement<HTMLButtonElement>("#run-tests");
const clearButton = getElement<HTMLButtonElement>("#clear");

let baseUrl = "";

const disposeBaseUrlListener = window.example?.onBaseUrl((value) => {
  baseUrl = value;
  summaryElement.textContent = `Ready.\nBase URL: ${baseUrl}`;
  void run();
});

if (!disposeBaseUrlListener) {
  throw new Error("window.example.onBaseUrl is not available from preload.");
}

if (!window.electronFetch) {
  throw new Error("window.electronFetch is not available from preload.");
}

const electronFetch = window.electronFetch;

runButton.addEventListener("click", () => {
  void run();
});

clearButton.addEventListener("click", () => {
  summaryElement.textContent = `Ready.\nBase URL: ${baseUrl || "(waiting for main process)"}`;
  detailsElement.textContent = "No requests made yet.";
});

async function run() {
  if (!baseUrl) {
    summaryElement.textContent =
      "Waiting for the local server URL from the main process…";
    return;
  }

  runButton.disabled = true;
  summaryElement.textContent = "Running bridge test…";
  detailsElement.textContent =
    "Fetching /json and /nobody via the preload-installed fetch.";

  try {
    const jsonResponse = await electronFetch(`${baseUrl}/json`);
    const jsonText = await jsonResponse.text();

    const noBodyResponse = await electronFetch(`${baseUrl}/nobody`);
    const noBodyText = await noBodyResponse.text();

    const result = {
      json: {
        ok: jsonResponse.ok,
        status: jsonResponse.status,
        hasBody: jsonText.length > 0,
        contentType: jsonResponse.headers.get("content-type"),
        body: jsonText,
      },
      nobody: {
        ok: noBodyResponse.ok,
        status: noBodyResponse.status,
        hasBody: noBodyText.length > 0,
        bodyLength: noBodyText.length,
      },
    };

    summaryElement.innerHTML =
      '<span class="status-ok">Bridge working.</span>\n' +
      `200 response body length: ${jsonText.length}\n` +
      `204 response body length: ${noBodyText.length}`;
    detailsElement.textContent = JSON.stringify(result, null, 2);
    window.example?.reportSmokeResult({ ok: true, result });
  } catch (error) {
    const message =
      error instanceof Error ? error.stack ?? error.message : String(error);
    summaryElement.innerHTML = '<span class="status-error">Bridge failed.</span>';
    detailsElement.textContent = message;
    window.example?.reportSmokeResult({ ok: false, error: message });
  } finally {
    runButton.disabled = false;
  }
}

function getElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);

  if (element === null) {
    throw new Error(`Missing required element: ${selector}`);
  }

  return element;
}
