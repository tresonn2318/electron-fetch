# electron-fetch

In Main process:

```ts
import { registerHandlers } from "@egoist/electron-fetch/main"

registerHandlers()
```

In preload script:

```ts
import { exposeElectronFetch } from "@egoist/electron-fetch/preload"

exposeElectronFetch()
```

In renderer process:

```ts
const response = await window.electronFetch("https://example.com")
```

## How it works

`registerHandlers` registers the main-process IPC handler and uses `MessageChannel` to stream response data. `exposeElectronFetch()` installs `window.electronFetch(...)` from preload so the renderer can use it like a normal fetch call without handling IPC directly.
