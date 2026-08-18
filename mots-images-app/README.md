# Mots-images

A web application for teachers supporting students with dysorthographia, based on the word-image method: each word is illustrated letter by letter to help fix its spelling visually.

This repository contains only the **frontend** (React + Vite). It consumes a separate backend API — see the [Backend](#backend) section below.

## Features

### Students

- Student list, adding a new student.
- Student profile: list of assigned series not yet taken ("To do"), test session history, and a **progress chart** (score percentage over time, with visual markers for good level / needs work / to review).

### Word bank

- Word list with search, creating a new word.
- Deleting a word: individually (immediate removal with a few seconds to undo) or via multi-select.
- Illustrated word editor, per letter:
  - freehand drawing, adding stickers (emoji) or uploaded images, with rectangular or lasso cropping;
  - letter color (including white);
  - each drawn element's position in front of or behind the letter;
  - bringing two letters closer together (even overlapping them) via drag-and-drop, to compose illustrations spanning several letters;
  - a one-click final preview, printing.
  - uploaded images are automatically resized and compressed to stay within the API's size limit.

### Series

- Series list, creation via a wizard (title, then word selection — from the bank or quick-added without illustration).
- Fully editable series detail screen: adding words, removing them (with confirmation), reordering, editing the fill-in-the-blank sentence inline.
- Assigning a series to one or more students, with detection of students already assigned.
- Printable illustrated cards for a whole series.

### Test session (student side)

- Fill-in-the-blank sentence with two attempts, an illustrated hint shown after a second failed attempt.
- Score computed and recorded at the end of the test.
- Protecting progress in an ongoing test: confirmation before leaving the test, a warning if the tab or browser is closed.

### Visual identity

Two distinct visual worlds: a sober teacher-facing space ("Atelier") and a test screen designed for the child ("Clairière"). On all content the child interacts with (illustrated words, sentences, the test screen), the font is fixed to one suited for dyslexia-type disorders.

## Running the project locally

Prerequisite: the backend API ([mots-images-api](#backend)) must be running locally on `http://localhost:3000`.

```bash
npm install
npm run dev
```

The application is then available at `http://localhost:5173`.

Other available commands:

```bash
npm run build    # production build
npm run preview  # serves the production build locally
npm run lint     # checks the code with ESLint
```

## Tech stack

- **React 18** + **Vite** (project structure from the official `create vite` template).
- **react-router-dom** (declarative mode) for navigation.
- **Konva** / **react-konva** for rendering illustrated words (letters, drawings, stickers, images).
- **recharts** for the student progress chart.
- **@fontsource/opendyslexic** for the font suited for dyslexia-type disorders.
- **emojibase-data** for emoji sticker search.
- **uuid** for client-side ID generation (illustration zones, drawn elements).

## Backend

This frontend doesn't work on its own: it communicates exclusively over HTTP with a separate backend API, the **mots-images-api** project (Node/Express/PostgreSQL, with JWT authentication), documented in its own repository. No data is stored on the frontend beyond the current session — the auth token is kept in memory only (never in the browser's local storage), so refreshing the page requires logging back in.

See the `mots-images-api` project's own documentation for its installation, routes, and database schema.
