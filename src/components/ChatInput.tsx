import { useRef, useState } from 'react'
import type { ChatImage } from '../lib/api'

interface Props {
  onSend: (text: string, image?: ChatImage) => void
  onStop: () => void
  streaming: boolean
  visionEnabled: boolean
}

export function ChatInput({ onSend, onStop, streaming, visionEnabled }: Props) {
  const [text, setText] = useState('')
  const [image, setImage] = useState<ChatImage | null>(null)
  const [history, setHistory] = useState<string[]>([])
  const [histIndex, setHistIndex] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  const submit = () => {
    if (streaming) return
    if (!text.trim() && !image) return
    const sent = text.trim()
    onSend(sent, image ?? undefined)
    setHistory((h) => (h[h.length - 1] === sent ? h : [...h, sent]))
    setHistIndex(null)
    setText('')
    setImage(null)
    if (taRef.current) taRef.current.style.height = 'auto'
  }

  const recall = (idx: number | null) => {
    setHistIndex(idx)
    setText(idx === null ? '' : history[idx])
    requestAnimationFrame(() => {
      const ta = taRef.current
      if (!ta) return
      ta.style.height = 'auto'
      ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
      const end = ta.value.length
      ta.setSelectionRange(end, end)
    })
  }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImage({ dataUrl: reader.result as string })
    reader.readAsDataURL(file)
  }

  return (
    <div className="border-t border-white/10 bg-[#12151d] p-3">
      {image && (
        <div className="mb-2 flex items-center gap-2">
          <img src={image.dataUrl} alt="" className="h-16 rounded-lg" />
          <button
            onClick={() => setImage(null)}
            className="text-xs text-gray-400 hover:text-white"
          >
            remove
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        {visionEnabled && (
          <>
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-lg bg-white/10 px-3 py-2 text-lg hover:bg-white/20"
              title="Attach image"
            >
              📎
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={onFile}
            />
          </>
        )}
        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
              return
            }
            if (e.key === 'ArrowUp' && history.length > 0) {
              const caretLine = text.slice(0, e.currentTarget.selectionStart).includes('\n')
              if (!caretLine) {
                e.preventDefault()
                const next = histIndex === null ? history.length - 1 : Math.max(0, histIndex - 1)
                recall(next)
              }
            }
            if (e.key === 'ArrowDown' && histIndex !== null) {
              const atLastLine = !text.slice(e.currentTarget.selectionStart).includes('\n')
              if (atLastLine) {
                e.preventDefault()
                if (histIndex >= history.length - 1) recall(null)
                else recall(histIndex + 1)
              }
            }
          }}
          rows={1}
          placeholder="Message…  (Enter to send, Shift+Enter for newline)"
          className="max-h-40 flex-1 resize-none rounded-xl bg-[#1b1f2a] px-3 py-2 text-sm outline-none placeholder:text-gray-500"
        />
        {streaming ? (
          <button
            onClick={onStop}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium hover:bg-red-500"
          >
            Stop
          </button>
        ) : (
          <button
            onClick={submit}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
          >
            Send
          </button>
        )}
      </div>
    </div>
  )
}
