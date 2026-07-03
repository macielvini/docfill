import { html, nothing, type TemplateResult } from 'lit-html'
import { repeat } from 'lit-html/directives/repeat.js'
import { live } from 'lit-html/directives/live.js'
import type { FieldInfo } from '../markers'
import { signaturePad, type SignaturePadHost } from '../signature-pad'
import { card } from './card'
import { segmentedToggle } from './segmented-toggle'

export const TYPE_LABELS: Record<string, string> = {
  text: 'Texto',
  title: 'Título',
  date: 'Data',
  select: 'Opção',
  textarea: 'Observações',
  sign: 'Assinatura',
  table: 'Tabela',
  yesno: 'Sim/Não',
  currency: 'Valor',
  formula: 'Cálculo',
}

export const CUR_SYM: Record<string, string> = { BRL: 'R$', USD: '$', EUR: '€', GBP: '£', ARS: '$', CLP: '$' }

export interface TableCellView {
  value: string
  onChange: (e: Event) => void
}

export interface TableView {
  columns: string[]
  onAddRow: () => void
  rows: { key: number; cells: TableCellView[]; onRemove: () => void }[]
}

export interface FieldView extends FieldInfo {
  value: string
  filled: boolean
  typeLabel: string
  placeholder: string
  visible: boolean
  isText: boolean
  isDate: boolean
  isSelect: boolean
  isTextarea: boolean
  isSign: boolean
  isTable: boolean
  isYesno: boolean
  isCurrency: boolean
  isFormula: boolean
  formulaResult: string
  currencyPrefix: string
  onChange: (e: Event) => void
  setYes: () => void
  setNo: () => void
  table: TableView | null
}

export type FillItem = { kind: 'heading'; level: number; text: string } | { kind: 'field'; field: FieldView }

export function sectionHeading(item: { level: number; text: string }): TemplateResult {
  const cls =
    item.level === 1
      ? 'divider text-base font-bold'
      : item.level === 2
        ? 'divider text-sm font-semibold'
        : 'divider text-xs font-medium text-base-content/70'
  return html`<div class="${cls}">${item.text}</div>`
}

export function fieldEditor(f: FieldView, sigHost: SignaturePadHost): TemplateResult {
  return card(html`
    <div class="flex items-center justify-between gap-2">
      <label class="text-sm font-semibold">${f.label}</label>
      <span class="badge badge-ghost badge-sm">${f.typeLabel}</span>
    </div>

    ${f.isText
      ? html`<input type="text" class="input w-full" .value=${live(f.value)} @change=${f.onChange} placeholder=${f.placeholder} />`
      : nothing}
    ${f.isDate ? html`<input type="date" class="input w-full" .value=${live(f.value)} @change=${f.onChange} />` : nothing}
    ${f.isSelect
      ? html`<select class="select w-full" @change=${f.onChange}>
          <option value="" ?selected=${!f.value}>Selecione…</option>
          ${repeat(
            f.options,
            (opt) => opt,
            (opt) => html`<option value=${opt} ?selected=${opt === f.value}>${opt}</option>`,
          )}
        </select>`
      : nothing}
    ${f.isTextarea
      ? html`<textarea class="textarea w-full" .value=${live(f.value)} @change=${f.onChange} rows="3" placeholder=${f.placeholder}></textarea>`
      : nothing}
    ${f.isSign ? signaturePad(sigHost, f.slug) : nothing}
    ${f.isYesno
      ? segmentedToggle([
          { label: 'Sim', active: f.value === 'true', onClick: f.setYes },
          { label: 'Não', active: f.value === 'false', onClick: f.setNo },
        ])
      : nothing}
    ${f.isCurrency
      ? html`<label class="input w-full">
          <span class="text-base-content/60">${f.currencyPrefix}</span>
          <input type="text" inputmode="decimal" .value=${live(f.value)} @change=${f.onChange} placeholder="0,00" />
        </label>`
      : nothing}
    ${f.isFormula
      ? html`<div class="flex items-center justify-between gap-2.5 rounded-box border border-dashed border-base-300 bg-base-200 px-3 py-2.5">
          <span class="text-[15px] font-bold text-primary">${f.formulaResult}</span>
          <span class="text-[10.5px] text-base-content/60">calculado automaticamente</span>
        </div>`
      : nothing}
    ${f.isTable ? tableEditor(f.table!) : nothing}
  `)
}

function tableEditor(t: TableView): TemplateResult {
  const gridTemplateColumns = `repeat(${t.columns.length},minmax(0,1fr)) 30px`
  return html`<div class="flex flex-col gap-1.5">
    <div class="grid items-center gap-1.5" style="grid-template-columns: ${gridTemplateColumns}">
      ${t.columns.map((col) => html`<span class="pl-0.5 text-[10px] font-bold tracking-wide text-base-content/60 uppercase">${col}</span>`)}
      <span></span>
    </div>
    ${repeat(
      t.rows,
      (row) => row.key,
      (row) => html`<div class="grid items-center gap-1.5" style="grid-template-columns: ${gridTemplateColumns}">
        ${row.cells.map((cell) => html`<input type="text" class="input input-sm w-full" .value=${live(cell.value)} @change=${cell.onChange} />`)}
        <button class="btn btn-ghost btn-xs btn-circle" @click=${row.onRemove} title="Remover linha">×</button>
      </div>`,
    )}
    <button class="btn btn-outline btn-primary btn-sm self-start" @click=${t.onAddRow}>+ Adicionar linha</button>
  </div>`
}
