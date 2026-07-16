
import { useState, useCallback, useEffect, useRef } from 'react';
import { phoneticEngine } from '../services/PhoneticEngine';
import type { PhoneticAnalysisResult } from '../services/PhoneticEngine';

export function usePhoneticAnalysis(initialText: string = '') {
    const [text, setText] = useState(initialText);
    const [analysis, setAnalysis] = useState<PhoneticAnalysisResult | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const timeoutRef = useRef<number | null>(null);
    const requestIdRef = useRef(0);

    // Sync text with prop if it changes (e.g. from parent data update)
    useEffect(() => {
        if (initialText !== text) {
            setText(initialText);
        }
    }, [initialText]);

    const runAnalysis = useCallback(async (currentText: string, requestId: number) => {
        try {
            const result = await phoneticEngine.analyze(currentText);
            if (requestId === requestIdRef.current) setAnalysis(result);
        } catch (error) {
            console.error("Phonetic analysis failed:", error);
        } finally {
            if (requestId === requestIdRef.current) setIsAnalyzing(false);
        }
    }, []);

    // Trigger analysis when text changes
    useEffect(() => {
        if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);

        const requestId = ++requestIdRef.current;
        if (!text.trim()) {
            setAnalysis(null);
            setIsAnalyzing(false);
            return;
        }

        setIsAnalyzing(true);
        timeoutRef.current = window.setTimeout(() => {
            void runAnalysis(text, requestId);
        }, 1000);

        return () => {
            if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
        };
    }, [text, runAnalysis]);

    // Manual immediate trigger (e.g. for initial load or button press)
    const analyzeNow = useCallback(async () => {
        if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
        const requestId = ++requestIdRef.current;

        if (!text.trim()) {
            setAnalysis(null);
            setIsAnalyzing(false);
            return;
        }

        setIsAnalyzing(true);
        await runAnalysis(text, requestId);
    }, [text, runAnalysis]);

    return {
        text,
        setText,
        analysis,
        isAnalyzing,
        analyzeNow
    };
}
