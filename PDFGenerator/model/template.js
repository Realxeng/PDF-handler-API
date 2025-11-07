const NocobaseFunctions = require('../logic/NocobaseFunctions')
const templateNocobase = new NocobaseFunctions(templates, Templates, process.env.USERNOCOURL || 'http://localhost:13000')

const upload = async(formName, tableName, pdfFormBuffer, formFields, nocoApp, cred) => {
    const schema = joi.object({
        filename: joi.string(),
        form_fields: joi.array().items(joi.object({
            field: joi.object({
                name: joi.string(),
            }),
            data_field: joi.string()
        }).unknown(false)).min(1)
    }).unknown(false)
    const body = {
        values: [
            {
                filename: formName,
                form_fields: formFields.map( (formfield) => {
                    return {
                        field: {
                            name: formfield.field.name
                        },
                        data_field: formfield.dataField
                    }
                }),
                nocobase_app: nocoApp,
                table_name: tableName
            }
        ],
        cred
    }
    const response = await templateNocobase.upload(body, schema)
    return response
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