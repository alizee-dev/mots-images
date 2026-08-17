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
        WHERE s.teacher_id = $1 AND s.is_active = true
        GROUP BY s.id`, [teacherId]
    )
    console.log(result.rows);
    return result.rows
    
}

const getSeriesById = async (teacherId, seriesId) => {
    const result = await pool.query(`
        SELECT id, title 
        FROM series
        WHERE teacher_id = $1 AND id = $2`, [teacherId, seriesId]
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

const editSeriesTitle =  async (seriesId, title, teacher_id) =>  {
    const result = await pool.query(`
        UPDATE series
        SET title = $1
        WHERE id = $2 AND teacher_id = $3
        RETURNING id, title`, [title, seriesId, teacher_id]
    )
    console.log(result.rows);
    return result.rows
}

const updateSeriesStatus = async (seriesId, teacher_id) => {
    const result = await pool.query(`
        UPDATE series
        SET is_active = false
        WHERE id = $1 AND teacher_id = $2
        RETURNING id, is_active`, [seriesId, teacher_id]
    )
    console.log(result.rows);
    return result.rows
}

const deleteWordFromSeries = async (wordId, seriesId) => {
    const result = await pool.query(`
        DELETE FROM series_words
        WHERE word_id = $1 AND series_id = $2 
        RETURNING word_id, series_id`, [wordId, seriesId]
    )
    console.log(result.rows[0])
    return result.rows[0]
}

const changeOrderOfWords = async (wordsDetails, seriesId) => {
    let newOrder = []
    for (let details of wordsDetails) {
        const result = await pool.query(`
        UPDATE series_words
        SET "order" = $1
        WHERE word_id = $2 AND series_id = $3
        RETURNING word_id, "order"`, [details.newOrder, details.wordId, seriesId])
        
        newOrder.push(result.rows[0])
    }
    console.log(newOrder);
    return newOrder
}



module.exports = { createSeries, linkWordsToSeries, seriesByTeacher, getSeriesDetail, getSeriesById, editSeriesTitle, updateSeriesStatus, deleteWordFromSeries, changeOrderOfWords}