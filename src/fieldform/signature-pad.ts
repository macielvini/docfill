import { html, type TemplateResult } from 'lit-html'
import { ref } from 'lit-html/directives/ref.js'

export interface SignaturePadHost {
  getValue(slug: string): string
  setValue(slug: string, dataUrl: string): void
}

interface WiredCanvas extends HTMLCanvasElement {
  _sigCleanup?: () => void
}

function initCanvas(host: SignaturePadHost, slugKey: string, canvas: Element | undefined) {
  if (!canvas || !(canvas instanceof HTMLCanvasElement)) return
  const el = canvas as WiredCanvas
  if (el.dataset.slug === slugKey) return
  el._sigCleanup?.()
  el.dataset.slug = slugKey

  const ratio = window.devicePixelRatio || 1
  const W = 600
  const H = 150
  canvas.width = W * ratio
  canvas.height = H * ratio
  const ctx = canvas.getContext('2d')!
  ctx.scale(ratio, ratio)
  ctx.lineWidth = 2.4
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = '#1c1c1a'

  const existing = host.getValue(slugKey)
  if (existing) {
    const img = new Image()
    img.onload = () => ctx.drawImage(img, 0, 0, W, H)
    img.src = existing
  }

  let drawing = false
  let last: { x: number; y: number } | null = null
  const pos = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect()
    return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) }
  }
  const start = (e: PointerEvent) => {
    e.preventDefault()
    drawing = true
    last = pos(e)
  }
  const move = (e: PointerEvent) => {
    if (!drawing || !last) return
    e.preventDefault()
    const p = pos(e)
    ctx.beginPath()
    ctx.moveTo(last.x, last.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    last = p
  }
  const end = () => {
    if (!drawing) return
    drawing = false
    host.setValue(slugKey, canvas.toDataURL('image/png'))
  }
  canvas.addEventListener('pointerdown', start)
  canvas.addEventListener('pointermove', move)
  window.addEventListener('pointerup', end)
  el._sigCleanup = () => {
    canvas.removeEventListener('pointerdown', start)
    canvas.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', end)
  }
}

export function clearSignature(host: SignaturePadHost, slugKey: string, canvas: HTMLCanvasElement | null | undefined) {
  if (canvas) {
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }
  host.setValue(slugKey, '')
}

export function signaturePad(host: SignaturePadHost, slugKey: string): TemplateResult {
  let canvasEl: HTMLCanvasElement | undefined
  return html`<div class="flex flex-col gap-1.5">
    <canvas
      ${ref((el) => {
        canvasEl = el as HTMLCanvasElement | undefined
        initCanvas(host, slugKey, el)
      })}
      class="block h-37.5 w-full rounded-box border border-base-300 border-b-2 border-b-primary bg-base-100"
      style="touch-action:none;cursor:crosshair;"
    ></canvas>
    <div class="flex items-center justify-between">
      <span class="text-[10.5px] text-base-content/60">Desenhe sua assinatura acima</span>
      <button class="btn btn-ghost btn-xs" @click=${() => clearSignature(host, slugKey, canvasEl)}>Limpar</button>
    </div>
  </div>`
}
