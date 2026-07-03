import { html, nothing, type TemplateResult } from 'lit-html'
import { styleMap } from 'lit-html/directives/style-map.js'
import { MarkerEngine, parseMarker, type FieldInfo, type Values } from './markers'

type Piece = TemplateResult | string | typeof nothing

function hStyle(lvl: number, fp: boolean, compact: boolean) {
  const c = fp && compact
  const base = { fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: '700', color: fp ? '#000' : '#1c1c1a', lineHeight: c ? '1.1' : '1.25' }
  if (lvl === 1) return { ...base, fontSize: fp ? (c ? '16pt' : '20pt') : '23px', margin: c ? '0 0 10px' : '0 0 16px', paddingBottom: c ? '6px' : '9px', borderBottom: '1px solid ' + (fp ? '#000' : 'rgba(0,0,0,0.12)') }
  if (lvl === 2) return { ...base, fontSize: fp ? (c ? '11pt' : '13.5pt') : '16px', margin: c ? '16px 0 7px' : '26px 0 11px' }
  return { ...base, fontSize: fp ? (c ? '10pt' : '12pt') : '14px', margin: c ? '12px 0 5px' : '20px 0 8px' }
}

function pStyle(fp: boolean, compact: boolean) {
  const c = fp && compact
  return { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: fp ? (c ? '9.5pt' : '11.5pt') : '15px', lineHeight: c ? '1.4' : '1.78', margin: c ? '0 0 9px' : '0 0 14px', color: fp ? '#111' : '#2c2c28' }
}

function markerNode(engine: MarkerEngine, values: Values, inner: string, fp: boolean): Piece {
  const info = parseMarker(inner)
  if (!engine.isVisible(info)) return nothing

  if (info.type === 'table') {
    return html`<span
      style=${styleMap({ background: 'rgba(43,99,217,0.09)', color: '#2b63d9', border: '1px dashed rgba(43,99,217,0.45)', borderRadius: '5px', padding: '1px 6px', fontSize: '0.8em', whiteSpace: 'nowrap' })}
      >${info.label}</span
    >`
  }

  const disp = engine.displayValue(info, values[info.slug] ?? '')

  if (info.type === 'sign') {
    if (!disp) {
      return fp
        ? html`<span style=${styleMap({ display: 'inline-block', minWidth: '180px', borderBottom: '1px solid #000' })}>&nbsp;</span>`
        : placeholderSpan(info.label)
    }
    return html`<img src=${disp} alt=${info.label} style=${styleMap({ height: fp ? '52px' : '44px', verticalAlign: 'bottom' })} />`
  }

  if (fp) {
    if (!disp) return html`<span style=${styleMap({ display: 'inline-block', minWidth: '130px', borderBottom: '1px solid #000' })}>&nbsp;</span>`
    return html`<span>${disp}</span>`
  }
  if (!disp) return placeholderSpan(info.label)
  return html`<span style=${styleMap({ borderBottom: '1.5px solid rgba(43,99,217,0.55)', fontWeight: '500', color: '#1c1c1a' })}>${disp}</span>`
}

function placeholderSpan(label: string) {
  return html`<span
    style=${styleMap({ background: 'rgba(43,99,217,0.09)', color: '#2b63d9', border: '1px dashed rgba(43,99,217,0.45)', borderRadius: '5px', padding: '1px 6px', fontSize: '0.8em', whiteSpace: 'nowrap', fontFamily: "'Helvetica Neue', Helvetica, sans-serif" })}
    >${label}</span
  >`
}

function segMarkers(engine: MarkerEngine, values: Values, str: string, fp: boolean): Piece[] {
  const out: Piece[] = []
  const re = /\{\{([^}]+)\}\}/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(str))) {
    if (m.index > last) out.push(str.slice(last, m.index))
    out.push(markerNode(engine, values, m[1], fp))
    last = re.lastIndex
  }
  if (last < str.length) out.push(str.slice(last))
  return out
}

function inlineNodes(engine: MarkerEngine, values: Values, str: string, fp: boolean): Piece[] {
  const out: Piece[] = []
  str.split('**').forEach((seg, si) => {
    const nodes = segMarkers(engine, values, seg, fp)
    if (si % 2 === 1) out.push(html`<strong>${nodes}</strong>`)
    else out.push(...nodes)
  })
  return out
}

