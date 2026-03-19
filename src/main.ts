import { BrowserWindow, ipcMain, MessageChannelMain, net } from "electron"
import {
  createAbortChannel,
  ELECTRON_FETCH_CHANNEL_PREFIX,
  type InteralRequestPayload,
  type StreamMessage,
} from "./shared"

export function registerElectronFetchMain() {
  ipcMain.addListener(
    `${ELECTRON_FETCH_CHANNEL_PREFIX}request`,
    async (event, payload: InteralRequestPayload) => {
      const window = BrowserWindow.fromWebContents(event.sender)
      if (!window) return

      const { port1, port2 } = new MessageChannelMain()
      window.webContents.postMessage(
        `${ELECTRON_FETCH_CHANNEL_PREFIX}${payload.id}`,
        null,
        [port2],
      )

      const abortChannel = createAbortChannel(payload.id)

      const controller = new AbortController()
      let aborted = false
      let reader: ReadableStreamDefaultReader | undefined

      const handleAbort = () => {
        if (aborted) return
        aborted = true
        controller.abort()
      }

      ipcMain.once(abortChannel, handleAbort)

      try {
        const response = await net.fetch(payload.url, {
          ...payload.init,
          signal: controller.signal,
        })
        port1.postMessage({
          type: "response",
          status: response.status,
          statusText: response.statusText,
          headers: [...response.headers.entries()],
        } satisfies StreamMessage)

        reader = response.body?.getReader()

        if (reader) {
          while (true) {
            const { done, value } = await reader.read()
            if (value) {
              port1.postMessage({
                type: "chunk",
                value,
              } satisfies StreamMessage)
            }
            if (done) {
              break
            }
          }
        }
      } catch (error) {
        if (
          error instanceof Error &&
          (error.name === "AbortError" || (error as any).code === "ABORT_ERR")
        ) {
          port1.postMessage({
            type: "error",
            error: "__aborted__",
          } satisfies StreamMessage)
        } else {
          port1.postMessage({ type: "error", error } satisfies StreamMessage)
        }
      } finally {
        ipcMain.removeAllListeners(abortChannel)

        port1.postMessage({
          type: "end",
        } satisfies StreamMessage)
        port1.close()
      }
    },
  )
}
