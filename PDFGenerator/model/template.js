const upload = async(formName, pdfFormBuffer) => {
    const body = req.body
    return { status: 200 }
}

const get = async (req, res) => {
    const body = req.body
    return res.status(200).send('kokekab')
}

module.exports = {
    upload, get
}