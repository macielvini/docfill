import { html, type TemplateResult } from 'lit-html'
import { repeat } from 'lit-html/directives/repeat.js'
import { ref } from 'lit-html/directives/ref.js'
import type { Template, HistoryEntry } from '../history'
import { card } from '../components/card'
import { icon } from '../icons'

export interface TemplatesScreenProps {
  templates: Template[]
  history: HistoryEntry[]
  onUpload: (e: Event) => void
  onOpenPasteEditor: () => void
  onSelectTemplate: (id: string) => void
  onRemoveTemplate: (id: string) => void
  editingTemplateId: string | null
  onStartRenameTemplate: (id: string) => void
  onConfirmRenameTemplate: (id: string, title: string) => void
  onCancelRenameTemplate: () => void
}

export function templatesScreen(props: TemplatesScreenProps): TemplateResult {
  return html`<div class="flex flex-1 flex-col gap-5 p-6">
    <div class="flex flex-col gap-1.5">
      <h1 class="text-[22px] font-bold tracking-tight">Modelos</h1>
      <p class="text-[13.5px] leading-relaxed text-base-content/60">Escolha um modelo para preencher ou envie um novo arquivo Markdown.</p>
    </div>

    <div class="flex gap-2">
      <label class="btn btn-outline btn-sm btn-primary">
        ${icon('file-up')}Enviar arquivo
        <input type="file" class="hidden" accept=".md,.markdown,.txt,text/markdown,text/plain" @change=${props.onUpload} />
      </label>
      <button class="btn btn-outline btn-sm btn-primary" @click=${props.onOpenPasteEditor}>${icon('clipboard-pen-line')}Colar e editar</button>
    </div>


    <div class="flex flex-col gap-2">
      ${repeat(
        props.templates,
        (t) => t.id,
        (t) => {
          const count = props.history.filter((h) => h.templateId === t.id).length
          const editing = props.editingTemplateId === t.id
          return card(
            editing
              ? html`<div class="flex items-center gap-2">
                  <input
                    class="input input-sm min-w-0 flex-1"
                    .value=${t.title}
                    @click=${(e: Event) => e.stopPropagation()}
                    @blur=${() => setTimeout(() => props.onCancelRenameTemplate())}
                    @keydown=${(e: KeyboardEvent) => {
                      if (e.key === 'Enter') props.onConfirmRenameTemplate(t.id, (e.target as HTMLInputElement).value)
                      if (e.key === 'Escape') props.onCancelRenameTemplate()
                    }}
                    ${ref((el) => {
                      if (el instanceof HTMLInputElement) queueMicrotask(() => el.isConnected && el.focus())
                    })}
                  />
                  <button
                    class="btn btn-ghost btn-sm btn-square flex-none"
                    @mousedown=${(e: Event) => e.preventDefault()}
                    @click=${(e: Event) => {
                      const input = (e.currentTarget as HTMLElement).previousElementSibling as HTMLInputElement
                      props.onConfirmRenameTemplate(t.id, input.value)
                    }}
                    title="Salvar"
                  >
                    ${icon('check')}
                  </button>
                </div>`
              : html`<div class="flex items-center gap-2">
                  <button class="flex min-w-0 flex-1 flex-col gap-0.5 text-left" @click=${() => props.onSelectTemplate(t.id)}>
                    <span class="text-sm font-semibold">${t.title}</span>
                    <span class="text-[11px] text-base-content/60">${count} preenchimento${count === 1 ? '' : 's'}</span>
                  </button>
                  <button
                    class="btn btn-ghost btn-sm btn-square flex-none"
                    @click=${(e: Event) => {
                      e.stopPropagation()
                      props.onStartRenameTemplate(t.id)
                    }}
                    title="Renomear"
                  >
                    ${icon('text-cursor-input')}
                  </button>
                  <button
                    class="btn btn-ghost btn-sm btn-square flex-none"
                    @click=${(e: Event) => {
                      e.stopPropagation()
                      props.onRemoveTemplate(t.id)
                    }}
                    title="Remover"
                  >
                    ${icon('trash-2')}
                  </button>
                </div>`,
          )
        },
      )}
    </div>

    <details tabindex="0" class="collapse collapse-arrow bg-base-100">


      <summary class="collapse-title font-semibold">Sintaxe dos marcadores</summary>
      <div class="collapse-content flex flex-col gap-3 font-mono text-sm text-base-content/80">
        <div class="flex flex-col gap-1">
          <div>{{Nome Completo}} <span class="text-base-content/50">— texto</span></div>
          <div>{{Data de Início | date}} <span class="text-base-content/50">— data</span></div>
          <div>{{Plano | select: Básico, Pro}} <span class="text-base-content/50">— lista suspensa</span></div>
          <div>{{Observações | textarea}} <span class="text-base-content/50">— várias linhas</span></div>
          <div>{{Assinatura | sign}} <span class="text-base-content/50">— assinatura</span></div>
          <div>{{Itens | table: Item, Qtd; Café, 2}} <span class="text-base-content/50">— tabela (; separa linhas fixas)</span></div>
          <div>{{Aprovado? | yesno}} <span class="text-base-content/50">— sim / não</span></div>
          <div>{{Valor | currency: BRL}} <span class="text-base-content/50">— valor em moeda</span></div>
          <div>{{Entrada | currency: BRL | link: pgto | link-value: true}} <span class="text-base-content/50">— campo condicional</span></div>
          <div>{{Total | formula: sum(Itens.Qtd)}} <span class="text-base-content/50">— campo calculado</span></div>
          <div>{{Nome | title}} <span class="text-base-content/50">— vira o nome no histórico</span></div>
        </div>
        <div class="font-sans text-[11px] leading-relaxed text-base-content/50">
          Use <b class="text-base-content/70">link: chave</b> num campo para controlar outros, e <b class="text-base-content/70">link-value: X</b> nos
          dependentes — eles só aparecem quando o valor do controlador é X.
        </div>
        <div class="font-sans text-[11px] leading-relaxed text-base-content/50">
          Envolva trechos com <b class="text-base-content/70">{{#if entrada = true}}</b> … <b class="text-base-content/70">{{/if}}</b> para mostrar seções
          inteiras só quando a condição bate.
        </div>
        <div class="flex flex-col gap-1.5 border-t border-base-300 pt-2.5 font-sans">
          <div class="text-[10.5px] font-bold tracking-wide text-base-content/60 uppercase">Fórmulas</div>
          <div class="font-mono text-[11.5px] leading-loose">
            <div>[Campo] <span class="text-base-content/50">— valor de outro campo</span></div>
            <div>sum(Tabela.Coluna) <span class="text-base-content/50">— soma de uma coluna</span></div>
            <div>+ - * / ( ) <span class="text-base-content/50">— operações</span></div>
            <div>; currency BRL <span class="text-base-content/50">— formata como moeda</span></div>
            <div>; int <span class="text-base-content/50">— número inteiro</span></div>
          </div>
        </div>
      </div>
    </details>
  </div>`
}
