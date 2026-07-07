import { html, type TemplateResult } from 'lit-html'
import type { Template, HistoryEntry } from '../history'
import { emptyState } from '../components/empty-state'
import { historyList } from '../components/history-list'

export interface TemplateDetailScreenProps {
  template: Template
  entries: HistoryEntry[]
  onStartNew: (t: Template) => void
  onEditTemplate: (t: Template) => void
  onOpenHistory: (h: HistoryEntry) => void
  onRemoveHistory: (id: string) => void
  onBack: () => void
}

export function templateDetailScreen(props: TemplateDetailScreenProps): TemplateResult {
  const { template: t, entries } = props
  return html`<div class="flex flex-1 flex-col gap-5 p-6">
    <button class="btn btn-ghost btn-sm -ml-2 w-fit gap-1" @click=${props.onBack}>← Voltar</button>
    <h1 class="text-[22px] font-bold tracking-tight">${t.title}</h1>

    <div class="flex gap-2">
      <button class="btn btn-primary" @click=${() => props.onStartNew(t)}>Preencher novo</button>
      <button class="btn btn-ghost" @click=${() => props.onEditTemplate(t)}>Editar modelo</button>
    </div>

    <div class="flex flex-col gap-2">
      <div class="text-[11px] font-bold tracking-wide text-base-content/60 uppercase">Preenchimentos anteriormente (${entries.length}/20)</div>
      ${entries.length
        ? historyList({ entries, onOpen: props.onOpenHistory, onRemove: props.onRemoveHistory })
        : emptyState('Nenhum preenchimento ainda.')}
    </div>
  </div>`
}
