import { html, type TemplateResult } from 'lit-html'

export function segmentedToggle(options: { label: string; active: boolean; onClick: () => void }[]): TemplateResult {
  return html`<div class="join w-full">
    ${options.map(
      (opt) => html`<button class="btn join-item btn-sm flex-1 ${opt.active ? 'btn-primary' : ''}" @click=${opt.onClick}>${opt.label}</button>`,
    )}
  </div>`
}
