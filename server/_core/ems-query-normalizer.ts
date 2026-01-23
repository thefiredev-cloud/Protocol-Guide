/**
 * EMS Query Normalizer
 *
 * Handles rushed/abbreviated field queries by:
 * 1. Expanding common EMS abbreviations
 * 2. Correcting common typos
 * 3. Normalizing medical terminology
 * 4. Extracting query intent for better routing
 *
 * Critical for 2-second latency target - this preprocessing
 * improves retrieval accuracy without additional LLM calls.
 */

// ============================================================================
// EMS ABBREVIATION DICTIONARY
// ============================================================================

/**
 * Comprehensive EMS abbreviation expansion dictionary
 * Ordered by frequency of use in field queries
 */
export const EMS_ABBREVIATIONS: Record<string, string> = {
  // Vital Signs & Assessment
  'bp': 'blood pressure',
  'hr': 'heart rate',
  'rr': 'respiratory rate',
  'spo2': 'oxygen saturation',
  'o2sat': 'oxygen saturation',
  'gcs': 'glasgow coma scale',
  'loc': 'level of consciousness',
  'avpu': 'alert verbal pain unresponsive',
  'perrla': 'pupils equal round reactive to light and accommodation',
  'rom': 'range of motion',
  'bgl': 'blood glucose level',
  'bs': 'blood sugar',

  // Cardiac
  'vf': 'ventricular fibrillation',
  'vfib': 'ventricular fibrillation',
  'vtach': 'ventricular tachycardia',
  'vt': 'ventricular tachycardia',
  'svt': 'supraventricular tachycardia',
  'afib': 'atrial fibrillation',
  'aflutter': 'atrial flutter',
  'pea': 'pulseless electrical activity',
  'asystole': 'asystole',
  'rosc': 'return of spontaneous circulation',
  'stemi': 'st elevation myocardial infarction',
  'nstemi': 'non st elevation myocardial infarction',
  'mi': 'myocardial infarction',
  'acs': 'acute coronary syndrome',
  'chf': 'congestive heart failure',
  'htn': 'hypertension',
  'ekg': 'electrocardiogram',
  'ecg': 'electrocardiogram',
  'cpr': 'cardiopulmonary resuscitation',
  'aed': 'automated external defibrillator',
  'defib': 'defibrillation',
  'cardiovert': 'cardioversion',
  'pacing': 'transcutaneous pacing',
  'tcp': 'transcutaneous pacing',

  // Respiratory
  'sob': 'shortness of breath',
  'dyspnea': 'difficulty breathing',
  'copd': 'chronic obstructive pulmonary disease',
  'pe': 'pulmonary embolism',
  'pneumo': 'pneumothorax',
  'ptx': 'pneumothorax',
  'hemoptysis': 'coughing up blood',
  'bvm': 'bag valve mask',
  'nrb': 'non rebreather mask',
  'nc': 'nasal cannula',
  'cpap': 'continuous positive airway pressure',
  'bipap': 'bilevel positive airway pressure',
  'ett': 'endotracheal tube',
  'eti': 'endotracheal intubation',
  'rsi': 'rapid sequence intubation',
  'bls': 'basic life support',
  'als': 'advanced life support',
  'opa': 'oropharyngeal airway',
  'npa': 'nasopharyngeal airway',
  'lma': 'laryngeal mask airway',
  'igel': 'i-gel supraglottic airway',
  'king': 'king airway',

  // Neurological
  'cva': 'cerebrovascular accident stroke',
  'tia': 'transient ischemic attack',
  'sz': 'seizure',
  'szr': 'seizure',
  'tbi': 'traumatic brain injury',
  'icp': 'intracranial pressure',
  'ams': 'altered mental status',
  'etoh': 'alcohol intoxication',
  'od': 'overdose',

  // Trauma
  'mva': 'motor vehicle accident',
  'mvc': 'motor vehicle collision',
  'gsw': 'gunshot wound',
  'sw': 'stab wound',
  'fx': 'fracture',
  'lac': 'laceration',
  'avulsion': 'avulsion',
  'amputation': 'amputation',
  'tq': 'tourniquet',
  'c-spine': 'cervical spine',
  'tle': 'trauma life support',

  // Medications & Routes
  'iv': 'intravenous',
  'io': 'intraosseous',
  'im': 'intramuscular',
  'sq': 'subcutaneous',
  'subq': 'subcutaneous',
  'sl': 'sublingual',
  'po': 'by mouth oral',
  'pr': 'per rectum',
  'in': 'intranasal',
  'et': 'endotracheal',
  'nebs': 'nebulizer',
  'neb': 'nebulizer',
  'epi': 'epinephrine',
  'epipen': 'epinephrine auto injector',
  'ntg': 'nitroglycerin',
  'nitro': 'nitroglycerin',
  'asa': 'aspirin',
  'narcan': 'naloxone',
  'benadryl': 'diphenhydramine',
  'versed': 'midazolam',
  'ativan': 'lorazepam',
  'valium': 'diazepam',
  'dextrose': 'dextrose glucose',
  'd50': 'dextrose 50 percent',
  'd10': 'dextrose 10 percent',
  'mag': 'magnesium sulfate',
  'bicarb': 'sodium bicarbonate',
  'lido': 'lidocaine',
  'amio': 'amiodarone',
  'adenosine': 'adenosine',
  'fentanyl': 'fentanyl',
  'morphine': 'morphine',
  'zofran': 'ondansetron',
  'phenergan': 'promethazine',
  'ketamine': 'ketamine',
  'etomidate': 'etomidate',
  'roc': 'rocuronium',
  'succ': 'succinylcholine',
  'vec': 'vecuronium',
  'txa': 'tranexamic acid',

  // Patient Types
  'peds': 'pediatric',
  'ped': 'pediatric',
  'pedi': 'pediatric',
  'neo': 'neonate neonatal',
  'geri': 'geriatric',
  'ob': 'obstetric pregnant',
  'obgyn': 'obstetric gynecologic',
  'preg': 'pregnant pregnancy',
  'pt': 'patient',
  'pts': 'patients',

  // Conditions
  'anaphylaxis': 'anaphylaxis allergic reaction',
  'anaph': 'anaphylaxis allergic reaction',
  'allergic rxn': 'allergic reaction',
  'dka': 'diabetic ketoacidosis',
  'hypoglycemia': 'low blood sugar hypoglycemia',
  'hypo': 'hypoglycemia low blood sugar',
  'hyper': 'hyperglycemia high blood sugar',
  'sepsis': 'sepsis infection',
  'hypothermia': 'hypothermia cold exposure',
  'hyperthermia': 'hyperthermia heat stroke',
  'heat stroke': 'heat stroke hyperthermia',
  'cold exposure': 'hypothermia cold exposure',
  'drowning': 'drowning submersion',
  'electrocution': 'electrical injury electrocution',
  'burns': 'burn injury thermal',
  'chemical': 'chemical exposure hazmat',
  'toxic': 'toxic exposure poisoning',

  // Procedures
  'sync cardioversion': 'synchronized cardioversion',
  'intubation': 'endotracheal intubation',
  'needle decompression': 'needle thoracostomy',
  'chest decompression': 'needle thoracostomy',
  'cricothyrotomy': 'surgical airway cricothyrotomy',
  'cric': 'surgical airway cricothyrotomy',
};

