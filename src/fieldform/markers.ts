export type FieldType =
  | 'text'
  | 'title'
  | 'date'
  | 'select'
  | 'textarea'
  | 'sign'
  | 'table'
  | 'yesno'
  | 'currency'
  | 'formula'

export interface FormulaFormat {
  kind: 'currency' | 'int'
  currency?: string
}

export interface FieldInfo {
  label: string
  type: FieldType
  options: string[]
  presetRows: string[][] | null
  link: string
  linkValue: string
  formula: string
  formulaFormat: FormulaFormat | null
  slug: string
}

export type Values = Record<string, unknown>

export function slug(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function parseMarker(inner: string): FieldInfo {
  const parts = inner.split('|').map((s) => s.trim())
  const label = parts[0]
  let type: FieldType = 'text'
  let options: string[] = []
  let presetRows: string[][] | null = null
  let link = ''
  let linkValue = ''
  let formula = ''
  let formulaFormat: FormulaFormat | null = null

  for (let i = 1; i < parts.length; i++) {
    const seg = parts[i]
    if (!seg) continue
    const ci = seg.indexOf(':')
    const key = (ci >= 0 ? seg.slice(0, ci) : seg).trim().toLowerCase()
    const rest = ci >= 0 ? seg.slice(ci + 1).trim() : ''
    if (key === 'link') {
      link = slug(rest)
      continue
    }
    if (key === 'link-value') {
      linkValue = rest
      continue
    }
    type = (key || 'text') as FieldType
    if (type === 'table') {
      const segs = rest.split(';').map((s) => s.trim()).filter(Boolean)
      const cols = (segs[0] || '').split(',').map((s) => s.trim()).filter(Boolean)
      const columns = cols.length ? cols : ['Item']
      presetRows = segs.slice(1).map((row) => {
        const cells = row.split(',').map((s) => s.trim())
        return columns.map((_c, k) => (cells[k] !== undefined ? cells[k] : ''))
      })
      options = columns
    } else if (type === 'formula') {
      const fs = rest.split(';')
      formula = (fs[0] || '').trim()
      if (fs[1]) {
        const fp = fs[1].trim().split(/\s+/)
        const kind = (fp[0] || '').toLowerCase()
        if (kind === 'currency' || kind === 'moeda') formulaFormat = { kind: 'currency', currency: (fp[1] || 'BRL').toUpperCase() }
        else if (kind === 'int' || kind === 'inteiro') formulaFormat = { kind: 'int' }
      }
    } else if (rest) {
      options = rest.split(',').map((s) => s.trim()).filter(Boolean)
    }
  }

  return { label, type, options, presetRows, link, linkValue, formula, formulaFormat, slug: slug(label) }
}

export type OutlineItem = { kind: 'heading'; level: number; text: string } | { kind: 'field'; slug: string }

/** Merges markdown headings (`#`..`###`) and `{{...}}` field markers in document order, for grouping fields under section titles. */
export function getOutline(text: string): OutlineItem[] {
  const items: OutlineItem[] = []
  const lines = (text || '').split('\n')
  const re = /\{\{([^}]+)\}\}/g
  for (const line of lines) {
    const h = /^(#{1,3})\s+(.*)$/.exec(line.trim())
    if (h) {
      items.push({ kind: 'heading', level: h[1].length, text: h[2].trim() })
      continue
    }
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(line))) {
      const info = parseMarker(m[1])
      if (info.label) items.push({ kind: 'field', slug: info.slug })
    }
  }
  return items
}

export function getFieldsFrom(text: string): FieldInfo[] {
  text = text || ''
  const re = /\{\{([^}]+)\}\}/g
  const seen: Record<string, boolean> = {}
  const list: FieldInfo[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const info = parseMarker(m[1])
    if (!info.label || seen[info.slug]) continue
    seen[info.slug] = true
    list.push(info)
  }
  return list
}

export function parseNum(v: unknown): number {
  if (v == null) return NaN
  let s = String(v).replace(/[^0-9.,-]/g, '')
  if (s.indexOf(',') > -1 && s.indexOf('.') > -1) s = s.replace(/\./g, '').replace(',', '.')
  else if (s.indexOf(',') > -1) s = s.replace(',', '.')
  return parseFloat(s)
}

export function formatDate(v: string): string {
  if (!v) return ''
  const d = new Date(v + 'T00:00:00')
  if (isNaN(d.getTime())) return v
  return d.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function formatCurrency(v: unknown, code: string): string {
  const raw = String(v == null ? '' : v).trim()
  if (!raw) return ''
  let s = raw.replace(/[^0-9.,-]/g, '')
  if (s.indexOf(',') > -1 && s.indexOf('.') > -1) s = s.replace(/\./g, '').replace(',', '.')
  else if (s.indexOf(',') > -1) s = s.replace(',', '.')
  const num = parseFloat(s)
  if (isNaN(num)) return raw
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: code }).format(num)
  } catch {
    return raw
  }
}

/** Everything needed to resolve conditionals (`{{#if}}`) and formulas against current field state. */
export class MarkerEngine {
  private docText: string
  private values: Values

