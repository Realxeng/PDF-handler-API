const joi = require('joi')
const NocobaseFunctions = require('../logic/NocobaseFunctions')
const templateNocobase = new NocobaseFunctions('templates', 'Templates', process.env.USERNOCOURL || 'http://localhost:13000/')

const upload = async (name, table_name, pdfFormBuffer, form_fields, nocoApp, cred) => {
    const response = await templateNocobase.uploadFile(name, pdfFormBuffer, cred)
    if (response.json.message) {
        return response
    }

    const id = response.json.data.id

    const body = {
        form_fields,
        nocobase_app: nocoApp,
        table_name,
    }

    const filter = {
        'id': {
            "$eq": id
        }
    }

    const detailsResponse = await templateNocobase.update(body, filter, cred)
    return { data: detailsResponse, id }
}

const get = async (cred, tempId) => {
    const response = await templateNocobase.get(cred, tempId)
    return response
}

const getAll = async (cred, nocoApp) => {
    const filter = { nocobase_app: nocoApp }
    const response = await templateNocobase.getAll(cred, filter)
    return response
}

module.exports = {
    upload, get, getAll
}