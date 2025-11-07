const data = require('../logic/NocobaseFunctions')

async function getAll(req, res) {
    // const data = await customer.get(pdfTemplate.tableName, userResponse.record.nocobase_url, userCred, custId)
    // if (!data.record) return res.status(400).json({ message: "No customer found" })
}

async function get(req, res) {
    return res.status(500).json({message: ''})
}

module.exports = {
    get
}