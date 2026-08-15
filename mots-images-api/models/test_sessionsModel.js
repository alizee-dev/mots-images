const pool = require('../db')

const testSessions = async (assignmentId, totalScore, attempts) => {
    let testSession = {
        scoreByAttempt : []
    }

    const testSessionScore = await pool.query(`
        INSERT INTO test_sessions (assignment_id, total_score)
        VALUES ($1, $2)
        RETURNING id, assignment_id, total_score`, [assignmentId, totalScore])

        console.log(testSessionScore.rows[0]);
        testSession.totalScore = testSessionScore.rows[0]
    
        for (let attempt of attempts) {
            const attemptsCount = await pool.query(`
                INSERT INTO attempts (test_session_id, word_id, attempts_count, score)
                VALUES ($1, $2, $3, $4)
                RETURNING id, test_session_id, word_id, attempts_count, score`, [testSessionScore.rows[0].id, attempt.wordId, attempt.attemptsCount, attempt.score ])
            
            console.log(attemptsCount.rows[0]);
            testSession.scoreByAttempt.push(attemptsCount.rows[0])
        }
        console.log(testSession);
        
        return testSession
}

const wordsFromSession = async (testSessionId) => {
    const words = await pool.query(`
        SELECT w.text, a.score  
        FROM attempts a 
        JOIN words w ON a.word_id = w.id
        WHERE a.test_session_id = $1`, [testSessionId])
    
    return words.rows
}

const testSessionsByTeacher = async (teacherId) => {
    const result = await pool.query(`
        SELECT ts.id
        FROM test_sessions ts
        JOIN assignments a ON ts.assignment_id = a.id
        JOIN series s ON s.id = a.series_id
        WHERE s.teacher_id = $1`, [teacherId])

    return result.rows
}

module.exports = { testSessions, wordsFromSession, testSessionsByTeacher }