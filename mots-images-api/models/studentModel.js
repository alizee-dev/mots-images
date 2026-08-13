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

const createStudent = async (name, teacherId) => {
    const result = await pool.query(
        `INSERT INTO students (name) VALUES ($1) RETURNING id, name`, [name]
    ) 
    const student = result.rows[0]

    await pool.query(
        `INSERT INTO teachers_students (student_id, teacher_id) VALUES ($1, $2)`, [student.id, teacherId]
    )

    return student
}

module.exports = {getStudentsByTeacher, createStudent}