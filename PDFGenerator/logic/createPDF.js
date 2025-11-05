const { PDFDocument } = require('pdf-lib')

class CreatePDF {
    constructor(pdfDoc) {
        this.pdf = pdfDoc
    }

    static async load(pdfBuffer) {
        const pdfDoc = await PDFDocument.load(pdfBuffer)
        return new CreatePDF(pdfDoc)
    }

    
}

module.exports = CreatePDF