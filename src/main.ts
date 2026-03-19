import { BrowserWindow, ipcMain, MessageChannelMain, net } from "electron"
import {
  ELECTRON_FETCH_CHANNEL_PREFIX,
  type InteralRequestPayload,
} from "./shared"

export function registerElectronFetchMain() {
  ipcMain.addListener(
    `${ELECTRON_FETCH_CHANNEL_PREFIX}request`,
    async (event, payload: InteralRequestPayload) => {
      const window = BrowserWindow.fromWebContents(event.sender)
      if (!window) return

      const { port1, port2 } = new MessageChannelMain()
      window.webContents.postMessage("stream-channel", null, [port2])

      const stream = await net.fetch(payload.url, payload.init)

      // TODO: send stream over port1, should also handle error and send
    },
  )
}
