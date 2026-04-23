// CBT + Psychoeducation Knowledge Base
// Grounded in NICE Clinical Guidelines, CBT principles, and NHS psychoeducation resources
// Used to enrich ORAII chat responses with evidence-based context
// No identifiable patient data — this is static reference content only

export type KnowledgeChunk = {
  id: string
  topic: string
  keywords: string[]
  content: string
  source: string
}

export const CBT_KNOWLEDGE_BASE: KnowledgeChunk[] = [
  // ── Anxiety ──────────────────────────────────────────────────────────────
  {
    id: 'anxiety-cycle',
    topic: 'anxiety',
    keywords: ['anxious', 'anxiety', 'worried', 'panic', 'nervous', 'fear', 'scared', 'on edge', 'dread'],
    content: 'Anxiety is a normal response to perceived threat. The anxiety cycle works like this: a triggering thought → physical symptoms (racing heart, shallow breathing, tension) → avoidance behaviours → temporary relief → the fear grows stronger. CBT breaks this cycle by identifying the trigger thought, challenging it with evidence, and gradually approaching feared situations rather than avoiding them.',
    source: 'NICE CG113: Generalised Anxiety Disorder',
  },
  {
    id: 'anxiety-breathing',
    topic: 'anxiety',
    keywords: ['anxious', 'panic', 'can\'t breathe', 'heart racing', 'palpitations', 'hyperventilating'],
    content: 'During anxiety, the body\'s fight-or-flight response causes rapid shallow breathing, which can make symptoms worse. Diaphragmatic breathing (slow 4-count inhale through the nose, hold for 2, 6-count exhale through the mouth) activates the parasympathetic nervous system, directly reducing physical anxiety symptoms within 2–3 minutes.',
    source: 'NICE-endorsed CBT self-help protocol',
  },
  {
    id: 'anxiety-grounding',
    topic: 'anxiety',
    keywords: ['grounding', 'dissociating', 'unreal', 'disconnected', 'overwhelmed', 'panic attack', 'spiralling'],
    content: 'The 5-4-3-2-1 grounding technique anchors you to the present moment: name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, 1 you can taste. This interrupts the anxiety cycle by directing attention away from threat-focused thoughts and towards sensory reality.',
    source: 'NHS Talking Therapies — grounding techniques',
  },
  {
    id: 'worry-time',
    topic: 'worry',
    keywords: ['worry', 'ruminating', 'overthinking', 'can\'t stop thinking', 'stuck in my head', 'intrusive thoughts'],
    content: 'Worry time is an evidence-based technique: set aside 20 minutes each day (not near bedtime) as your designated worry period. When worries arise outside that window, note them down and postpone them to worry time. During worry time, distinguish between solvable problems (take one small action) and hypothetical worries (practice acceptance). This prevents worry from colonising the whole day.',
    source: 'NICE CG113 — worry postponement technique',
  },

  // ── Depression ───────────────────────────────────────────────────────────
  {
    id: 'depression-ba',
    topic: 'depression',
    keywords: ['depressed', 'depression', 'low mood', 'no motivation', 'can\'t be bothered', 'empty', 'hopeless', 'nothing matters', 'pointless'],
    content: 'Behavioural Activation (BA) is a first-line CBT technique for depression. Depression creates a vicious cycle: low mood → withdrawal and inactivity → fewer positive experiences → lower mood. BA breaks this by scheduling small, manageable activities that provide a sense of mastery or pleasure — even when motivation is absent. The key insight: you don\'t wait to feel motivated; you act first and mood improves after.',
    source: 'NICE CG90: Depression in Adults',
  },
  {
    id: 'depression-thought-record',
    topic: 'depression',
    keywords: ['negative thoughts', 'automatic thoughts', 'critical thoughts', 'self-critical', 'thinking traps', 'cognitive distortions', 'all or nothing'],
    content: 'Cognitive restructuring involves catching automatic negative thoughts (ANTs), identifying the thinking trap (e.g., all-or-nothing, catastrophising, mind-reading), and generating a balanced alternative. Common thinking traps in depression: catastrophising ("this will never get better"), overgeneralisation ("I always fail"), mental filter (focusing only on the negative), and personalisation ("it\'s all my fault").',
    source: 'Beck\'s Cognitive Model — NICE-recommended CBT approach',
  },
  {
    id: 'depression-activity',
    topic: 'depression',
    keywords: ['no energy', 'tired', 'fatigue', 'exhausted', 'can\'t get out of bed', 'unmotivated', 'withdrawn', 'isolated'],
    content: 'When energy is very low, start with micro-activities: sitting up in bed, making a cup of tea, opening a window. Rate each activity for mastery (how much you achieved, 0–10) and pleasure (how much you enjoyed it, 0–10). These small wins begin to rebuild the activity-mood connection that depression erodes.',
    source: 'NHS Talking Therapies — behavioural activation worksheets',
  },

  // ── Sleep ────────────────────────────────────────────────────────────────
  {
    id: 'sleep-hygiene',
    topic: 'sleep',
    keywords: ['sleep', 'insomnia', 'can\'t sleep', 'lying awake', 'waking up', 'tired', 'exhausted', 'rest', 'nighttime'],
    content: 'CBT for Insomnia (CBT-I) is more effective than sleep medication in the long term. Core principles: keep a consistent wake time (even weekends); get out of bed if awake for more than 20 minutes; avoid screens 1 hour before bed; use the bedroom only for sleep and sex (stimulus control); don\'t try to force sleep — this creates performance anxiety.',
    source: 'NICE CG159: Sleep disorders — CBT-I protocol',
  },
  {
    id: 'sleep-worry',
    topic: 'sleep',
    keywords: ['can\'t switch off', 'racing mind at night', 'bedtime worry', 'night anxiety', 'ruminating at night'],
    content: 'Bedtime worry is best managed by a pre-sleep wind-down ritual: write down tomorrow\'s tasks and worries at least an hour before bed (worry dump), do a brief breathing exercise, then practice progressive muscle relaxation. This creates a psychological transition from day-mode to sleep-mode and prevents the bed from becoming associated with rumination.',
    source: 'NHS Talking Therapies — sleep management module',
  },

  // ── Self-esteem ──────────────────────────────────────────────────────────
  {
    id: 'self-esteem',
    topic: 'self-esteem',
    keywords: ['self-esteem', 'confidence', 'worthless', 'not good enough', 'failure', 'hate myself', 'inadequate', 'useless', 'broken'],
    content: 'Low self-esteem is maintained by a negative core belief ("I am worthless/unlovable/incompetent"), which causes a bias in how we notice and remember information — confirming the belief and discounting evidence against it. CBT addresses this by: (1) identifying the core belief explicitly, (2) keeping a daily log of small evidence against it, (3) using a "positive data log" to gradually update the belief.',
    source: 'Fennell\'s CBT model of low self-esteem — NICE-referenced approach',
  },

  // ── Stress ───────────────────────────────────────────────────────────────
  {
    id: 'stress-response',
    topic: 'stress',
    keywords: ['stressed', 'overwhelmed', 'pressure', 'too much', 'burnout', 'exhausted', 'stretched', 'at my limit'],
    content: 'Chronic stress keeps the body in a low-level fight-or-flight state, raising cortisol, disrupting sleep, and narrowing our problem-solving capacity. The most effective short-term reset is the physiological sigh: two quick inhales through the nose (inflate lungs fully), then one long exhale through the mouth. This is the fastest way to downregulate the nervous system — faster than box breathing.',
    source: 'Stanford Neuroscience Lab — Huberman et al.; NHS stress management',
  },
  {
    id: 'stress-problem-solving',
    topic: 'stress',
    keywords: ['problem', 'stuck', 'don\'t know what to do', 'no way out', 'options', 'decision', 'overwhelmed by'],
    content: 'Structured problem-solving reduces the emotional overwhelm of stress: (1) Write the problem clearly in one sentence, (2) Brainstorm all possible solutions — no judging yet, (3) Weigh pros and cons of each, (4) Choose the most workable option, (5) Plan the smallest first step, (6) Do it, then review. Breaking problems into steps reduces the all-or-nothing paralysis that stress creates.',
    source: 'NHS Talking Therapies — problem-solving therapy module',
  },

  // ── Mindfulness ──────────────────────────────────────────────────────────
  {
    id: 'mindfulness-intro',
    topic: 'mindfulness',
    keywords: ['mindfulness', 'meditation', 'present moment', 'calm', 'breathing exercise', 'relax', 'body scan'],
    content: 'Mindfulness is paying attention to the present moment with curiosity and without judgement. It doesn\'t mean having no thoughts — it means noticing thoughts without getting pulled into them. A simple starting practice: sit comfortably, focus on the sensation of breathing, notice when the mind wanders (it will), and gently return focus without self-criticism. Even 5 minutes daily produces measurable reductions in anxiety and depression after 8 weeks.',
    source: 'NICE-referenced MBCT (Mindfulness-Based Cognitive Therapy)',
  },

  // ── Relationships ────────────────────────────────────────────────────────
  {
    id: 'loneliness',
    topic: 'loneliness',
    keywords: ['lonely', 'alone', 'isolated', 'no friends', 'no one understands', 'disconnected', 'left out'],
    content: 'Loneliness is the gap between the social connection you have and the connection you want — it\'s not the same as being alone. It activates the same brain regions as physical pain. CBT approaches involve: identifying safety behaviours that maintain loneliness (e.g., not reaching out for fear of rejection), gradually increasing low-risk social contact, and challenging the belief that you are fundamentally unlikeable.',
    source: 'Campaign to End Loneliness — CBT framework; NHS Talking Therapies',
  },

  // ── Grief ────────────────────────────────────────────────────────────────
  {
    id: 'grief',
    topic: 'grief',
    keywords: ['grief', 'loss', 'bereavement', 'someone died', 'grieving', 'miss someone', 'lost someone'],
    content: 'Grief is not a linear process with fixed stages — it\'s unique to each person and loss. Common experiences include waves of sadness, anger, guilt, numbness, and temporary relief, often in unpredictable order. There is no timeline for grief. Helpful approaches: allow yourself to feel without judgement, maintain some daily structure, and speak to others who knew the person. Complicated grief (persistent, debilitating grief after 6+ months) benefits from professional support.',
    source: 'NHS guidance on bereavement; NICE grief support framework',
  },
]

// Fast keyword-based topic detector for real-time chat use
// Returns top matching chunks (max 2) for a given user message
export function findRelevantKnowledge(userMessage: string, maxChunks = 2): KnowledgeChunk[] {
  const lower = userMessage.toLowerCase()
  const scored = CBT_KNOWLEDGE_BASE.map(chunk => {
    const score = chunk.keywords.reduce((acc, kw) => {
      return acc + (lower.includes(kw.toLowerCase()) ? 1 : 0)
    }, 0)
    return { chunk, score }
  })

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxChunks)
    .map(s => s.chunk)
}
