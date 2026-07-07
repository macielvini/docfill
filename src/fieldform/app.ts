import { html, render, nothing, type TemplateResult } from 'lit-html'
import { MarkerEngine, getFieldsFrom, getOutline, type FieldInfo, type Values } from './markers'
import { renderDoc } from './render-doc'
import type { SignaturePadHost } from './signature-pad'
import {
  loadHistory,
  putHistoryEntry,
  removeHistoryEntry,
  loadTemplates,
  putTemplate,
  removeTemplate as removeTemplateEntry,
  firstHeading,
  type HistoryEntry,
  type Template,
} from './history'
import { BUILTIN_TEMPLATES } from './sample'
import { TYPE_LABELS, CUR_SYM, type FieldView, type FillItem } from './components/field-editor'
import { templatesScreen } from './screens/templates-screen'
import { templateDetailScreen } from './screens/template-detail-screen'
import { docScreen, type Step } from './screens/doc-screen'
import { pasteEditorScreen } from './screens/paste-editor-screen'
import { confirmModal } from './components/confirm-modal'
import { uploadModal } from './components/upload-modal'
import { renderIcons } from './icons'

type Screen = 'templates' | 'detail' | 'doc' | 'paste-editor'

interface AppState {
  screen: Screen
  templates: Template[]
  selectedTemplateId: string | null
  docText: string
  values: Values
  step: Step
  currentId: string | null
  currentTemplateId: string | null
  fallbackTitle: string | null
  history: HistoryEntry[]
  signModalIndex: number | null
  confirmRemoveTemplateId: string | null
  confirmClearSignatures: boolean
  printCompact: boolean
  uploadModalOpen: boolean
  editingTemplateId: string | null
  pasteEditorTemplateId: string | null
  pasteEditorTitle: string
  pasteEditorText: string
}

function firstTitleValue(docText: string, values: Values): string {
  const info = getFieldsFrom(docText).find((f) => f.type === 'title')
  return info ? String(values[info.slug] || '').trim() : ''
}

function titleOf(docText: string, values: Values, fallback: string | null): string {
  const titlePart = firstTitleValue(docText, values) || firstHeading(docText) || fallback || 'Documento sem título'
  if (fallback && titlePart !== fallback) return titlePart + ' · ' + fallback
  return titlePart
}

function baseRows(values: Values, slug: string, presets: string[][] | null): string[][] {
  const cur = values[slug]
  return Array.isArray(cur) ? (cur as string[][]).map((x) => x.slice()) : (presets || []).map((x) => x.slice())
}

