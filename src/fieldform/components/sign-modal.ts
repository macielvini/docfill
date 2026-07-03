import { html, type TemplateResult } from 'lit-html'
import { ref } from 'lit-html/directives/ref.js'
import type { SignaturePadHost } from '../signature-pad'
import { signaturePad } from '../signature-pad'
import type { FieldView } from './field-editor'

export interface SignModalProps {
  fields: FieldView[]
  index: number
  sigHost: SignaturePadHost
  onCancel: () => void
  onAdvance: () => void
  onSkip: () => void
}

export function signModal(props: SignModalProps): TemplateResult {
  const { fields, index } = props
  const field = fields[index]
  const isLast = index === fields.length - 1
  return html`<dialog
    class="modal modal-open"
    ${ref((el) => {
      if (el instanceof HTMLDialogElement && !el.open) queueMicrotask(() => el.isConnected && !el.open && el.showModal())
    })}
  >
    <div class="modal-box flex flex-col gap-3.5">
      <h3 class="text-sm font-semibold">${field.label}</h3>
      <span class="text-[11px] text-base-content/60">Assinatura ${index + 1} de ${fields.length}</span>
      ${signaturePad(props.sigHost, field.slug)}
      <div class="modal-action">
        <button class="btn btn-outline" @click=${props.onCancel}>Cancelar</button>
        <button class="btn btn-ghost" @click=${props.onSkip}>Pular</button>
        <button class="btn btn-primary" @click=${props.onAdvance}>${isLast ? 'Concluir' : 'Assinar e avançar'}</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click=${props.onCancel}>close</button>
    </form>
  </dialog>`
}
