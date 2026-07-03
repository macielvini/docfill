export function createWhatsAppShareLink(message?: string) {
  return 'https://web.whatsapp.com/send?text=' + encodeURIComponent(message || '');
}

export function encodeDocument() {}

export function decodeDocument() {}

export function messageTemplate(encodedDoc: string) {
  return `Clique no link para revisar o contrato\nhttps://docfill.com/assinar/${encodedDoc}`
}