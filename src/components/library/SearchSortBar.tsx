import { Search, ArrowUpDown } from 'lucide-react'

interface SearchSortBarProps {
    searchQuery: string
    onSearchChange: (query: string) => void
    activeFilter: string
    onFilterChange: (filter: string) => void
    sortBy: 'date' | 'name' | 'duration'
    onSortChange: (sort: 'date' | 'name' | 'duration') => void
}

const filters = [
    { id: 'all', label: 'הכל' },
    { id: 'freestyle', label: 'הקלטות' },
    { id: 'drill', label: 'אימונים' },
]

const sortOptions = [
    { id: 'date', label: 'תאריך' },
    { id: 'name', label: 'שם' },
    { id: 'duration', label: 'משך' },
] as const

export default function SearchSortBar({
    searchQuery,
    onSearchChange,
    activeFilter,
    onFilterChange,
    sortBy,
    onSortChange
}: SearchSortBarProps) {
    return (
        <div className="space-y-3">
            {/* Search Input */}
            <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-subdued" size={18} />
                <input
                    type="text"
                    placeholder="חיפוש בספריה..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full bg-[#282828] text-white placeholder-subdued pr-10 pl-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1DB954]/50 transition-all"
                    dir="rtl"
                />
            </div>

            {/* Filters + Sort Row */}
            <div className="flex items-center justify-between gap-2">
                {/* Filter Chips */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {filters.map((filter) => (
                        <button
                            key={filter.id}
                            onClick={() => onFilterChange(filter.id)}
                            className={`spotify-chip shrink-0 hover:bg-white/20 transition-colors ${activeFilter === filter.id ? 'active' : ''
                                }`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>

                {/* Sort Dropdown */}
                <div className="relative shrink-0">
                    <select
                        value={sortBy}
                        onChange={(e) => onSortChange(e.target.value as 'date' | 'name' | 'duration')}
                        className="appearance-none bg-[#282828] text-subdued text-xs pl-8 pr-3 py-2 rounded-lg cursor-pointer hover:bg-[#383838] transition-colors focus:outline-none"
                        dir="rtl"
                    >
                        {sortOptions.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                    <ArrowUpDown className="absolute left-2 top-1/2 -translate-y-1/2 text-subdued pointer-events-none" size={14} />
                </div>
            </div>
        </div>
    )
}
