const joi = require('joi')
const PDFHelper = require('../logic/PDFHelper')

const schema = joi.array().items(joi.object({
    fieldName: joi.string(),
    data: joi.alternatives(joi.string(), joi.number(), joi.boolean())
}).unknown(false)).min(1)

async function fillController(req, res) {
    const pdfBuffer = req.file.buffer || false
    if (!pdfBuffer) return res.status(400).json({message: 'No PDF file received'})
    let fields = req.body.fields
    if (!fields) return res.status(400).json({message: "No field data provided"})
    
    const {error, value} = schema.validate(fields, {abortEarly: false})
    if (error) {
        console.log(error)
        return res.status(400).json({message: "Invalid form data", error})
    }
    fields = value

    const PDFForm = await PDFHelper.load(pdfBuffer)
    fields.forEach(item => {
        try {
            PDFForm.fillData(item.fieldName, item.data)
        } catch (err) {
            console.log(`Field not found: ${item.fieldName}`)
        }
    })
    const outputBuffer = await PDFForm.exportFlatten()
    return outputBuffer
}

module.exports = fillController