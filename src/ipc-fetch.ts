import {
  ELECTRON_FETCH_CHANNEL,
  type FetchErrorMessage,
  type FetchRequestMessage,
  type FetchResponseMessage,
  type HeaderEntry,
  type PortOutboundMessage,
  type SerializedRequest,
} from "./shared.ts";

export type PostMessageLike = (
  channel: string,
  message: unknown,
  transfer?: readonly Transferable[],
) => void;

export async function fetchWithSerializedRequest(
  postMessage: PostMessageLike,
  request: SerializedRequest,
  signal?: AbortSignal,
): Promise<Response> {
  if (signal?.aborted) {
    throw createAbortError();
  }

  const messagePort = new MessageChannel();
  const port = messagePort.port1;
  const payload: FetchRequestMessage = { request };

  let settled = false;
  let streamFinished = false;
  let streamController: ReadableStreamDefaultController<Uint8Array> | null =
    null;
  let cleanup = () => undefined;

  const responsePromise = new Promise<Response>((resolve, reject) => {
    const fail = (error: unknown) => {
      const normalizedError =
        error instanceof Error ? error : new Error(String(error));

      if (!settled) {
        settled = true;
        reject(normalizedError);
      } else if (streamController !== null && !streamFinished) {
        streamFinished = true;
        streamController.error(normalizedError);
      }

      cleanup();
    };

    const finish = () => {
      if (streamController !== null && !streamFinished) {
        streamFinished = true;
        streamController.close();
      }

      cleanup();
    };

    const handleMessage = (event: MessageEvent<PortOutboundMessage>) => {
      const message = event.data;

      switch (message.type) {
        case "response":
          if (settled) {
            return;
          }

          settled = true;
          resolve(
            createResponse(message, (controller) => {
              streamController = controller;
            }),
          );
          return;
        case "chunk":
          if (streamController === null || streamFinished) {
            return;
          }

          streamController.enqueue(new Uint8Array(message.chunk));
          return;
        case "end":
          finish();
          return;
        case "error":
          fail(deserializeError(message));
          return;
        default:
          return;
      }
    };

    const handleMessageError = () => {
      fail(new Error("Received an unreadable message from the main process."));
    };

    const handleAbort = () => {
      port.postMessage({ type: "abort" });
      fail(createAbortError());
    };

    cleanup = () => {
      signal?.removeEventListener("abort", handleAbort);
      port.removeEventListener("message", handleMessage);
      port.removeEventListener("messageerror", handleMessageError);
      port.close();
    };

    signal?.addEventListener("abort", handleAbort, { once: true });
    port.addEventListener("message", handleMessage as EventListener);
    port.addEventListener("messageerror", handleMessageError);
    port.start();
  });

  try {
    postMessage(ELECTRON_FETCH_CHANNEL, payload, [messagePort.port2]);
  } catch (error) {
    cleanup();
    throw error;
  }

  return responsePromise;
}

export async function serializeRequest(
  request: Request,
): Promise<SerializedRequest> {
  return {
    body: request.body === null ? null : await request.arrayBuffer(),
    cache: request.cache,
    credentials: request.credentials,
    headers: serializeHeaders(request.headers),
    integrity: request.integrity,
    keepalive: request.keepalive,
    method: request.method,
    mode: request.mode,
    redirect: request.redirect,
    referrer: request.referrer,
    referrerPolicy: request.referrerPolicy,
    url: request.url,
  };
}

function createResponse(
  message: FetchResponseMessage,
  setStreamController: (
    controller: ReadableStreamDefaultController<Uint8Array>,
  ) => void,
): Response {
  const { response } = message;
  const body = response.hasBody
    ? new ReadableStream<Uint8Array>({
        start(controller) {
          setStreamController(controller);
        },
      })
    : null;
  const result = new Response(body, {
    headers: response.headers,
    status: response.status,
    statusText: response.statusText,
  });

  Object.defineProperties(result, {
    redirected: {
      configurable: true,
      value: response.redirected,
    },
    url: {
      configurable: true,
      value: response.url,
    },
  });

  return result;
}

function deserializeError(message: FetchErrorMessage): Error {
  const error = new Error(message.error.message);
  error.name = message.error.name;
  error.stack = message.error.stack;
  return error;
}

function serializeHeaders(headers: Headers): HeaderEntry[] {
  return Array.from(headers.entries());
}

function createAbortError(): Error {
  if (typeof DOMException === "function") {
    return new DOMException("The operation was aborted.", "AbortError");
  }

  const error = new Error("The operation was aborted.");
  error.name = "AbortError";
  return error;
}
