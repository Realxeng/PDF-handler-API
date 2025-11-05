const { PDFDocument, PDFForm } = require('pdf-lib')
/**
 * A helper class to build pdf forms
 */
class PDFHelper {
    /**
     * 
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
     */
    addTextBox(name, pageNum, x, y, width, height) {
        const pages = this.pdf.getPages()
        const page = pages[pageNum]
        const textbox = this.form.createTextField(name)
        textbox.addToPage(page, { x, y, width, height, borderWidth: 0 })
    }

    /**
     * Fill a form field with the data
     * @param {string} fieldName 
     * @param {Object || string} data 
     */
    fillData(fieldName, data) {
        const field = this.form.getTextField(fieldName)
        field.setText(data)
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
     * @returns {Buffer}
     */
    async export() {
        const pdfFormBuffer = await this.pdf.save()
        return pdfFormBuffer
    }
}

module.exports = PDFHelper