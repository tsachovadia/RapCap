# Library Screen & Beat Selector

## 1. MVP Decisions (V1)
*   **Playback Context**: טעינת הוידאו והאודיו במקביל.
*   **Moment Navigation**: לחיצה על סימוני "moments" מקפיצה את הנגן 10 שניות אחורה (Pre-roll) כדי לתפוס את הכניסה.
*   **Export**:
    *   כפתור **Download Mixed Track** יהיה קיים אך **Disabled** (Coming Soon).
    *   הסיבה: מגבלות טכניות (CORS) למיזוג אודיו מיוטיוב ב-Client Side.
*   **Persistence**: שמירה לוקאלית (IndexedDB) בשלב ראשון לוודא מהירות.

## 2. Future Roadmap (Ideas for Later)
*   [ ] **AI Transcription + Timestamps**:
    *   שליחת האודיו (Vocal) לשירות תמלול (כמו Whisper).
    *   הצגת המילים על המסך בזמן אמת (Karaoke Style) בזמן ניגון.
    *   יכולת חיפוש טקסטואלי בתוך פריסטיילים ("מתי אמרתי 'דרקון'?").
*   [ ] **Cloud Sync**: סנכרון הסשנים לענן לשמירה וגיבוי.
*   [ ] **Server-Side Rendering (Export)**: שירות ענן שיוריד את הביט וימזג אותו עם ההקלטה לקובץ MP3 איכותי להורדה.