  constructor(docText: string, values: Values) {
    this.docText = docText
    this.values = values
  }

  private fieldsCache: FieldInfo[] | null = null
  getFields(): FieldInfo[] {
    if (!this.fieldsCache) this.fieldsCache = getFieldsFrom(this.docText)
    return this.fieldsCache
  }

  private linkValuesCache: Record<string, unknown> | null = null
  linkValues(): Record<string, unknown> {
    if (this.linkValuesCache) return this.linkValuesCache
    const map: Record<string, unknown> = {}
    this.getFields().forEach((info) => {
      if (info.link && !info.linkValue) map[info.link] = this.values[info.slug] || ''
    })
    this.linkValuesCache = map
    return map
  }

  isVisible(info: FieldInfo): boolean {
    if (!info.link || !info.linkValue) return true
    const cur = this.linkValues()[info.link] || ''
    return String(cur).trim().toLowerCase() === String(info.linkValue).trim().toLowerCase()
  }

  private condValue(slugKey: string): unknown {
    const lv = this.linkValues()
    if (slugKey in lv) return lv[slugKey]
    return this.values[slugKey] || ''
  }

  private evalCondition(expr: string): boolean {
    const m = /^(.+?)\s*(!=|==|=)\s*(.*)$/.exec(expr)
    if (!m) {
      const cur = String(this.condValue(slug(expr.trim())) || '').trim().toLowerCase()
      return !!cur && cur !== 'false' && cur !== 'não' && cur !== 'nao'
    }
    const cur = String(this.condValue(slug(m[1].trim())) || '').trim().toLowerCase()
    const val = m[3].trim().toLowerCase()
    const eq = cur === val
    return m[2] === '!=' ? !eq : eq
  }

  visibleDocText(): string {
    const lines = (this.docText || '').split('\n')
    const out: string[] = []
    const stack: boolean[] = []
    const activeNow = () => stack.every(Boolean)
    for (const line of lines) {
      const t = line.trim()
      const mIf = /^\{\{\s*#if\s+(.+?)\}\}$/.exec(t)
      if (mIf) {
        stack.push(activeNow() && this.evalCondition(mIf[1]))
        continue
      }
      if (/^\{\{\s*\/if\s*\}\}$/.test(t)) {
        stack.pop()
        continue
      }
      if (activeNow()) out.push(line)
    }
    return out.join('\n')
  }

  activeSlugs(): Record<string, boolean> {
    const set: Record<string, boolean> = {}
    const re = /\{\{([^}]+)\}\}/g
    let m: RegExpExecArray | null
    const text = this.visibleDocText()
    while ((m = re.exec(text))) {
      const info = parseMarker(m[1])
      if (info.label) set[info.slug] = true
    }
    return set
  }

  private sumTableColumn(label: string, column: string): number {
    const info = this.getFields().find((f) => f.slug === slug(label) && f.type === 'table')
    if (!info) return 0
    const rows = Array.isArray(this.values[info.slug]) ? (this.values[info.slug] as string[][]) : info.presetRows || []
    const ci = info.options.findIndex((c) => c.trim().toLowerCase() === column.trim().toLowerCase())
    if (ci < 0) return 0
    let sum = 0
    rows.forEach((r) => {
      const n = parseNum(r && r[ci])
      if (!isNaN(n)) sum += n
    })
    return sum
  }

  evalFormula(info: FieldInfo, depth = 0): number {
    if (depth > 6) return NaN
    let expr = String(info.formula || '')
    expr = expr.replace(/sum\(\s*([^.)]+)\.([^)]+)\)/gi, (_mm, lbl, col) => String(this.sumTableColumn(lbl, col)))
    expr = expr.replace(/\[([^\]]+)\]/g, (_mm, lbl) => {
      const slugKey = slug(lbl)
      const ref = this.getFields().find((f) => f.slug === slugKey)
      const num = ref && ref.type === 'formula' ? this.evalFormula(ref, depth + 1) : parseNum(this.values[slugKey])
      return String(isNaN(num) ? 0 : num)
    })
    if (!/^[-0-9.+*/() \t]*$/.test(expr) || !expr.trim()) return NaN
    try {
      // eslint-disable-next-line no-new-func
      const r = Function('return (' + expr + ')')()
      return typeof r === 'number' && isFinite(r) ? r : NaN
    } catch {
      return NaN
    }
  }

  formulaText(info: FieldInfo): string {
    const r = this.evalFormula(info)
    if (isNaN(r)) return ''
    const fmt = info.formulaFormat
    if (fmt && fmt.kind === 'currency') return formatCurrency(String(r), fmt.currency || 'BRL')
    if (fmt && fmt.kind === 'int') return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(r)
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(r)
  }

  displayValue(info: FieldInfo, val: unknown): string {
    if (info.type === 'date') return formatDate(val as string)
    if (info.type === 'currency') return formatCurrency(val, (info.options && info.options[0]) || 'BRL')
    if (info.type === 'yesno') return val === 'true' ? 'Sim' : val === 'false' ? 'Não' : ''
    if (info.type === 'formula') return this.formulaText(info)
    return (val as string) || ''
  }
}
