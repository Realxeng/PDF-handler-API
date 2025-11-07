const customer = require('../model/data')
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

        const data = await customer.getAll(templateResponse.record.table_name, userResponse.record.nocobase_url, userCred)
        if (!data.records) return res.status(404).json({ message: "No customer found" })
        return res.status(200).send(data.records)
    } catch (err) {
        console.error('Error in getAll:', err)
        return res.status(500).json({ message: "Server error getting customer list", error: err.message });
    }
}

async function get(req, res) {
    return res.status(500).json({message: ''})
}

module.exports = {
    get,
    getAll
}