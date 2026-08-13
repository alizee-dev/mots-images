const pool = require('../db')

const getStudentsByTeacher = async (teacherId) => {
    const result = await pool.query(
        `SELECT students.id, students.name 
        FROM students
        JOIN teachers_students ON students.id = teachers_students.student_id
        WHERE teachers_students.teacher_id = $1`,
        [teacherId]
    )
    return result.rows
}

module.exports = {getStudentsByTeacher}