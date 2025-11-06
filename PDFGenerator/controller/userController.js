const user = require('../model/user')

async function login(req, res) {
    return res.status(500).json({message: ''})
}

module.exports = {
    login
}