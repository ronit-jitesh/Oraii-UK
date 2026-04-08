'use client';

interface Segment {
  speaker: string;
  text: string;
  isDraft: boolean;
  timestamp: number;
}

const SPEAKER_COLORS = [
  { bg: '#D8EDDF', text: '#1B4332', border: '#40916C' },
  { bg: '#EBF8FF', text: '#1E3A5F', border: '#3B82F6' },
  { bg: '#FAF5FF', text: '#3B0764', border: '#7C3AED' },
  { bg: '#FFF5F7', text: '#4A0020', border: '#DB2777' },
];

const getSpeakerColor = (speaker: string) => {
  const idx = parseInt(speaker.replace(/[^0-9]/g, '')) || 0;
  return SPEAKER_COLORS[idx % SPEAKER_COLORS.length];
};

export default function LiveTranscript({ segments }: { segments: Segment[] }) {
  const grouped: Segment[][] = [];
  let current: Segment[] = [];

  for (const seg of segments) {
    if (current.length === 0 || current[0].speaker === seg.speaker) {
      current.push(seg);
    } else {
      grouped.push(current);
      current = [seg];
    }
  }
  if (current.length > 0) grouped.push(current);

  return (
    <div className="space-y-3 py-1">
      {grouped.map((group, gi) => {
        const speaker = group[0].speaker;
        const colors = getSpeakerColor(speaker);
        const text = group.map(s => s.text).join(' ');
        const isDraft = group.some(s => s.isDraft);
        return (
          <div key={gi} className="flex gap-3">
            <div
              className="shrink-0 mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold border"
              style={{ background: colors.bg, color: colors.text, borderColor: colors.border + '40' }}
            >
              {speaker.replace('Speaker ', 'S')}
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-semibold mb-0.5" style={{ color: colors.text }}>
                {speaker}
              </p>
              <p
                className="text-sm leading-relaxed"
                style={{
                  color: isDraft ? '#9CA3AF' : '#1A1A1A',
                  fontStyle: isDraft ? 'italic' : 'normal',
                }}
              >
                {text}
                {isDraft && <span className="inline-block w-1 h-3.5 bg-[#9CA3AF] ml-0.5 animate-pulse rounded-sm" />}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
