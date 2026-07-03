import { html, nothing, type TemplateResult } from 'lit-html'
import { repeat } from 'lit-html/directives/repeat.js'
import type { Values } from '../markers'
import type { SignaturePadHost } from '../signature-pad'
import { renderDoc } from '../render-doc'
import { segmentedToggle } from '../components/segmented-toggle'
import { fieldEditor, sectionHeading, type FieldView, type FillItem } from '../components/field-editor'
import { signModal } from '../components/sign-modal'

export type Step = 'fill' | 'review'

export interface DocScreenProps {
  step: Step
  docText: string
  values: Values
  fillFields: FieldView[]
  fillItems: FillItem[]
  signFields: FieldView[]
  filledCount: number
  total: number
  pct: number
  sigHost: SignaturePadHost
  canBack: boolean
  nextLabel: string
  signModalIndex: number | null
  printCompact: boolean
  onStepChange: (step: Step) => void
  onBack: () => void
  onNext: () => void
  onEnviarParaRevisao: () => void
  onOpenSignModal: () => void
  onCancelSignModal: () => void
  onAdvanceSignModal: () => void
  onRequestClearSignatures: () => void
  onTogglePrintCompact: () => void
}

export function docScreen(props: DocScreenProps): TemplateResult {
  const { step } = props
  return html`
    <div class="px-4.5 pt-3.5">
      ${segmentedToggle([
        { label: '1 · Preencher', active: step === 'fill', onClick: () => props.onStepChange('fill') },
        { label: '2 · Revisar', active: step === 'review', onClick: () => props.onStepChange('review') },
      ])}
    </div>

    ${step === 'fill'
      ? html`<div class="flex flex-col gap-4 px-4.5 pt-4 pb-32.5">
          <div class="flex flex-col gap-2">
            <div class="flex items-baseline justify-between">
              <span class="text-xs font-semibold">${props.filledCount} de ${props.total} preenchidos</span>
              <span class="text-[11px] text-base-content/60">${props.pct}%</span>
            </div>
            <progress class="progress progress-primary w-full" value=${props.pct} max="100"></progress>
          </div>
          ${repeat(
            props.fillItems,
            (it, i) => (it.kind === 'field' ? it.field.slug : 'h' + i),
            (it) => (it.kind === 'heading' ? sectionHeading(it) : fieldEditor(it.field, props.sigHost)),
          )}
        </div>`
      : nothing}
    ${step === 'review'
      ? html`<div class="flex flex-col gap-3.5 px-4.5 pt-4 pb-32.5">
          <div class="card card-border bg-base-100 shadow-sm">
            <div class="card-body p-7 bg-gray-50">${renderDoc(props.docText, props.values, false)}</div>
          </div>
          ${props.signFields.length > 0
            ? html`<div class="flex gap-2.5">
                <button class="btn btn-primary flex-1" @click=${props.onOpenSignModal}>Assinar</button>
                <button class="btn btn-outline flex-none" @click=${props.onRequestClearSignatures}>Limpar assinaturas</button>
              </div>`
            : nothing}
        </div>`
      : nothing}
    ${props.signModalIndex !== null
      ? (() => {
          const advance = props.signModalIndex === props.signFields.length - 1 ? props.onCancelSignModal : props.onAdvanceSignModal
          return signModal({
            fields: props.signFields,
            index: props.signModalIndex,
            sigHost: props.sigHost,
            onCancel: props.onCancelSignModal,
            onAdvance: advance,
            onSkip: () => {
              props.sigHost.setValue(props.signFields[props.signModalIndex!].slug, '')
              advance()
            },
          })
        })()
      : nothing}

    ${step === 'review'
      ? html`<div class="flex justify-end px-4.5">
          <label class="label cursor-pointer gap-1.5 text-xs">
            <input type="checkbox" class="checkbox checkbox-sm" .checked=${props.printCompact} @change=${props.onTogglePrintCompact} />
            Compacto na impressão
          </label>
        </div>`
      : nothing}
    <div class="sticky bottom-0 z-20 flex gap-2.5 bg-linear-to-t from-base-200 from-62% to-transparent px-4.5 pt-3.5 pb-4">
      ${props.canBack ? html`<button class="btn btn-outline flex-none" @click=${props.onBack}>Voltar</button>` : nothing}
      ${step === 'review' ? html`<button class="btn btn-outline flex-1" @click=${props.onEnviarParaRevisao}>Enviar para revisão</button>` : nothing}
      <button class="btn btn-primary flex-1" @click=${props.onNext}>${props.nextLabel}</button>
    </div>
  `
}
