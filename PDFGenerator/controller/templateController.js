const joi = require('joi')
const PDFHelper = require('../logic/PDFHelper')
const template = require('../model/template')
const customer = require('../model/data')
const user = require('../model/user')

//Function to create a template
async function create(req, res) {
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

    let cred = req.body.cred || process.env
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
    const response = await template.upload(form.formName, pdfFormBuffer, form.formFields, cred)
    //Check response
    if (response.status != 201) {
        return res.status(400).json({ message: "Failed to save template", error: response.error })
    }
    //Return the template
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="template.pdf"')
    return res.status(201).send(pdfFormBuffer)
}

//Function to get all templates
async function getAll(req, res) {
    const cred = req.body.cred || process.env
    const response = await template.getAll(cred)
    if (response.message) {
        if (response.error) {
            console.log(error)
            return res.status(response.status).json({ message: response.message, error: response.error })
        } else {
            console.log(message)
            return res.status(response.status).json({ message: response.message })
        }
    }
    return res.status(200).json({ data: response.records })
}

//Function to fill data to template
async function fill(req, res) {
    const schema = joi.object({
        id: joi.number().integer().required(),
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

    try {
        const pdfBuffer = req.file.buffer
        const tempId = req.query.templateId
        const custId = req.query.customerId
        const cred = req.body.cred || null

        if (!pdfBuffer) return res.status(400).json({ message: 'No PDF file received' })
        if (!tempId) return res.status(400).json({ message: "No template ID received" })
        if (!custId) return res.status(400).json({ message: "No customer ID received" })
        
        //Get user data Nocobase Credentials
        const userResponse = await user.get(cred, custId)
        if (userResponse.message) {
            return res.status(userResponse.status).json({ message: userResponse.message })
        }
        let userCred
        try {
            userCred = {
                NOCOBASE_TOKEN: userResponse.record.nocobase_token,
                NOCOBASE_APP: userResponse.record.nocobase_app,
                DATABASE_URI: userResponse.record.nocobase_host,
            }
        } catch (error) {
            console.log(error)
            return res.status(400).json({ message: 'Error getting user nocobase credentials' })
        }
        
        const templateResponse = await template.get({ NOCOBASE_TOKEN: process.env.USERNOCOTOKEN, NOCOBASE_APP: process.env.USERNOCOAPP, DATABASE_URI: process.env.USERNOCOHOST }, tempId)
        if (!templateResponse.record) return res.status(400).json({ message: "No template found" })

        const { error, value: pdfTemplate } = schema.validate(templateResponse.record, { abortEarly: false })
        if (error) {
            console.log(error)
            return res.status(400).json({ message: "Invalid template structure", error })
        }

        const data = await customer.get(pdfTemplate.tableName, userResponse.record.nocobase_url, userCred, custId)
        if (!data.record) return res.status(400).json({ message: "No customer found" })

        const PDFForm = await PDFHelper.load(pdfBuffer)
        pdfTemplate.formFields.forEach(({ field, dataField }) => {
            const valueToFill = data.record[dataField]
            if (valueToFill !== undefined) {
                try {
                    PDFForm.fillData(field.name, valueToFill)
                } catch (err) {
                    console.log(`Field not found: ${field.name}`)
                }
            }
        })
        const outputBuffer = await PDFForm.exportFlatten()
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="filled.pdf"`);
        return res.status(200).send(outputBuffer)

    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: "Server error filling PDF", error: err.message });
    }
}

module.exports = {
    create,
    getAll,
    fill
}