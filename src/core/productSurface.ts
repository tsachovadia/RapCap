export type PrimaryDestinationId = 'freestyle' | 'library' | 'lab'

export interface ProductDestination {
    id: string
    href: string
    label: string
    description: string
}

export const PRIMARY_DESTINATIONS: readonly ProductDestination[] = [
    {
        id: 'freestyle',
        href: '/record?mode=freestyle',
        label: 'פריסטייל',
        description: 'ביט, הקלטה ותמלול מסונכרן',
    },
    {
        id: 'library',
        href: '/library',
        label: 'סשנים',
        description: 'כל הפריסטיילים ששמרת',
    },
    {
        id: 'lab',
        href: '/lab',
        label: 'Lab',
        description: 'כלי האימון והכתיבה שנשמרו להמשך',
    },
] as const

export const LAB_DESTINATIONS: readonly ProductDestination[] = [
    {
        id: 'thoughts',
        href: '/record?mode=thoughts',
        label: 'תיעוד מחשבות',
        description: 'הקלטה חופשית בלי ביט',
    },
    {
        id: 'rhyme-groups',
        href: '/rhyme-library',
        label: 'קבוצות חריזה',
        description: 'ניהול קבוצות מילים לשכבת האימון',
    },
    {
        id: 'drills',
        href: '/drills',
        label: 'אימונים',
        description: 'תרגילי אסוציאציות, פלואו ושרשראות חרוזים',
    },
    {
        id: 'verse',
        href: '/verse-editor',
        label: 'כתיבת ורס',
        description: 'העורך המורחב לכתיבה ועריכת שורות',
    },
    {
        id: 'studio',
        href: '/studio',
        label: 'Studio ניסיוני',
        description: 'הגרסה המורחבת שנבנתה בעבר',
    },
    {
        id: 'dashboard',
        href: '/lab/dashboard',
        label: 'המסך הישן',
        description: 'דשבורד הגרסה הקודמת, נשמר לעיון',
    },
    {
        id: 'settings',
        href: '/settings',
        label: 'הגדרות',
        description: 'פרופיל, שמע והעדפות האפליקציה',
    },
] as const

const LAB_PATH_PREFIXES = [
    '/lab',
    '/studio',
    '/verse-editor',
    '/rhyme-library',
    '/drills',
    '/settings',
]

export function getActivePrimaryDestination(pathname: string, search = ''): PrimaryDestinationId {
    if (pathname === '/record' && new URLSearchParams(search).get('mode') !== 'thoughts') {
        return 'freestyle'
    }

    if (pathname === '/library' || pathname.startsWith('/library/')) {
        return 'library'
    }

    if (
        (pathname === '/record' && new URLSearchParams(search).get('mode') === 'thoughts')
        || LAB_PATH_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))
    ) {
        return 'lab'
    }

    return 'freestyle'
}
