const PDF = require('pdfkit')

async function convert(req, res) {
    const doc = new PDF({
        size: 'A4',
        font: 'TimesNewRoman'
    })
    doc.pipe(res)
    doc.end()
}

module.exports = convert