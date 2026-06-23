import { useEffect, useRef, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { ChatInput } from './components/ChatInput'
import { Message } from './components/Message'
import { MODELS, getModel, type ModelId } from './config/models'
import { getProfile, type ProfileId } from './config/profiles'
import { streamChat, editImage, unloadModel, type ChatImage, type ChatMessage } from './lib/api'

function estimateTokens(msgs: ChatMessage[], systemPrompt: string): number {
  let chars = systemPrompt.length
  let imgs = 0
  for (const m of msgs) {
    chars += m.content.length
    if (m.image) imgs++
  }
  return Math.ceil(chars / 4) + imgs * 1000
}

export default function App() {
  const [model, setModel] = useState<ModelId>(MODELS[0].id)
  const [profile, setProfile] = useState<ProfileId>(MODELS[0].defaultProfile)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preloadImage, setPreloadImage] = useState<ChatImage | null>(null)
  const [guidance, setGuidance] = useState(2.5)
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const modelInfo = getModel(model)

  const selectModel = (id: ModelId) => {
    if (id === model) {
      setSidebarOpen(false)
      return
    }
    // Switching to the image-edit model: free Ollama VRAM so ComfyUI has room.
    if (getModel(id).kind === 'image-edit' && modelInfo.kind !== 'image-edit') {
      void unloadModel(model)
    }
    // Clear chat context on model switch.
    abortRef.current?.abort()
    setMessages([])
    setStreaming(false)
    setError(null)
    setPreloadImage(null)
    setModel(id)
    setSidebarOpen(false)
    setProfile(getModel(id).defaultProfile)
  }

  const selectProfile = (id: ProfileId) => {
    setProfile(id)
  }

  const newChat = () => {
    abortRef.current?.abort()
    setMessages([])
    setStreaming(false)
    setError(null)
    setSidebarOpen(false)
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  const send = (text: string, image?: ChatImage) => {
    setError(null)
    const userMsg: ChatMessage = { role: 'user', content: text, image }
    const history = [...messages, userMsg]
    setMessages([...history, { role: 'assistant', content: '' }])
    setStreaming(true)

    const abort = new AbortController()
    abortRef.current = abort

    if (modelInfo.kind === 'image-edit') {
      if (!image) {
        setError('Attach an image to edit.')
        setStreaming(false)
        setMessages(history)
        return
      }
      editImage(image.dataUrl, text, guidance, abort.signal)
        .then((resultUrl) => {
          setMessages((prev) => {
            const next = [...prev]
            next[next.length - 1] = {
              role: 'assistant',
              content: '',
              image: { dataUrl: resultUrl },
            }
            return next
          })
          setStreaming(false)
        })
        .catch((err: Error) => {
          if (err.name === 'AbortError') return
          setError(err.message)
          setStreaming(false)
        })
      return
    }

    const sys: ChatMessage = {
      role: 'system',
      content: getProfile(profile).systemPrompt,
    }
    streamChat(model, [sys, ...history], abort.signal, {
      onToken: (tok) =>
        setMessages((prev) => {
          const next = [...prev]
          next[next.length - 1] = {
            ...next[next.length - 1],
            content: next[next.length - 1].content + tok,
          }
          return next
        }),
      onDone: () => setStreaming(false),
      onError: (err) => {
        setError(err.message)
        setStreaming(false)
      },
    })
  }

  const stop = () => {
    abortRef.current?.abort()
    setStreaming(false)
  }

  return (
    <div className="flex h-full">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        selectedModel={model}
        selectedProfile={profile}
        onSelectModel={selectModel}
        onSelectProfile={selectProfile}
        onNewChat={newChat}
      />

      <div className="flex flex-1 flex-col">

        <header className="flex items-center gap-3 border-b border-white/10 bg-[#12151d] px-3 py-2.5">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg bg-white/10 px-2.5 py-1 text-sm md:hidden"
          >
            ☰
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{modelInfo.name}</div>
            <div className="truncate text-xs text-gray-400">
              {getProfile(profile).name} · {modelInfo.blurb}
            </div>
          </div>
          {messages.length > 0 && modelInfo.numCtx > 0 &&
            (() => {
              const used = estimateTokens(messages, getProfile(profile).systemPrompt)
              const pct = Math.min(100, Math.round((used / modelInfo.numCtx) * 100))
              const warn = pct >= 80
              return (
                <div className="shrink-0 text-right text-xs">
                  <div className={warn ? 'text-amber-400' : 'text-gray-400'}>
                    ~{used.toLocaleString()} / {modelInfo.numCtx.toLocaleString()}
                  </div>
                  <div className="text-gray-500">
                    {messages.length} msgs · {pct}%
                  </div>
                </div>
              )
            })()}
        </header>


        <div ref={scrollRef} className="flex-1 overflow-y-auto py-3">
          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              Pick a model and start chatting.
            </div>
          )}
          {messages.map((m, i) => (
            <Message
              key={i}
              msg={m}
              loading={streaming && i === messages.length - 1 && m.role === 'assistant'}
              onEditImage={
                modelInfo.kind === 'image-edit' && m.role === 'assistant' && m.image
                  ? setPreloadImage
                  : undefined
              }
            />
          ))}
          {error && (
            <div className="px-4 py-2 text-sm text-red-400">Error: {error}</div>
          )}
        </div>

        <ChatInput
          onSend={send}
          onStop={stop}
          streaming={streaming}
          visionEnabled={modelInfo.vision}
          preloadImage={preloadImage}
          onPreloadConsumed={() => setPreloadImage(null)}
          guidance={modelInfo.kind === 'image-edit' ? guidance : undefined}
          onGuidanceChange={setGuidance}
        />
      </div>
    </div>
  )
}
