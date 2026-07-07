import { html, type TemplateResult } from 'lit-html'
import { ref } from 'lit-html/directives/ref.js'
import { icon } from '../icons'

export interface PasteEditorScreenProps {
  initialTitle: string
  initialText: string
  onSave: (title: string, text: string) => void
  onBack: () => void
}

export function pasteEditorScreen(props: PasteEditorScreenProps): TemplateResult {
  let titleEl: HTMLInputElement | null = null
  let textEl: HTMLTextAreaElement | null = null

  const save = () => {
    const title = titleEl?.value.trim() || ''
    const text = textEl?.value || ''
    if (!title || !text.trim()) return
    props.onSave(title, text)
  }

  return html`<div class="flex flex-1 flex-col gap-4 p-6">
    <div class="flex items-center gap-2">
      <button class="btn btn-ghost btn-sm btn-square" @click=${props.onBack} title="Voltar">${icon('arrow-left')}</button>
    </div>

    <input
      class="input w-full"
      placeholder="Título do modelo"
      .value=${props.initialTitle}
      ${ref((el) => {
        if (el instanceof HTMLInputElement) titleEl = el
      })}
    />

    <textarea
      class="textarea w-full flex-1 font-mono text-sm"
      rows="16"
      placeholder="Cole ou escreva o conteúdo do modelo em Markdown"
      .value=${props.initialText}
      ${ref((el) => {
        if (el instanceof HTMLTextAreaElement) textEl = el
      })}
    ></textarea>

    <button class="btn btn-primary" @click=${save}>${icon('check')}Salvar</button>
  </div>`
}
