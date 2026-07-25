// ~/composables/useOrderConfirmPdf.ts
type BuildPdfInput = {
  saved: {
    orderRef?: string
    totals: {
      currency: string
      originalSubtotal?: number
      productDiscount?: number
      subtotal: number
      shipping: number
      vat: number
      grand: number
      loyaltyDiscount?: number
    }
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

type PdfFont = {
  widthOfTextAtSize: (text: string, size: number) => number
}

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN_X = 28
const BLACK = { r: 0, g: 0, b: 0 }
const GRID = { r: 0.72, g: 0.72, b: 0.72 }
const LIGHT = { r: 0.94, g: 0.96, b: 0.98 }
const ISC_VATIN = 'OM1100033153'
const ISC_CR = '1321172'

export function useOrderConfirmPdf() {
  const buildPdfUrl = async (input: BuildPdfInput): Promise<string> => {
    if (!import.meta.client) return ''

    const { PDFDocument, StandardFonts, rgb } = await import('~/utils/pdfRuntime.client')

    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const color = (c: { r: number; g: number; b: number }) => rgb(c.r, c.g, c.b)
    const fmt = (value: number | string | null | undefined) => {
      const num = Number(value || 0)
      return Number.isFinite(num) ? num.toFixed(3) : '0.000'
    }
    const safeText = (value: unknown) =>
      String(value ?? '')
        .replace(/[\u2013\u2014]/g, '-')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201c\u201d]/g, '"')
        .replace(/\u00a0/g, ' ')
        .replace(/[^\x09\x0a\x0d\x20-\x7e\u00a0-\u00ff]/g, '')

    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    let y = 0

    const drawText = (
      text: unknown,
      x: number,
      yPos: number,
      options: { bold?: boolean; size?: number; maxWidth?: number } = {},
    ) => {
      const size = options.size ?? 8
      page.drawText(safeText(text), {
        x,
        y: yPos,
        size,
        font: options.bold ? fontBold : font,
        color: color(BLACK),
        maxWidth: options.maxWidth,
      })
    }

    const drawRight = (text: unknown, rightX: number, yPos: number, size = 7.5, bold = false) => {
      const value = safeText(text)
      const f = bold ? fontBold : font
      page.drawText(value, {
        x: rightX - f.widthOfTextAtSize(value, size),
        y: yPos,
        size,
        font: f,
        color: color(BLACK),
      })
    }

    const drawCenter = (text: unknown, yPos: number, size = 9, bold = false) => {
      const value = safeText(text)
      const f = bold ? fontBold : font
      page.drawText(value, {
        x: (PAGE_WIDTH - f.widthOfTextAtSize(value, size)) / 2,
        y: yPos,
        size,
        font: f,
        color: color(BLACK),
      })
    }

    const line = (x1: number, y1: number, x2: number, y2: number, thickness = 0.45) => {
      page.drawLine({
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
        thickness,
        color: color(GRID),
      })
    }

    const rect = (x: number, yPos: number, width: number, height: number, fill?: { r: number; g: number; b: number }) => {
      page.drawRectangle({
        x,
        y: yPos,
        width,
        height,
        borderColor: color(GRID),
        borderWidth: 0.45,
        color: fill ? color(fill) : undefined,
      })
    }

    const wrapText = (text: unknown, maxWidth: number, size = 7.5, usedFont: PdfFont = font): string[] => {
      const paragraphs = safeText(text).split('\n')
      const lines: string[] = []

      paragraphs.forEach((paragraph) => {
        const words = paragraph.trim().split(/\s+/).filter(Boolean)
        if (!words.length) {
          lines.push('')
          return
        }

        let current = ''
        words.forEach((word) => {
          const candidate = current ? `${current} ${word}` : word
          if (usedFont.widthOfTextAtSize(candidate, size) <= maxWidth) {
            current = candidate
          } else {
            if (current) lines.push(current)
            current = word
          }
        })
        if (current) lines.push(current)
      })

      return lines
    }

    const drawWrapped = (text: unknown, x: number, yPos: number, maxWidth: number, size = 7.5, bold = false) => {
      const usedFont = bold ? fontBold : font
      const lines = wrapText(text, maxWidth, size, usedFont)
      lines.forEach((part, index) => drawText(part, x, yPos - index * (size + 2), { bold, size }))
      return lines.length
    }

    const fetchImageBytes = async (path: string) => {
      try {
        const response = await fetch(path)
        if (!response.ok) return null
        return await response.arrayBuffer()
      } catch {
        return null
      }
    }

    const buildFooterStrip = async () => {
      const canvas = document.createElement('canvas')
      canvas.width = 1500
      canvas.height = 120
      const ctx = canvas.getContext('2d')
      if (!ctx) return null

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#000000'
      ctx.font = '24px Arial, Tahoma, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`Industrial Supplies Center LLC | CR No: ${ISC_CR} | VATIN: ${ISC_VATIN}`, canvas.width / 2, 38)
      ctx.direction = 'rtl'
      ctx.font = '26px Tahoma, Arial, sans-serif'
      ctx.fillText('المركز الصناعي للمستلزمات ش.م.م', canvas.width / 2, 78)

      const dataUrl = canvas.toDataURL('image/png')
      const bytes = Uint8Array.from(atob(dataUrl.split(',')[1] || ''), (char) => char.charCodeAt(0))
      return pdfDoc.embedPng(bytes)
    }

    const logoBytes = await fetchImageBytes('/logonew1.png')
    const logo = logoBytes ? await pdfDoc.embedPng(logoBytes) : null
    const footerStrip = await buildFooterStrip()

    const ref = input.meta.ref || input.saved.orderRef || '-'
    const vat = input.company.vat || ISC_VATIN
    const currency = input.saved.totals.currency || 'OMR'
    const bank = input.meta.bank
    const supplierContact = input.supplierContact || { name: 'IC', phone: input.company.phone }
    const buyerContact = input.buyerContact || { name: input.buyer.name }

    const drawPageFooter = (targetPage: any) => {
      targetPage.drawLine({
        start: { x: MARGIN_X, y: 56 },
        end: { x: PAGE_WIDTH - MARGIN_X, y: 56 },
        thickness: 0.45,
        color: color(GRID),
      })

      if (footerStrip) {
        targetPage.drawImage(footerStrip, {
          x: MARGIN_X,
          y: 18,
          width: PAGE_WIDTH - MARGIN_X * 2,
          height: 34,
        })
      } else {
        targetPage.drawText(`Industrial Supplies Center LLC | CR No: ${ISC_CR} | VATIN: ${ISC_VATIN}`, {
          x: MARGIN_X,
          y: 32,
          size: 7,
          font,
          color: color(BLACK),
        })
      }
    }

    const drawInvoiceHeader = () => {
      if (logo) {
        page.drawImage(logo, { x: MARGIN_X, y: 780, width: 92, height: 38 })
      }

      drawText(input.company.name || 'Industrial Supplies Center LLC', 134, 801, { bold: true, size: 11 })
      drawText(`VATIN ${vat}`, 134, 786, { size: 8 })
      drawText(`Ref: ${ref} VATIN ${vat}`, MARGIN_X, 756, { size: 8 })
      drawCenter(input.meta.title || 'INVOICE', 733, 13, true)
      line(MARGIN_X, 724, PAGE_WIDTH - MARGIN_X, 724)

      drawText(`ISC Invoice Ref: ${ref}`, MARGIN_X, 705, { bold: true, size: 8.5 })
      drawRight(`Invoice Date: ${input.meta.date}`, PAGE_WIDTH - MARGIN_X, 705, 8.5, true)
      line(MARGIN_X, 695, PAGE_WIDTH - MARGIN_X, 695)
    }

    const drawPartyBlocks = () => {
      const blockY = 588
      const blockH = 92
      const colW = (PAGE_WIDTH - MARGIN_X * 2) / 2
      const rightX = MARGIN_X + colW

      rect(MARGIN_X, blockY, colW, blockH)
      rect(rightX, blockY, colW, blockH)
      rect(MARGIN_X, blockY + blockH - 18, colW, 18, LIGHT)
      rect(rightX, blockY + blockH - 18, colW, 18, LIGHT)

      drawText('SUPPLIER', MARGIN_X + 6, blockY + blockH - 12, { bold: true, size: 8 })
      drawText('BUYER', rightX + 6, blockY + blockH - 12, { bold: true, size: 8 })

      drawText(input.company.name, MARGIN_X + 6, blockY + blockH - 30, { bold: true, size: 8 })
      drawWrapped(input.company.address, MARGIN_X + 6, blockY + blockH - 43, colW - 12, 7)
      drawText(`VATIN: ${vat}`, MARGIN_X + 6, blockY + 17, { size: 7 })
      drawText(`Contact: ${supplierContact.name || 'IC'}`, MARGIN_X + 6, blockY + 7, { size: 7 })
      if (supplierContact.phone) drawText(`Mob: ${supplierContact.phone}`, MARGIN_X + 88, blockY + 7, { size: 7 })

      drawText(buyerContact.name || input.buyer.name || 'Customer', rightX + 6, blockY + blockH - 30, { bold: true, size: 8 })
      if (buyerContact.phone) drawText(`Mob: ${buyerContact.phone}`, rightX + 6, blockY + blockH - 43, { size: 7 })
      if (buyerContact.email) drawText(`Email: ${buyerContact.email}`, rightX + 6, blockY + blockH - 55, { size: 7 })
      drawWrapped(input.buyer.address, rightX + 6, blockY + blockH - 68, colW - 12, 7)

      y = blockY - 18
    }

    const drawNotesPageHeader = () => {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
      y = 760
      drawText(`Ref: ${ref}`, MARGIN_X, 802, { bold: true, size: 8 })
      drawCenter(input.meta.title || 'INVOICE', 802, 10, true)
      drawRight(`Invoice Date: ${input.meta.date}`, PAGE_WIDTH - MARGIN_X, 802, 8, true)
      line(MARGIN_X, 790, PAGE_WIDTH - MARGIN_X, 790)
    }

    const drawBankTerms = () => {
      const lines: string[] = []
      if (bank?.accountName) lines.push(`Account Name: ${bank.accountName}`)
      if (bank?.accountNo) lines.push(`Account Number: ${bank.accountNo}`)
      if (bank?.currency) lines.push(`Account Currency: ${bank.currency}`)
      if (bank?.swift) lines.push(`SWIFT Code: ${bank.swift}`)
      if (bank?.bank) lines.push(`Bank Name: ${bank.bank}`)
      if (bank?.branch) lines.push(`Bank Address: ${bank.branch}`)
      if (bank?.iban) lines.push(`IBAN: ${bank.iban}`)

      const requiredHeight = 42 + lines.length * 10
      if (y - requiredHeight < 72) {
        drawNotesPageHeader()
      } else {
        y -= 18
      }

      drawText('Terms & Conditions:', MARGIN_X, y, { bold: true, size: 8.5 })
      y -= 14
      drawText('1) Bank Account Details for Payment:', MARGIN_X, y, { bold: true, size: 7.7 })
      y -= 12

      lines.forEach((part) => {
        drawText(part, MARGIN_X + 10, y, { size: 7.2, maxWidth: PAGE_WIDTH - MARGIN_X * 2 - 20 })
        y -= 10
      })

      y -= 8
    }

    const columns = [
      { key: 'sl', label: 'SL\nNo', x: MARGIN_X, w: 24 },
      { key: 'desc', label: 'Description', x: MARGIN_X + 24, w: 205 },
      { key: 'qty', label: 'QTY', x: MARGIN_X + 229, w: 28 },
      { key: 'unit', label: 'Unit', x: MARGIN_X + 257, w: 30 },
      { key: 'price', label: 'Price', x: MARGIN_X + 287, w: 48 },
      { key: 'excl', label: 'Total excl.\nVAT', x: MARGIN_X + 335, w: 52 },
      { key: 'vatPct', label: 'VAT\n%', x: MARGIN_X + 387, w: 28 },
      { key: 'vatAmt', label: 'VAT Amt', x: MARGIN_X + 415, w: 48 },
      { key: 'incl', label: 'Total incl.\nVAT', x: MARGIN_X + 463, w: 76 },
    ]

    const tableRight = PAGE_WIDTH - MARGIN_X

    const drawTableHeader = () => {
      const headerH = 28
      rect(MARGIN_X, y - headerH + 8, tableRight - MARGIN_X, headerH, LIGHT)
      columns.forEach((col) => {
        line(col.x, y + 8, col.x, y - headerH + 8)
        drawWrapped(col.label, col.x + 3, y, col.w - 6, 7, true)
      })
      line(tableRight, y + 8, tableRight, y - headerH + 8)
      y -= headerH
    }

    const startContinuationPage = () => {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
      y = 770
      drawText(`Ref: ${ref}`, MARGIN_X, 802, { bold: true, size: 8 })
      drawCenter(input.meta.title || 'INVOICE', 802, 10, true)
      drawRight(`Invoice Date: ${input.meta.date}`, PAGE_WIDTH - MARGIN_X, 802, 8, true)
      line(MARGIN_X, 790, PAGE_WIDTH - MARGIN_X, 790)
      drawTableHeader()
    }

    const drawTableRows = () => {
      drawTableHeader()

      input.lines.forEach((lineItem, index) => {
        const totalEx = Number(lineItem.qty || 0) * Number(lineItem.unitPrice || 0)
        const vatAmt = totalEx * (Number(lineItem.vatPct || 0) / 100)
        const totalInc = totalEx + vatAmt
        const descLines = wrapText(lineItem.description, columns[1].w - 8, 7.2, font)
        const rowH = Math.max(30, descLines.length * 9 + 12)

        if (y - rowH < 128) startContinuationPage()

        const topY = y + 7
        rect(MARGIN_X, y - rowH + 8, tableRight - MARGIN_X, rowH)
        columns.forEach((col) => line(col.x, topY, col.x, y - rowH + 8))
        line(tableRight, topY, tableRight, y - rowH + 8)

        drawText(String(index + 1).padStart(2, '0'), columns[0].x + 4, y - 5, { size: 7.4 })
        descLines.forEach((part, descIndex) => drawText(part, columns[1].x + 4, y - 5 - descIndex * 9, { size: 7.2 }))
        drawRight(lineItem.qty, columns[2].x + columns[2].w - 4, y - 5, 7.4)
        drawText(lineItem.unit || 'EA', columns[3].x + 4, y - 5, { size: 7.4 })
        drawRight(fmt(lineItem.unitPrice), columns[4].x + columns[4].w - 4, y - 5, 7.2)
        drawRight(fmt(totalEx), columns[5].x + columns[5].w - 4, y - 5, 7.2)
        drawRight(`${Number(lineItem.vatPct || 0)}%`, columns[6].x + columns[6].w - 4, y - 5, 7.2)
        drawRight(fmt(vatAmt), columns[7].x + columns[7].w - 4, y - 5, 7.2)
        drawRight(fmt(totalInc), columns[8].x + columns[8].w - 4, y - 5, 7.2)

        y -= rowH
      })
    }

    const drawTotals = () => {
      if (y < 185) startContinuationPage()

      y -= 8
      const labelX = PAGE_WIDTH - 205
      const valueX = PAGE_WIDTH - MARGIN_X
      const shipping = Number(input.saved.totals.shipping || 0)
      const productDiscount = Number(input.saved.totals.productDiscount || 0)
      const originalSubtotal = Number(input.saved.totals.originalSubtotal || 0)
      const loyalty = Number(input.saved.totals.loyaltyDiscount || 0)

      if (productDiscount > 0 && originalSubtotal > 0) {
        drawRight('Items Before Discount:', labelX + 95, y, 8, true)
        drawRight(fmt(originalSubtotal), valueX, y, 8)
        y -= 13

        drawRight('Product Discount:', labelX + 95, y, 8, true)
        drawRight(`-${fmt(productDiscount)}`, valueX, y, 8)
        y -= 13
      }

      drawRight('Taxable Amount:', labelX + 95, y, 8, true)
      drawRight(fmt(input.saved.totals.subtotal), valueX, y, 8)
      y -= 13

      if (shipping > 0) {
        drawRight('Shipping Amount:', labelX + 95, y, 8, true)
        drawRight(fmt(shipping), valueX, y, 8)
        y -= 13
      }

      drawRight('VAT Amount:', labelX + 95, y, 8, true)
      drawRight(fmt(input.saved.totals.vat), valueX, y, 8)
      y -= 13

      if (loyalty > 0) {
        drawRight('Loyalty Discount:', labelX + 95, y, 8, true)
        drawRight(`-${fmt(loyalty)}`, valueX, y, 8)
        y -= 13
      }

      line(labelX, y + 7, valueX, y + 7, 0.7)
      drawRight('Total Net Amount (Incl. VAT):', labelX + 95, y - 5, 8.5, true)
      drawRight(`${fmt(input.saved.totals.grand)} ${currency}`, valueX, y - 5, 8.5, true)
      y -= 28
    }

    drawInvoiceHeader()
    drawPartyBlocks()
    drawTableRows()
    drawTotals()
    drawBankTerms()

    const pages = pdfDoc.getPages()
    pages.forEach((pdfPage: any, index: number) => {
      const pageLabel = `Page ${index + 1} of ${pages.length}`
      pdfPage.drawText(pageLabel, {
        x: PAGE_WIDTH - MARGIN_X - font.widthOfTextAtSize(pageLabel, 7),
        y: 821,
        size: 7,
        font,
        color: color(BLACK),
      })
      drawPageFooter(pdfPage)
    })

    const bytes = await pdfDoc.save()
    const blob = new Blob([Uint8Array.from(bytes)], { type: 'application/pdf' })
    return URL.createObjectURL(blob)
  }

  return { buildPdfUrl }
}
