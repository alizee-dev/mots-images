const express = require('express')
const teachersRoutes = require('./routes/teachers')
const studentsRoutes = require('./routes/students')

const PORT = 3000

const app = express()
app.use(express.json())

// Register & Login
app.use('/teachers', teachersRoutes)
app.use('/students', studentsRoutes)




app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
    
})