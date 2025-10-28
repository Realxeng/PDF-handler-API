const PDF = require('pdfkit')
const joi = require('joi')
const depth = require('object-depth')
const { flatten } = require('flat')
const util = require('util')

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
    const maxDepth = depth(data) + 1
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
    //doc.info = {...doc.info, title: queryValue.title}

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
    if (queryValue.title) {
        doc.font(FONT).fontSize(24).text(queryValue.title, { align: 'center' })
        doc.text('\n')
    }
    //Description
    if (queryValue.description) doc.font(FONT).fontSize(12).text(queryValue.description);

    //Build the table data
    let td = []

    //Function to traverse the data
    const traverseJSON = (obj, depth) => {
        //Arrays
        if (Array.isArray(obj)) {
            obj.forEach((value, index) => {
                if (typeof value === 'object') {
                    const rowSpan = Object.keys(flatten(value)).length
                    !td.length ? td.push([{ rowSpan, text: index + 1 }])
                        : index === 0 ? td.at(-1).push({ rowSpan, text: index + 1 })
                            : td.push([{ rowSpan, text: index + 1 }]);
                    traverseJSON(value, depth - 1);
                }
                //Value
                else {
                    const colSpan = depth - 1
                    if (depth === maxDepth || index > 0){
                         td.push([{ text: index }])
                    } else if (index === 0) {
                        td.at(-1).push({ text: index })
                    }
                    td.at(-1).push({ colSpan, text: value });
                }
            });
        }
        //Objects
        else {
            Object.entries(obj).forEach(([key, value], index) => {
                if (typeof value === 'object') {
                    const rowSpan = Object.keys(flatten(value)).length
                    !td.length ? td.push([{ rowSpan, text: key }])
                        : index === 0 ? td.at(-1).push({ rowSpan, text: key })
                            : td.push([{ rowSpan, text: key }])
                    traverseJSON(value, depth - 1)
                }
                //Value
                else {
                    const colSpan = depth - 1
                    if (depth === maxDepth || index > 0){
                        td.push([{ text: key }])
                    } else if (index === 0) {
                        td.at(-1).push({ text: key })
                    }
                    td.at(-1).push({ colSpan, text: value });
                }
            })
        }
    }

    traverseJSON(data, maxDepth)

    //console.log(util.inspect(td, false, null, color = true))

    //Create the table
    doc.font(FONT).fontSize(12)
    doc.table({
        defaultStyle: {
        },
        data: td
    })
    doc.text('\n')

    //Remarks
    if (queryValue.remarks) doc.font(FONT).fontSize(12).text(queryValue.remarks)

    //Close the doc
    doc.end()
}

module.exports = convert