// Shared between the word bank's hidden export staging area, the print
// document builder, and the layout-choice dialog (see WordsBankPage).
export const PRINT_LAYOUTS = [
  {
    id: 'full',
    title: 'Pleine page',
    description: 'Une carte par page, en pleine page, format paysage.',
    perPage: 1,
  },
  {
    id: 'two',
    title: '2 mots par page',
    description: 'Une demi-page par carte, en portrait.',
    perPage: 2,
  },
  {
    id: 'grid6',
    title: '6 mots par page',
    description: 'Cartes réparties uniformément, en portrait.',
    perPage: 6,
  },
]
