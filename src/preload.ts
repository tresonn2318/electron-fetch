import { contextBridge, ipcRenderer } from "electron"

import {
  createAbortChannel,
  ELECTRON_FETCH_CHANNEL_PREFIX,
  type InternalAPI,
} from "./shared.ts"

export function exposeElectronFetch() {
  const internalAPI: InternalAPI = {
    request: (payload) => {
      ipcRenderer.send(`${ELECTRON_FETCH_CHANNEL_PREFIX}request`, payload)
    },

    onStreamChannel: (id, callback) => {
      ipcRenderer.once(
        `${ELECTRON_FETCH_CHANNEL_PREFIX}${id}`,
        (event, args) => {
          const port = args[0]
          callback(port)
        },
      )
    },

    abort: (id) => {
      ipcRenderer.send(createAbortChannel(id))
    },
  }

  contextBridge.exposeInMainWorld("__electronFetchInternal", internalAPI)
}
