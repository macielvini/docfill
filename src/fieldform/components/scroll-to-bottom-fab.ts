import { html, type TemplateResult } from 'lit-html'
import { ref } from 'lit-html/directives/ref.js'
import { icon } from '../icons'

interface WiredFab extends HTMLButtonElement {
  _fabCleanup?: () => void
}

let currentFab: WiredFab | undefined

function wireScrollFab(el: Element | undefined) {
  if (!el) {
    currentFab?._fabCleanup?.()
    currentFab = undefined
    return
  }
  const btn = el as WiredFab
  if (btn.dataset.fabWired) return
  btn.dataset.fabWired = '1'
  currentFab = btn

  const onScroll = () => {
    const show = window.scrollY > 80
    btn.classList.toggle('opacity-0', !show)
    btn.classList.toggle('pointer-events-none', !show)
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
  btn._fabCleanup = () => window.removeEventListener('scroll', onScroll)
}

export function scrollToBottomFab(): TemplateResult {
  return html`<button
    ${ref(wireScrollFab)}
    class="btn btn-primary btn-circle fixed right-4 bottom-24 z-30 opacity-0 pointer-events-none shadow-lg transition-opacity"
    @click=${() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
    title="Ir para o final"
  >
    ${icon('arrow-down')}
  </button>`
}
