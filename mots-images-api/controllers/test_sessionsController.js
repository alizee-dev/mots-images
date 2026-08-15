const { testSessions, wordsFromSession, testSessionsByTeacher } = require('../models/test_sessionsModel')
const { assignmentsByTeacher } = require('../models/assignmentsModel')

const testSessionsController = async (req, res) => {
    const assignmentId = req.params.assignmentId
    const {attempts} = req.body
    const totalScore = attempts.reduce((acc, cur) => acc + cur.score, 0)
    const teacherId = req.teacherId

    const assignments = await assignmentsByTeacher(teacherId)
    const assignmentIsValid = assignments.find(assignment => assignment.id === Number(assignmentId))
    
    if (assignmentIsValid) {
        try {
        const result = await testSessions(assignmentId, totalScore, attempts)
        
        console.log(result);
        res.status(201).json(result)

        } catch (error) {
            res.status(500).json(error.message)
        }
    } else {
        res.status(403).json('Forbidden')
    }
}

const wordsFromSessionController = async (req, res) => {
    const sessionId = req.params.testSessionId
    const teacherId = req.teacherId

    const sessions = await testSessionsByTeacher(teacherId)
    const testSessionIsValid = sessions.find(session => session.id === Number(sessionId))

    if(testSessionIsValid) {
        try {
        const result = await wordsFromSession(sessionId)
        res.status(200).json(result)
        } catch (error) {
            res.status(500).json(error.message)
        }
    } else {
        res.status(403).json('Forbidden')
    }
    
    
}
module.exports = { testSessionsController, wordsFromSessionController}