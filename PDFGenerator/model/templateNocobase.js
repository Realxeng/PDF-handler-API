const create = async(req, res) => {
    const body = req.body
    return res.status(200).send('bakekok')
}

const get = async (req, res) => {
    const body = req.body
    return res.status(200).send('kokekab')
}

module.exports = {
    create, get
}