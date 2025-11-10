const joi = require("joi");
const _ = require("lodash");
const util = require("util");
/**
 * A class to do CRUD operation into nocobase data source
 */
class NocobaseFunctions {
    /**
     * Create a new instance of NocobaseFunctions class to use CRUD methods on a specific entity in NocoBase
     * 
     * @param {string} nocoTable - The corresponding table name in NocoBase.
     * @param {string} [name=nocoTable] - A readable name for the entity (defaults to nocoTable).
     * @param {string} [nocoUrl=process.env.DATABASE_URI || 'http://localhost:13000/'] - The base URL of the NocoBase instance.
     */

    constructor(nocoTable, name = nocoTable, nocoUrl = process.env.DATABASE_URI || 'http://localhost:13000/') {
        this.nocoTable = nocoTable   /* Table name in Nocobase */
        this.name = name             /* General name of the entity */
        this.nocoUrl = nocoUrl       /* Nocobase endpoint */
    }

    /**
     * Insert and Update data to Nocobase
     * 
     * @async
     * @param {{values: object[], cred: { NOCOBASE_TOKEN: string, NOCOBASE_APP: string, DATABASE_URI: string } }} body - The request body retrieved from the API request
     * @param {import('joi').ObjectSchema} structure - The Joi validation schema for the request body
     * @returns {Promise<{ status: number, json: | { message: string, errors: Array<object> }
     *                                           | { message: string }
     *                                           | { data: string } }>}
     */
    async upload(body, structure) {
        const credentials = body.cred || process.env
        //Verify all credentials exists
        const { error: credError, value: cred } = validateCredentials(credentials)
        if (credError) return { status: 401, json: { message: credError.details.map(d => d.message).join(", "), errors: credError.details } }
        //Get the credentials
        const { NOCOBASE_TOKEN, NOCOBASE_APP, DATABASE_URI } = cred

        //Validate the request
        const { error, value: data } = structure.validate(body)
        //console.log(error)
        //Catch validation error
        if (error) {
            console.log(error)
            return { status: 400, json: { message: error.details, error } }
        }

        //Get existing data
        const { records: nocoData, message } = await this.getAll(cred)
        if (message) {
            return { status: 500, json: { message } }
        }
        const existingIdset = new Set(nocoData.map(d => d.id))

        //Split the data into create and update
        const createPayload = []
        const updatePayload = []
        //Check for existing data
        //console.log(data)
        for (const record of data.values) {
            if (existingIdset.has(record.id)) {
                updatePayload.push(record)
            } else {
                createPayload.push(record)
            }
        }

        let updatedLength = 0
        let createdLength = 0

        //Update data
        if (updatePayload.length > 0) {
            console.log(`Updating ${updatePayload.length} ${this.name} to nocobase`)
            //Iterate through the old data and update each field
            const updateIDs = new Set(updatePayload.map(record => record.id))
            const oldData = nocoData.filter(record => updateIDs.has(record.id))
            const updatedData = oldData.map(oldRecord => {
                const newRecord = updatePayload.find(newData => newData.id === oldRecord.id)
                return _.merge({}, oldRecord, newRecord)
            })

            //Delete the old data
            console.log(`Deleting record(s) ${[...updateIDs].join(', ')}`)
            try {
                const filter = {
                    id: {
                        $in: [...updateIDs]
                    }
                }
                const deleteResponse = await fetch(`${this.nocoUrl}api/${this.nocoTable}:destroy?filter=${encodeURIComponent(JSON.stringify(filter))}`, {
                    method: 'POST',
                    headers: {
                        "Content-Type": 'application/json',
                        'Accept': 'application/json',
                        Authorization: `Bearer ${NOCOBASE_TOKEN}`,
                        'X-App': NOCOBASE_APP,
                        'X-Host': DATABASE_URI,
                    },
                })
                const deleteResponseJSON = await deleteResponse.json()
                //console.log(util.inspect(deleteResponseJSON, { depth: null, colors: true }))
                //Check for errors
                if (deleteResponseJSON.errors) {
                    return { status: 400, json: { message: deleteResponseJSON.errors.map(e => e.message).join(', ') } }
                }
            } catch (error) {
                console.log(error)
                return { status: 500, json: { message: `Failed to delete old ${this.tableName} on nocobase` } }
            }

            //Insert the new data
            console.log(`Inserting record(s) ${[...updateIDs].join(', ')}`)
            try {
                const createResponse = await fetch(`${this.nocoUrl}api/${this.nocoTable}:create`, {
                    method: 'POST',
                    headers: {
                        "Content-Type": 'application/json',
                        'Accept': 'application/json',
                        Authorization: `Bearer ${NOCOBASE_TOKEN}`,
                        'X-App': NOCOBASE_APP,
                        'X-Host': DATABASE_URI,
                    },
                    body: JSON.stringify(updatedData)
                })
                const createResponseJSON = await createResponse.json()
                //console.log(util.inspect(createResponseJSON, { depth: null, colors: true }))
                //Check for errors
                if (createResponseJSON.errors) {
                    return { status: 400, json: { message: createResponseJSON.errors[0].message, errors: createResponseJSON.errors } }
                }

                //Return the number of successfully replaced data
                updatedLength = createResponseJSON.data?.length
            } catch (error) {
                console.log(error)
                return { status: 500, json: { message: `Failed to insert new ${this.name} to nocobase` } }
            }
        }

        //Create data
        if (createPayload.length > 0) {
            console.log(`Creating ${createPayload.length} data to nocobase`)
            try {
                const response = await fetch(`${this.nocoUrl}api/${this.nocoTable}:create`, {
                    method: 'POST',
                    headers: {
                        "Content-Type": 'application/json',
                        'Accept': 'application/json',
                        Authorization: `Bearer ${NOCOBASE_TOKEN}`,
                        'X-App': NOCOBASE_APP,
                        'X-Host': DATABASE_URI,
                    },
                    body: JSON.stringify(createPayload)
                })
                const responseJson = await response.json()
                //Check for errors
                if (responseJson.errors) {
                    return { status: 400, json: { message: responseJson.errors[0].message, errors: responseJson.errors } }
                }

                //Return the number of created data
                const dataLength = responseJson.data ? responseJson.data.length : 0
                createdLength = dataLength
            } catch (error) {
                console.log(error)
                return { status: 500, json: { message: `Error creating ${this.name} on nocobase` } }
            }
        }
        return { status: 201, json: { data: `Data updated: ${updatedLength} entries, Data created: ${createdLength} entries` } }
    }

