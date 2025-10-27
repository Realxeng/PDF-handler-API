const PDF = require('pdfkit')
const joi = require('joi')
const depth = require('object-depth')

//Create the query schema
const schema = joi.object({
    title: joi.string(),
    cdescription: joi.string(),
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
    }),
    font: joi.string().valid(
        'Courier', 'Courier-Bold', 'Courier-Oblique', 'Courier-BoldOblique',
        'Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique', 'Helvetica-BoldOblique', 'Symbol',
        'Times-Roman', 'Times-Bold', 'Times-Italic', 'Times-BoldItalic', 'ZapfDingbats'
    ).default('Times-Roman'),
}).unknown(false)

function convert(req, res) {
    //Validate the request query
    const { error, value: queryValue } = schema.validate(req.query, { abortEarly: false })
    //Check query validation
    if (error) return res.status(400).json(error)
    //Set the default font
    const FONT = queryValue.font
    //Get the data
    const data = req.body
    //Intialize the PDF
    const doc = new PDF({
        size: queryValue.size,
        margins: queryValue.margins
    })
    //Set the response header
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `inline; filename=form.pdf`)
    res.status(200)
    //Create the doc metadata
    doc.info({
        title: queryValue.title
    })
    //Send the pdf to res object
    doc.pipe(res)

    /**
     * Build the PDF
     */
    //Title
    if (queryValue.title) doc.font(FONT).fontSize(18).text(queryValue.title, { align: 'center' })
    //Description
    if (queryValue.description) doc.font(FONT).fontSize(11).text(queryValue.description)

    //Function to create key value pair
    const childKeyValue = (childKey, childValue, colSpan) => {
        if (Array.isArray(value)){
            const rowSpan = value.length
            td.push([{ rowSpan, text: key }, { colSpan, text: value[0] }])
            value.forEach(element => {
                td.push([element])
            })
        } else if (typeof childValue === 'object') {
            for (const grandchildKey in childValue) {
                childKeyValue(grandchildKey, childValue[childKey], colSpan - 1)
            }
        } else {
            td.push([key, { colSpan, text: value}])
        }
    }

    const createKeyValue = (key, value, colSpan) => {
        if (Array.isArray(value)){
            const rowSpan = value.length
            td.push([{ rowSpan, text: key }, { colSpan, text: value[0] }])
            value.forEach(element => {
                td.push([element])
            })
        } else if (typeof value === 'object') {
            for (const childKey in value) {
                childKeyValue(childKey, value[childKey], colSpan - 1)
            }
        } else {
            td.push([key, { colSpan, text: value}])
        }
    }

    //Find the max depth
    const maxDepth = depth(data)
    //Create the table
    const td = []
    //Table data
    for (const key in data) {
        createKeyValue(key, data[key], maxDepth)
    }
    doc.table({
        data: td
    })

    //Close the doc
    doc.end()

}

module.exports = convert