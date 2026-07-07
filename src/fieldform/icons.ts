import { html, type TemplateResult } from 'lit-html';
import { createIcons, Trash2, PencilLine, Check, FileUp, ClipboardPenLine, TextCursorInput } from 'lucide';


export const renderIcons = () => createIcons({
  icons: {
    Trash2, PencilLine, Check, FileUp, ClipboardPenLine, TextCursorInput
  }
})

export function icon(name: string):TemplateResult {
      return html`<i data-lucide="${name}" class="size-4"></i>`
}