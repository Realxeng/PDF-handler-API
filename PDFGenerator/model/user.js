const NocobaseFunctions = require('../logic/NocobaseFunctions')
const user = new NocobaseFunctions(users, Users, process.env.USERNOCOURL)

async function get(cred, uid) {
    const cred = cred || { NOCOBASE_TOKEN: process.env.USERNOCOTOKEN, NOCOBASE_APP: process.env.USERNOCOAPP, DATABASE_URI: process.env.USERNOCOHOST }
    const response = await user.get(cred, uid)
    return response
}

module.exports = {
    get
}