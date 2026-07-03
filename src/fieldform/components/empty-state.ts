import { html, type TemplateResult } from 'lit-html'

export function emptyState(message: string): TemplateResult {
  return html`<div class="rounded-box border border-dashed border-base-300 p-4 text-center text-sm text-base-content/60">${message}</div>`
}
