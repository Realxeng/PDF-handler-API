const joi = require('joi')
const PDFHelper = require('../logic/PDFHelper')
const template = require('../model/template')
const customer = require('../model/data')
const user = require('../model/user')
const { StandardFonts } = require('pdf-lib')

//Function to create a template
async function create(req, res) {
    //Declare the joi validation schema for form fields
    const schema = joi.object({
        name: joi.string(),
        table_name: joi.string(),
        form_fields: joi.array().items(joi.object({
            field: joi.object({
                name: joi.string(),
                pageNum: joi.number().integer(),
                x: joi.number(),
                y: joi.number(),
                width: joi.number(),
                height: joi.number()
            }),
            data_field: joi.string()
        }).unknown(false)).min(1),
    }).unknown(false)

    let cred = req.body.cred || { NOCOBASE_TOKEN: process.env.USERNOCOTOKEN, NOCOBASE_APP: process.env.USERNOCOAPP, DATABASE_URI: process.env.USERNOCOHOST }
    const nocoApp = req.body.nocoApp || false
    if (!nocoApp) {
        return res.status(400).json({ message: 'No user nocobase found' })
    }
    //Validate the pdf file
    if (!req.file || !req.file.buffer) {
        return res.status(400).json({ message: 'No PDF file found' })
    }
    if (req.file.mimetype !== 'application/pdf') {
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
    const { error, value } = schema.validate(JSON.parse(form), { abortEarly: false })
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
    // form.form_fields.forEach((field, index) => {
    //     PDFForm.addTextBox(...Object.values(field.field))
    // });

    //Export the pdf template with form
    const pdfFormBuffer = await PDFForm.export()
    //Create the fields template

    //Upload the template
    const response = await template.upload(form.name, form.table_name, pdfFormBuffer, form.form_fields, nocoApp, cred)
    //Check response
    if (response.data.status != 201) {
        return res.status(400).json({ message: "Failed to save template", error: response.data.json.message })
    }
    //Return the template
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${form.name || 'template'}.pdf"`)
    res.setHeader('Access-Control-Expose-Headers', 'X-File-ID, X-File_title, X-File_table_name, X-File_size')
    res.setHeader('X-File-ID', response.id)
    res.setHeader('X-File_title', response.data.json.data[0].title)
    res.setHeader('X-File_table_name', response.data.json.data[0].table_name)
    res.setHeader('X-File_size', response.data.json.data[0].size)
    return res.status(201).send(pdfFormBuffer)
}

//Function to get all templates
async function getAll(req, res) {
    const cred = req?.body?.cred ?? { NOCOBASE_TOKEN: process.env.USERNOCOTOKEN, NOCOBASE_APP: process.env.USERNOCOAPP, DATABASE_URI: process.env.USERNOCOHOST }
    const nocoApp = req.body.nocoApp || false
    if (!nocoApp) {
        return res.status(400).json({ message: 'User nocobase not found' })
    }
    const response = await template.getAll(cred, nocoApp)
    const data = response.json
    if (data.message) {
        if (data.error) {
            console.log(data.error)
            return res.status(data.status || 500).json({ message: data.message, error: data.error })
        } else {
            console.log(data.message)
            return res.status(data.status || 500).json({ message: data.message })
        }
    }
    return res.status(200).json({ data: data.data })
}

async function getFile(req, res) {
    const cred = req?.body?.cred ?? { NOCOBASE_TOKEN: process.env.USERNOCOTOKEN, NOCOBASE_APP: process.env.USERNOCOAPP, DATABASE_URI: process.env.USERNOCOHOST }
    const tempId = req.query.templateId
    if (!tempId) return res.status(400).json({ message: "Missing required parameter: templateId" });
    try {
        const response = await template.get(cred, tempId)
        if (!response || !response.record) return res.status(404).json({ message: "Template not found" });
        const data = response.record
        if (!data.url) return res.status(404).json({ message: "PDF URL not found in template record" });
        const pdfUrl = data.url
        const fullUrl = `${process.env.USERNOCOURL}${pdfUrl.substring(1)}`
        const pdfResponse = await fetch(fullUrl);
        if (!pdfResponse.ok) throw new Error(`Failed to fetch PDF: ${pdfResponse.statusText}`);
        const buffer = await pdfResponse.arrayBuffer();
        res.status(200).send(Buffer.from(buffer));
    } catch (error) {
        console.error("Error fetching template:", error);
        return res.status(500).json({ message: "Failed to get template", error: error.message });
    }
}

//Function to fill data to template
async function fill(req, res) {
    const schema = joi.object({
        id: joi.number().integer().required(),
        name: joi.string(),
        table_name: joi.string(),
        form_fields: joi.array().items(joi.object({
            field: joi.object({
                name: joi.string(),
                pageNum: joi.number().integer(),
                x: joi.number(),
                y: joi.number(),
                width: joi.number(),
                height: joi.number()
            }),
            dataField: joi.string()
        }).unknown(true)).min(1)
    }).unknown(true)

    try {
        const pdfBuffer = req.file.buffer
        const tempId = req.query.templateId
        const custId = req.query.customerId
        const dataId = req.query.dataId
        const cred = req.body.cred || null

        if (!pdfBuffer) return res.status(400).json({ message: 'No PDF file received' })
        if (!tempId) return res.status(400).json({ message: "No template ID received" })
        if (!custId) return res.status(400).json({ message: "No customer ID received" })
        if (!dataId) return res.status(400).json({ message: "No data ID received "})
        
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
                DATABASE_URI: process.env.USERNOCOHOST,
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

        const data = await customer.get(pdfTemplate.table_name, userResponse.record.nocobase_url, userCred, dataId)
        if (!data.record) {
            return res.status(400).json({ message: "No customer found" })
        }

        const PDFForm = await PDFHelper.load(pdfBuffer)
        const font = await PDFForm.embedFont(StandardFonts.TimesRoman)
        let truncatedFields = []
        pdfTemplate.form_fields.forEach(({ field, data_field }) => {
            if (!field || !data_field) return;
            const valueToFill = data.record[data_field]
            if (valueToFill !== undefined && valueToFill !== null) {
                try {
                    const limit = PDFForm.fillData(field, valueToFill, font, 12)
                    if (limit) {
                        truncatedFields.push(field.name)
                    }
                } catch (err) {
                    console.log(err)
                    console.log(`Field not found: ${field.name}`)
                }
            } else {
                console.log(`No data found for field: ${data_field}`)
            }
        })
        const outputBuffer = await PDFForm.exportFlatten()

        res.setHeader('Access-Control-Expose-Headers', 'Truncated-Fields')
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="filled.pdf"`);
        if (truncatedFields.length > 0) res.setHeader('Truncated-Fields', JSON.stringify(truncatedFields))
        return res.status(200).send(outputBuffer)

    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: "Server error filling PDF", error: err.message });
    }
}

module.exports = {
    create,
    getAll,
    getFile,
    fill
}