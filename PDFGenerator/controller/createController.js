const joi = require('joi')
const CreatePDF = require('../logic/createPDF')
const template = require('../model/template')

async function createController (req, res) {
    //Get the pdf file
    const pdfBuffer = req.file.buffer
    //Get the form fields
    let fields = req.body.fields || false

    //Check for form fields validation
    if (!fields) {
        console.log(fields)
        return res.status(400).json({ message: "No form fields found sent" })
    }
    const { error, value } = joi.array().items(joi.object({
        field: joi.object({
            name: joi.string(),
            pageNum: joi.number().integer(),
            x: joi.number(),
            y: joi.number(),
            width: joi.number(),
            height: joi.number()
        }),
        data: joi.string()
    }).unknown(false)).min(1).validate(req.body.fields || false, { abortEarly: false })
    if (error) {
        console.log(error)
        return res.status(400).json({ message: "Invalid request", error })
    }
    fields = value

    //Load the pdf
    const PDFForm = await CreatePDF.load(pdfBuffer)
    //Build the form inside pdf
    fields.forEach((element, index) => {
        PDFForm.addTextBox(...element.field)
    });
    //Export the pdf template with form
    const pdfFormBuffer = await PDFForm.export()
    //Create the fields template

    //Upload the template
    const response = await template.upload(pdfFormBuffer)
    //Check response
    if (response.status != 201){
        return res.status(400).json({ message: "Failed to save template" })
    }
    //Return the template
    return pdfFormBuffer
}

module.exports = createController