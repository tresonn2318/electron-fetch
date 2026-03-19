import { createRoot } from "react-dom/client"
import { fetch } from "../src/renderer"

createRoot(document.getElementById("root")!).render(<App />)

function App() {
  let abortController = new AbortController()

  async function handleStream() {
    const output = document.getElementById("output")!
    output.textContent = ""
    abortController = new AbortController()

    try {
      const response = await fetch("http://localhost:3333/sse", {
        signal: abortController.signal,
      })
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        output.textContent += decoder.decode(value, { stream: true })
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        output.textContent += "\n[Aborted]"
      } else {
        output.textContent += `\n[Error: ${e}]`
      }
    }
  }

  function handleAbort() {
    abortController.abort()
  }

  return (
    <div>
      <h1>SSE Stream Example</h1>
      <button onClick={handleStream}>Start Stream</button>
      <button onClick={handleAbort}>Abort</button>
      <pre id="output" />
    </div>
  )
}
