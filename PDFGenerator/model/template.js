const NocobaseFunctions = require('../logic/NocobaseFunctions')
const templateNocobase = new NocobaseFunctions(templates, Templates, 'http://localhost:13000')

const upload = async(formName, pdfFormBuffer, formFields, cred) => {
    const schema = joi.object({
        formName: joi.string(),
        formFields: joi.array().items(joi.object({
            field: joi.object({
                name: joi.string(),
            }),
            dataField: joi.string()
        }).unknown(false)).min(1)
    }).unknown(false)
    const body = {
        values: [
            {
                name: formName,
                form: formFields,
            }
        ],
        cred
    }
    const response = await templateNocobase.upload(body, schema)
    return response
}

const get = async (req, res) => {
    const body = req.body
    return res.status(200).send('kokekab')
}

const getAll = async (cred) => {
    const response = await templateNocobase.getAll(cred)
    return response
}

module.exports = {
    upload, get, getAll
}