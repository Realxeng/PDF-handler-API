const joi = require('joi')
const PDFHelper = require('../logic/PDFHelper')
const template = require('../model/template')

const schema = joi.array().items(joi.object({
    formField: joi.object({
        name: joi.string(),
        pageNum: joi.number().integer(),
        x: joi.number(),
        y: joi.number(),
        width: joi.number(),
        height: joi.number()
    }),
    dataField: joi.string()
}).unknown(false)).min(1)

async function createController(req, res) {
    //Get the pdf file
    const pdfBuffer = req.file.buffer || false
    //Get the form fields
    let fields = req.body.fields || false

    //Check for empty form fields
    if (!fields || !pdfBuffer) {
        console.log(fields)
        return res.status(400).json({ message: "No form fields or pdf found" })
    }

    //Validate form fields
    const { error, value } = schema.validate(fields, { abortEarly: false })
    //Check validation error
    if (error) {
        console.log(error)
        return res.status(400).json({ message: "Invalid request", error })
    }

    //Get validated form fields
    fields = value

    //Load the pdf
    const PDFForm = await PDFHelper.load(pdfBuffer)

    //Build the form inside pdf
    fields.forEach((field, index) => {
        PDFForm.addTextBox(...field.formField)
    });

    //Export the pdf template with form
    const pdfFormBuffer = await PDFForm.export()
    //Create the fields template

    //Upload the template
    const response = await template.upload(pdfFormBuffer)
    //Check response
    if (response.status != 201) {
        return res.status(400).json({ message: "Failed to save template" })
    }
    //Return the template
    return pdfFormBuffer
}

module.exports = createController