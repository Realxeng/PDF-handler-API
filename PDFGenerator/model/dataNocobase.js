const get = async (req, res) => {
    const body = req.body
    return res.status(200).send('cukurukuk')
}

module.exports = {
    get
}