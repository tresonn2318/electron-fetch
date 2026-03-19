# electron-fetch

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
