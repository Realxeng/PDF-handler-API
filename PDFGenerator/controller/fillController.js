const joi = require('joi')
const PDFHelper = require('../logic/PDFHelper')
const NocobaseFunctions = require('../logic/NocobaseFunctions')

const templateData = new NocobaseFunctions('templates', 'template', 'Template')
const customerData = new NocobaseFunctions('customers', 'customer', 'Customer')

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

async function fillController(req, res) {
    try {
        const pdfBuffer = req.file.buffer
        const tempId = req.query.templateId
        const custId = req.query.customerId
        const cred = req.body.cred
        if (!pdfBuffer) return res.status(400).json({message: 'No PDF file received'})
        if (!tempId) return res.status(400).json({message: "No template ID received"})
        if (!custId) return res.status(400).json({message: "No customer ID received"})
        if (!cred) return res.status(400).json({message: "Missing credentials"})

        const result = await templateData.get(cred, tempId)
        if (!result.record) return res.status(400).json({message: "No template found"})
        
        const {error, value: template} = schema.validate(result.record, {abortEarly: false})
        if (error) {
            console.log(error)
            return res.status(400).json({message: "Invalid template structure", error})
        }

        const data = await customerData.get(cred, custId)
        if (!data.record) return res.status(400).json({message: "No customer found"})

        const PDFForm = await PDFHelper.load(pdfBuffer)
        template.formFields.forEach(({field, dataField}) => {
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

module.exports = fillController