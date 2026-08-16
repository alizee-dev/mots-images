const pool = require('../db')

const assignStudentsToSeries = async (seriesId, studentsIds) => {
    let result = []
    for (let student of studentsIds) {
        const assignment = await pool.query(`
        INSERT INTO assignments (series_id, student_id)
        VALUES ($1, $2)
        RETURNING id, series_id, student_id`, [seriesId, student])
        result.push(assignment.rows[0])
    }

    return result
}

const assignmentsByTeacher = async (teacherId) => {
    const result = await pool.query(`
        SELECT a.id, s.title
        FROM assignments a
        JOIN series s ON a.series_id = s.id
        WHERE s.teacher_id = $1
        `, [teacherId])
    
        console.log(result.rows)
        return result.rows
}

const assignmentsToDo = async (studentId) => {
    const result = await pool.query(`
        SELECT a.id, s.title, COUNT(sw.word_id)
        FROM assignments a
        JOIN series s ON s.id = a.series_id
        JOIN series_words sw ON sw.series_id = s.id
        LEFT JOIN test_sessions ts ON ts.assignment_id = a.id
        WHERE a.student_id = $1 AND ts.id IS NULL
        GROUP BY a.id, s.title`, [studentId]
    )
    return result.rows
}

module.exports = { assignStudentsToSeries, assignmentsByTeacher, assignmentsToDo }