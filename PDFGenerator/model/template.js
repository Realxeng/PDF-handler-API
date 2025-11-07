const NocobaseFunctions = require('../logic/NocobaseFunctions')
const templateNocobase = new NocobaseFunctions('templates', 'Templates', process.env.USERNOCOURL || 'http://localhost:13000')

const upload = async(table_name, pdfFormBuffer, form_fields, nocoApp, cred) => {
    const schema = joi.object({
        form_fields: joi.array().items(joi.object({
            field: joi.object({
                name: joi.string(),
            }),
            data_field: joi.string()
        }).unknown(false)).min(1),
        nocobase_app: joi.string(),
        table_name: joi.string(),
    }).unknown(false)

    const response = await templateNocobase.uploadFile(pdfFormBuffer, cred)
    if (response.json.message) {
        return response
    }

    const id = response.json.data.id

    const body = {
        values: [
            {
                id,
                form_fields,
                nocobase_app: nocoApp,
                table_name,
            }
        ],
        cred
    }

    const detailsResponse = await templateNocobase.upload(body, cred)
    return detailsResponse
}

const get = async(cred, tempId) => {
    const response = await templateNocobase.get(cred, tempId)
    return response
}

const getAll = async(cred, nocoApp) => {
    const filter = { nocobase_app: nocoApp }
    const response = await templateNocobase.getAll(cred, filter)
    return response
}

module.exports = {
    upload, get, getAll
}