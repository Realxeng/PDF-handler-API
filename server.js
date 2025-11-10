const express = require('express')
const CORS = require('cors')
const multer = require('multer');
require('dotenv').config()
const JSONtoPDF = require('./JSONtoPDF/JSONtoPDF')
const template = require('./PDFGenerator/controller/templateController')
const data = require('./PDFGenerator/controller/dataController')
const user = require('./PDFGenerator/controller/userController')

//Intialize Express Server
const PORT = process.env.PORT || 3000;
const app = express()
app.use(express.json())
const upload = multer ({ storage: multer.memoryStorage() })

app.use(CORS({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

//Route to convert JSON to PDF
app.post('/jsontopdf', JSONtoPDF)

/**
 * Generate and fill pdf from template
 */
//UI for creating tagging the textbox
app.post('/createpdf', upload.single("pdf"), template.create)
app.post('/fillpdf', upload.single("pdf"), template.fill)
app.post('/templates/all', template.getAll)
app.get('/user/noco_app', user.getNocoApp)
app.post('/data/schema', data.getSchema)
app.post('/data/tables', data.getTables)
app.post('/data/list', data.getAll)

//User authorization route
app.post('/login', user.login)

//Unknown route
app.use('/', (req, res) => {
    console.log(req.body)
    res.status(404).json('404 not found')
})

//Start the server on PORT
app.listen(PORT, () => {console.log(`Server is running on port ${PORT}`)})