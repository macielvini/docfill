export const SAMPLE_DOC = `# Carta-Proposta de Emprego

Prezado(a) {{Nome do Candidato | title}},

Temos o prazer de oferecer a você a posição de **{{Cargo}}** na {{Empresa}}. Ficamos impressionados com a sua trajetória e acreditamos que você será uma ótima adição à equipe.

## Detalhes da Posição

- **Data de Início:** {{Data de Início | date}}
- **Departamento:** {{Departamento | select: Engenharia, Design, Vendas, Operações}}
- **Tipo de Contratação:** {{Tipo de Contratação | select: Tempo integral, Meio período, Contrato}}
- **Salário Anual:** {{Salário Anual}}

## Termos

O vínculo empregatício se dará sem prazo determinado e está condicionado à conclusão bem-sucedida da verificação de antecedentes.

Observações adicionais: {{Observações | textarea}}

## Itens Fornecidos

{{Itens | table: Item, Quantidade}}

## Equipamentos

Equipamentos a serem disponibilizados (ajuste as quantidades):

{{Equipamentos | table: Equipamento, Quantidade; Notebook, 1; Monitor, 1; Teclado, 1; Mouse, 1}}

Total de equipamentos: {{Total de Equipamentos | formula: sum(Equipamentos.Quantidade); int}} unidade(s).

## Pagamento

Haverá entrada? {{Com entrada? | yesno | link: entrada}}

{{#if entrada = true}}
Valor da entrada: {{Entrada | currency: BRL}}
{{/if}}

Forma de pagamento: {{Forma de Pagamento | select: Parcelado, À vista | link: pagamento}}

{{#if pagamento = Parcelado}}
Número de parcelas: {{Número de Parcelas}}

Valor de cada parcela: {{Valor da Parcela | formula: [Entrada] / [Número de Parcelas]; currency BRL}}
{{/if}}

## Aceite

Aceito os termos descritos nesta carta. Por favor, confirme assinando abaixo até {{Prazo para Resposta | date}}.

{{Assinatura do Candidato | sign}}

Assinado em {{Data de Aceite | date}}`

import type { Template } from './history'

export const BUILTIN_TEMPLATES: Template[] = [
  // { id: 'sample', title: 'Carta-Proposta de Emprego (exemplo)', docText: SAMPLE_DOC, createdAt: 0 },
]
