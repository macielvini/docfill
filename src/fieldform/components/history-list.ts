import { html, type TemplateResult } from 'lit-html'
import { repeat } from 'lit-html/directives/repeat.js'
import { getFieldsFrom } from '../markers'
import { relTime, type HistoryEntry } from '../history'
import { card } from './card'

export interface HistoryListProps {
  entries: HistoryEntry[]
  onOpen: (h: HistoryEntry) => void
  onRemove: (id: string) => void
}

export function historyList(props: HistoryListProps): TemplateResult {
  return html`<div class="flex flex-col gap-2">
    ${repeat(
      props.entries,
      (h) => h.id,
      (h) => {
        const fs = getFieldsFrom(h.docText)
        const filledN = fs.filter((f) => h.values && h.values[f.slug]).length
        return card(
          html`<div class="flex items-center gap-2">
            <button class="flex min-w-0 flex-1 flex-col gap-0.5 text-left" @click=${() => props.onOpen(h)}>
              <span class="truncate text-[13.5px] font-semibold">${h.title || 'Documento sem título'}</span>
              <span class="text-[11px] text-base-content/60">${relTime(h.updatedAt)} · ${filledN}/${fs.length} campos</span>
            </button>
            <button class="btn btn-ghost btn-sm btn-circle flex-none" @click=${() => props.onRemove(h.id)} title="Remover">×</button>
          </div>`,
        )
      },
    )}
  </div>`
}
