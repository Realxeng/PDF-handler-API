const express = require('express')
const PORT = process.env.PORT || 3000;

//Intialize Express Server
const app = express()
app.use(express.json())

app.use('/jsontopdf', require('./JSONtoPDF'))

app.use('/', (req, res) => {
    console.log(req.body)
    res.status(404).json('404 not found')
})

//Start the server on PORT
app.listen(PORT, () => {console.log(`Server is running on port ${PORT}`)})