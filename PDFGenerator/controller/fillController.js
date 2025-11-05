const joi = require('joi')
const PDFHelper = require('../logic/PDFHelper')

const schema = joi.array().items(joi.object({
    fieldName: joi.string(),
    data: joi.alternatives(joi.string(), joi.number(), joi.boolean())
}).unknown(false)).min(1)

async function fillController(req, res) {
    try {
        const pdfBuffer = req.file.buffer
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
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="filled.pdf"`);
        return res.status(200).send(outputBuffer)

    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: "Server error filling PDF", error: err.message });
    }
}

module.exports = fillController