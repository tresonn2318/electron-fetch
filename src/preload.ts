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

    onStream: (id, callback) => {
      ipcRenderer.once(`${ELECTRON_FETCH_CHANNEL_PREFIX}${id}`, (event) => {
        const port = event.ports[0]
        if (!port) return

        port.onmessage = (event) => {
          callback(event.data)
        }
        port.start()
      })
    },

    abort: (id) => {
      ipcRenderer.send(createAbortChannel(id))
    },
  }

  contextBridge.exposeInMainWorld("__electronFetchInternal", internalAPI)
}
