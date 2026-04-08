// ── SNOMED CT Clinical Coding ──
// UK NHS standard since 2018 (primary care) and 2020 (all settings)
// Private practice: recommended for NHS interoperability readiness
//
// NOT CPT codes — Current Procedural Terminology is American and has no meaning in UK healthcare
// NOT ICD-10 as primary coding — used for statistical/commissioning purposes only
// NOT READ codes — deprecated across NHS England

// Common SNOMED CT concepts for mental health therapy documentation
export const SNOMED_MENTAL_HEALTH = {
  // ── Mood disorders ──
  DEPRESSIVE_DISORDER: { conceptId: '35489007', display: 'Depressive disorder' },
  MILD_DEPRESSIVE_EPISODE: { conceptId: '310495003', display: 'Mild depressive episode' },
  MODERATE_DEPRESSIVE_EPISODE: { conceptId: '310496002', display: 'Moderate depressive episode' },
  SEVERE_DEPRESSIVE_EPISODE: { conceptId: '310497006', display: 'Severe depressive episode without psychotic symptoms' },
  RECURRENT_DEPRESSION: { conceptId: '36923009', display: 'Major depression, recurrent' },
  BIPOLAR_DISORDER: { conceptId: '13746004', display: 'Bipolar disorder' },
  DYSTHYMIA: { conceptId: '38341003', display: 'Dysthymia' },

  // ── Anxiety disorders ──
  GENERALISED_ANXIETY: { conceptId: '21897009', display: 'Generalised anxiety disorder' },
  PANIC_DISORDER: { conceptId: '371631005', display: 'Panic disorder' },
  PANIC_WITH_AGORAPHOBIA: { conceptId: '200753003', display: 'Panic disorder with agoraphobia' },
  SOCIAL_ANXIETY: { conceptId: '231504006', display: 'Social phobia' },
  SPECIFIC_PHOBIA: { conceptId: '386810004', display: 'Phobic disorder' },
  OCD: { conceptId: '191736004', display: 'Obsessive-compulsive disorder' },
  HEALTH_ANXIETY: { conceptId: '300228004', display: 'Health anxiety disorder' },

  // ── Trauma ──
  PTSD: { conceptId: '47505003', display: 'Posttraumatic stress disorder' },
  COMPLEX_PTSD: { conceptId: '1137608002', display: 'Complex posttraumatic stress disorder' },
  ACUTE_STRESS_REACTION: { conceptId: '212545002', display: 'Acute stress reaction' },

  // ── Eating disorders ──
  ANOREXIA: { conceptId: '56882008', display: 'Anorexia nervosa' },
  BULIMIA: { conceptId: '78004001', display: 'Bulimia nervosa' },
  BINGE_EATING: { conceptId: '191771003', display: 'Binge eating disorder' },

  // ── Personality ──
  EMOTIONALLY_UNSTABLE_PD: { conceptId: '20010003', display: 'Emotionally unstable personality disorder' },
  BPD: { conceptId: '20010003', display: 'Borderline personality disorder' },

  // ── Risk ──
  SUICIDAL_IDEATION: { conceptId: '6471006', display: 'Suicidal ideation' },
  SUICIDAL_INTENT: { conceptId: '305141003', display: 'Suicidal intent' },
  SELF_HARM: { conceptId: '248062006', display: 'Self-injurious behaviour' },
  NON_SUICIDAL_SELF_INJURY: { conceptId: '418290006', display: 'Non-suicidal self injury' },

  // ── Therapy types ──
  CBT: { conceptId: '228557008', display: 'Cognitive behavioural therapy' },
  ACT: { conceptId: '449418008', display: 'Acceptance and commitment therapy' },
  DBT: { conceptId: '426347004', display: 'Dialectical behaviour therapy' },
  PERSON_CENTRED: { conceptId: '229070002', display: 'Person centred therapy' },
  PSYCHODYNAMIC: { conceptId: '229071003', display: 'Psychodynamic psychotherapy' },
  EMDR: { conceptId: '229070002', display: 'Eye movement desensitisation and reprocessing' },
  COUNSELLING: { conceptId: '11429006', display: 'Counselling' },
  PSYCHOTHERAPY: { conceptId: '75516001', display: 'Psychotherapy' },
  GROUP_THERAPY: { conceptId: '76168009', display: 'Group therapy' },

  // ── Assessment tools ──
  PHQ9_ASSESSMENT: { conceptId: '720433000', display: 'PHQ-9 depression scale' },
  GAD7_ASSESSMENT: { conceptId: '720425007', display: 'GAD-7 anxiety scale' },
  CORE10_ASSESSMENT: { conceptId: '443317000', display: 'CORE-10 outcome measure' },
} as const

export type SnomedMentalHealthCode = keyof typeof SNOMED_MENTAL_HEALTH
export type SnomedConcept = (typeof SNOMED_MENTAL_HEALTH)[SnomedMentalHealthCode]

// QOF (Quality and Outcomes Framework) mental health indicators
// Used by GPs for primary care mental health tracking — relevant for GP correspondence
export const QOF_MENTAL_HEALTH = {
  MH001: 'Patients with schizophrenia, bipolar and other psychoses — annual review',
  MH007: 'Patients with serious mental illness — alcohol use documented',
  MH009: 'Patients with SMI — blood pressure measured',
  DEPR001: 'Patients with depression — PHQ-9 score recorded at diagnosis',
  DEPR002: 'Patients with depression — follow-up 5-12 weeks after diagnosis',
} as const
