/**
 * The iMac illustration from the design: a monitor with a mint screen and
 * floating job-requirement bubbles around it — "the requirements come to you".
 */
const BUBBLES: Array<{ text: string; position: string; delay: string }> = [
  {
    text: "דרושה מתכנתת Fullstack לפרויקט מרגש — שלחי קו״ח",
    position: "start-[2%] top-[6%] sm:start-[6%]",
    delay: "0s",
  },
  {
    text: "דרושים: ניסיון ב-Node.js ובניית DB עם Postgres · מיקום: תל אביב",
    position: "end-[1%] top-[20%] sm:end-[4%]",
    delay: "1.1s",
  },
  {
    text: "דרושה מתכנתת Backend/Fullstack להשלמת פיתוח בפרויקט קיים",
    position: "start-[4%] bottom-[24%] sm:start-[10%]",
    delay: "0.5s",
  },
  {
    text: "Java · Kafka · Redis · משרה היברידית במרכז",
    position: "end-[5%] bottom-[16%] sm:end-[12%]",
    delay: "1.7s",
  },
];

export function MonitorShowcase() {
  return (
    <div className="relative mx-auto max-w-2xl px-2 pb-6 pt-4">
      {/* Monitor */}
      <div className="mx-auto w-full max-w-[520px]">
        <div className="rounded-[22px] border border-ink/15 bg-white p-3 shadow-[var(--shadow-card)]">
          <div className="aspect-[16/10] w-full rounded-[12px] bg-gradient-to-br from-[#9dead7] to-[#6fd9c8]" />
        </div>
        {/* stand */}
        <div className="mx-auto h-12 w-16 bg-gradient-to-b from-ink/15 to-ink/5 [clip-path:polygon(18%_0,82%_0,100%_100%,0_100%)]" />
        <div className="mx-auto h-2 w-40 rounded-full bg-ink/15" />
      </div>

      {/* Floating requirement bubbles */}
      {BUBBLES.map((b) => (
        <div
          key={b.text}
          className={`animate-blob absolute max-w-[46%] rounded-2xl bg-white p-3 text-[12px] font-medium leading-snug text-ink shadow-[var(--shadow-pop)] ring-1 ring-ink/5 sm:max-w-[240px] sm:text-[13px] ${b.position}`}
          style={
            {
              "--blob-duration": "6.5s",
              "--blob-delay": b.delay,
            } as React.CSSProperties
          }
        >
          {b.text}
        </div>
      ))}
    </div>
  );
}
