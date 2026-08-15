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
    
        log(result.rows)
        return result.rows
}

module.exports = { assignStudentsToSeries, assignmentsByTeacher }