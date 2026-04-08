// ── UK Clinical Risk Detection ──
// Based on C-SSRS (Columbia Suicide Severity Rating Scale)
// NICE CG133 (self-harm), NICE CG90 (depression)
// Mental Health Act 1983 — NOT MHCA 2017 (Indian)
// Safeguarding: Children Act 1989, Care Act 2014

export interface RiskAlert {
  id: string;
  level: 'low' | 'moderate' | 'high' | 'critical';
  category: string;
  phrase: string;
  recommendation: string;
  timestamp: number;
  dismissed?: boolean;
}

export interface ClinicalTheme {
  id: string;
  label: string;
  color: string;
}

// C-SSRS ideation items — UK clinical language
const RISK_PATTERNS: Array<{
  pattern: RegExp;
  level: RiskAlert['level'];
  category: string;
  recommendation: string;
}> = [
  // Critical — immediate risk
  {
    pattern: /\b(kill myself|end my life|want to die|suicide|suicidal|take my life|not want to be here anymore)\b/i,
    level: 'critical',
    category: 'Suicidal ideation',
    recommendation: 'IMMEDIATE: Conduct full C-SSRS assessment. Consider MHA s136 referral. Contact crisis team. Document under NICE CG133.',
  },
  {
    pattern: /\b(have a plan|know how i.ll do it|got pills|got a method)\b/i,
    level: 'critical',
    category: 'Suicidal ideation with plan',
    recommendation: 'CRITICAL: Suicidal ideation with plan. Implement safety plan immediately. Contact NHS 111 option 2 or emergency services.',
  },
  // High
  {
    pattern: /\b(hurt myself|self[- ]harm|cutting|burning myself|overdose)\b/i,
    level: 'high',
    category: 'Self-harm',
    recommendation: 'Assess self-harm under NICE CG136. Document severity and intent. Review safeguarding obligations.',
  },
  {
    pattern: /\b(no reason to live|nothing to live for|better off without me|pointless|no hope)\b/i,
    level: 'high',
    category: 'Hopelessness',
    recommendation: 'Significant hopelessness — key risk factor. Explore protective factors. Review PHQ-9 item 9. Safety plan.',
  },
  // Moderate
  {
    pattern: /\b(hopeless|helpless|worthless|can.t go on|exhausted|burnt out|can.t cope)\b/i,
    level: 'moderate',
    category: 'Distress indicators',
    recommendation: 'Monitor for escalation. Administer PHQ-9 or GAD-7. Explore support network.',
  },
  {
    pattern: /\b(abuse|violence|hit me|hurt me|scared of|afraid of|threatened)\b/i,
    level: 'high',
    category: 'Safeguarding concern',
    recommendation: 'Potential safeguarding concern. Follow local authority safeguarding procedures (Care Act 2014 / Children Act 1989). Document and refer if indicated.',
  },
  {
    pattern: /\b(drinking|alcohol|drugs|substance|using)\b/i,
    level: 'moderate',
    category: 'Substance use',
    recommendation: 'Screen for substance use disorder. Consider AUDIT-C. Refer to substance use service if clinically indicated.',
  },
  // Low
  {
    pattern: /\b(anxious|anxiety|panic|worry|worried|stressed)\b/i,
    level: 'low',
    category: 'Anxiety',
    recommendation: 'Administer GAD-7. Explore triggers. Consider CBT referral via NHS Talking Therapies.',
  },
  {
    pattern: /\b(depressed|depression|low mood|sad|tearful|crying|empty)\b/i,
    level: 'low',
    category: 'Low mood',
    recommendation: 'Administer PHQ-9. Monitor frequency and duration. Assess functional impairment.',
  },
];

// Clinical themes for the Copilot panel
const THEME_PATTERNS: Array<{ pattern: RegExp; id: string; label: string; color: string }> = [
  { pattern: /\b(sleep|insomnia|waking|nightmares|tired|exhausted)\b/i, id: 'sleep', label: 'Sleep disturbance', color: '#6366F1' },
  { pattern: /\b(work|job|boss|colleague|career|workplace|redundant)\b/i, id: 'work', label: 'Occupational stress', color: '#F59E0B' },
  { pattern: /\b(relationship|partner|husband|wife|divorce|separated|breakup)\b/i, id: 'relationships', label: 'Relationship issues', color: '#EC4899' },
  { pattern: /\b(family|parent|mother|father|sibling|children|child)\b/i, id: 'family', label: 'Family dynamics', color: '#8B5CF6' },
  { pattern: /\b(loss|grief|bereavement|died|death|passed away|funeral)\b/i, id: 'grief', label: 'Grief and loss', color: '#64748B' },
  { pattern: /\b(trauma|ptsd|flashback|nightmare|assault|abuse)\b/i, id: 'trauma', label: 'Trauma', color: '#DC2626' },
  { pattern: /\b(medication|tablets|antidepressant|sertraline|fluoxetine|prescription)\b/i, id: 'medication', label: 'Medication', color: '#059669' },
  { pattern: /\b(money|financial|debt|bills|rent|mortgage|benefits)\b/i, id: 'financial', label: 'Financial stress', color: '#D97706' },
];

let alertIdCounter = 0;

export function scanTranscriptUK(text: string, timestamp: number): RiskAlert[] {
  const alerts: RiskAlert[] = [];
  const lower = text.toLowerCase();

  for (const rule of RISK_PATTERNS) {
    const match = lower.match(rule.pattern);
    if (match) {
      alerts.push({
        id: `alert-${++alertIdCounter}`,
        level: rule.level,
        category: rule.category,
        phrase: match[0],
        recommendation: rule.recommendation,
        timestamp,
        dismissed: false,
      });
    }
  }
  return alerts;
}

export function detectThemesUK(fullText: string): ClinicalTheme[] {
  return THEME_PATTERNS
    .filter(t => t.pattern.test(fullText))
    .map(t => ({ id: t.id, label: t.label, color: t.color }));
}

export function applyCoOccurrenceEscalation(alerts: RiskAlert[]): RiskAlert[] {
  const hasIdeation = alerts.some(a => a.category === 'Suicidal ideation');
  const hasHopelessness = alerts.some(a => a.category === 'Hopelessness');
  const hasPlan = alerts.some(a => a.category === 'Suicidal ideation with plan');

  if ((hasIdeation && hasHopelessness) || hasPlan) {
    return alerts.map(a =>
      a.category === 'Hopelessness'
        ? { ...a, level: 'critical' as const, recommendation: a.recommendation + ' Co-occurring with suicidal ideation — CRITICAL escalation.' }
        : a
    );
  }
  return alerts;
}
