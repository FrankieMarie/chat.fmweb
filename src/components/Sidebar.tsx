import { MODELS, getModel, type ModelId } from '../config/models'
import { PROFILES, type ProfileId } from '../config/profiles'

interface Props {
  open: boolean
  onClose: () => void
  selectedModel: ModelId
  selectedProfile: ProfileId
  onSelectModel: (id: ModelId) => void
  onSelectProfile: (id: ProfileId) => void
  onNewChat: () => void
}

export function Sidebar({
  open,
  onClose,
  selectedModel,
  selectedProfile,
  onSelectModel,
  onSelectProfile,
  onNewChat,
}: Props) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed z-30 flex h-full w-72 flex-col border-r border-white/10 bg-[#12151d] transition-transform md:static md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4">
          <h1 className="text-base font-semibold">chat.fmweb</h1>
          <button
            onClick={onNewChat}
            className="rounded-lg bg-white/10 px-2.5 py-1 text-xs hover:bg-white/20"
          >
            New chat
          </button>
        </div>

        <div className="px-2 pb-2">
          <div className="px-2 pb-1 text-xs uppercase tracking-wide text-gray-500">
            Agent profile
          </div>
          {PROFILES.filter((p) =>
            getModel(selectedModel).kind === 'image-edit'
              ? p.id === 'flux-edit'
              : p.id !== 'flux-edit',
          ).map((p) => (
            <button
              key={p.id}
              onClick={() => onSelectProfile(p.id)}
              className={`mb-1 block w-full rounded-lg px-3 py-2 text-left ${
                selectedProfile === p.id
                  ? 'bg-blue-600/20 ring-1 ring-blue-500/50'
                  : 'hover:bg-white/5'
              }`}
            >
              <div className="text-sm font-medium">{p.name}</div>
              <div className="text-xs text-gray-400">{p.description}</div>
            </button>
          ))}
        </div>

        <div className="mt-2 flex-1 overflow-y-auto px-2 pb-4">
          <div className="px-2 pb-1 text-xs uppercase tracking-wide text-gray-500">
            Models
          </div>
          {MODELS.map((m) => (
            <button
              key={m.id}
              onClick={() => onSelectModel(m.id)}
              className={`mb-1 block w-full rounded-lg px-3 py-2 text-left ${
                selectedModel === m.id
                  ? 'bg-blue-600/20 ring-1 ring-blue-500/50'
                  : 'hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-1.5 text-sm font-medium">
                {m.name}
                {m.vision && <span title="vision">🖼️</span>}
                {m.reasoning && <span title="reasoning">🧠</span>}
              </div>
              <div className="text-xs text-gray-400">{m.blurb}</div>
            </button>
          ))}
        </div>
      </aside>
    </>
  )
}
