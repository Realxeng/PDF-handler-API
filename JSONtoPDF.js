const PDF = require('pdfkit')
const joi = require('joi')
const depth = require('object-depth')
const { flatten } = require('flat')
const util = require('util')
const { table } = require('console')

//Create the query schema
const schema = joi.object({
    filename: joi.string(),
    title: joi.string(),
    description: joi.string(),
    remarks: joi.string(),
    compress: joi.bool(),
    userPassword: joi.string(),
    ownerPassword: joi.string(),
    pdfVersion: joi.string(),
    autoFirstPage: joi.bool(),
    size: joi.alternatives().try(
        joi.string().valid(
            "4A0", "2A0", "A0", "A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9", "A10",
            "B0", "B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9", "B10",
            "C0", "C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10",
            "RA0", "RA1", "RA2", "RA3", "RA4",
            "SRA0", "SRA1", "SRA2", "SRA3", "SRA4",
            "LETTER", "LEGAL", "TABLOID", "EXECUTIVE", "FOLIO"
        ),
        joi.array().items(joi.number()).min(2).max(2)
    ).default("A4"),
    margin: joi.alternatives().try(
        joi.number(),
        joi.string()
    ).default(50),
    margins: joi.object({
        top: joi.number().min(0),
        bottom: joi.number().min(0),
        left: joi.number(),
        right: joi.number(),
    }),
    layout: joi.string().valid("potrait", "landscape"),
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
    const maxDepth = countDepthwithArrayIndices(data) + 1
    if (!maxDepth || maxDepth < 1) {
        console.log("Data: ")
        console.log(data)
        return res.status(400).json({ message: "Incomplete JSON" })
    }

    const { title, description, remarks, ...pageOptions } = queryValue

    //Intialize the PDF
    const doc = new PDF({
        ...pageOptions,
        info: {
            Title: queryValue.title || "Form"
        }
    })
    const pageHeight = doc.page.height
    const marginBottom = doc.page.margins.bottom
    const pageWidth = doc.page.width
    const marginLeft = doc.page.margins.left
    const marginRight = doc.page.margins.right

    //Create filename
    const filename = (queryValue.filename || queryValue.title || 'form')
        .replace(/[^\w\d_-]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');

    //Set the response header
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `inline; filename=${filename}.pdf`)
    res.status(200)
    //Send the pdf to res object
    doc.pipe(res)

    /**
     * Build the PDF
     */
    //Title
    if (queryValue.title) {
        doc.font(FONT).fontSize(24).text(queryValue.title, { align: 'center' })
        doc.fontSize(12).text('\n')
    }
    //Description
    if (queryValue.description) doc.font(FONT).fontSize(12).text(queryValue.description);

    //Build the table data
    let tdArray = []

    //Function to traverse the data
    const buildTableData = (obj, depth) => {
        //Arrays
        if (Array.isArray(obj)) {
            obj.forEach((value, index) => {
                if (typeof value === 'object') {
                    const rowSpan = Object.keys(flatten(value)).length
                    !tdArray.length ? tdArray.push([{ rowSpan, align: { x: 'center', y: 'center' }, text: index + 1 }])
                        : index === 0 ? tdArray.at(-1).push({ rowSpan, align: { x: 'center', y: 'center' }, text: index + 1 })
                            : tdArray.push([{ rowSpan, align: { x: 'center', y: 'center' }, text: index + 1 }]);
                    buildTableData(value, depth - 1);
                }
                //Value
                else {
                    const colSpan = depth - 1
                    if (depth === maxDepth || index > 0) {
                        tdArray.push([{ text: index }])
                    } else if (index === 0) {
                        tdArray.at(-1).push({ text: index })
                    }
                    tdArray.at(-1).push({ colSpan, text: value });
                }
            });
        }
        //Objects
        else {
            Object.entries(obj).forEach(([key, value], index) => {
                if (typeof value === 'object') {
                    const rowSpan = Object.keys(flatten(value)).length
                    !tdArray.length ? tdArray.push([{ rowSpan, text: key }])
                        : index === 0 ? tdArray.at(-1).push({ rowSpan, text: key })
                            : tdArray.push([{ rowSpan, text: key }])
                    buildTableData(value, depth - 1)
                }
                //Value
                else {
                    const colSpan = depth - 1
                    if (depth === maxDepth || index > 0) {
                        tdArray.push([{ text: key }])
                    } else if (index === 0) {
                        tdArray.at(-1).push({ text: key })
                    }
                    tdArray.at(-1).push({ colSpan, text: value });
                }
            })
        }
    }

    console.log("Processing data")
    buildTableData(data, maxDepth)

    //Create the table
    const cellWidth = (pageWidth - marginLeft - marginRight) / maxDepth;
    doc.font(FONT).fontSize(12)
    console.log("Paginating table")
    const tablePages = [[]]
    let currentY = doc.y
    for (const td of tdArray) {
        const rowHeight = Math.max(...td.map(cell => {
            return doc.heightOfString(cell.text, { width: cellWidth * (cell.colSpan || 1) }) + 10
        }))
        const totalColSpan = td.reduce((sum, cell) => {
            //console.log(`cell: ${cell.text}\ncolspan: ${cell.colSpan || 1}`)
            return sum + (cell.colSpan || 1)
        }, 0)
        //console.log(`total row colspan: ${totalColSpan}`)
        if (currentY + rowHeight > pageHeight) {
            tablePages.push([])
            currentY = doc.page.margins.top
        }
        const currPage = tablePages[tablePages.length - 1]
        const newRow = []
        for (let i = totalColSpan; i < maxDepth; i++) {
            newRow.push({text: ""})
        }
        newRow.push(...td)
        currPage.push(newRow)
        currentY += rowHeight
    }
    console.log("Printing table")
    console.log(util.inspect(tablePages, { depth: null, colors: true}))
    for (const pages of tablePages) {
        doc.table({
            data: pages,
            defaultStyle: {
                padding: {
                    top: 6,
                    bottom: 4,
                    left: 4,
                    right: 4
                },
                align: {
                    x: 'left',
                    y: 'center'
                }
            },
        })
        doc.addPage()
    }
    //doc.addPage()
    doc.text('\n')

    //Remarks
    if (queryValue.remarks) doc.font(FONT).fontSize(12).text(queryValue.remarks)

    //Close the doc
    doc.end()
}

function countDepthwithArrayIndices(object) {
    const baseDepth = depth(object)

    const numArray = countArrays(object)
    return baseDepth + numArray
}

function countArrays(object) {
    if (Array.isArray(object)) {
        return 1 + object.reduce((sum, item) => sum + countArrays(item), 0)
    } else if (object && typeof o === 'object') {
        return Object.values(object).reduce((sum, item) => sum + countArrays(item), 0)
    } else {
        return 0
    }
}

module.exports = convert