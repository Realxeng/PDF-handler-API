const CreatePDF = require('../logic/createPDF')

async function createController (req, res) {
    const rawpdf = await req.body.arrayBuffer()
    const PDFForm = new CreatePDF(req.body)
}

module.exports = createController