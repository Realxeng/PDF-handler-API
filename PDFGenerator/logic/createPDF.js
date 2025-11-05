const { PDFDocument, PDFForm } = require('pdf-lib')

class CreatePDF {
    /**
     * A helper class to build pdf forms
     * @param {PDFDocument} pdfDoc 
     * @param {PDFForm} form 
     */
    constructor(pdfDoc, form) {
        this.pdf = pdfDoc
        this.form = form
    }

    static async load(pdfBuffer) {
        const pdfDoc = await PDFDocument.load(pdfBuffer)
        const form = pdfDoc.getForm()
        return new CreatePDF(pdfDoc, form)
    }

    addTextBox(name, pageNum, x, y, width, height) {
        const pages = this.pdf.getPages()
        const page = pages[pageNum]
        const textbox = this.form.createTextField(name)
        textbox.addToPage(page, { x, y, width, height, borderWidth: 0 })
    }

    async export() {
        this.form.flatten()
        const pdfFormBuffer = await this.pdf.save()
        return pdfFormBuffer
    }
}

module.exports = CreatePDF