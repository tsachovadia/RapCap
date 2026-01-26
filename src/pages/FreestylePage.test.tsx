import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import FreestylePage from './FreestylePage'
import { MemoryRouter } from 'react-router-dom'

// --- MOCKS ---

// Shared state container that survives hoisting behavior
const mockGlobals = vi.hoisted(() => ({
    onPlayerReadyCallback: null as ((player: any) => void) | null,
    isRecording: false,
    mockInitializeStream: vi.fn(),
    mockStartRecording: vi.fn(),
    mockStopRecording: vi.fn(),
    mockPlayVideo: vi.fn(),
    mockPauseVideo: vi.fn(),
    mockSeekTo: vi.fn()
}))

// 1. Mock Audio Recorder Hook
vi.mock('../hooks/useAudioRecorder', () => ({
    useAudioRecorder: () => ({
        initializeStream: mockGlobals.mockInitializeStream.mockResolvedValue(undefined),
        startRecording: mockGlobals.mockStartRecording.mockImplementation(async () => {
            mockGlobals.isRecording = true
        }),
        stopRecording: mockGlobals.mockStopRecording.mockImplementation(async () => {
            mockGlobals.isRecording = false
            return new Blob(['audio'], { type: 'audio/webm' })
        }),
        isRecording: mockGlobals.isRecording,
        duration: 0,
        analyser: null,
        stream: null,
        availableDevices: [],
        selectedDeviceId: '',
        setDeviceId: vi.fn()
    })
}))

// 2. Mock Beat Player
vi.mock('../components/freestyle/BeatPlayer', () => ({
    default: ({ onReady }: { onReady: (player: any) => void }) => {
        mockGlobals.onPlayerReadyCallback = onReady
        return <div data-testid="beat-player">Beat Player Mock</div>
    }
}))

// 3. Mock DB
const mockDbAdd = vi.fn().mockResolvedValue('session-id')
vi.mock('../db/db', () => {
    return {
        db: {
            sessions: {
                add: (...args: any[]) => mockDbAdd(...args)
            }
        }
    }
})

// 4. Mock Navigation
const mockedNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return {
        ...actual,
        useNavigate: () => mockedNavigate
    }
})

describe('FreestylePage Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockGlobals.onPlayerReadyCallback = null
        mockGlobals.isRecording = false
    })

    it('Scenario A: Full Recording Flow (Start -> Pre-Roll -> Pause -> Finish -> Save)', async () => {
        render(
            <MemoryRouter>
                <FreestylePage />
            </MemoryRouter>
        )

        // 1. Verify page loaded
        expect(screen.getByText('Live Studio')).toBeInTheDocument()

        // 2. Simulate Player Ready
        act(() => {
            if (mockGlobals.onPlayerReadyCallback) {
                mockGlobals.onPlayerReadyCallback({
                    playVideo: mockGlobals.mockPlayVideo,
                    pauseVideo: mockGlobals.mockPauseVideo,
                    seekTo: mockGlobals.mockSeekTo,
                    getCurrentTime: () => 3.0,
                    setVolume: vi.fn()
                })
            }
        })

        // 3. Find Start Button (Big Red Circle)
        const recordButton = screen.getByTestId('record-toggle')

        // 4. Start Flow
        fireEvent.click(recordButton)

        // 5. Verify Beat Plays
        expect(mockGlobals.mockPlayVideo).toHaveBeenCalled()
        expect(mockGlobals.mockSeekTo).toHaveBeenCalledWith(0)

        // 6. Wait for Pre-Roll to finish and enter Recording state
        await waitFor(() => {
            expect(mockGlobals.mockStartRecording).toHaveBeenCalled()
        }, { timeout: 2000 })

        // 7. Test "Pause" (Which stops beat but essentially enters Paused State)
        fireEvent.click(recordButton)

        // Verify Pause Logic
        expect(mockGlobals.mockPauseVideo).toHaveBeenCalled()

        // 8. Test Finish
        const finishButton = screen.getByTestId('finish-button')
        fireEvent.click(finishButton)

        // 9. Verify Save (Triggered via Modal in new flow)
        await waitFor(() => {
            expect(screen.getByText('זמן אימון')).toBeInTheDocument()
        })

        const saveModalButton = screen.getByText('שמור וסיים')
        fireEvent.click(saveModalButton)

        await waitFor(() => {
            expect(mockGlobals.mockStopRecording).toHaveBeenCalled()
            expect(mockDbAdd).toHaveBeenCalled()
        })
    })

    it('Scenario C: Markers and Random Words', async () => {
        render(
            <MemoryRouter>
                <FreestylePage />
            </MemoryRouter>
        )

        // 1. Enable Random Words
        const randomToggle = screen.getByText('זרוק מילה')
        fireEvent.click(randomToggle)
        // We assume it toggled enabled.

        // 2. Start Recording
        const recordButton = screen.getByTestId('record-toggle')
        fireEvent.click(recordButton)

        // Simulate ready
        act(() => {
            if (mockGlobals.onPlayerReadyCallback) mockGlobals.onPlayerReadyCallback({
                playVideo: mockGlobals.mockPlayVideo,
                pauseVideo: mockGlobals.mockPauseVideo,
                seekTo: mockGlobals.mockSeekTo,
                getCurrentTime: () => 3.0,
                setVolume: vi.fn()
            })
        })

        await waitFor(() => expect(mockGlobals.mockStartRecording).toHaveBeenCalled())

        // 3. Save Marker (Button appears on visualizer)
        const bookmarkButton = screen.getByTitle('שמור רגע')
        fireEvent.click(bookmarkButton)

        // 4. Finish and Verify Markers Saved
        const finishButton = screen.getByTestId('finish-button')
        fireEvent.click(finishButton)

        // Handle Modal
        await waitFor(() => {
            expect(screen.getByText('שמור וסיים')).toBeInTheDocument()
        })
        fireEvent.click(screen.getByText('שמור וסיים'))

        await waitFor(() => {
            expect(mockDbAdd).toHaveBeenCalledWith(expect.objectContaining({
                metadata: expect.objectContaining({
                    moments: expect.arrayContaining([expect.any(Number)])
                })
            }))
        })
    })
})
