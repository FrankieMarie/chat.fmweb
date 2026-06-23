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

function resolveComfyBase(): string {
  if (import.meta.env.DEV) return ''
  const host = window.location.hostname
  if (host === 'localhost' || host.startsWith('127.') || host.endsWith('.xyz')) {
    return 'https://comfy.fmweb.xyz'
  }
  if (host.endsWith('.ts.net')) {
    return ''
  }
  if (IPV4_RE.test(host)) {
    return `http://${host}:8188`
  }
  return 'https://comfy.fmweb.space'
}

export const COMFY_BASE = resolveComfyBase()

// Free Ollama VRAM by forcing the given model to unload immediately.
// Used when switching to the FLUX image-edit model so ComfyUI has room.
export async function unloadModel(model: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, keep_alive: 0 }),
    })
  } catch {
    // best-effort; ignore failures
    void 0
  }
}

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

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, b64] = dataUrl.split(',')
  const mime = head.match(/data:(.*?);/)?.[1] ?? 'image/png'
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export async function editImage(
  dataUrl: string,
  prompt: string,
  guidance: number,
  signal: AbortSignal,
): Promise<string> {
  // 1. upload source image
  const form = new FormData()
  form.append('image', dataUrlToBlob(dataUrl), 'input.png')
  form.append('overwrite', 'true')
  const up = await fetch(`${COMFY_BASE}/upload/image`, {
    method: 'POST',
    body: form,
    signal,
  })
  if (!up.ok) throw new Error(`upload failed: HTTP ${up.status}`)
  const uploaded = (await up.json()) as { name: string; subfolder?: string }
  const imageName = uploaded.subfolder
    ? `${uploaded.subfolder}/${uploaded.name}`
    : uploaded.name

  // 2. queue workflow
  const { buildWorkflow } = await import('../config/fluxKontext')
  const workflow = buildWorkflow(imageName, prompt, guidance)
  const clientId = crypto.randomUUID()
  const queued = await fetch(`${COMFY_BASE}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow, client_id: clientId }),
    signal,
  })
  if (!queued.ok) throw new Error(`queue failed: HTTP ${queued.status}: ${await queued.text()}`)
  const { prompt_id: promptId } = (await queued.json()) as { prompt_id: string }

  // 3. poll history until done
  for (;;) {
    if (signal.aborted) throw new DOMException('aborted', 'AbortError')
    await new Promise((r) => setTimeout(r, 1000))
    const hres = await fetch(`${COMFY_BASE}/history/${promptId}`, { signal })
    if (!hres.ok) continue
    const hist = (await hres.json()) as Record<string, HistoryEntry>
    const entry = hist[promptId]
    if (!entry) continue
    const status = entry.status?.status_str
    if (status === 'error') throw new Error('generation failed')
    const outputs = entry.outputs
    if (!outputs) continue
    for (const nodeId of Object.keys(outputs)) {
      const imgs = outputs[nodeId].images
      if (imgs && imgs.length) {
        const img = imgs[0]
        const params = new URLSearchParams({
          filename: img.filename,
          subfolder: img.subfolder ?? '',
          type: img.type ?? 'output',
        })
        const view = await fetch(`${COMFY_BASE}/view?${params}`, { signal })
        if (!view.ok) throw new Error(`fetch image failed: HTTP ${view.status}`)
        return blobToDataUrl(await view.blob())
      }
    }
  }
}

interface HistoryEntry {
  status?: { status_str?: string; completed?: boolean }
  outputs?: Record<string, { images?: { filename: string; subfolder?: string; type?: string }[] }>
}
