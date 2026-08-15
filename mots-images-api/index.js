const express = require('express')
const cors = require('cors')
const teachersRoutes = require('./routes/teachers')
const studentsRoutes = require('./routes/students')
const wordsRoutes = require('./routes/words')
const seriesRoutes = require('./routes/series')
const assignmentsRoutes = require('./routes/assignments')
const testSessionRoutes = require('./routes/test_sessions')

const PORT = 3000

const app = express()
app.use(cors())
app.use(express.json())

// Register & Login
app.use('/teachers', teachersRoutes)
app.use('/students', studentsRoutes)
app.use('/words', wordsRoutes)
app.use('/series', seriesRoutes)
app.use('/assignments', assignmentsRoutes)
app.use('/test-sessions', testSessionRoutes)


app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
    
})