/**
 * Common typos and misspellings in rushed queries
 */
export const TYPO_CORRECTIONS: Record<string, string> = {
  // Common medical term typos
  'epinephrin': 'epinephrine',
  'epinepherine': 'epinephrine',
  'epenephrine': 'epinephrine',
  'nitroglycerine': 'nitroglycerin',
  'nitroglycerain': 'nitroglycerin',
  'defibralation': 'defibrillation',
  'defibrilation': 'defibrillation',
  'cariopulmonary': 'cardiopulmonary',
  'cardiopulmonery': 'cardiopulmonary',
  'ventrcular': 'ventricular',
  'ventricular': 'ventricular',
  'tachycarida': 'tachycardia',
  'tachycardia': 'tachycardia',
  'bradicardia': 'bradycardia',
  'bradycarida': 'bradycardia',
  'anaphylaxsis': 'anaphylaxis',
  'anaphylaxis': 'anaphylaxis',
  'siezure': 'seizure',
  'seizure': 'seizure',
  'seizures': 'seizure',
  'seziure': 'seizure',
  'intubaton': 'intubation',
  'intubatin': 'intubation',
  'pediatirc': 'pediatric',
  'pediatric': 'pediatric',
  'pediactric': 'pediatric',
  'hypoglycema': 'hypoglycemia',
  'hypoglycemia': 'hypoglycemia',
  'hyperglycema': 'hyperglycemia',
  'naloxon': 'naloxone',
  'noloxone': 'naloxone',
  'morphone': 'morphine',
  'morphin': 'morphine',
  'fentanil': 'fentanyl',
  'fentynl': 'fentanyl',
  'midazolom': 'midazolam',
  'lorazepan': 'lorazepam',
  'atropene': 'atropine',
  'adenosin': 'adenosine',
  'amiodarone': 'amiodarone',
  'amioderone': 'amiodarone',
  'lidocain': 'lidocaine',
};

