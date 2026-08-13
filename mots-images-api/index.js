const express = require('express')
const teachersRoutes = require('./routes/teachers')
const PORT = 3000

const app = express()
app.use(express.json())
app.use('/teachers', teachersRoutes)


app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
    
})