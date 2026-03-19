import { contextBridge, ipcRenderer } from "electron";

import { exposeElectronFetch } from "../../preload.ts";

exposeElectronFetch({ contextBridge, ipcRenderer });

contextBridge.exposeInMainWorld("example", {
  onBaseUrl(listener: (value: string) => void) {
    const wrappedListener = (_event: unknown, value: string) => {
      listener(value);
    };

    ipcRenderer.on("example:base-url", wrappedListener);

    return () => {
      ipcRenderer.removeListener("example:base-url", wrappedListener);
    };
  },
  reportSmokeResult(payload: unknown) {
    ipcRenderer.send("example:smoke-result", payload);
  },
});
