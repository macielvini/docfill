import { html, type TemplateResult } from 'lit-html'
import { ref } from 'lit-html/directives/ref.js'

export interface ConfirmModalProps {
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function confirmModal(props: ConfirmModalProps): TemplateResult {
  return html`<dialog
    class="modal modal-open"
    ${ref((el) => {
      if (el instanceof HTMLDialogElement && !el.open) queueMicrotask(() => el.isConnected && !el.open && el.showModal())
    })}
  >
    <div class="modal-box flex flex-col gap-3.5">
      <p class="text-sm">${props.message}</p>
      <div class="modal-action">
        <button class="btn btn-outline" @click=${props.onCancel}>Cancelar</button>
        <button class="btn btn-error" @click=${props.onConfirm}>${props.confirmLabel || 'Remover'}</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click=${props.onCancel}>close</button>
    </form>
  </dialog>`
}
