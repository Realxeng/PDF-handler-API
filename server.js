const express = require('express')
const multer = require('multer');
const JSONtoPDF = require('./JSONtoPDF/JSONtoPDF')
const template = require('./PDFGenerator/controller/templateController')
const data = require('./PDFGenerator/controller/dataController')

//Intialize Express Server
const PORT = process.env.PORT || 3000;
const app = express()
app.use(express.json())
const upload = multer ({ storage: multer.memoryStorage() })

//Route to convert JSON to PDF
app.post('/jsontopdf', JSONtoPDF)

/**
 * Generate and fill pdf from template
 */
//UI for creating tagging the textbox
app.post('/createpdf', upload.single("pdf"), template.create)
app.post('/fillpdf', upload.single("pdf"), template.fill)
app.get('/template/all', template.getAll)
app.get('/data/schema', data.get)


//Unknown route
app.use('/', (req, res) => {
    console.log(req.body)
    res.status(404).json('404 not found')
})

//Start the server on PORT
app.listen(PORT, () => {console.log(`Server is running on port ${PORT}`)})