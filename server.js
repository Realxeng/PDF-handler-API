const express = require('express')
const multer = require('multer');
const PORT = process.env.PORT || 3000;
const JSONtoPDF = require('./JSONtoPDF/JSONtoPDF')
const createController = require('./PDFGenerator/controller/createController')
const fillPDF = require('./PDFGenerator/controller/fillController');
const upload = multer ({ storage: multer.memoryStorage() })

//Intialize Express Server
const app = express()
app.use(express.json())

//Route to convert JSON to PDF
app.post('/jsontopdf', JSONtoPDF)

/**
 * Generate and fill pdf from template
 */
//UI for creating tagging the textbox
app.post('/createpdf', upload.single("pdf"), createController)
app.post('/fillpdf', upload.single("pdf"), fillPDF)


//Unknown route
app.use('/', (req, res) => {
    console.log(req.body)
    res.status(404).json('404 not found')
})

//Start the server on PORT
app.listen(PORT, () => {console.log(`Server is running on port ${PORT}`)})