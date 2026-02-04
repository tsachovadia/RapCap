
import { useState, useCallback, useEffect, useRef } from 'react';
import { phoneticEngine } from '../services/PhoneticEngine';
import type { PhoneticAnalysisResult } from '../services/PhoneticEngine';
// @ts-ignore
import debounce from 'lodash.debounce';

export function usePhoneticAnalysis(initialText: string = '') {
    const [text, setText] = useState(initialText);
    const [analysis, setAnalysis] = useState<PhoneticAnalysisResult | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Sync text with prop if it changes (e.g. from parent data update)
    useEffect(() => {
        if (initialText !== text) {
            setText(initialText);
        }
    }, [initialText]);

    // Create a debounced analyze function
    // We use useRef to keep the same debounced instance across renders
    const analyzeDebounced = useRef(
        debounce(async (currentText: string) => {
            if (!currentText.trim()) {
                setAnalysis(null);
                setIsAnalyzing(false);
                return;
            }

            try {
                const result = await phoneticEngine.analyze(currentText);
                setAnalysis(result);
            } catch (error) {
                console.error("Phonetic analysis failed:", error);
            } finally {
                setIsAnalyzing(false);
            }
        }, 1000) // 1 second debounce
    ).current;

    // Trigger analysis when text changes
    useEffect(() => {
        setIsAnalyzing(true);
        analyzeDebounced(text);

        // Cleanup on unmount
        return () => {
            analyzeDebounced.cancel();
        };
    }, [text, analyzeDebounced]);

    // Manual immediate trigger (e.g. for initial load or button press)
    const analyzeNow = useCallback(async () => {
        analyzeDebounced.cancel(); // Cancel pending
        setIsAnalyzing(true);
        try {
            const result = await phoneticEngine.analyze(text);
            setAnalysis(result);
        } catch (error) {
            console.error("Manual analysis failed:", error);
        } finally {
            setIsAnalyzing(false);
        }
    }, [text]);

    return {
        text,
        setText,
        analysis,
        isAnalyzing,
        analyzeNow
    };
}
