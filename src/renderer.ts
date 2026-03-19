export async function fetch(url: string | URL, _requestInit?: RequestInit) {
  const id = crypto.randomUUID()
  const { signal, ...requestInit } = _requestInit || {}

  const { responseInit, streamRef } = await new Promise<{
    port: MessagePort
    responseInit: ResponseInit
    streamRef: ReadableStream | null
  }>((resolve) => {
    signal?.addEventListener(
      "abort",
      () => {
        __electronFetchInternal.abort(id)
      },
      { once: true },
    )

    __electronFetchInternal.onStreamChannel(id, (port) => {
      const responseInit: ResponseInit = {}
      const decoder = new TextDecoder()
      const streamRef = new ReadableStream({
        start(controller) {
          port.onmessage = (event) => {
            const data = JSON.parse(event.data)
            if (data.type === "end") {
              controller.close()
              port.close()
            } else if (data.type === "error") {
              controller.error(data.error)
              port.close()
            } else if (data.type === "response") {
              responseInit.status = data.status
              responseInit.statusText = data.statusText
              responseInit.headers = data.headers
            } else if (data.type === "chunk") {
              controller.enqueue(decoder.decode(data.value, { stream: true }))
            }
          }
          port.start()
        },
        cancel() {
          __electronFetchInternal.abort(id)
        },
      })

      resolve({
        port,
        streamRef,
        responseInit,
      })
    })

    __electronFetchInternal.request({
      id,
      url: url.toString(),
      init: requestInit,
    })
  })

  return new Response(streamRef, responseInit)
}
