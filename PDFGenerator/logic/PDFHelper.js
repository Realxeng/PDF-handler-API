const { PDFDocument, PDFForm, StandardFonts } = require('pdf-lib')
const { fontSize } = require('pdfkit')
/**
 * A helper class to build pdf forms
 */
class PDFHelper {
    /**
     * Create an instance of PDFHelper class
     * @param {PDFDocument} pdfDoc 
     * @param {PDFForm} form 
     */
    constructor(pdfDoc, form) {
        this.pdf = pdfDoc
        this.form = form
    }

    /**
     * Load the pdf into pdf-lib PDFDocument class instance
     * @param {Buffer} pdfBuffer Memory buffer for the pdf file
     * @returns {PDFHelper} A new instance of PDFHelper with the loaded pdf file and form 
     */
    static async load(pdfBuffer) {
        const pdfDoc = await PDFDocument.load(pdfBuffer)
        const form = pdfDoc.getForm()
        return new PDFHelper(pdfDoc, form)
    }

    /**
     * Adds a new textbox form field into the pdf
     * @param {string} name The name of the textbox
     * @param {number} pageNum The page number where the textbox will be put
     * @param {number} x The position of the textbox from the bottom of the page
     * @param {number} y The position of the textbox from the left of the page
     * @param {number} width The width of the textbox
     * @param {number} height The height of the textbox
     * @returns {void}
     */
    addTextBox(name, pageNum, x, y, width, height) {
        const pages = this.pdf.getPages()
        const page = pages[pageNum]
        const textbox = this.form.createTextField(name)
        textbox.addToPage(page, { x, y, width, height, borderWidth: 0 })
    }

    /**
     * Fill a form field with the data
     * @param {string} fieldName The name of the input field 
     * @param {(string | number | boolean)} data The data to be placed into the field
     * @returns {void}
     */
    fillData(field, data, font, fontSize) {
        if (typeof data !== 'string') data = data.toString()
        const page = this.pdf.getPage(field.pageNum)
        const { limit, text } = computeDrawTextHeight(data, font, fontSize, field.width, fontSize, field.height)
        page.drawText(text, { x: field.x, y: field.y, font: font, size: fontSize, maxWidth: field.width, lineHeight: fontSize, wordBreaks: [...data] })
        if (limit) return limit
    }

    async embedFont(font) {
        return await this.pdf.embedFont(font)
    }

    /**
     * Flatten the form fields and export the flatten pdf into buffer
     * @returns {Buffer} Memory buffer of the compeleted and flatten pdf
     */
    async exportFlatten() {
        this.form.flatten()
        const pdfFormBuffer = await this.pdf.save()
        return pdfFormBuffer
    }

    /**
     * Exports the pdf into buffer without flattening the form fields
     * @returns {Buffer} Memory buffer of the completed pdf
     */
    async export() {
        const pdfFormBuffer = await this.pdf.save()
        return pdfFormBuffer
    }
}

function computeDrawTextHeight(
    text,
    font,
    fontSize,
    maxWidth,
    lineHeight = fontSize,
    maxHeight,
) {
    const lines = [];
    let line = '';

    for (const ch of text) {
        const testLine = line + ch;
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);

        if (testWidth > maxWidth) {
            if ((lines.length + 1) * lineHeight > maxHeight) {
                const slicedLine = lines[lines.length - 1].slice(0, -2)
                lines[lines.length - 1] = slicedLine + '...'
                return { limit: true, text: lines.join('') }
            }
            lines.push(line);
            line = ch;
        } else {
            line = testLine;
        }
    }

    if (line) {
        if ((lines.length + 1) * lineHeight > maxHeight) {
            const slicedLine = lines[lines.length - 1].slice(0, -3)
            lines[lines.length - 1] = slicedLine + '...'
            return { limit: true, text: lines.join('') }
        }
        lines.push(line);
    }

    return { limit: false, text: lines.join('') };
}

module.exports = PDFHelper