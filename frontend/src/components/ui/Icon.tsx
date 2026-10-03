import type { SVGProps } from 'react'

const paths = {
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
  heart: <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20Z" />,
  bag: <><path d="M5 8h14l-1.2 12H6.2L5 8Z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></>,
  user: <><circle cx="12" cy="8.5" r="3.8" /><path d="M4.5 20c.9-3.6 3.9-5.5 7.5-5.5s6.6 1.9 7.5 5.5" /></>,
  menu: <><path d="M3.5 8h17" /><path d="M3.5 16h11" /></>,
  close: <><path d="m6 6 12 12" /><path d="M18 6 6 18" /></>,
  plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
  minus: <path d="M5 12h14" />,
  chevronLeft: <path d="m14.5 6-6 6 6 6" />,
  chevronRight: <path d="m9.5 6 6 6-6 6" />,
  chevronDown: <path d="m6 9.5 6 6 6-6" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  star: <path d="m12 3.8 2.5 5.2 5.7.8-4.1 4 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4.1-4 5.7-.8L12 3.8Z" />,
  trash: <><path d="M4.5 7h15" /><path d="M9.5 7V4.5h5V7" /><path d="M6.5 7 7.5 20h9l1-13" /></>,
  edit: <><path d="m14.5 5.5 4 4L8 20H4v-4L14.5 5.5Z" /></>,
  upload: <><path d="M12 16V4.5" /><path d="m7 9 5-5 5 5" /><path d="M4.5 19.5h15" /></>,
  grip: <><circle cx="9" cy="6" r="1" /><circle cx="15" cy="6" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="9" cy="18" r="1" /><circle cx="15" cy="18" r="1" /></>,
  zoom: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /><path d="M11 8.5v5" /><path d="M8.5 11h5" /></>,
  clock: <><circle cx="12" cy="12" r="8" /><path d="M12 7.5V12l3 2" /></>,
  filter: <><path d="M4 7h16" /><path d="M7 12h10" /><path d="M10 17h4" /></>,
  logout: <><path d="M14 4.5H6v15h8" /><path d="M10.5 12H20" /><path d="m16.5 8.5 3.5 3.5-3.5 3.5" /></>,
  arrowRight: <><path d="M4.5 12h15" /><path d="m13.5 6 6 6-6 6" /></>,
  arrowUpRight: <><path d="M7 17 17 7" /><path d="M8.5 7H17v8.5" /></>,
  arrowLeft: <><path d="M19.5 12h-15" /><path d="m10.5 6-6 6 6 6" /></>,
  truck: <><path d="M3.5 6.5h10v10h-10z" /><path d="M13.5 10h4l3 3.2v3.3h-7" /><circle cx="7.5" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></>,
  returns: <><path d="M4.5 9.5h11a4.5 4.5 0 0 1 0 9H9" /><path d="m8 5.5-4 4 4 4" /></>,
  shield: <><path d="M12 3.5 19 6v5.5c0 4.2-3 7.4-7 9-4-1.6-7-4.8-7-9V6l7-2.5Z" /><path d="m9 12 2.2 2.2L15.5 10" /></>,
  layers: <><path d="m12 4 8.5 4.5L12 13 3.5 8.5 12 4Z" /><path d="m3.5 12.5 8.5 4.5 8.5-4.5" /><path d="m3.5 16.5 8.5 4.5 8.5-4.5" /></>,
  external: <><path d="M13 5h6v6" /><path d="M19 5 10 14" /><path d="M17 13.5V19H5V7h5.5" /></>,
} as const

export type IconName = keyof typeof paths

export function Icon({ name, size = 20, strokeWidth = 1.4, filled, ...rest }:
  { name: IconName; size?: number; filled?: boolean } & SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {paths[name]}
    </svg>
  )
}