// ============================================================================
// QUERY INTENT CLASSIFICATION
// ============================================================================

/**
 * Query intent types for routing and context
 */
export type QueryIntent =
  | 'medication_dosing'
  | 'procedure_steps'
  | 'assessment_criteria'
  | 'differential_diagnosis'
  | 'contraindication_check'
  | 'pediatric_specific'
  | 'protocol_lookup'
  | 'general_query';

/**
 * Intent classification patterns
 */
const INTENT_PATTERNS: { intent: QueryIntent; patterns: RegExp[] }[] = [
  {
    intent: 'medication_dosing',
    patterns: [
      /\b(?:dose|dosage|dosing|how much|mg|mcg|units?)\b/i,
      /\b(?:give|administer|push|drip|infusion)\b/i,
      /\bmax(?:imum)?\s*dose\b/i,
    ],
  },
  {
    intent: 'procedure_steps',
    patterns: [
      /\b(?:how to|steps|procedure|perform|technique)\b/i,
      /\b(?:intubate|intubation|defibrillate|cardiovert)\b/i,
      /\b(?:needle|cric|chest tube|io|iv)\s*(?:access|placement|insertion)\b/i,
    ],
  },
  {
    intent: 'assessment_criteria',
    patterns: [
      /\b(?:criteria|indications?|when to|signs?|symptoms?)\b/i,
      /\b(?:assess|assessment|evaluate|diagnosis)\b/i,
      /\b(?:gcs|nihss|cincinnati|fast|apgar)\b/i,
    ],
  },
  {
    intent: 'differential_diagnosis',
    patterns: [
      /\b(?:differential|ddx|versus|vs|compare|difference)\b/i,
      /\b(?:rule out|r\/o|could be|might be)\b/i,
    ],
  },
  {
    intent: 'contraindication_check',
    patterns: [
      /\b(?:contraindication|contraindicated|can't give|don't give)\b/i,
      /\b(?:avoid|caution|warning|precaution)\b/i,
      /\b(?:allergy|allergic|reaction)\b/i,
    ],
  },
  {
    intent: 'pediatric_specific',
    patterns: [
      /\b(?:peds?|pediatric|child|infant|neonate|newborn|baby)\b/i,
      /\b(?:broselow|weight.based|kg|kilogram)\b/i,
    ],
  },
  {
    intent: 'protocol_lookup',
    patterns: [
      /\b(?:protocol|policy|ref|reference)\s*(?:#|number|no\.?)?\s*\d+\b/i,
      /^\d{3,4}$/,
    ],
  },
];

// ============================================================================
// MAIN NORMALIZATION FUNCTIONS
// ============================================================================

export interface NormalizedQuery {
  original: string;
  normalized: string;
  expandedAbbreviations: string[];
  correctedTypos: string[];
  intent: QueryIntent;
  isComplex: boolean;
  extractedMedications: string[];
  extractedConditions: string[];
  isEmergent: boolean;
}

/**
 * Normalize an EMS query for optimal retrieval
 *
 * @param query - Raw query from field user
 * @returns Normalized query with metadata
 */
export function normalizeEmsQuery(query: string): NormalizedQuery {
  const original = query.trim();
  let normalized = original.toLowerCase();

  const expandedAbbreviations: string[] = [];
  const correctedTypos: string[] = [];

  // Step 1: Correct common typos
  for (const [typo, correction] of Object.entries(TYPO_CORRECTIONS)) {
    const regex = new RegExp(`\\b${escapeRegex(typo)}\\b`, 'gi');
    if (regex.test(normalized)) {
      normalized = normalized.replace(regex, correction);
      correctedTypos.push(`${typo} -> ${correction}`);
    }
  }

  // Step 2: Expand abbreviations (preserve original + add expanded)
  const words = normalized.split(/\s+/);
  const expandedWords: string[] = [];

  for (const word of words) {
    const cleanWord = word.replace(/[^a-z0-9]/g, '');
    const expansion = EMS_ABBREVIATIONS[cleanWord];

    if (expansion) {
      expandedWords.push(word); // Keep original
      expandedWords.push(expansion); // Add expansion
      expandedAbbreviations.push(`${cleanWord} -> ${expansion}`);
    } else {
      expandedWords.push(word);
    }
  }

  normalized = expandedWords.join(' ');

  // Step 3: Classify intent
  const intent = classifyIntent(normalized);

  // Step 4: Extract medical entities
  const extractedMedications = extractMedications(normalized);
  const extractedConditions = extractConditions(normalized);

  // Step 5: Determine complexity (for model routing)
  const isComplex = determineComplexity(normalized, intent);

  // Step 6: Check for emergent indicators
  const isEmergent = checkEmergentIndicators(normalized);

  return {
    original,
    normalized,
    expandedAbbreviations,
    correctedTypos,
    intent,
    isComplex,
    extractedMedications,
    extractedConditions,
    isEmergent,
  };
}

/**
 * Classify query intent for routing
 */
function classifyIntent(query: string): QueryIntent {
  for (const { intent, patterns } of INTENT_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(query)) {
        return intent;
      }
    }
  }
  return 'general_query';
}

