import { html, type TemplateResult } from 'lit-html'
import { ref } from 'lit-html/directives/ref.js'

export interface UploadModalProps {
  onUpload: (e: Event) => void
  onPasteFromClipboard: () => void
  onCancel: () => void
}

export function uploadModal(props: UploadModalProps): TemplateResult {
  return html`<dialog
    class="modal modal-open"
    ${ref((el) => {
      if (el instanceof HTMLDialogElement && !el.open) queueMicrotask(() => el.isConnected && !el.open && el.showModal())
    })}
  >
    <div class="modal-box flex flex-col gap-3.5">
      <p class="text-sm font-semibold">Enviar modelo</p>
      <label class="btn btn-outline">
        Enviar arquivo
        <input type="file" class="hidden" accept=".md,.markdown,.txt,text/markdown,text/plain" @change=${props.onUpload} />
      </label>
      <button class="btn btn-outline" @click=${props.onPasteFromClipboard}>Colar texto</button>
      <div class="modal-action">
        <button class="btn btn-ghost" @click=${props.onCancel}>Cancelar</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click=${props.onCancel}>close</button>
    </form>
  </dialog>`
}
