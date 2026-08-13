const express = require('express')
const teachersRoutes = require('./routes/teachers')
const studentsRoutes = require('./routes/students')
const wordsRoutes = require('./routes/words')
const { createWordController } = require('./controllers/wordsController')

const PORT = 3000

const app = express()
app.use(express.json())

// Register & Login
app.use('/teachers', teachersRoutes)
app.use('/students', studentsRoutes)
app.use('/words', wordsRoutes)




app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
    
})