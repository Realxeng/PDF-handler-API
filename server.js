const express = require('express')
const PORT = process.env.PORT || 3000;
const JSONtoPDF = require('./JSONtoPDF/JSONtoPDF')
const createPDF = require('./PDFGenerator/controller/createController')
const template = require('./PDFGenerator/model/templateNocobase')
const data = require('./PDFGenerator/model/dataNocobase')

//Intialize Express Server
const app = express()
app.use(express.json())

//Route to convert JSON to PDF
app.post('/jsontopdf', JSONtoPDF)

/**
 * Generate and fill pdf from template
 */
//UI for creating tagging the textbox
app.get('/create', createPDF)
//Save the textbox template
app.post('/template', template.create)
//Get the textbox template
app.get('/template', template.get)
//Get the data from Nocobase
app.get('/data', data.get)

//Unknown route
app.use('/', (req, res) => {
    console.log(req.body)
    res.status(404).json('404 not found')
})

//Start the server on PORT
app.listen(PORT, () => {console.log(`Server is running on port ${PORT}`)})