const create = async(req, res) => {
    const body = req.body
    return res.status(200).send('kukurukuc')
}

module.exports = create