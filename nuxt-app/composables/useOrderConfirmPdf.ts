// ~/composables/useOrderConfirmPdf.ts
type BuildPdfInput = {
  saved: {
    orderRef?: string
    totals: { currency: string; subtotal: number; shipping: number; vat: number; grand: number }
  }
  company: { name: string; address: string; phone?: string; vat?: string }
  buyer: { name: string; address: string }
  supplierContact?: { name: string; phone?: string; email?: string }
  buyerContact?: { name: string; phone?: string; email?: string }
  meta: {
    title: string
    ref: string
    date: string
    terms?: string[]
    bank?: {
      accountName?: string
      accountNo?: string
      currency?: string
      swift?: string
      bank?: string
      branch?: string
      iban?: string
    }
  }
  lines: Array<{
    description: string
    qty: number
    unit: string
    unitPrice: number
    vatPct: number
  }>
}

export function useOrderConfirmPdf() {
  const buildPdfUrl = async (input: BuildPdfInput): Promise<string> => {
    // SSR guard
    if (!import.meta.client) return ''

    // ✅ dynamic import on client
    if (!import.meta.client) return ''
const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib') // pdf-lib must be installed

    // ✅ correct API is create(), not new()
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595.28, 841.89]) // A4 portrait
    const { width } = page.getSize()

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    // helpers
    const drawText = (text: string, x: number, y: number, bold = false, size = 10) => {
      page.drawText(text ?? '', { x, y, size, font: bold ? fontBold : font, color: rgb(0, 0, 0) })
    }
    const lineY = (y: number) => page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.7, color: rgb(0.8, 0.8, 0.8) })

    // Header
    let y = 800
    drawText(input.meta.title, 40, y, true, 16)
    drawText(`Ref: ${input.meta.ref}`, width - 200, y, false, 10)
    y -= 20
    drawText(`Date: ${input.meta.date}`, width - 200, y)
    y -= 24
    lineY(y); y -= 12

    // Supplier / Buyer blocks (simple two columns)
    const leftX = 40
    const rightX = width / 2 + 10

    drawText('SUPPLIER', leftX, y, true)
    drawText(input.company.name, leftX, y - 14, true)
    const supplierLines = (input.company.address || '').split('\n')
    supplierLines.forEach((l, i) => drawText(l, leftX, y - 14 - 14 * (i + 1)))
    let blockBottom = y - 14 - 14 * (supplierLines.length + 1)

    drawText('BUYER', rightX, y, true)
    drawText(input.buyer.name, rightX, y - 14, true)
    const buyerLines = (input.buyer.address || '').split('\n')
    buyerLines.forEach((l, i) => drawText(l, rightX, y - 14 - 14 * (i + 1)))
    const blockBottom2 = y - 14 - 14 * (buyerLines.length + 1)

    y = Math.min(blockBottom, blockBottom2) - 16
    lineY(y); y -= 12

    // Table header
    drawText('Description', 40, y, true)
    drawText('Qty', width - 230, y, true)
    drawText('Unit', width - 190, y, true)
    drawText('Unit Price', width - 140, y, true)
    drawText('VAT', width - 85, y, true)
    drawText('Total', width - 45, y, true)
    y -= 10
    lineY(y); y -= 12

    // Table rows
    const cur = input.saved.totals.currency || 'OMR'
    input.lines.forEach((ln) => {
      if (y < 140) { // crude page-break
        y = 780
        pdfDoc.addPage([595.28, 841.89])
      }
      const totalEx = ln.qty * ln.unitPrice
      const vatAmt = totalEx * (ln.vatPct / 100)
      const totalInc = totalEx + vatAmt

      const descLines = ln.description.split('\n')
      descLines.forEach((d, i) => drawText(d, 40, y - i * 12))
      const rowHeight = 12 * descLines.length

      drawText(String(ln.qty), width - 230, y)
      drawText(ln.unit, width - 190, y)
      drawText(`${cur} ${ln.unitPrice.toFixed(3)}`, width - 140, y)
      drawText(`${ln.vatPct}%`, width - 85, y)
      drawText(`${cur} ${totalInc.toFixed(3)}`, width - 45, y)

      y -= rowHeight + 10
      lineY(y); y -= 10
    })

    // Totals
    y -= 6
    drawText('Subtotal:', width - 140, y, true)
    drawText(`${cur} ${Number(input.saved.totals.subtotal || 0).toFixed(3)}`, width - 45, y)
    y -= 14
    drawText('Shipping:', width - 140, y, true)
    drawText(`${cur} ${Number(input.saved.totals.shipping || 0).toFixed(3)}`, width - 45, y)
    y -= 14
    drawText('VAT:', width - 140, y, true)
    drawText(`${cur} ${Number(input.saved.totals.vat || 0).toFixed(3)}`, width - 45, y)
    y -= 14
    drawText('Grand Total:', width - 140, y, true)
    drawText(`${cur} ${Number(input.saved.totals.grand || 0).toFixed(3)}`, width - 45, y, true)
    y -= 20

    // Terms / bank
    if (input.meta.terms?.length) {
      drawText('TERMS', 40, y, true)
      input.meta.terms.forEach((t, i) => drawText(`• ${t}`, 40, y - 14 * (i + 1)))
      y -= 14 * (input.meta.terms.length + 1) + 8
    }
    if (input.meta.bank) {
      drawText('BANK DETAILS', 40, y, true)
      const b = input.meta.bank
      const lines: string[] = []
      if (b.accountName) lines.push(`Account: ${b.accountName}`)
      if (b.accountNo) lines.push(`A/C No: ${b.accountNo}`)
      if (b.currency) lines.push(`Currency: ${b.currency}`)
      if (b.swift) lines.push(`SWIFT: ${b.swift}`)
      if (b.bank) lines.push(`Bank: ${b.bank}`)
      if (b.branch) lines.push(`Branch: ${b.branch}`)
      if (b.iban) lines.push(`IBAN: ${b.iban}`)
      lines.forEach((t, i) => drawText(t, 40, y - 14 * (i + 1)))
    }

    const bytes = await pdfDoc.save()
    const uint8Array = Uint8Array.from(bytes)
    const blob = new Blob([uint8Array], { type: 'application/pdf' })
    return URL.createObjectURL(blob)
  }

  return { buildPdfUrl }
}