/**
 * Extract medication names from query
 */
function extractMedications(query: string): string[] {
  const medicationPatterns = [
    'epinephrine', 'atropine', 'amiodarone', 'lidocaine', 'adenosine',
    'nitroglycerin', 'aspirin', 'morphine', 'fentanyl', 'ketamine',
    'midazolam', 'lorazepam', 'diazepam', 'naloxone', 'dextrose',
    'magnesium', 'calcium', 'sodium bicarbonate', 'albuterol',
    'diphenhydramine', 'ondansetron', 'promethazine', 'etomidate',
    'rocuronium', 'succinylcholine', 'vecuronium', 'dopamine',
    'norepinephrine', 'vasopressin', 'tranexamic acid',
  ];

  const found: string[] = [];
  for (const med of medicationPatterns) {
    if (query.includes(med)) {
      found.push(med);
    }
  }
  return found;
}

/**
 * Extract medical conditions from query
 */
function extractConditions(query: string): string[] {
  const conditionPatterns = [
    'cardiac arrest', 'ventricular fibrillation', 'ventricular tachycardia',
    'asystole', 'pulseless electrical activity', 'myocardial infarction',
    'stroke', 'seizure', 'anaphylaxis', 'hypoglycemia', 'hyperglycemia',
    'diabetic ketoacidosis', 'sepsis', 'pneumothorax', 'pulmonary embolism',
    'overdose', 'trauma', 'burn', 'hypothermia', 'hyperthermia',
    'respiratory distress', 'asthma', 'copd', 'congestive heart failure',
    'allergic reaction', 'childbirth', 'delivery', 'hemorrhage',
  ];

  const found: string[] = [];
  for (const condition of conditionPatterns) {
    if (query.includes(condition)) {
      found.push(condition);
    }
  }
  return found;
}

