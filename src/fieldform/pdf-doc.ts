import pdfMake from 'pdfmake/build/pdfmake'
import vfs from 'pdfmake/build/vfs_fonts'
import type { Content, TableCell, TCreatedPdf } from 'pdfmake/build/pdfmake'
import type { TDocumentDefinitions } from 'pdfmake/interfaces'
import { MarkerEngine, parseMarker, type FieldInfo, type Values } from './markers'

pdfMake.addVirtualFileSystem(vfs)

function headingSize(lvl: number, compact: boolean): number {
  if (lvl === 1) return compact ? 16 : 20
  if (lvl === 2) return compact ? 11 : 13.5
  return compact ? 10 : 12
}

function headingMarginBottom(lvl: number, compact: boolean): number {
  if (lvl === 1) return compact ? 10 : 16
  if (lvl === 2) return compact ? 7 : 11
  return compact ? 5 : 8
}

function blank(width: number): Content {
  return { text: ' '.repeat(width), decoration: 'underline', preserveLeadingSpaces: true, preserveTrailingSpaces: true }
}

function markerRun(engine: MarkerEngine, values: Values, inner: string, bold: boolean): Content {
  const info = parseMarker(inner)
  if (!engine.isVisible(info)) return ''
  if (info.type === 'table') return { text: info.label, color: '#2b63d9', bold }
  const disp = engine.displayValue(info, values[info.slug] ?? '')
  if (info.type === 'sign') return disp ? { text: '[assinado]', italics: true } : blank(22)
  if (!disp) return blank(16)
  return { text: disp, bold }
}

function inlineRuns(engine: MarkerEngine, values: Values, str: string): Content[] {
  const out: Content[] = []
  str.split('**').forEach((seg, si) => {
    const bold = si % 2 === 1
    const re = /\{\{([^}]+)\}\}/g
    let last = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(seg))) {
      if (m.index > last) out.push(bold ? { text: seg.slice(last, m.index), bold: true } : seg.slice(last, m.index))
      out.push(markerRun(engine, values, m[1], bold))
      last = re.lastIndex
    }
    if (last < seg.length) out.push(bold ? { text: seg.slice(last), bold: true } : seg.slice(last))
  })
  return out
}

function tableContent(info: FieldInfo, values: Values, compact: boolean): Content {
  const cols = info.options.length ? info.options : ['Item']
  const rows = Array.isArray(values[info.slug]) ? (values[info.slug] as string[][]) : info.presetRows || []
  const hasData = rows.some((r) => Array.isArray(r) && r.some((c) => c && String(c).trim()))
  const headerFont = compact ? 9 : 10.5
  const cellFont = compact ? 9.5 : 11
  const body: TableCell[][] = [cols.map((c) => ({ text: c, bold: true, fontSize: headerFont }))]
  if (hasData) {
    rows.forEach((row) => body.push(cols.map((_c, ci) => ({ text: (row && row[ci]) || ' ', fontSize: cellFont }))))
  } else {
    body.push([{ text: 'Nenhum item ainda', italics: true, color: '#767671', fontSize: cellFont, colSpan: cols.length }, ...cols.slice(1).map(() => ({}))])
  }
  return { table: { headerRows: 1, widths: cols.map(() => '*'), body }, layout: 'lightHorizontalLines', margin: [0, 4, 0, compact ? 9 : 14] }
}

/** Mirrors render-doc.ts's block loop, targeting pdfmake's content tree instead of lit-html. */
export function docDefinition(docText: string, values: Values, compact: boolean): TDocumentDefinitions {
  const engine = new MarkerEngine(docText, values)
  const text = engine.visibleDocText()
  const blocks = text.split(/\n{2,}/)
  const content: Content[] = []

  blocks.forEach((block) => {
    const trimmed = block.trim()
    if (!trimmed) return
    const lines = block.split('\n').filter((l) => l.trim() !== '')

    const h = /^(#{1,3})\s+(.*)$/.exec(trimmed)
    if (h && lines.length === 1) {
      const lvl = h[1].length
      content.push({
        text: inlineRuns(engine, values, h[2]),
        bold: true,
        fontSize: headingSize(lvl, compact),
        margin: [0, lvl === 1 ? (compact ? 14 : 20) : 0, 0, headingMarginBottom(lvl, compact)],
      })
      return
    }

    if (lines.length && lines.every((l) => /^\s*-\s+/.test(l))) {
      content.push({
        ul: lines.map((l) => ({ text: inlineRuns(engine, values, l.replace(/^\s*-\s+/, '')), fontSize: compact ? 9.5 : 11.5 })),
        margin: [0, 0, 0, compact ? 10 : 16],
      })
      return
    }

    const solo = /^\{\{([^}]+)\}\}$/.exec(trimmed)
    if (solo) {
      const sinfo = parseMarker(solo[1])
      if (!engine.isVisible(sinfo)) return
      if (sinfo.type === 'table') {
        content.push(tableContent(sinfo, values, compact))
        return
      }
      if (sinfo.type === 'sign') {
        const disp = engine.displayValue(sinfo, values[sinfo.slug] ?? '')
        content.push(
          disp
            ? { image: disp, height: compact ? 40 : 48, margin: [0, 4, 0, compact ? 9 : 14] }
            : { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 140, y2: 0, lineWidth: 1 }], margin: [0, 20, 0, compact ? 9 : 14] },
        )
        return
      }
    }

    content.push({
      text: inlineRuns(engine, values, lines.join(' ')),
      fontSize: compact ? 9.5 : 11.5,
      lineHeight: compact ? 1.25 : 1.4,
      margin: [0, 0, 0, compact ? 9 : 14],
    })
  })

  return {
    content,
    pageMargins: compact ? 32 : 61,
    defaultStyle: { font: 'Roboto', fontSize: compact ? 9.5 : 11.5, color: '#111' },
  }
}

export function buildPdf(docText: string, values: Values, compact: boolean): TCreatedPdf {
  return pdfMake.createPdf(docDefinition(docText, values, compact))
}
