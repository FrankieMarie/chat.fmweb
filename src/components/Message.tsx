import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import type { ChatMessage } from '../lib/api'

function splitThink(content: string): { think: string | null; body: string } {
  const match = content.match(/<think>([\s\S]*?)<\/think>/i)
  if (!match) return { think: null, body: content }
  const think = match[1].trim()
  const body = content.replace(match[0], '').trim()
  return { think, body }
}

export function Message({
  msg,
  onEditImage,
  loading,
}: {
  msg: ChatMessage
  onEditImage?: (img: { dataUrl: string }) => void
  loading?: boolean
}) {
  const isUser = msg.role === 'user'
  const { think, body } = isUser ? { think: null, body: msg.content } : splitThink(msg.content)

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} px-3 py-1.5`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser ? 'bg-blue-600 text-white' : 'bg-[#1b1f2a] text-gray-100'
        }`}
      >
        {msg.image && (
          <div className="mb-2">
            <img
              src={msg.image.dataUrl}
              alt={isUser ? 'upload' : 'result'}
              className="max-h-72 rounded-lg"
            />
            {!isUser && (
              <div className="mt-1 flex gap-3">
                <a
                  href={msg.image.dataUrl}
                  download="flux-edit.png"
                  className="text-xs text-blue-300 hover:text-blue-200"
                >
                  ↓ Download
                </a>
                {onEditImage && (
                  <button
                    onClick={() => onEditImage({ dataUrl: msg.image!.dataUrl })}
                    className="text-xs text-blue-300 hover:text-blue-200"
                  >
                    ✎ Edit this
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {think && (
          <details className="mb-2 rounded-lg bg-black/30 px-3 py-1.5 text-xs text-gray-400">
            <summary className="cursor-pointer select-none">Thinking</summary>
            <div className="prose prose-invert mt-2 max-w-none whitespace-pre-wrap">
              {think}
            </div>
          </details>
        )}

        {loading && !body && !msg.image ? (
          <span className="typing-dots text-gray-300" aria-label="thinking">
            <span />
            <span />
            <span />
          </span>
        ) : isUser ? (
          <span className="whitespace-pre-wrap">{body}</span>
        ) : (
          <div className="prose prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
              {body || ' '}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}
