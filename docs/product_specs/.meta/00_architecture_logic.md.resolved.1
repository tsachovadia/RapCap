# Architecture & Core Logic

## 1. המודל הפנימי (Session Model)
החלטנו שה-"Session" הוא יחידת התוכן האטומית. הוא נשמר לוקאלית.

```typescript
type Session = {
    id: string; // UUID
    createdAt: number; 
    
    // Inspiration (The Beat)
    beatContext: {
        provider: 'youtube' | 'local_placeholder'; 
        videoId?: string;
        videoTitle: string;
        playStartOffset: number; // מאיזו שניה בוידאו התחלנו להקליט
    };

    // The Recording (Vocal)
    recording: {
        localBlobUrl: string; 
        durationSeconds: number;
        // Latency Compensation
        userLoopbackLatencyMs: number; // הדיליי המוערך (או שנמדד)
    };

    moments: number[]; // Timestamps of "Moments"
    
    // Sync Events Log
    events: {
        type: 'buffering_start' | 'buffering_end' | 'pause' | 'resume';
        timestamp: number; // Session time
    }[];
}
```

## 2. פיצוי השהייה (Latency & Sync Logic)
**האתגר**: משתמש שומע את הביט באוזניות Bluetooth -> יש דיליי עד שהוא שומע -> הוא מקליט -> יש דיליי עד שהמיקרופון קולט. התוצאה: השירה מוקלטת באיחור מורגש ביחס לביט ("Drifting").

**הפתרון ל-MVP**:
1.  **Buffering Handling**:
    *   ההקלטה היא המאסטר (לא עוצרת).
    *   אם הוידאו נתקע, המערכת רושמת אירוע `buffering_start` ו-`buffering_end`.
    *   בניגון חוזר, המערכת תדע "לדלג" או להשהות את הוידאו בנקודות האלו כדי לשמור על סנכרון עם השירה הרציפה.
2.  **Manual Calibration**: בסדרות הגדרות (Settings), נוסיף כלי כיול פשוט ("Tap to the beat").
3.  **Offset Adjustment**: בזמן ניגון (Playback) של הסשן, נזיז את התחלת ניגון השירה (Vocal Track) אחורה ב-X מילישניות לפי הערך שנשמר ב-`userLoopbackLatencyMs`.
4.  **Visual Nudge**: (בעתיד) נאפשר למשתמש להזיז ידנית את גל השמע ימינה/שמאלה במסך העריכה אם היה פספוס.

## 3. Offline Mode Strategy
*   **Acapella**: אם אין אינטרנט, המשתמש עדיין יכול להכנס ל-Studio ולהקליט ללא ביט רקע.
*   במקרה כזה, `beatContext` יהיה ריק או יכיל Placeholder של "Acapella Session".
