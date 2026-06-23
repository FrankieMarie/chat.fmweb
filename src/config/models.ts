export type ModelId =
  | 'qwen2.5-coder:14b'
  | 'dolphincoder:15b'
  | 'qwen3:30b'
  | 'gpt-oss:20b'
  | 'deepseek-r1:14b'
  | 'qwen3-vl:8b'
  | 'dolphin3:8b'
  | 'flux-kontext'

export type ModelKind = 'chat' | 'image-edit'

export interface ModelInfo {
  id: ModelId
  name: string
  blurb: string
  vision: boolean
  reasoning: boolean
  defaultProfile: ProfileId
  numCtx: number
  kind?: ModelKind
}

import type { ProfileId } from './profiles'

export const MODELS: ModelInfo[] = [
  {
    id: 'qwen2.5-coder:14b',
    name: 'Qwen2.5 Coder 14B',
    blurb: 'Coding — fast, fully on GPU. Best for code.',
    vision: false,
    reasoning: false,
    defaultProfile: 'coder',
    numCtx: 32768,
  },
  {
    id: 'dolphincoder:15b',
    name: 'DolphinCoder 15B',
    blurb: 'Uncensored coding assistant.',
    vision: false,
    reasoning: false,
    defaultProfile: 'coder',
    numCtx: 16384,
  },
  {
    id: 'qwen3:30b',
    name: 'Qwen3 30B',
    blurb: 'Big general model. Smart, reasoning.',
    vision: false,
    reasoning: true,
    defaultProfile: 'reasoner',
    numCtx: 32768,
  },
  {
    id: 'gpt-oss:20b',
    name: 'GPT-OSS 20B',
    blurb: 'General + reasoning. Large context.',
    vision: false,
    reasoning: true,
    defaultProfile: 'reasoner',
    numCtx: 131072,
  },
  {
    id: 'deepseek-r1:14b',
    name: 'DeepSeek R1 14B',
    blurb: 'Reasoning — shows its thinking.',
    vision: false,
    reasoning: true,
    defaultProfile: 'reasoner',
    numCtx: 32768,
  },
  {
    id: 'qwen3-vl:8b',
    name: 'Qwen3 VL 8B',
    blurb: 'Vision — send it images.',
    vision: true,
    reasoning: false,
    defaultProfile: 'vision',
    numCtx: 32768,
  },
  {
    id: 'dolphin3:8b',
    name: 'Dolphin 3 8B',
    blurb: 'Uncensored general chat.',
    vision: false,
    reasoning: false,
    defaultProfile: 'uncensored',
    numCtx: 32768,
  },
  {
    id: 'flux-kontext',
    name: 'FLUX Kontext',
    blurb: 'Edit images — attach an image, describe the edit.',
    vision: true,
    reasoning: false,
    defaultProfile: 'flux-edit',
    numCtx: 0,
    kind: 'image-edit',
  },
]

export const getModel = (id: ModelId) => MODELS.find((m) => m.id === id)!
