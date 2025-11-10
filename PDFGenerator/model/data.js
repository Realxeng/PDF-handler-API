const NocobaseFunctions = require('../logic/NocobaseFunctions')

const get = async (tableName, nocoUrl, cred, custId) => {
    const data = new NocobaseFunctions(tableName, tableName, nocoUrl)
    const response = await data.get(cred, custId)
    return response
}

const getAll = async (tableName, nocoUrl, cred) => {
    const data = new NocobaseFunctions(tableName, tableName, nocoUrl)
    const response = await data.getAll(cred)
    return response
}

const getTables = async (nocoUrl, nocoApp, nocoToken) => {
    const response = await fetch(`${nocoUrl}api/collections:list`, {
        method: 'GET',
        headers: {
            'X-Host': 'connect.appnicorn.com',
            Authorization: `Bearer ${nocoToken}`,
            'X-App': nocoApp,
        }
    })
    if (response.status !== 200) return { status: response.status, message: 'Failed to fetch tables' }
    const data = await response.json()
    const tables = data.data.map(item => {
        return { name: item.name, title: item.title }
    })
    return { data: tables }
}

module.exports = {
    get,
    getAll,
    getTables
}