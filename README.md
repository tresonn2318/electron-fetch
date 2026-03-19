# electron-fetch

In Main process:

```ts
import { registerHandlers } from "@egoist/electron-fetch/main"

registerHandlers()
```

In preload script, expose `window.ipcRenderer.postMessage`.

In renderer process:

```ts
import { fetch } from "@egoist/electron-fetch/renderer"

// just fetch like normal `window.fetch`
```

## How it works

`registerHandlers` register ipc handler and use `MessageChannel` to stream response data, `fetch` would call `ipcRenderer.postMessage('electron-fetch', { url, requestInit })` and use `MessageChannel` to listen to data.
