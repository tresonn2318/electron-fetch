export async function fetch(url: string | URL, init?: RequestInit) {
  const id = crypto.randomUUID()

  __electronFetchInternal.request({
    id,
    url: url.toString(),
    init,
  })

  __electronFetchInternal.onStreamChannel(id, (port) => {})

  return new Response()
}
