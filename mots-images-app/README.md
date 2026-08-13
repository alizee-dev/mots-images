
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

# DataBase

```mermaid
erDiagram
  TEACHERS ||--o{ TEACHER_STUDENTS : has
  STUDENTS ||--o{ TEACHER_STUDENTS : has
  TEACHERS ||--o{ WORDS : creates
  TEACHERS ||--o{ SERIES : creates
  WORDS ||--o{ WORD_STUDENTS : "linked to"
  STUDENTS ||--o{ WORD_STUDENTS : "linked to"
  SERIES ||--o{ SERIES_WORDS : contains
  WORDS ||--o{ SERIES_WORDS : "used in"
  SERIES ||--o{ ASSIGNMENTS : "assigned via"
  STUDENTS ||--o{ ASSIGNMENTS : receives
  ASSIGNMENTS ||--o{ TEST_SESSIONS : "attempted in"
  TEST_SESSIONS ||--o{ ATTEMPTS : contains
  WORDS ||--o{ ATTEMPTS : "tested on"

  TEACHERS {
    int id PK
    string name
    string email
    string password_hash
  }
  STUDENTS {
    int id PK
    string name
  }
  TEACHER_STUDENTS {
    int teacher_id FK
    int student_id FK
  }
  WORDS {
    int id PK
    string text
    string sentence
    json zones
    int teacher_id FK
  }
  WORD_STUDENTS {
    int word_id FK
    int student_id FK
  }
  SERIES {
    int id PK
    string title
    int teacher_id FK
  }
  SERIES_WORDS {
    int series_id FK
    int word_id FK
    int order
  }
  ASSIGNMENTS {
    int id PK
    int series_id FK
    int student_id FK
    date assigned_at
  }
  TEST_SESSIONS {
    int id PK
    int assignment_id FK
    date date
    float total_score
  }
  ATTEMPTS {
    int id PK
    int test_session_id FK
    int word_id FK
    int attempts_count
    float score
  }
```