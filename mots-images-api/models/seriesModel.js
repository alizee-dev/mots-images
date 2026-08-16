const pool = require('../db')

const createSeries = async (teacherId, title) => {
    const result = await pool.query(
        `INSERT INTO series (title, teacher_id)
        VALUES ($1, $2)
        RETURNING id, title`, [title, teacherId]
    )
    console.log(result.rows);
    return result.rows[0]
}


const linkWordsToSeries = async (seriesId, wordsIds) => {
    let result = []
    for (let i = 0; i < wordsIds.length; i++) {
        let pairs = await pool.query(`
                INSERT INTO series_words (series_id, word_id, "order")
                VALUES ($1, $2, $3)
                RETURNING series_id, word_id, "order"`, [seriesId, wordsIds[i], i])
        result.push(pairs.rows[0])
    }
    console.log(result);
    return result
}

const seriesByTeacher = async (teacherId) => {
    const result = await pool.query(`
        SELECT s.id, s.title, COUNT(sw.word_id)
        FROM series s
        LEFT JOIN series_words sw ON sw.series_id = s.id
        WHERE s.teacher_id = $1
        GROUP BY s.id`, [teacherId]
    )
    console.log(result.rows);
    return result.rows
    
}

const getSeriesDetail = async (seriesId, teacherId) => {
    const result = await pool.query(`
        SELECT w.id, w.text, w.sentence, w.zones, sw."order", s.title
        FROM series s
        JOIN series_words sw ON s.id = sw.series_id
        JOIN words w ON w.id = sw.word_id
        WHERE $1 = s.id AND $2 = s.teacher_id`, [seriesId, teacherId]
    )
    console.log(result.rows);    
    return result.rows
}

module.exports = { createSeries, linkWordsToSeries, seriesByTeacher, getSeriesDetail }