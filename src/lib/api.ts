const IPV4_RE = /^\d{1,3}(\.\d{1,3}){3}$/

function resolveBase(): string {
  if (import.meta.env.DEV) return ''
  const host = window.location.hostname
  if (host === 'localhost' || host.startsWith('127.') || host.endsWith('.xyz')) {
    return 'https://llama.fmweb.xyz'
  }
  if (host.endsWith('.ts.net')) {
    return ''
  }
  if (IPV4_RE.test(host)) {
    return `http://${host}:11434`
  }
  return 'https://llama.fmweb.space'
}

export const API_BASE = resolveBase()

export interface ChatImage {
  dataUrl: string
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  image?: ChatImage
}

function buildContent(msg: ChatMessage): unknown {
  if (!msg.image) return msg.content
  return [
    { type: 'text', text: msg.content },
    { type: 'image_url', image_url: { url: msg.image.dataUrl } },
  ]
}

export interface StreamCallbacks {
  onToken: (text: string) => void
  onDone: () => void
  onError: (err: Error) => void
}

export async function streamChat(
  model: string,
  messages: ChatMessage[],
  signal: AbortSignal,
  cb: StreamCallbacks,
) {
  try {
    const res = await fetch(`${API_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        model,
        stream: true,
        messages: messages.map((m) => ({
          role: m.role,
          content: buildContent(m),
        })),
      }),
    })

    if (!res.ok || !res.body) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') {
          cb.onDone()
          return
        }
        try {
          const json = JSON.parse(data)
          const token = json.choices?.[0]?.delta?.content
          if (token) cb.onToken(token)
        } catch {
          void 0
        }
      }
    }
    cb.onDone()
  } catch (err) {
    if ((err as Error).name === 'AbortError') return
    cb.onError(err as Error)
  }
}