/**
 * Determine if query is complex (needs Sonnet vs Haiku)
 */
function determineComplexity(query: string, intent: QueryIntent): boolean {
  // Complex intents always use Sonnet
  if (['differential_diagnosis', 'contraindication_check'].includes(intent)) {
    return true;
  }

  // Multiple conditions/medications = complex
  const medications = extractMedications(query);
  const conditions = extractConditions(query);

  if (medications.length > 1 || conditions.length > 1) {
    return true;
  }

  // Pediatric + medication = complex (weight-based dosing)
  if (intent === 'pediatric_specific' && medications.length > 0) {
    return true;
  }

  // Long queries with multiple concepts
  const wordCount = query.split(/\s+/).length;
  if (wordCount > 15) {
    return true;
  }

  return false;
}

/**
 * Check for emergent/critical situation indicators
 */
function checkEmergentIndicators(query: string): boolean {
  const emergentPatterns = [
    /\b(?:cardiac arrest|code|coding|pulseless|apneic)\b/i,
    /\b(?:anaphylaxis|anaphylactic)\b/i,
    /\b(?:status epilepticus|continuous seizure)\b/i,
    /\b(?:massive hemorrhage|exsanguinating)\b/i,
    /\b(?:tension pneumothorax|sucking chest)\b/i,
    /\b(?:choking|airway obstruction|can't breathe)\b/i,
    /\b(?:unresponsive|unconscious)\b/i,
  ];

  return emergentPatterns.some(pattern => pattern.test(query));
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// QUERY ENHANCEMENT FOR RETRIEVAL
// ============================================================================

/**
 * Generate enhanced query variations for better retrieval
 * Creates semantic variations to improve recall
 */
export function generateQueryVariations(query: string): string[] {
  const normalized = normalizeEmsQuery(query);
  const variations: string[] = [normalized.normalized];

  // Add condition-focused variation
  if (normalized.extractedConditions.length > 0) {
    variations.push(`${normalized.extractedConditions.join(' ')} protocol treatment`);
  }

  // Add medication-focused variation
  if (normalized.extractedMedications.length > 0) {
    variations.push(`${normalized.extractedMedications.join(' ')} dosage indication route`);
  }

  // Add intent-specific enhancement
  switch (normalized.intent) {
    case 'medication_dosing':
      variations.push(`${normalized.normalized} dose mg route administration`);
      break;
    case 'procedure_steps':
      variations.push(`${normalized.normalized} steps procedure technique how to`);
      break;
    case 'pediatric_specific':
      variations.push(`${normalized.normalized} pediatric child weight based kg`);
      break;
    case 'contraindication_check':
      variations.push(`${normalized.normalized} contraindication caution warning avoid`);
      break;
  }

  return Array.from(new Set(variations)); // Deduplicate
}

/**
 * Build optimized search query for vector retrieval
 * Balances recall and precision
 */
export function buildSearchQuery(query: string): {
  primaryQuery: string;
  fallbackQueries: string[];
  filters: Record<string, unknown>;
} {
  const normalized = normalizeEmsQuery(query);

  // Primary query uses full normalized + expanded form
  const primaryQuery = normalized.normalized;

  // Fallback queries for lower similarity matches
  const fallbackQueries = generateQueryVariations(query).slice(1);

  // Build filters based on extracted metadata
  const filters: Record<string, unknown> = {};

  if (normalized.intent === 'pediatric_specific') {
    filters.content_type = 'pediatric';
  }

  return {
    primaryQuery,
    fallbackQueries,
    filters,
  };
}
