# RapCap

Interactive rap and freestyle training platform with AI-powered feedback, beat synchronization, and rhyme tools.

**Live demo:** [rap-cap.vercel.app](https://rap-cap.vercel.app)

## Features

- **Freestyle Recording** -- Record freestyle sessions over synchronized beats with real-time BPM tracking and metronome support
- **Rhyme Generation & Training** -- Generate rhyme chains, explore phonetic matches, and practice with structured drills
- **Verse & Bar Writing** -- Compose and edit verses with a dedicated writing interface, word association exercises, and object writing prompts
- **Session Library** -- Browse, replay, and manage saved recording sessions with full audio playback
- **Phonetic Analysis** -- Analyze rhyme schemes and phonetic patterns across your lyrics using a custom phonetic engine
- **Speech Recognition & Transcription** -- Automatic transcription of recorded sessions via Whisper, with transcript editing and processing
- **AI Feedback** -- Get feedback on your bars and flow from Google Gemini
- **Multi-Language Support** -- Built with internationalization in mind, supporting Hebrew and English
- **Progressive Web App** -- Installable PWA with offline support

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 |
| Auth & Storage | Firebase (Auth, Firestore, Storage) |
| Local Database | Dexie (IndexedDB) |
| AI | Google Gemini API |
| Transcription | OpenAI Whisper (via serverless API) |
| Speech | Web Speech API |
| Audio Encoding | lamejs (MP3) |
| Routing | React Router 7 |
| Icons | Lucide React |
| Deployment | Vercel |

## Project Structure

```
├── api/                    # Serverless API routes (Gemini, Whisper)
├── public/                 # Static assets and beats
├── scripts/                # Data generation and utility scripts
├── docs/                   # Product specs and research notes
├── src/
│   ├── components/
│   │   ├── freestyle/      # Freestyle session UI
│   │   ├── library/        # Session library and playback
│   │   ├── onboarding/     # User onboarding flow
│   │   ├── record/         # Recording controls and visualization
│   │   ├── rhymes/         # Rhyme generation and display
│   │   ├── shared/         # Reusable UI components
│   │   ├── studio/         # Main studio interface
│   │   ├── verse/          # Verse editor components
│   │   └── writing/        # Writing exercise components
│   ├── contexts/           # React contexts (Auth, Studio, Toast)
│   ├── data/               # Static data (beats, drills, word banks)
│   ├── db/                 # Dexie database schema
│   ├── hooks/              # Custom hooks (13 total)
│   │   ├── useAudioRecorder
│   │   ├── useFlowState
│   │   ├── useMetronome
│   │   ├── usePhoneticAnalysis
│   │   ├── usePlaybackEffects
│   │   ├── useSessions
│   │   ├── useTranscription
│   │   └── ...
│   ├── layouts/            # App shell layout
│   ├── lib/                # Firebase initialization
│   ├── pages/              # Route-level page components (17 pages)
│   ├── services/           # Business logic layer
│   │   ├── PhoneticEngine  # Custom phonetic analysis engine
│   │   ├── dicta           # Hebrew NLP integration
│   │   ├── gemini          # AI feedback service
│   │   ├── speechRecognition
│   │   ├── audioEncoder    # MP3 encoding with Web Workers
│   │   └── ...
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Utility functions
├── firestore.rules         # Firestore security rules
├── storage.rules           # Firebase Storage security rules
└── vercel.json             # Vercel deployment configuration
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/tsachovadia/RapCap.git
cd RapCap
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
```

### Development

```bash
npm run dev
```

The app starts on `https://localhost:5173` (HTTPS required for microphone access).

### Build

```bash
npm run build
npm run preview
```

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
