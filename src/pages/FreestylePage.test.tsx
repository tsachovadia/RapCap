import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import FreestylePage from './FreestylePage'
import { MemoryRouter } from 'react-router-dom'

// Mock dependencies
vi.mock('../hooks/useAudioRecorder', () => ({
    useAudioRecorder: () => ({
        initializeStream: vi.fn().mockResolvedValue(undefined),
        startRecording: vi.fn(),
        stopRecording: vi.fn(),
        isRecording: false,
        duration: 0,
        analyser: null,
        stream: null
    })
}))

// Mock YouTube player component since we can't load iframe in test
vi.mock('../components/freestyle/BeatPlayer', () => ({
    default: ({ videoId }: { videoId: string }) => <div data-testid="beat-player">{videoId}</div>
}))

// Mock DB
vi.mock('../db/db', () => ({
    db: {
        sessions: {
            add: vi.fn()
        }
    }
}))

// Mock useNavigate
const mockedNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return {
        ...actual,
        useNavigate: () => mockedNavigate
    }
})

describe('FreestylePage', () => {
    it('renders correctly', () => {
        render(
            <MemoryRouter>
                <FreestylePage />
            </MemoryRouter>
        )
        expect(screen.getByText('פריסטייל')).toBeInTheDocument()
        expect(screen.getByText('מילים')).toBeInTheDocument()
    })

    it('toggles lyrics editor', () => {
        render(
            <MemoryRouter>
                <FreestylePage />
            </MemoryRouter>
        )

        const addButton = screen.getByText('הוסף')
        fireEvent.click(addButton)

        expect(screen.getByPlaceholderText('כתוב כאן את המילים שלך...')).toBeInTheDocument()
        expect(screen.getByText('סגור')).toBeInTheDocument()

        const closeButton = screen.getByText('סגור')
        fireEvent.click(closeButton)

        expect(screen.queryByPlaceholderText('כתוב כאן את המילים שלך...')).not.toBeInTheDocument()
    })

    it('navigates to settings on menu click', () => {
        render(
            <MemoryRouter>
                <FreestylePage />
            </MemoryRouter>
        )

        const settingsButton = screen.getByLabelText('Settings')
        fireEvent.click(settingsButton)

        expect(mockedNavigate).toHaveBeenCalledWith('/settings')
    })
})
