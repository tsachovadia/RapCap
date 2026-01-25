/**
 * TheLab Component
 * Writing area where users compose their bars.
 * Words can be dragged/clicked from RhymeBank into here.
 */

interface TheLabProps {
    lines: string[];
    onLinesChange: (lines: string[]) => void;
    onNewLine: () => void;
}

export default function TheLab({ lines, onLinesChange, onNewLine }: TheLabProps) {
    const handleLineChange = (index: number, value: string) => {
        const newLines = [...lines];
        newLines[index] = value;
        onLinesChange(newLines);
    };

    const handleKeyDown = (e: React.KeyboardEvent, _index: number) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            onNewLine();
            // Focus the new line after render
            setTimeout(() => {
                const inputs = document.querySelectorAll<HTMLInputElement>('.lab-line-input');
                inputs[inputs.length - 1]?.focus();
            }, 50);
        }
    };

    const handleDeleteLine = (index: number) => {
        if (lines.length <= 1) return;
        const newLines = lines.filter((_, i) => i !== index);
        onLinesChange(newLines);
    };

    return (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-4">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-green-400">
                <span>🧪</span>
                <span>The Lab</span>
            </h2>

            <p className="mb-4 text-xs text-gray-500">
                לחץ על מילה מהבנק להוספה • Enter לשורה חדשה
            </p>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {lines.map((line, index) => (
                    <div key={index} className="group flex items-center gap-2">
                        <span className="w-6 text-center text-xs text-gray-600">
                            {index + 1}.
                        </span>
                        <input
                            type="text"
                            value={line}
                            onChange={(e) => handleLineChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, index)}
                            placeholder="כתוב כאן..."
                            className="lab-line-input flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-right text-white placeholder-gray-600 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                            dir="rtl"
                        />
                        {lines.length > 1 && (
                            <button
                                onClick={() => handleDeleteLine(index)}
                                className="rounded p-1 text-gray-600 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                                title="מחק שורה"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                ))}
            </div>

            <button
                onClick={onNewLine}
                className="mt-4 w-full rounded-lg border border-dashed border-gray-700 py-2 text-sm text-gray-500 transition-colors hover:border-green-500 hover:text-green-400"
            >
                + שורה חדשה
            </button>

            {/* Line count */}
            <div className="mt-4 text-center text-xs text-gray-600">
                {lines.filter(l => l.trim()).length} / {lines.length} שורות
            </div>
        </div>
    );
}
