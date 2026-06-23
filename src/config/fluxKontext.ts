// FLUX.1 Kontext (dev) image-edit workflow, exported from ComfyUI API format.
// Only three fields are swapped per request: input image, prompt text, seed.
// Everything else (model, encoders, VAE, sampler) is frozen in.

export const LOAD_IMAGE_NODE = '190'
export const PROMPT_NODE = '192:6'
export const SEED_NODE = '192:31'
export const GUIDANCE_NODE = '192:35'
export const OUTPUT_NODE = '136'

type ComfyWorkflow = Record<string, { inputs: Record<string, unknown>; class_type: string; _meta?: unknown }>

const TEMPLATE: ComfyWorkflow = {
  '136': {
    inputs: { images: ['192:8', 0] },
    class_type: 'PreviewImage',
  },
  '190': {
    inputs: { image: 'images.jpeg' },
    class_type: 'LoadImage',
  },
  '192:39': {
    inputs: { vae_name: 'ae.safetensors' },
    class_type: 'VAELoader',
  },
  '192:38': {
    inputs: {
      clip_name1: 'clip_l.safetensors',
      clip_name2: 't5xxl_fp8_e4m3fn.safetensors',
      type: 'flux',
      device: 'default',
    },
    class_type: 'DualCLIPLoader',
  },
  '192:135': {
    inputs: { conditioning: ['192:6', 0] },
    class_type: 'ConditioningZeroOut',
  },
  '192:8': {
    inputs: { samples: ['192:31', 0], vae: ['192:39', 0] },
    class_type: 'VAEDecode',
  },
  '192:124': {
    inputs: { pixels: ['192:42', 0], vae: ['192:39', 0] },
    class_type: 'VAEEncode',
  },
  '192:35': {
    inputs: { guidance: 2.5, conditioning: ['192:177', 0] },
    class_type: 'FluxGuidance',
  },
  '192:37': {
    inputs: { unet_name: 'flux1-kontext-dev-fp8.safetensors', weight_dtype: 'default' },
    class_type: 'UNETLoader',
  },
  '192:177': {
    inputs: { conditioning: ['192:6', 0], latent: ['192:124', 0] },
    class_type: 'ReferenceLatent',
  },
  '192:146': {
    inputs: {
      direction: 'right',
      match_image_size: true,
      spacing_width: 0,
      spacing_color: 'white',
      image1: ['190', 0],
    },
    class_type: 'ImageStitch',
  },
  '192:42': {
    inputs: { image: ['192:146', 0] },
    class_type: 'FluxKontextImageScale',
  },
  '192:31': {
    inputs: {
      seed: 26287264827379,
      steps: 20,
      cfg: 1,
      sampler_name: 'euler',
      scheduler: 'simple',
      denoise: 1,
      model: ['192:37', 0],
      positive: ['192:35', 0],
      negative: ['192:135', 0],
      latent_image: ['192:124', 0],
    },
    class_type: 'KSampler',
  },
  '192:6': {
    inputs: { text: 'add a mouse sitting next to the cat', clip: ['192:38', 0] },
    class_type: 'CLIPTextEncode',
  },
}

// Neutral preservation hint: localizes edits without forbidding any named change.
const PRESERVE_HINT = 'Preserve the rest of the image.'

export function buildWorkflow(
  imageName: string,
  prompt: string,
  guidance = 2.5,
): ComfyWorkflow {
  const wf: ComfyWorkflow = structuredClone(TEMPLATE)
  const trimmed = prompt.trim()
  const text = trimmed ? `${trimmed} ${PRESERVE_HINT}` : PRESERVE_HINT
  wf[LOAD_IMAGE_NODE].inputs.image = imageName
  wf[PROMPT_NODE].inputs.text = text
  wf[SEED_NODE].inputs.seed = Math.floor(Math.random() * 1e15)
  wf[GUIDANCE_NODE].inputs.guidance = guidance
  return wf
}
