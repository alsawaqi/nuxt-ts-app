// Keep the PDF implementation behind one narrow, lazy-loaded boundary.
// Importing pdf-lib directly with import() exposes its entire public namespace
// to Rollup, while this wrapper lets it retain only the APIs our invoice uses.
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export { PDFDocument, StandardFonts, rgb }
