declare module "electron" {
  export interface ContextBridge {
    executeInMainWorld(executionScript: {
      func: (...args: any[]) => any;
      args?: any[];
    }): any;
    exposeInMainWorld(apiKey: string, api: unknown): void;
  }

  export interface MessagePortMainEvent {
    data: unknown;
  }

  export interface MessagePortMain {
    close(): void;
    on(event: "close", listener: () => void): this;
    on(event: "message", listener: (event: MessagePortMainEvent) => void): this;
    off?(event: "close", listener: () => void): this;
    off?(
      event: "message",
      listener: (event: MessagePortMainEvent) => void,
    ): this;
    postMessage(message: unknown, transfer?: readonly unknown[]): void;
    removeListener?(event: "close", listener: () => void): this;
    removeListener?(
      event: "message",
      listener: (event: MessagePortMainEvent) => void,
    ): this;
    start(): void;
  }

  export interface IpcMainEvent {
    ports: MessagePortMain[];
  }

  export interface IpcMain {
    on(
      channel: string,
      listener: (event: IpcMainEvent, message: unknown) => void,
    ): this;
    off?(
      channel: string,
      listener: (event: IpcMainEvent, message: unknown) => void,
    ): this;
    removeListener?(
      channel: string,
      listener: (event: IpcMainEvent, message: unknown) => void,
    ): this;
  }

  export interface IpcRenderer {
    on(
      channel: string,
      listener: (event: unknown, ...args: any[]) => void,
    ): this;
    postMessage(
      channel: string,
      message: unknown,
      transfer?: MessagePort[],
    ): void;
    removeListener(
      channel: string,
      listener: (event: unknown, ...args: any[]) => void,
    ): this;
    send(channel: string, ...args: any[]): void;
  }

  export const contextBridge: ContextBridge;
  export const ipcMain: IpcMain;
  export const ipcRenderer: IpcRenderer;
}
