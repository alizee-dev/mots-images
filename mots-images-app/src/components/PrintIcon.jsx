export default function PrintIcon({ size = 18 }) {
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
      <path d="M6.5 8.5V4.3a.8.8 0 0 1 .8-.8h9.4a.8.8 0 0 1 .8.8v4.2" />
      <rect x="4" y="8.5" width="16" height="7.2" rx="1.4" />
      <rect x="7" y="13" width="10" height="6.7" rx="1" />
      <circle cx="16.2" cy="11" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}
