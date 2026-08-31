export default function ImageIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="5" width="16" height="14" rx="2.2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="M4.8 16.6l4.7-4.5a1.3 1.3 0 0 1 1.8 0l2.7 2.5 1.6-1.5a1.3 1.3 0 0 1 1.8 0l2.2 2.1" />
    </svg>
  )
}
