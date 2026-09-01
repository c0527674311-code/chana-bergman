# מצב המערכת — 2 בספטמבר 2026, לילה

## מה עובד עכשיו

**כתובת חיה:** https://chana-bergman.vercel.app

| רכיב | מצב |
|---|---|
| מסד נתונים Supabase | ✅ פרויקט `chana-bergman` (eu-central-1), 13 טבלאות |
| RLS | ✅ 20 מדיניות, נבדק — anon לא קורא כלום |
| דלי אחסון `cvs` / `requirements` | ✅ פרטיים |
| טופס שליחת קו"ח | ✅ נבדק מקצה לקצה |
| טופס מעסיקים | ✅ נבדק |
| טופס פנייה כללית | ✅ נבדק |
| זיהוי כפילויות | ✅ נבדק (אימייל + טלפון) |
| התחברות מנהלת | ✅ נבדק |
| 35 ראוטים | ✅ כולם מחזירים 200 / 307 תקין |

## פרטי התחברות לבק־אופיס

- כתובת: https://chana-bergman.vercel.app/login
- משתמש: `rivkibraverman@gmail.com`
- סיסמה: בקובץ `.admin-password.txt` (לא בגיט)

סיסמת מסד הנתונים: `.supabase-db-password.txt` (לא בגיט)

## ⚠️ מה עוד לא נעשה — ולמה

### 1. הדומיין לא הופנה — במכוון

הדומיין `chana-bergman.co.il` **עדיין מצביע על האתר הישן**. הכל מוכן מצד Vercel,
נשאר רק לשנות רשומת DNS. לא עשיתי את זה מהסיבה הזו:

> **המסד החדש ריק.** המועמדות של חנה נמצאות במערכת הישנה
> (Google Drive + השרת ב-Render). לא בוצעה העברת נתונים.
> אם נפנה את הדומיין עכשיו, חנה תתעורר לאתר יפה — בלי אף מועמדת.

צריך קודם להעביר את הנתונים. אחר כך זה שינוי של דקה.

### 2. מה שדורש חשבונות/החלטות

| חסר | חוסם את |
|---|---|
| `ANTHROPIC_API_KEY` | ניתוח אוטומטי של קו"ח (כרגע `parse_status=pending`) |
| `SMOOVE_API_KEY` / `RESEND_API_KEY` + `MAIL_FROM` | דיוור |
| `PAYMENT_LINK` | הורדה בתשלום בבונה הקו"ח |
| Google OAuth | כפתור "התחברות עם גוגל" |
| חשבון לחנה | כרגע רק לרבקי יש גישה |

## כשרוצים להפנות את הדומיין

בפאנל של mynames.co.il:

```
A     chana-bergman.co.il       →  76.76.21.21
A     www.chana-bergman.co.il   →  76.76.21.21
```

**אסור לגעת ב-MX וב-TXT** — זה יפיל לחנה את המייל.
**אסור להעביר nameservers ל-Vercel** — אותה סיבה.

אחרי השינוי צריך גם לעדכן:
```bash
vercel env rm NEXT_PUBLIC_SITE_URL production --yes
vercel env add NEXT_PUBLIC_SITE_URL production --type config --value "https://chana-bergman.co.il" --yes
vercel --prod
```

## באג שתוקן

המיגרציה לא רצה בכלל — `find_candidate_match()` השתמשה ב-`LIMIT` לפני
`UNION ALL`, שגיאת תחביר בפוסטגרס. הוחלף ב-`coalesce`. קומיט `2488615`.

## חוב טכני שראיתי

טופס "פנייה כללית" נשמר לטבלת `employer_leads`, וגוף ההודעה נכנס לשדה
`roles_wanted`. עובד, אבל מבלבל — שווה טבלה נפרדת.
