const joi = require('joi')
const PDFHelper = require('../logic/PDFHelper')
const template = require('../model/template')

//Declare the joi validation schema for form fields
const schema = joi.object({
    formName: joi.string(),
    formFields: joi.array().items(joi.object({
        field: joi.object({
            name: joi.string(),
            pageNum: joi.number().integer(),
            x: joi.number(),
            y: joi.number(),
            width: joi.number(),
            height: joi.number()
        }),
        dataField: joi.string()
    }).unknown(false)).min(1)
}).unknown(false)

async function createController(req, res) {
    //Validate the pdf file
    if (!req.file || !req.file.buffer) {
        return res.status(400).json({ message: 'No PDF file found' })
    }
    if (req.file.mimetype !== 'application/json') {
        return res.status(400).json({ message: "File is not a PDF file" })
    }
    //Get the pdf file
    const pdfBuffer = req.file?.buffer || false
    //Get the form fields
    let form = req.body.form || false

    //Check for empty form fields or pdf
    if (!form) {
        console.log(form)
        return res.status(400).json({ message: "No template found" })
    }

    //Validate form fields
    const { error, value } = schema.validate(form, { abortEarly: false })
    //Check validation error
    if (error) {
        console.log(error)
        return res.status(400).json({ message: "Invalid request", error })
    }

    //Get validated form fields
    form = value

    //Load the pdf
    const PDFForm = await PDFHelper.load(pdfBuffer)

    //Build the form inside pdf
    form.formFields.forEach((field, index) => {
        PDFForm.addTextBox(...field.field)
    });

    //Export the pdf template with form
    const pdfFormBuffer = await PDFForm.export()
    //Create the fields template

    //Upload the template
    const response = await template.upload(form.formName, pdfFormBuffer)
    //Check response
    if (response.status != 201) {
        return res.status(400).json({ message: "Failed to save template" })
    }
    //Return the template
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="template.pdf"')
    return res.status(201).send(pdfFormBuffer)
}

module.exports = createController