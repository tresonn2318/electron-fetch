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

  async function handleText() {
    const output = document.getElementById("output")!
    output.textContent = "Loading..."

    try {
      const response = await fetch("http://localhost:3333/plaintext")
      const text = await response.text()
      output.textContent = text
    } catch (e) {
      output.textContent = `Error: ${e}`
    }
  }

  async function handleJson() {
    const output = document.getElementById("output")!
    output.textContent = "Loading..."

    try {
      const response = await fetch("http://localhost:3333/json")
      const json = await response.json()
      output.textContent = JSON.stringify(json, null, 2)
    } catch (e) {
      output.textContent = `Error: ${e}`
    }
  }

  async function handleBlob() {
    const output = document.getElementById("output")!
    output.textContent = "Loading..."

    try {
      const response = await fetch("http://localhost:3333/binary")
      const blob = await response.blob()
      output.textContent = `Blob size: ${blob.size} bytes, type: ${blob.type}`
    } catch (e) {
      output.textContent = `Error: ${e}`
    }
  }

  async function handleArrayBuffer() {
    const output = document.getElementById("output")!
    output.textContent = "Loading..."

    try {
      const response = await fetch("http://localhost:3333/binary")
      const buffer = await response.arrayBuffer()
      output.textContent = `ArrayBuffer size: ${buffer.byteLength} bytes`
    } catch (e) {
      output.textContent = `Error: ${e}`
    }
  }

  async function handleFormData() {
    const output = document.getElementById("output")!
    output.textContent = "Loading..."

    try {
      const response = await fetch("http://localhost:3333/formdata")
      const formData = await response.formData()
      const entries: string[] = []
      formData.forEach((value, key) => {
        entries.push(`${key}: ${value}`)
      })
      output.textContent = entries.join("\n")
    } catch (e) {
      output.textContent = `Error: ${e}`
    }
  }

  function handleAbort() {
    abortController.abort()
  }

  return (
    <div>
      <h1>Body Format Tests</h1>
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <button onClick={handleStream}>Stream (SSE)</button>
        <button onClick={handleText}>Text</button>
        <button onClick={handleJson}>JSON</button>
        <button onClick={handleBlob}>Blob</button>
        <button onClick={handleArrayBuffer}>ArrayBuffer</button>
        <button onClick={handleFormData}>FormData</button>
        <button onClick={handleAbort}>Abort</button>
      </div>
      <pre id="output" />
    </div>
  )
}
