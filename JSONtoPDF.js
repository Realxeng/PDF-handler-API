const PDF = require('pdfkit')
const joi = require('joi')
const depth = require('object-depth')

//Create the query schema
const schema = joi.object({
    title: joi.string(),
    description: joi.string(),
    remarks: joi.string(),
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
    //Check the data
    if (!data) {
        console.log('Request body: ')
        console.log(req.body)
        return res.status(400).json({ message: "No JSON to parse" })
    }
    //Find the max depth
    const maxDepth = depth(data)
    if (!maxDepth || maxDepth < 1) {
        console.log("Data: ")
        console.log(data)
        return res.status(400).json({ message: "Incomplete JSON" })
    }

    //Intialize the PDF
    const doc = new PDF({
        size: queryValue.size,
        margins: queryValue.margins
    })
    //Create the doc metadata
    doc.info({
        title: queryValue.title
    })
    //Set the response header
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `inline; filename=form.pdf`)
    res.status(200)
    //Send the pdf to res object
    doc.pipe(res)

    /**
     * Build the PDF
     */
    //Title
    if (queryValue.title) doc.font(FONT).fontSize(18).text(queryValue.title, { align: 'center' })
    //Description
    if (queryValue.description) doc.font(FONT).fontSize(12).text(queryValue.description)

    //Functions to create key value pair
    const childKeyValue = (childKey, childValue, colSpan, first) => {
        if (Array.isArray(value)){
            
        } else if (typeof childValue === 'object') {
            const rowSpan = Object.keys(childValue).length
            if (first) td.at(-1).push({rowSpan, text: childKey})
            Object.keys(childValue).forEach( (grandChildKey, index) => {
                childKeyValue(grandChildKey, childValue[grandChildKey], colSpan - 1, index === 0)
            })
        } else {
            
        }
    }
    const createKeyValue = (key, value, colSpan) => {
        if (Array.isArray(value)){
            const rowSpan = value.length
            td.push([{ rowSpan, text: key }])
            value.forEach( (element, index) => {
                childKeyValue(index + 1, element, colSpan - 1, (index === 0))
            });
        } else if (typeof value === 'object') {
            const rowSpan = value.length
        } else {
            td.push([key, value])
        }
    }

    //Build the table data
    const td = []
    for (const key in data) {
        createKeyValue(key, data[key], maxDepth, true)
    }
    //Create the table
    doc.table({
        data: td
    })

    //Remarks
    if (queryValue.remarks) doc.font(FONT).fontSize(12).text(queryValue.remarks)

    //Close the doc
    doc.end()
}

module.exports = convert