export function mount(rootEl: HTMLElement) {
  let state: AppState = {
    screen: 'templates',
    // templates: BUILTIN_TEMPLATES,
    templates: [],
    selectedTemplateId: null,
    docText: '',
    values: {},
    step: 'fill',
    currentId: null,
    currentTemplateId: null,
    fallbackTitle: null,
    history: [],
    signModalIndex: null,
    confirmRemoveTemplateId: null,
    confirmClearSignatures: false,
    printCompact: false,
    uploadModalOpen: false,
    editingTemplateId: null,
    pasteEditorTemplateId: null,
    pasteEditorTitle: '',
    pasteEditorText: '',
  }
  let sigHost: SignaturePadHost

  function setState(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
    const p = typeof patch === 'function' ? patch(state) : patch
    state = { ...state, ...p }
    renderApp()
  }

  async function persistCurrent() {
    const { docText, values, currentId, currentTemplateId, fallbackTitle } = state
    if (!currentId || !currentTemplateId || !(docText || '').trim()) return
    const entry: HistoryEntry = {
      id: currentId,
      templateId: currentTemplateId,
      title: titleOf(docText, values, fallbackTitle),
      fallbackTitle,
      docText,
      values,
      updatedAt: Date.now(),
    }
    const list = await putHistoryEntry(entry)
    state = { ...state, history: list }
    renderApp()
  }

  function setValue(slug: string, v: unknown) {
    state = { ...state, values: { ...state.values, [slug]: v } }
    renderApp()
    void persistCurrent()
  }

  function setCell(slug: string, r: number, c: number, val: string, presets: string[][] | null) {
    const rows = baseRows(state.values, slug, presets)
    while (rows.length <= r) rows.push([])
    const row = rows[r].slice()
    row[c] = val
    rows[r] = row
    state = { ...state, values: { ...state.values, [slug]: rows } }
    renderApp()
    void persistCurrent()
  }

  function addRow(slug: string, ncols: number, presets: string[][] | null) {
    const rows = baseRows(state.values, slug, presets)
    rows.push(new Array(ncols).fill(''))
    state = { ...state, values: { ...state.values, [slug]: rows } }
    renderApp()
    void persistCurrent()
  }

  function removeRow(slug: string, r: number, presets: string[][] | null) {
    const rows = baseRows(state.values, slug, presets).filter((_, i) => i !== r)
    state = { ...state, values: { ...state.values, [slug]: rows } }
    renderApp()
    void persistCurrent()
  }

  function openDoc(docText: string, values: Values, id: string | null, fallbackTitle: string | null, templateId: string) {
    const cid = id || 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
    state = {
      ...state,
      screen: 'doc',
      docText,
      values: values ? { ...values } : {},
      step: 'fill',
      currentId: cid,
      currentTemplateId: templateId,
      fallbackTitle: fallbackTitle || null,
      signModalIndex: null,
    }
    renderApp()
    void persistCurrent()
  }

  async function removeHistory(id: string) {
    const list = await removeHistoryEntry(id)
    state = { ...state, history: list }
    renderApp()
  }

  async function removeTemplate(id: string) {
    const list = await removeTemplateEntry(id)
    state = { ...state, templates: [...BUILTIN_TEMPLATES, ...list], confirmRemoveTemplateId: null }
    renderApp()
  }

  function startRenameTemplate(id: string) {
    setState({ editingTemplateId: id })
  }

  function cancelRenameTemplate() {
    if (state.editingTemplateId === null) return
    setState({ editingTemplateId: null })
  }

  function confirmRenameTemplate(id: string, title: string) {
    const t = state.templates.find((x) => x.id === id)
    const trimmed = title.trim()
    if (!t || !trimmed) return setState({ editingTemplateId: null })
    void putTemplate({ ...t, title: trimmed }).then((templates) =>
      setState({ templates: [...BUILTIN_TEMPLATES, ...templates], editingTemplateId: null }),
    )
  }

  function goTemplates() {
    setState({ screen: 'templates', selectedTemplateId: null })
  }

  function selectTemplate(id: string) {
    setState({ screen: 'detail', selectedTemplateId: id })
  }

  const startNew = (t: Template) => openDoc(t.docText, {}, null, null, t.id)

  function createTemplateFromText(text: string, fallback: string | null) {
    const t: Template = { id: 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), title: fallback || 'Modelo colado', docText: text, createdAt: Date.now() }
    void putTemplate(t).then((templates) => setState({ templates: [...BUILTIN_TEMPLATES, ...templates] }))
    openDoc(t.docText, {}, null, fallback, t.id)
    setState({ uploadModalOpen: false })
  }

  const onUpload = (e: Event) => {
    const input = e.target as HTMLInputElement
    const f = input.files && input.files[0]
    if (!f) return
    const fallback = f.name.replace(/\.[^.]+$/, '')
    const r = new FileReader()
    r.onload = () => createTemplateFromText(String(r.result), fallback)
    r.readAsText(f)
    input.value = ''
  }

  const onPasteFromClipboard = () => {
    void navigator.clipboard
      .readText()
      .then((text) => {
        if (text.trim()) createTemplateFromText(text, null)
      })
      .catch(() => {})
  }

  function openPasteEditor() {
    setState({ pasteEditorTemplateId: null, pasteEditorTitle: '' })
    void navigator.clipboard
      .readText()
      .then((text) => setState({ screen: 'paste-editor', pasteEditorText: text }))
      .catch(() => setState({ screen: 'paste-editor', pasteEditorText: '' }))
  }

  function editTemplate(t: Template) {
    setState({ screen: 'paste-editor', pasteEditorTemplateId: t.id, pasteEditorTitle: t.title, pasteEditorText: t.docText })
  }

  function goBackFromPasteEditor() {
    setState({ screen: state.pasteEditorTemplateId ? 'detail' : 'templates' })
  }

  function savePastedTemplate(title: string, text: string) {
    const existing = state.pasteEditorTemplateId ? state.templates.find((x) => x.id === state.pasteEditorTemplateId) : null
    const t: Template = existing
      ? { ...existing, title, docText: text }
      : { id: 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), title, docText: text, createdAt: Date.now() }
    void putTemplate(t).then((templates) => setState({ templates: [...BUILTIN_TEMPLATES, ...templates], screen: existing ? 'detail' : 'templates' }))
  }

  const doPrint = () => window.print()

  const onEnviarParaRevisao = () => {}

  const onOpenSignModal = () => setState({ signModalIndex: 0 })
  const onCancelSignModal = () => setState({ signModalIndex: null })
  const onAdvanceSignModal = () =>
    setState((s) => {
      const next = (s.signModalIndex ?? 0) + 1
      return { signModalIndex: next }
    })

  function clearAllSignatures() {
    const engine = new MarkerEngine(state.docText, state.values)
    const active = engine.activeSlugs()
    const signSlugs = engine.getFields().filter((f) => f.type === 'sign' && engine.isVisible(f) && active[f.slug])
    state = {
      ...state,
      values: { ...state.values, ...Object.fromEntries(signSlugs.map((f) => [f.slug, ''])) },
      signModalIndex: null,
      confirmClearSignatures: false,
    }
    renderApp()
    void persistCurrent()
  }

  sigHost = {
    getValue: (slug) => (state.values[slug] as string) || '',
    setValue,
  }

  function buildFieldView(info: FieldInfo, engine: MarkerEngine): FieldView {
    const val = state.values[info.slug]
    const isTable = info.type === 'table'
    const displayRows = isTable ? (Array.isArray(val) ? (val as string[][]) : info.presetRows || []) : []
    const filled = isTable ? displayRows.some((r) => Array.isArray(r) && r.some((c) => c && String(c).trim())) : !!val

    const cols = isTable ? (info.options.length ? info.options : ['Item']) : []

    return {
      ...info,
      value: (val as string) || '',
      filled,
      typeLabel: TYPE_LABELS[info.type] || 'Texto',
      placeholder: 'Digite ' + info.label.toLowerCase(),
      visible: engine.isVisible(info),
      isText: info.type === 'text' || info.type === 'title',
      isDate: info.type === 'date',
      isSelect: info.type === 'select',
      isTextarea: info.type === 'textarea',
      isSign: info.type === 'sign',
      isTable,
      isYesno: info.type === 'yesno',
      isCurrency: info.type === 'currency',
      isFormula: info.type === 'formula',
      formulaResult: info.type === 'formula' ? engine.formulaText(info) || '—' : '',
      currencyPrefix: CUR_SYM[(info.options && info.options[0]) || 'BRL'] || (info.options && info.options[0]) || 'R$',
      setYes: () => setValue(info.slug, 'true'),
      setNo: () => setValue(info.slug, 'false'),
      onChange: (e: Event) => setValue(info.slug, (e.target as HTMLInputElement).value),
      table: isTable
        ? {
            columns: cols,
            onAddRow: () => addRow(info.slug, cols.length, displayRows),
            rows: displayRows.map((row, ri) => ({
              key: ri,
              onRemove: () => removeRow(info.slug, ri, displayRows),
              cells: cols.map((_c, ci) => ({
                value: (row && row[ci]) || '',
                onChange: (e: Event) => setCell(info.slug, ri, ci, (e.target as HTMLInputElement).value, displayRows),
              })),
            })),
          }
        : null,
    }
  }

  function template(): TemplateResult {
    const engine = new MarkerEngine(state.docText, state.values)
    const raw = engine.getFields()
    const fields = raw.map((info) => buildFieldView(info, engine))
    const active = engine.activeSlugs()
    const visibleFields = fields.filter((f) => f.visible && active[f.slug])
    const fillFields = visibleFields.filter((f) => !f.isSign)
    const signFields = visibleFields.filter((f) => f.isSign)

    const outline = getOutline(engine.visibleDocText())
    const fillBySlug = new Map(fillFields.map((f) => [f.slug, f]))
    const fillItems: FillItem[] = []
    let pendingHeading: { level: number; text: string } | null = null
    for (const o of outline) {
      if (o.kind === 'heading') {
        pendingHeading = { level: o.level, text: o.text }
        continue
      }
      const f = fillBySlug.get(o.slug)
      if (!f) continue
      if (pendingHeading) {
        fillItems.push({ kind: 'heading', ...pendingHeading })
        pendingHeading = null
      }
      fillItems.push({ kind: 'field', field: f })
    }

    const countable = fillFields.filter((f) => !f.isFormula)
    const total = countable.length
    const filledCount = countable.filter((f) => f.filled).length
    const pct = total ? Math.round((filledCount / total) * 100) : 0

    const step = state.step

    const nextMap: Record<Step, { label: string; act: () => void }> = {
      fill: { label: 'Revisar', act: () => setState({ step: 'review' }) },
      review: { label: 'Imprimir / Salvar PDF', act: doPrint },
    }
    const backMap: Partial<Record<Step, Step>> = { review: 'fill' }

    const screen = state.screen
    const docTitle = firstTitleValue(state.docText, state.values) || firstHeading(state.docText) || 'Documento sem título'
    const canBack = true

    return html`
      <div class="app-shell flex min-h-screen flex-col items-center bg-base-200 text-base-content">
        <div class="relative flex w-full max-w-[560px] flex-1 flex-col">
          <div class="navbar sticky top-0 z-20 border-b border-base-300 bg-base-100/90 px-4 py-2 backdrop-blur">
            <div class="navbar-start min-w-0 gap-2.5">
              <div class="flex size-[26px] flex-none items-center justify-center rounded-md bg-primary">
                <div class="h-0.5 w-2.5 bg-primary-content shadow-[0_4px_0_var(--color-primary-content),0_-4px_0_color-mix(in_oklab,var(--color-primary-content)_55%,transparent)]"></div>
              </div>
              <div class="flex min-w-0 flex-col gap-px">
                <div class="text-[14.5px] leading-none font-bold tracking-tight">
                  docfill <span class="font-normal">- by <a class="underline" href="https://github.com/macielvini">macielvini</a></span>
                </div>
                ${screen === 'doc' ? html`<div class="truncate text-[11px] text-base-content/60">${docTitle}</div>` : nothing}
              </div>
            </div>
            <div class="navbar-end flex-none gap-2">
              ${screen !== 'templates' ? html`<button class="btn btn-ghost btn-sm" @click=${goTemplates}>Modelos</button>` : nothing}
              ${screen === 'doc'
                ? html`<button class="btn btn-ghost btn-sm" @click=${() => setState({ uploadModalOpen: true })}>Enviar</button>`
                : nothing}
            </div>
          </div>

          ${screen === 'templates'
            ? templatesScreen({
                templates: state.templates,
                history: state.history,
                onUpload,
                onOpenPasteEditor: openPasteEditor,
                onSelectTemplate: selectTemplate,
                onRemoveTemplate: (id) => setState({ confirmRemoveTemplateId: id }),
                editingTemplateId: state.editingTemplateId,
                onStartRenameTemplate: startRenameTemplate,
                onConfirmRenameTemplate: confirmRenameTemplate,
                onCancelRenameTemplate: cancelRenameTemplate,
              })
            : nothing}
          ${screen === 'detail'
            ? (() => {
                const t = state.templates.find((x) => x.id === state.selectedTemplateId)
                if (!t)
                  return templatesScreen({
                    templates: state.templates,
                    history: state.history,
                    onUpload,
                    onOpenPasteEditor: openPasteEditor,
                    onSelectTemplate: selectTemplate,
                    onRemoveTemplate: (id) => setState({ confirmRemoveTemplateId: id }),
                    editingTemplateId: state.editingTemplateId,
                    onStartRenameTemplate: startRenameTemplate,
                    onConfirmRenameTemplate: confirmRenameTemplate,
                    onCancelRenameTemplate: cancelRenameTemplate,
                  })
                return templateDetailScreen({
                  template: t,
                  entries: state.history.filter((h) => h.templateId === t.id),
                  onStartNew: startNew,
                  onEditTemplate: editTemplate,
                  onOpenHistory: (h) => openDoc(h.docText, h.values, h.id, h.fallbackTitle, h.templateId),
                  onRemoveHistory: removeHistory,
                  onBack: goTemplates,
                })
              })()
            : nothing}
          ${screen === 'doc'
            ? docScreen({
                step,
                docText: state.docText,
                values: state.values,
                fillFields,
                fillItems,
                signFields,
                filledCount,
                total,
                pct,
                sigHost,
                canBack,
                nextLabel: nextMap[step].label,
                signModalIndex: state.signModalIndex,
                printCompact: state.printCompact,
                onStepChange: (s) => setState({ step: s }),
                onBack: () => (step === 'fill' ? setState({ screen: 'detail' }) : setState({ step: backMap[step] || 'fill' })),
                onNext: nextMap[step].act,
                onEnviarParaRevisao,
                onOpenSignModal,
                onCancelSignModal,
                onAdvanceSignModal,
                onRequestClearSignatures: () => setState({ confirmClearSignatures: true }),
                onTogglePrintCompact: () => setState({ printCompact: !state.printCompact }),
              })
            : nothing}
          ${screen === 'paste-editor'
            ? pasteEditorScreen({
                initialTitle: state.pasteEditorTitle,
                initialText: state.pasteEditorText,
                onSave: savePastedTemplate,
                onBack: goBackFromPasteEditor,
              })
            : nothing}
          ${state.confirmRemoveTemplateId !== null
            ? confirmModal({
                message: 'Remover este modelo? Essa ação não pode ser desfeita.',
                onConfirm: () => removeTemplate(state.confirmRemoveTemplateId!),
                onCancel: () => setState({ confirmRemoveTemplateId: null }),
              })
            : nothing}
          ${state.confirmClearSignatures
            ? confirmModal({
                message: 'Limpar todas as assinaturas? Você vai precisar assinar novamente.',
                confirmLabel: 'Limpar',
                onConfirm: clearAllSignatures,
                onCancel: () => setState({ confirmClearSignatures: false }),
              })
            : nothing}
          ${state.uploadModalOpen
            ? uploadModal({
                onUpload,
                onPasteFromClipboard,
                onCancel: () => setState({ uploadModalOpen: false }),
              })
            : nothing}
        </div>
      </div>
      <style>
        @page { margin: ${state.printCompact ? '0.45in' : '0.85in'}; }
      </style>
      <div class="print-sheet">
        <div style="font-family:Georgia, 'Times New Roman', serif;color:#000;max-width:720px;margin:0 auto;">${renderDoc(state.docText, state.values, true, state.printCompact)}</div>
      </div>
    `
  }

  function renderApp() {
    render(template(), rootEl)
    renderIcons()
  }

  renderApp()
  loadHistory().then((history) => setState({ history }))
  loadTemplates().then((templates) => setState({ templates: [...BUILTIN_TEMPLATES, ...templates] }))
}