function tableNode(info: FieldInfo, values: Values, fp: boolean, compact: boolean): TemplateResult {
  const c = fp && compact
  const cols = info.options.length ? info.options : ['Item']
  const rows = Array.isArray(values[info.slug]) ? (values[info.slug] as string[][]) : info.presetRows || []
  const hasData = rows.some((r) => Array.isArray(r) && r.some((c) => c && String(c).trim()))
  const thStyle = { textAlign: 'left', padding: fp ? (c ? '3px 6px' : '5px 9px') : '7px 10px', borderBottom: '1.5px solid ' + (fp ? '#000' : '#1c1c1a'), fontFamily: "Georgia, 'Times New Roman', serif", fontSize: fp ? (c ? '9pt' : '10.5pt') : '12.5px', fontWeight: '700', color: fp ? '#000' : '#1c1c1a' }
  const tdStyle = { padding: fp ? (c ? '3px 6px' : '5px 9px') : '7px 10px', borderBottom: '1px solid ' + (fp ? '#000' : 'rgba(0,0,0,0.12)'), fontFamily: "Georgia, 'Times New Roman', serif", fontSize: fp ? (c ? '9.5pt' : '11pt') : '14px', color: fp ? '#111' : '#2c2c28' }

  let bodyRows: TemplateResult[]
  if (hasData) {
    bodyRows = rows.map(
      (row) => html`<tr>${cols.map((_c, ci) => html`<td style=${styleMap(tdStyle)}>${(row && row[ci]) || ' '}</td>`)}</tr>`,
    )
  } else if (fp) {
    bodyRows = [html`<tr><td colspan=${cols.length} style=${styleMap({ ...tdStyle, color: '#767671', fontStyle: 'italic' })}>Nenhum item ainda</td></tr>`]
  } else {
    bodyRows = [html`<tr><td colspan=${cols.length} style=${styleMap({ ...tdStyle, color: '#9a9a92', fontStyle: 'italic' })}>Nenhum item ainda</td></tr>`]
  }

  return html`<table style=${styleMap({ width: '100%', borderCollapse: 'collapse', margin: '4px 0 18px' })}>
    <thead>
      <tr>
        ${cols.map((c) => html`<th style=${styleMap(thStyle)}>${c}</th>`)}
      </tr>
    </thead>
    <tbody>
      ${bodyRows}
    </tbody>
  </table>`
}

/** Renders the doc's visible markdown to lit-html — `fp` (final-print) selects print vs. on-screen styling, `compact` (print only) shrinks fonts/margins. */
export function renderDoc(docText: string, values: Values, fp: boolean, compact = false): TemplateResult[] {
  const c = fp && compact
  const engine = new MarkerEngine(docText, values)
  const text = engine.visibleDocText()
  const blocks = text.split(/\n{2,}/)
  const els: TemplateResult[] = []

  blocks.forEach((block) => {
    const trimmed = block.trim()
    if (!trimmed) return
    const lines = block.split('\n').filter((l) => l.trim() !== '')
    const h = /^(#{1,3})\s+(.*)$/.exec(trimmed)
    if (h && lines.length === 1) {
      const lvl = h[1].length
      const content = inlineNodes(engine, values, h[2], fp)
      const style = styleMap(hStyle(lvl, fp, compact))
      els.push(lvl === 1 ? html`<h1 style=${style}>${content}</h1>` : lvl === 2 ? html`<h2 style=${style}>${content}</h2>` : html`<h3 style=${style}>${content}</h3>`)
      return
    }

    if (lines.length && lines.every((l) => /^\s*-\s+/.test(l))) {
      const items = lines.map((l) => html`<li style=${styleMap({ marginBottom: c ? '3px' : '6px' })}>${inlineNodes(engine, values, l.replace(/^\s*-\s+/, ''), fp)}</li>`)
      els.push(
        html`<ul style=${styleMap({ margin: c ? '0 0 10px' : '0 0 16px', paddingLeft: '22px', fontFamily: "Georgia, 'Times New Roman', serif", fontSize: fp ? (c ? '9.5pt' : '11.5pt') : '15px', lineHeight: c ? '1.3' : '1.6', color: fp ? '#111' : '#2c2c28' })}>
          ${items}
        </ul>`,
      )
      return
    }

    const solo = /^\{\{([^}]+)\}\}$/.exec(trimmed)
    if (solo) {
      const sinfo = parseMarker(solo[1])
      if (!engine.isVisible(sinfo)) return
      if (sinfo.type === 'table') {
        els.push(tableNode(sinfo, values, fp, compact))
        return
      }
    }

    els.push(html`<p style=${styleMap(pStyle(fp, compact))}>${inlineNodes(engine, values, lines.join(' '), fp)}</p>`)
  })

  return els
}
