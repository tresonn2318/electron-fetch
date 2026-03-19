import { ipcMain, type IpcMainEvent, type MessagePortMain } from "electron";

import {
  ELECTRON_FETCH_CHANNEL,
  type FetchAbortMessage,
  type FetchRequestMessage,
  type FetchResponseMessage,
  type PortOutboundMessage,
  type SerializedRequest,
} from "./shared.ts";

export interface RegisterHandlersOptions {
  fetch?: typeof globalThis.fetch;
}

export function registerHandlers(
  options: RegisterHandlersOptions = {},
): () => void {
  const channel = ELECTRON_FETCH_CHANNEL;
  const fetchImplementation = options.fetch ?? globalThis.fetch;

  const listener = (event: IpcMainEvent, message: unknown) => {
    if (!isFetchRequestMessage(message)) {
      return;
    }

    const port = event.ports[0];
    if (!port) {
      return;
    }

    void handleFetchRequest({
      fetchImplementation,
      port,
      request: message.request,
    });
  };

  ipcMain.on(channel, listener);

  return () => {
    ipcMain.off?.(channel, listener);
    ipcMain.removeListener?.(channel, listener);
  };
}

interface HandleFetchRequestOptions {
  fetchImplementation: typeof globalThis.fetch;
  port: MessagePortMain;
  request: SerializedRequest;
}

async function handleFetchRequest({
  fetchImplementation,
  port,
  request,
}: HandleFetchRequestOptions): Promise<void> {
  const abortController = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let closed = false;

  const closePort = () => {
    if (closed) {
      return;
    }

    closed = true;
    port.close();
  };

  const abort = () => {
    abortController.abort();
    void reader?.cancel().catch(() => undefined);
  };

  const onMessage = (event: { data: unknown }) => {
    if (isAbortMessage(event.data)) {
      abort();
    }
  };

  const onClose = () => {
    closed = true;
    abort();
  };

  port.on("message", onMessage);
  port.on("close", onClose);
  port.start();

  try {
    const response = await fetchImplementation(request.url, {
      body: request.body === null ? undefined : request.body,
      cache: request.cache,
      credentials: request.credentials,
      headers: request.headers,
      integrity: request.integrity,
      keepalive: request.keepalive,
      method: request.method,
      mode: request.mode,
      redirect: request.redirect,
      referrer: request.referrer,
      referrerPolicy: request.referrerPolicy,
      signal: abortController.signal,
    });

    postMessage(port, closed, {
      type: "response",
      response: {
        headers: Array.from(response.headers.entries()),
        hasBody: response.body !== null,
        redirected: response.redirected,
        status: response.status,
        statusText: response.statusText,
        url: response.url,
      },
    } satisfies FetchResponseMessage);

    if (response.body === null) {
      postMessage(port, closed, { type: "end" });
      closePort();
      return;
    }

    reader = response.body.getReader();

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      postMessage(port, closed, {
        type: "chunk",
        chunk: cloneArrayBuffer(value),
      });
    }

    postMessage(port, closed, { type: "end" });
    closePort();
  } catch (error) {
    postMessage(port, closed, {
      type: "error",
      error: serializeError(error),
    });
    closePort();
  } finally {
    port.off?.("message", onMessage);
    port.off?.("close", onClose);
    port.removeListener?.("message", onMessage);
    port.removeListener?.("close", onClose);
  }
}

function cloneArrayBuffer(value: Uint8Array): ArrayBuffer {
  return value.slice().buffer;
}

function serializeError(error: unknown): {
  message: string;
  name: string;
  stack?: string;
} {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }

  return {
    message: String(error),
    name: "Error",
  };
}

function postMessage(
  port: MessagePortMain,
  closed: boolean,
  message: PortOutboundMessage,
): void {
  if (closed) {
    return;
  }

  try {
    port.postMessage(message);
  } catch {
    // The renderer can close its end of the channel while the main process is
    // still unwinding. At that point there is nothing left to deliver.
  }
}

function isAbortMessage(value: unknown): value is FetchAbortMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === "abort"
  );
}

function isFetchRequestMessage(value: unknown): value is FetchRequestMessage {
  return typeof value === "object" && value !== null && "request" in value;
}
