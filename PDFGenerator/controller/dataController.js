const userData = require('../model/data')
const template = require('../model/template')
const user = require('../model/user')

async function getAll(req, res) {
    try {
        const tempId = req.query.templateId
        const custId = req.query.customerId
        const cred = req.body.cred || null

        const templateResponse = await template.get(
            { 
                NOCOBASE_TOKEN: process.env.USERNOCOTOKEN, 
                NOCOBASE_APP: process.env.USERNOCOAPP, 
                DATABASE_URI: process.env.USERNOCOHOST 
            }, 
            tempId
        )
        if (!templateResponse.record) return res.status(400).json({ message: "No template found" })

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

        const data = await userData.getAll(templateResponse.record.table_name, userResponse.record.nocobase_url, userCred)
        if (!data.json.data) return res.status(404).json({ message: "No customer found" })
        return res.status(200).send(data.json.data)
    } catch (err) {
        console.error('Error in getAll:', err)
        return res.status(500).json({ message: "Server error getting customer list", error: err.message });
    }
}

async function getTables(req, res) {
    const uid = req.body.uid || null
    if (!uid) return res.status(400).json({ message: 'Invalid UID' })
    const userResponse = await user.get(null, uid)
    if (userResponse.message) return res.status(400).json({ message: userResponse.message })
    const details = userResponse.record
    const { nocobase_url, nocobase_token, nocobase_app } = details
    if (!nocobase_url || !nocobase_token || !nocobase_app) return res.status(400).json({message: `Cannot find nocobase credentials`})
    const { status, message, data } = await userData.getTables(nocobase_url, nocobase_app, nocobase_token)
    if (message) return res.status(status).json({ message })
    return res.status(200).json({ data })
}


async function getSchema(req, res) {

    return res.status(500).json({message: ''})
}

module.exports = {
    getSchema,
    getTables,
    getAll
}