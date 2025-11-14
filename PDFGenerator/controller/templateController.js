const joi = require('joi')
const PDFHelper = require('../logic/PDFHelper')
const template = require('../model/template')
const customer = require('../model/data')
const user = require('../model/user')
const { StandardFonts } = require('pdf-lib')
const NocobaseFunctions = require('../logic/NocobaseFunctions')

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

    //Upload the template
    const response = await template.upload(form.name, form.table_name, pdfBuffer, form.form_fields, nocoApp, cred)
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
    return res.status(201).send(pdfBuffer)
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
        const details = userResponse.record
        const { nocobase_url, nocobase_token, nocobase_app } = details
        const childData = await customer.getSchema(nocobase_url, nocobase_app, nocobase_token, pdfTemplate.table_name)
        for (const childDataItem of childData.data) {
            if (childDataItem.child) {
                try {
                    const child = new NocobaseFunctions(`${pdfTemplate.table_name}/${dataId}/${childDataItem.name}`,childDataItem.name, userResponse.record.nocobase_url)
                    let cf = await child.getAll(userCred);
                    if (cf.status == 500 || cf.json?.error?.errors?.[0]?.message === "repository.findAndCount is not a function") {
                        cf = await child.get(userCred, 1);
                    }
                    data.record[childDataItem.name] = {
                        json: cf.json ?? null,
                        record: cf.record ?? null
                    };
                } catch (err) {
                    console.error(`Error fetching ${childDataItem.name}:`, err);
                    return res.status(500).json({ message: "Error fetching child data" });
                }
            }
        }
        for (const key of Object.keys(data.record)) {
            const val = data.record[key];
            if (val && typeof val === "object" && ("json" in val || "record" in val)) {
                let flattened = null;

                if (val.json?.data) {
                    flattened = val.json.data;
                } else if (val.record) {
                    flattened = val.record;
                } else if (val.json) {
                    flattened = val.json;
                }
                data.record[key] = flattened;
            }
        }

        function resolveNestedPath(obj, fieldName) {
            // Recursive search for the field
            function search(current, path = "") {
                if (current == null) return null;

                if (typeof current === "object" && !Array.isArray(current)) {
                    // Iterate object keys
                    for (const key of Object.keys(current)) {
                        const result = search(current[key], path ? `${path}.${key}` : key);
                        if (result) return result;
                    }
                } else if (Array.isArray(current)) {
                    // Iterate array items
                    for (let i = 0; i < current.length; i++) {
                        const result = search(current[i], `${path}[${i}]`);
                        if (result) return result;
                    }
                } else {
                    // Primitive value
                    if (path.endsWith(fieldName)) return path;
                }

                return null;
            }

            return search(obj);
        }


        function getNestedValue(obj, path) {
            if (!obj || !path) return undefined;

            // Convert bracket notation [0] to dot notation
            path = path.replace(/\[(\d+)\]/g, '.$1');

            const keys = path.split('.');
            let current = obj;

            for (const key of keys) {
                if (current == null) return undefined;
                current = current[key];
            }

            return current;
        }

        function preparePDFValue(value) {
            if (value === null || value === undefined) return "";

            if (typeof value === "string" || typeof value === "number") {
                return value;
            }

            try {
                return JSON.stringify(value);
            } catch {
                return String(value);
            }
        }

        const PDFForm = await PDFHelper.load(pdfBuffer)
        const font = await PDFForm.embedFont(StandardFonts.TimesRoman)
        let truncatedFields = []
        pdfTemplate.form_fields.forEach(({ field, data_field }) => {
            if (!field || !data_field) return;
            const nestedPath = resolveNestedPath(data.record, data_field);
            const rawValue = nestedPath ? getNestedValue(data.record, nestedPath) : null;

            if (rawValue === undefined || rawValue === null) {
                console.log(`No data found for field: ${data_field}`);
                return;
            }
            const valueToFill = preparePDFValue(rawValue);

            try {
                const limit = PDFForm.fillData(field, valueToFill, font, 12);

                if (limit) {
                    truncatedFields.push(field.name);
                }

            } catch (err) {
                console.log(err);
                console.log(`Field not found: ${field.name}`);
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