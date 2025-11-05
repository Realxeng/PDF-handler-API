const CreatePDF = require('../logic/createPDF')

async function createController (req, res) {
    const pdfBuffer = req.file.buffer
    const PDFForm = await CreatePDF.load(pdfBuffer)
}

module.exports = createController