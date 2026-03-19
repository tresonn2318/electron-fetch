# @egoist/electron-fetch

An anlternative way to get rid of CORS in Electron renderer process by exposing a `fetch` function backed by `electron.net.fetch`

## Install

Install as dev dependency, make sure your bundler would bundle it:

```bash
npm i @egoist/electron-fetch -D
```

## Usage

In Main process:

```ts
import { registerElectronFetchMain } from "@egoist/electron-fetch/main"

registerElectronFetchMain()
```

In preload script:

```ts
import { registerElectronFetchPreload } from "@egoist/electron-fetch/preload"

registerElectronFetchPreload()
```

In renderer process:

```ts
import { fetch } from "@egoist/electron-fetch/renderer"

const response = await fetch("https://example.com")
const text = await response.text()
```

## How it works

```
Renderer                 Preload                Main
   |                       |                     |
   |  request(id, url)     |                     |
   |──────────────────────>│                     |
   |                       |  ipcRenderer.send   |
   |                       |────────────────────>|
   |                       |                     |
   |                       |        net.fetch(url)
   |                       |          (bypasses CORS)
   |                       |                     |
   |                       |   port.postMessage  |
   |                       |<────────────────────|
   |  onStream(id, cb)     |                     |
   │<──────────────────────│                     |
   |                       |                     |
   |  Response stream      |                     |
   |<───────────────────────│                     |
```

1. Renderer calls `fetch()` → preload sends IPC to main
2. Main uses `net.fetch` (Electron's CORS-free and proxy friendly fetch) to make the request
3. Main streams response chunks back via `MessageChannel`
4. Preload forwards chunks to renderer as a `ReadableStream`

## License

MIT
