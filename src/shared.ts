export const ELECTRON_FETCH_CHANNEL = "electron-fetch";

export type HeaderEntry = [name: string, value: string];

export interface SerializedRequest {
  url: string;
  method: string;
  headers: HeaderEntry[];
  body: ArrayBuffer | null;
  cache: RequestCache;
  credentials: RequestCredentials;
  integrity: string;
  keepalive: boolean;
  mode: RequestMode;
  redirect: RequestRedirect;
  referrer: string;
  referrerPolicy: ReferrerPolicy;
}

export interface SerializedResponse {
  headers: HeaderEntry[];
  redirected: boolean;
  status: number;
  statusText: string;
  url: string;
  hasBody: boolean;
}

export interface FetchRequestMessage {
  request: SerializedRequest;
}

export interface FetchAbortMessage {
  type: "abort";
}

export interface FetchResponseMessage {
  type: "response";
  response: SerializedResponse;
}

export interface FetchChunkMessage {
  type: "chunk";
  chunk: ArrayBuffer;
}

export interface FetchEndMessage {
  type: "end";
}

export interface FetchErrorMessage {
  type: "error";
  error: {
    message: string;
    name: string;
    stack?: string;
  };
}

export type PortInboundMessage = FetchAbortMessage;

export type PortOutboundMessage =
  | FetchChunkMessage
  | FetchEndMessage
  | FetchErrorMessage
  | FetchResponseMessage;
