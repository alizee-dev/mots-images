import { openDB } from 'idb'

const DB_NAME = 'mots-images-db'
const DB_VERSION = 1
const STORE = 'words'
export const CURRENT_WORD_ID = 'current-word'

let dbPromise = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}

export async function saveWord(word) {
  const db = await getDb()
  await db.put(STORE, word)
}

export async function loadWord(id) {
  const db = await getDb()
  return db.get(STORE, id)
}
