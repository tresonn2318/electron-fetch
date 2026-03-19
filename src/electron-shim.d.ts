declare module "electron" {
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

  export const ipcMain: IpcMain;
}
