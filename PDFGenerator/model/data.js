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
    if (!data || !data.data || data.data.length < 1) return { status: 404, message: 'Failed to fetch tables' }
    const tables = data.data.map(item => {
        return { name: item.name, title: item.title }
    })
    return { data: tables }
}

const getSchema = async (nocoUrl, nocoApp, nocoToken, tableName, depth = 0, visited = new Set()) => {
    if (visited.has(tableName)) {
        return { status: 409, message: `Circular reference detected for table: ${tableName}` };
    }
    visited.add(tableName);

    const response = await fetch(`${nocoUrl}api/collections/${tableName}/fields:list`, {
        method: 'GET',
        headers: {
            'X-Host': 'connect.appnicorn.com',
            Authorization: `Bearer ${nocoToken}`,
            'X-App': nocoApp,
        }
    })
    if (response.status !== 200) {
        visited.delete(tableName)
        return { status: response.status, message: 'Failed to fetch schema'}
    }
    const data = await response.json()
    if (!data || !data.data || data.data.length < 1) {
        visited.delete(tableName)
        return { status: 404, message: 'Failed to fetch tables' }
    }

    const schema = []
    for (const item of data.data) {
        let title = item.uiSchema?.title ?? null
        if (title && /"(.+?)"/.test(title)) {
            title = title.match(/"(.+?)"/)[1];
        }
        const fieldSchema = {
            name: item.name,
            title: title || item.name,
        };
        if (item.target && item.target !== "users") {
            const childSchema = await getSchema(
                nocoUrl,
                nocoApp,
                nocoToken,
                item.target,
                depth + 1,
                visited
            );

            if (childSchema.data) {
                fieldSchema.child = {
                    table: item.target,
                    fields: childSchema.data 
                };
            } else {
                fieldSchema.child = {
                    table: item.target,
                    error: childSchema.message
                };
            }
        }
        schema.push(fieldSchema);
    }
    visited.delete(tableName)
    // if (depth === 0) {
    //     console.log(JSON.stringify(schema, null, 2));
    // }
    return { data: schema }
}

module.exports = {
    get,
    getAll,
    getTables,
    getSchema
}