    /**
     * Upload a file into nocobase
     * 
     * @param {Buffer} file - The file in memory to be uploaded 
     * @param {{ NOCOBASE_TOKEN: string, NOCOBASE_APP: string, DATABASE_URI: string }} cred - The credentials used to connect to nocobase API
     * @returns 
     */
    async uploadFile(file, cred) {
        const credentials = cred || false
        //Verify all credentials exists
        const { error: credError, value } = validateCredentials(credentials)
        if (credError) return { status: 401, json: { message: credError.details.map(d => d.message).join(", "), errors: credError.details } }

        //Create payload
        const formData = new FormData()
        formData.append("file", file)

        console.log(`Creating file to nocobase`)
        try {
            const response = await fetch(`${this.nocoUrl}api/${this.nocoTable}:create`, {
                method: 'POST',
                headers: {
                    "Content-Type": 'application/json',
                    'Accept': 'application/json',
                    Authorization: `Bearer ${NOCOBASE_TOKEN}`,
                    'X-App': NOCOBASE_APP,
                    'X-Host': DATABASE_URI,
                },
                body: formData
            })
            const responseJson = await response.json()
            //Check for errors
            if (responseJson.errors) {
                return { status: 400, json: { message: responseJson.errors[0].message, errors: responseJson.errors } }
            }
            return { status: response.status, json: { data: responseJson.data } }
        } catch (error) {
            console.log(error)
            return { status: 500, json: { message: `Error creating ${this.name} on nocobase` } }
        }
    }

    /**
     * Gets all data from the entity in NocoBase
     * 
     * @param {{NOCOBASE_TOKEN: string, NOCOBASE_APP: string, DATABASE_URI: string}} cred - The authentication and connection credentials to connect to NocoBase
     * @param {Object | null} filter - The filter to be used when sending the get request
     * @returns {Promise<{ records?: object[], message?: string }>}
     */
    async getAll(cred, filter = null) {
        const { error, value } = validateCredentials(cred)
        if (error) {
            console.log(error)
            return { status: 400, json: { message: "Invalid nocobase credentials", error } }
        }
        const { NOCOBASE_TOKEN, NOCOBASE_APP, DATABASE_URI } = value
        let records = [], data = []
        let page = 1
        try {
            do {
                const res = await fetch(`${this.nocoUrl}api/${this.nocoTable}:list?${filter ? `filter=${encodeURIComponent(JSON.stringify(filter))}&` : ''}page=${page}`, {
                    method: 'GET',
                    headers: {
                        "Content-Type": 'application/json',
                        'Accept': 'application/json',
                        Authorization: `Bearer ${NOCOBASE_TOKEN}`,
                        'X-App': NOCOBASE_APP,
                        'X-Host': DATABASE_URI,
                    },
                });
                data = await res.json()
                records = records.concat(data.data)
                page++
            }
            while (data.meta && data.meta.totalPage >= page);
        } catch (error) {
            console.log(error)
            return { status: 500, json: { message: `Failed to get ${this.nocoTable}`, error: error } }
        }
        if (data.error) {
            return { status: 500, json: { message: data.error } }
        }
        return { status: 200, json: { data: records } }
    }

    /**
     * Gets data from the entity in NocoBase
     * 
     * @param {{NOCOBASE_TOKEN: string, NOCOBASE_APP: string, DATABASE_URI: string}} cred - The authentication and connection credentials to connect to NocoBase
     * @param {number | string} id - The specific id of record to be requested
     * @returns {Promise<{ status: number, record?: object, message?: string }>}
     */
    async get(cred, id) {
        if (!id) return { status: 400, json: { message: 'Missing ID parameter' } }
        const { error, value } = validateCredentials(cred)
        if (error) {
            console.log(error)
            return { status: 400, json: { message: 'Invalid nocobase credentials'} , error }
        }
        const { NOCOBASE_TOKEN, NOCOBASE_APP, DATABASE_URI } = value
        const res = await fetch(`${this.nocoUrl}api/${this.nocoTable}:get?filter=${encodeURIComponent(JSON.stringify({ id }))}`, {
            method: 'GET',
            headers: {
                "Content-Type": 'application/json',
                'Accept': 'application/json',
                Authorization: `Bearer ${NOCOBASE_TOKEN}`,
                'X-App': NOCOBASE_APP,
                'X-Host': DATABASE_URI,
            },
        })
        const data = await res.json()
        if (data.error) {
            return { message: data.error }
        }
        return { record: data.data }
    }
}

//Validate Nocobase credentials
function validateCredentials(credentials) {
    const structure = joi.object({
        NOCOBASE_TOKEN: joi.string().required(),
        NOCOBASE_APP: joi.string().allow(''),
        DATABASE_URI: joi.string().required(),
    }).options({ stripUnknown: true })

    return structure.validate(credentials, { abortEarly: false })
}

module.exports = NocobaseFunctions