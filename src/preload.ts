import {
  contextBridge,
  ipcRenderer,
  type ContextBridge,
  type IpcRenderer,
} from "electron";

import { fetchWithSerializedRequest } from "./ipc-fetch.ts";
import { type HeaderEntry, type SerializedRequest } from "./shared.ts";

const INTERNAL_BRIDGE_NAME = "__electronFetchBridge";

export interface ExposeElectronFetchOptions {
  contextBridge?: Pick<
    ContextBridge,
    "exposeInMainWorld" | "executeInMainWorld"
  >;
  ipcRenderer?: Pick<IpcRenderer, "postMessage">;
}

interface BridgeChunk {
  done: boolean;
  value: ArrayBuffer | null;
}

interface BridgeResponse {
  headers: HeaderEntry[];
  redirected: boolean;
  status: number;
  statusText: string;
  url: string;
  hasBody: boolean;
  read?: () => Promise<BridgeChunk>;
  cancel?: () => Promise<void>;
}

function createElectronFetchBinding(
  electronIpcRenderer: Pick<IpcRenderer, "postMessage"> = ipcRenderer,
): {
  request(request: SerializedRequest): Promise<BridgeResponse>;
} {
  return {
    async request(request: SerializedRequest): Promise<BridgeResponse> {
      const response = await fetchWithSerializedRequest(
        (channel, message, transfer) => {
          electronIpcRenderer.postMessage(
            channel,
            message,
            [...(transfer ?? [])] as MessagePort[],
          );
        },
        request,
      );
      const reader = response.body?.getReader() ?? null;

      return {
        headers: Array.from(response.headers.entries()),
        hasBody: reader !== null,
        redirected: response.redirected,
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        read:
          reader === null
            ? undefined
            : async () => {
                const { done, value } = await reader.read();

                return {
                  done,
                  value: done ? null : value.slice().buffer,
                };
              },
        cancel:
          reader === null
            ? undefined
            : async () => {
                await reader.cancel();
              },
      };
    },
  };
}

export function exposeElectronFetch(
  options: ExposeElectronFetchOptions = {},
): void {
  const electronContextBridge = options.contextBridge ?? contextBridge;

  electronContextBridge.exposeInMainWorld(
    INTERNAL_BRIDGE_NAME,
    createElectronFetchBinding(options.ipcRenderer ?? ipcRenderer),
  );
  electronContextBridge.executeInMainWorld({
    func: installElectronFetch,
    args: [INTERNAL_BRIDGE_NAME],
  });
}

function installElectronFetch(bridgeName: string): void {
  const bridge = (
    window as unknown as Window & {
      [key: string]: {
        request(request: SerializedRequest): Promise<BridgeResponse>;
      };
    }
  )[bridgeName];

  if (!bridge) {
    throw new Error(`Missing preload bridge: ${bridgeName}`);
  }

  Object.defineProperty(window, "electronFetch", {
    configurable: true,
    value: async (input: RequestInfo | URL, init?: RequestInit) => {
      const serializeRequest = async (request: Request): Promise<SerializedRequest> => {
        return {
          body: request.body === null ? null : await request.arrayBuffer(),
          cache: request.cache,
          credentials: request.credentials,
          headers: Array.from(request.headers.entries()),
          integrity: request.integrity,
          keepalive: request.keepalive,
          method: request.method,
          mode: request.mode,
          redirect: request.redirect,
          referrer: request.referrer,
          referrerPolicy: request.referrerPolicy,
          url: request.url,
        };
      };
      const request = new Request(input, init);
      const proxyResponse = await bridge.request(await serializeRequest(request));
      const body = proxyResponse.hasBody
        ? new ReadableStream<Uint8Array>({
            async pull(controller) {
              const chunk = await proxyResponse.read?.();

              if (!chunk || chunk.done || chunk.value === null) {
                controller.close();
                return;
              }

              controller.enqueue(new Uint8Array(chunk.value));
            },
            async cancel() {
              await proxyResponse.cancel?.();
            },
          })
        : null;
      const response = new Response(body, {
        headers: proxyResponse.headers,
        status: proxyResponse.status,
        statusText: proxyResponse.statusText,
      });

      Object.defineProperties(response, {
        redirected: {
          configurable: true,
          value: proxyResponse.redirected,
        },
        url: {
          configurable: true,
          value: proxyResponse.url,
        },
      });

      return response;
    },
  });
}
