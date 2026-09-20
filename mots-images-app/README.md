# Mots-images

A web application for parents and teachers supporting children with dysorthographia, based on the word-image method: a difficult letter or letter group in a word is paired with an illustration to help fix its spelling visually. Illustrating a word is primarily automatic (AI-generated, per letter or letter group), with manual drawing available as a fallback when generation doesn't produce a usable result.

This repository contains only the **frontend** (React + Vite). It consumes a separate backend API — see the [Backend](#backend) section below.

## Features

### Students ("Enfants")

- Student list, adding a new student.
- Student detail screen: **progress chart** (score percentage over time, with visual markers for good level / needs work / to review) and session history, with a link through to that student's trainings. Each past session can be opened for a per-word score breakdown.

### Word bank

- Word list with search, creating a new word.
- Deleting a word: individually (immediate removal with a few seconds to undo) or via multi-select.
- **Common bank**: a collaborative illustrated dictionary shared across all users — browsing words submitted by other parents/teachers, and submitting one of your own words for review so it can be approved into it.
- Illustrating a word, per letter or letter group:
  - **AI-generated illustration** (beta) is the primary way to illustrate a word: pick the letter(s) to illustrate, and the model proposes 3 variations to choose from;
  - a **manual editor**, used as a fallback whenever the model fails to produce a usable illustration for a given word (or for further touch-ups): freehand drawing, adding stickers (emoji) or uploaded images with rectangular or lasso cropping, letter color (including white), each drawn element's position in front of or behind the letter, and bringing two letters closer together (even overlapping them) via drag-and-drop to compose illustrations spanning several letters;
  - a one-click final preview, printing;
  - uploaded images are automatically resized and compressed to stay within the API's size limit.

### Admin

- An admin-only screen (`/admin`, hidden from the navigation for non-admin teachers) for reviewing words submitted to the common bank: approving or rejecting pending submissions, and removing words already published to the common bank.

### Training ("Entraînements")

- Per-student list of every training ever created for them — a training never expires, unlike the one-time evaluation it generates.
- Creating a training: pick a title, then either add words afterward from the word bank, or start directly from a batch of words already selected via the word bank's "Créer un entraînement" bulk action.
- A training belongs to exactly one student from the moment it's created, which also automatically generates a pending evaluation for that student.
- Fully editable training detail screen: adding words, removing them (with confirmation), reordering, editing the fill-in-the-blank sentence inline.
- Printable illustrated cards for a whole training.
- Free, ungraded practice mode on the training's own words, in three progressive levels — a child can either go through all three in sequence (well suited to younger children) or jump straight to whichever level suits them:
  - **Level 1 — image → letters**: the illustrated word stays on screen, the child taps shuffled letter tiles to reconstruct it.
  - **Level 2 — reorder by ear**: no image or spelling shown — the word is only heard through the mascot's spoken hint, and the child reorders letter tiles rather than typing freely, so no wrong letter can ever be picked, only a wrong order.
  - **Level 3 — free recall**: a fill-in-the-blank sentence, typed from memory on the keyboard after hearing the word, validated explicitly (mirrors the real evaluation's own interaction) — this time the child chooses the letters themselves.
  Practice is purely local and never recorded: nothing is sent back to the API beyond loading the words.

### Evaluations ("Évaluations")

- Per-student list of pending evaluations — the one-time graded test automatically generated when a training is created for them.
- Taking the test: fill-in-the-blank sentence with two attempts, an illustrated hint shown after a second failed attempt, score computed and recorded at the end.
- Protecting progress in an ongoing test: confirmation before leaving the test, a warning if the tab or browser is closed.
- Once passed, an evaluation disappears from this list and its result appears in the student's progress chart.

### Visual identity

Two distinct visual worlds: a sober adult-facing space ("Atelier") for the parent or teacher, and a screen designed for the child ("Clairière") used for both practice and the graded test. On all content the child interacts with (illustrated words, sentences, practice, the test screen), the font is fixed to one suited for dyslexia-type disorders.

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
- **@vercel/analytics** for usage analytics on the deployed app.

## Backend

This frontend doesn't work on its own: it communicates exclusively over HTTP with a separate backend API, the **mots-images-api** project (Node/Express/PostgreSQL, with JWT authentication), documented in its own repository. No data is stored on the frontend beyond the current session — the auth token is kept in memory only (never in the browser's local storage), so refreshing the page requires logging back in.

See the `mots-images-api` project's own documentation for its installation, routes, and database schema.
