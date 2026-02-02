import { useState, useCallback } from 'react'
import { X, Volume2, Mic, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { runCalibration, getCalibratedLatency, clearCalibration, type CalibrationResult } from '../../services/latencyCalibration'

interface CalibrationWizardProps {
    isOpen: boolean
    onClose: () => void
    micStream?: MediaStream
    onRequestMic?: () => Promise<MediaStream>
}

type WizardStep = 'intro' | 'calibrating' | 'result'

export function CalibrationWizard({
    isOpen,
    onClose,
    micStream,
    onRequestMic
}: CalibrationWizardProps) {
    const [step, setStep] = useState<WizardStep>('intro')
    const [result, setResult] = useState<CalibrationResult | null>(null)
    const [error, setError] = useState<string | null>(null)

    const existingLatency = getCalibratedLatency()

    const startCalibration = useCallback(async () => {
        setStep('calibrating')
        setError(null)

        try {
            let stream = micStream

            if (!stream && onRequestMic) {
                stream = await onRequestMic()
            }

            if (!stream) {
                throw new Error('Microphone access required')
            }

            const calibrationResult = await runCalibration(stream)
            setResult(calibrationResult)
            setStep('result')

        } catch (e) {
            console.error('Calibration failed:', e)
            setError(e instanceof Error ? e.message : 'Calibration failed')
            setStep('result')
        }
    }, [micStream, onRequestMic])

    const handleClose = () => {
        setStep('intro')
        setResult(null)
        setError(null)
        onClose()
    }

    const handleClearCalibration = () => {
        clearCalibration()
        setResult(null)
        setStep('intro')
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#181818] rounded-2xl border border-[#282828] overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-[#282828]">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Volume2 size={20} className="text-[#1DB954]" />
                        Audio Calibration
                    </h2>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X size={20} className="text-white/60" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {step === 'intro' && (
                        <div className="space-y-6">
                            <div className="text-center space-y-3">
                                <div className="w-16 h-16 mx-auto bg-[#1DB954]/20 rounded-full flex items-center justify-center">
                                    <Mic size={32} className="text-[#1DB954]" />
                                </div>
                                <p className="text-white/80 text-sm leading-relaxed">
                                    We'll play 5 short beeps. Your microphone will record them to measure audio latency.
                                </p>
                            </div>

                            <div className="bg-[#121212] rounded-xl p-4 space-y-2">
                                <div className="flex items-center gap-2 text-xs text-white/60">
                                    <span className="w-2 h-2 bg-yellow-500 rounded-full" />
                                    Ensure speakers/headphones are on
                                </div>
                                <div className="flex items-center gap-2 text-xs text-white/60">
                                    <span className="w-2 h-2 bg-yellow-500 rounded-full" />
                                    Microphone should hear the beeps
                                </div>
                                <div className="flex items-center gap-2 text-xs text-white/60">
                                    <span className="w-2 h-2 bg-yellow-500 rounded-full" />
                                    Quiet environment works best
                                </div>
                            </div>

                            {existingLatency > 0 && (
                                <div className="bg-[#1DB954]/10 rounded-xl p-3 flex items-center justify-between">
                                    <span className="text-sm text-white/80">
                                        Current: <span className="font-mono text-[#1DB954]">{existingLatency}ms</span>
                                    </span>
                                    <button
                                        onClick={handleClearCalibration}
                                        className="text-xs text-white/40 hover:text-white/80 transition-colors"
                                    >
                                        Clear
                                    </button>
                                </div>
                            )}

                            <button
                                onClick={startCalibration}
                                className="w-full py-4 bg-[#1DB954] text-black font-bold rounded-xl hover:bg-[#1ED760] transition-colors"
                            >
                                Start Calibration
                            </button>
                        </div>
                    )}

                    {step === 'calibrating' && (
                        <div className="text-center space-y-6 py-8">
                            <div className="w-20 h-20 mx-auto bg-[#1DB954]/20 rounded-full flex items-center justify-center animate-pulse">
                                <Loader2 size={40} className="text-[#1DB954] animate-spin" />
                            </div>
                            <div className="space-y-2">
                                <p className="text-white font-medium">Playing beeps...</p>
                                <p className="text-white/40 text-sm">Keep quiet and wait</p>
                            </div>
                            <div className="flex justify-center gap-2">
                                {[0, 1, 2, 3, 4].map(i => (
                                    <div
                                        key={i}
                                        className="w-3 h-3 bg-[#1DB954]/30 rounded-full animate-pulse"
                                        style={{ animationDelay: `${i * 0.5}s` }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 'result' && (
                        <div className="space-y-6">
                            {error ? (
                                <div className="text-center space-y-4">
                                    <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
                                        <AlertCircle size={32} className="text-red-500" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-white font-medium">Calibration Failed</p>
                                        <p className="text-white/40 text-sm">{error}</p>
                                    </div>
                                </div>
                            ) : result?.success ? (
                                <div className="text-center space-y-4">
                                    <div className="w-16 h-16 mx-auto bg-[#1DB954]/20 rounded-full flex items-center justify-center">
                                        <CheckCircle size={32} className="text-[#1DB954]" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-white font-medium">Calibration Complete!</p>
                                        <p className="text-4xl font-mono font-bold text-[#1DB954]">
                                            {Math.round(result.latencyMs)}ms
                                        </p>
                                        <p className="text-white/40 text-xs">
                                            {result.message}
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-center gap-2">
                                        <span className={`text-xs px-2 py-1 rounded-full ${result.confidence === 'high' ? 'bg-green-500/20 text-green-400' :
                                                result.confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-red-500/20 text-red-400'
                                            }`}>
                                            {result.confidence} confidence
                                        </span>
                                        <span className="text-xs text-white/40">
                                            {result.detectedPeaks}/5 beeps
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center space-y-4">
                                    <div className="w-16 h-16 mx-auto bg-yellow-500/20 rounded-full flex items-center justify-center">
                                        <AlertCircle size={32} className="text-yellow-500" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-white font-medium">Could Not Calibrate</p>
                                        <p className="text-white/40 text-sm">{result?.message}</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep('intro')}
                                    className="flex-1 py-3 bg-[#282828] text-white font-medium rounded-xl hover:bg-[#333] transition-colors"
                                >
                                    Try Again
                                </button>
                                <button
                                    onClick={handleClose}
                                    className="flex-1 py-3 bg-[#1DB954] text-black font-bold rounded-xl hover:bg-[#1ED760] transition-colors"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default CalibrationWizard
