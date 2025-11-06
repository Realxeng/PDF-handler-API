const NocobaseFunctions = require('../logic/NocobaseFunctions')

const get = async (tableName, nocoUrl, cred, custId) => {
    const data = new NocobaseFunctions(tableName, tableName, nocoUrl)
    const response = await data.get(cred, custId)
    return response
}

module.exports = {
    get
}