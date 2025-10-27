const PDF = require('pdfkit')
const joi = require('joi')

const schema = joi.object({
    title: joi.string(),
    size: joi.string().valid(
        "4A0", "2A0", "A0", "A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9", "A10", 
        "B0", "B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9", "B10", 
        "C0", "C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10", 
        "RA0", "RA1", "RA2", "RA3", "RA4", 
        "SRA0", "SRA1", "SRA2", "SRA3", "SRA4", 
        "LETTER", "LEGAL", "TABLOID", "EXECUTIVE", "FOLIO"
    ).default("A4"),
    margins: joi.object({
        top: joi.number().min(0).default(60),
        bottom: joi.number().min(0).default(60),
        left: joi.number().default(50),
        right: joi.number().default(50),
    })
}).unknown(false)

async function convert(req, res) {
    //Validate the request query
    const { error, value: queryValue } = schema.validate(req.query, {abortEarly: false})
    //Check query validation
    if(error) return res.status(400).json(error)
    //Get the data
    const data = req.body
    //Intialize the PDF
    const doc = new PDF({
        size: queryValue.size,
        margins: queryValue.margins
    })
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `inline; filename=form.pdf`)
    doc.info({
        title: queryValue.title
    })
    doc.pipe(res)
    
    doc.end()
}

module.exports = convert