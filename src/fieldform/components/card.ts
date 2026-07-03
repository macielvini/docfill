import { html, nothing, type TemplateResult } from 'lit-html'

export function card(content: TemplateResult | TemplateResult[], opts: { onClick?: () => void; className?: string } = {}): TemplateResult {
  const clickable = opts.className || ''
  return html`<div
    class="card card-border bg-base-100 ${opts.onClick ? 'cursor-pointer hover:bg-base-200' : ''} ${clickable}"
    @click=${opts.onClick ?? nothing}
  >
    <div class="card-body p-3.5 gap-2">${content}</div>
  </div>`
}
