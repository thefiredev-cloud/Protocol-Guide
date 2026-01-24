/**
 * California LEMSA Parsing Configurations
 *
 * Per-LEMSA parsing rules for different protocol formats.
 * California has 33 LEMSAs with varying protocol structures.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface LEMSAConfig {
  name: string;
  counties: string[];
  protocolUrl: string;
  protocolType: 'pdf' | 'web' | 'acidremap';
  population: number;
  priority: 1 | 2 | 3;  // 1 = highest (by population)
  parsingRules: ParsingRules;
}

export interface ParsingRules {
  // Protocol number extraction pattern
  protocolNumberPattern: RegExp;
  // Title extraction pattern
  titlePattern: RegExp | null;
  // Section detection keywords
  sectionKeywords: string[];
  // Whether protocols are split by page
  splitByPage: boolean;
  // Custom transformations
  numberTransform?: (num: string) => string;
  titleTransform?: (title: string, num: string) => string;
}

// ============================================================================
// DEFAULT PARSING RULES
// ============================================================================

export const DEFAULT_PARSING_RULES: ParsingRules = {
  protocolNumberPattern: /(?:Protocol|P|Ref|TP|MCG)\s*[#:]?\s*(\d+[\.\-]?\d*)/i,
  titlePattern: null,
  sectionKeywords: ['Cardiac', 'Respiratory', 'Trauma', 'Medical', 'Pediatric'],
  splitByPage: true,
};

// ============================================================================
// TIER 1 LEMSAS (60% of CA population)
// ============================================================================

export const TIER1_LEMSAS: LEMSAConfig[] = [
  {
    name: 'Los Angeles County EMS Agency',
    counties: ['Los Angeles'],
    protocolUrl: 'https://dhs.lacounty.gov/emergency-medical-services/ems-protocols/',
    protocolType: 'pdf',
    population: 10014009,
    priority: 1,
    parsingRules: {
      protocolNumberPattern: /(?:REFERENCE|Ref\.?)\s*NO\.?\s*:?\s*(\d+\s*\d*\.?\d*)/i,
      titlePattern: /Medical\s*Control\s*Guideline\s*:?\s*([A-Z][A-Z\s\-–—\.]+)/i,
      sectionKeywords: [
        'Trauma', 'Cardiac', 'Respiratory', 'Neurological',
        'OB/GYN', 'Pediatric', 'Toxicology', 'Behavioral'
      ],
      splitByPage: true,
      numberTransform: (num: string) => num.replace(/\s+/g, ''),
      titleTransform: (title: string, num: string) => {
        const prefix = num.startsWith('1') ? 'TP' : 'Ref';
        return `${prefix} ${num} - ${title}`;
      },
    },
  },
  {
    name: 'San Diego County EMS',
    counties: ['San Diego'],
    protocolUrl: 'https://www.sandiegocounty.gov/hhsa/programs/phs/emergency_medical_services/policies_and_procedures.html',
    protocolType: 'pdf',
    population: 3338330,
    priority: 1,
    parsingRules: {
      protocolNumberPattern: /Policy\s*(\d+[\.\-]?\d*)/i,
      titlePattern: /Policy\s*\d+[\.\-]?\d*\s*[-:]\s*(.+)/i,
      sectionKeywords: ['Clinical', 'Administrative', 'Operational'],
      splitByPage: true,
    },
  },
  {
    name: 'Orange County EMS Agency',
    counties: ['Orange'],
    protocolUrl: 'https://www.ochealthinfo.com/about-hca/public-health-services/ems/ems-guidelines',
    protocolType: 'web',
    population: 3186989,
    priority: 1,
    parsingRules: {
      protocolNumberPattern: /(?:OC)?-?(\d{3,4})/i,
      titlePattern: /(\d{3,4})\s*[-–]\s*(.+)/i,
      sectionKeywords: ['Adult', 'Pediatric', 'OB', 'Cardiac', 'Trauma'],
      splitByPage: false,
    },
  },
  {
    name: 'Riverside County EMS Agency',
    counties: ['Riverside'],
    protocolUrl: 'https://www.rivcoems.org/Portals/0/REMSA/Policy%20Manual.pdf',
    protocolType: 'pdf',
    population: 2470546,
    priority: 1,
    parsingRules: {
      protocolNumberPattern: /Policy\s*#?\s*(\d+[\.\-]?\d*)/i,
      titlePattern: null,
      sectionKeywords: ['Treatment', 'Administrative', 'Operational'],
      splitByPage: true,
    },
  },
  {
    name: 'Inland Counties Emergency Medical Agency',
    counties: ['Inyo', 'Mono', 'San Bernardino'],
    protocolUrl: 'https://www.icema.net/policies-procedures/treatment-protocols',
    protocolType: 'pdf',
    population: 2200000,
    priority: 1,
    parsingRules: {
      protocolNumberPattern: /ICEMA\s*#?\s*(\d+[\.\-]?\d*)/i,
      titlePattern: /ICEMA\s*#?\s*\d+[\.\-]?\d*\s*[-:]\s*(.+)/i,
      sectionKeywords: ['BLS', 'ALS', 'Specialty'],
      splitByPage: true,
    },
  },
];

// ============================================================================
// TIER 2 LEMSAS (25% of CA population)
// ============================================================================

export const TIER2_LEMSAS: LEMSAConfig[] = [
  {
    name: 'Santa Clara County EMS Agency',
    counties: ['Santa Clara'],
    protocolUrl: 'https://www.sccgov.org/sites/ems/providers/Pages/protocols.aspx',
    protocolType: 'pdf',
    population: 1927470,
    priority: 2,
    parsingRules: {
      protocolNumberPattern: /Protocol\s*(\d+[\.\-]?\d*)/i,
      titlePattern: null,
      sectionKeywords: ['Adult', 'Pediatric', 'General'],
      splitByPage: true,
    },
  },
  {
    name: 'Sacramento County EMS Agency',
    counties: ['Sacramento'],
    protocolUrl: 'https://www.emsa.saccounty.gov/Pages/Protocols.aspx',
    protocolType: 'pdf',
    population: 1552058,
    priority: 2,
    parsingRules: {
      protocolNumberPattern: /(\d{3,4})/,
      titlePattern: null,
      sectionKeywords: ['Medical', 'Trauma', 'Cardiac', 'Pediatric'],
      splitByPage: true,
    },
  },
  {
    name: 'Alameda County EMS Agency',
    counties: ['Alameda'],
    protocolUrl: 'https://ems.acgov.org/providers/policies-and-procedures.page',
    protocolType: 'web',
    population: 1682353,
    priority: 2,
    parsingRules: {
      protocolNumberPattern: /Policy\s*(\d+[\.\-]?\d*)/i,
      titlePattern: null,
      sectionKeywords: ['Clinical', 'Administrative'],
      splitByPage: false,
    },
  },
  {
    name: 'Contra Costa County EMS',
    counties: ['Contra Costa'],
    protocolUrl: 'https://portal.acidremap.com/sites/ContraCostaCountyEMS/',
    protocolType: 'acidremap',
    population: 1165927,
    priority: 2,
    parsingRules: {
      protocolNumberPattern: /(\d{3,4})/,
      titlePattern: null,
      sectionKeywords: ['Medical', 'Trauma', 'Pediatric'],
      splitByPage: false,
    },
  },
  {
    name: 'San Francisco EMS Agency',
    counties: ['San Francisco'],
    protocolUrl: 'https://www.sf-fire.org/protocols',
    protocolType: 'pdf',
    population: 874961,
    priority: 2,
    parsingRules: {
      protocolNumberPattern: /Protocol\s*(\d+[\.\-]?\d*)/i,
      titlePattern: null,
      sectionKeywords: ['Adult', 'Pediatric', 'OB'],
      splitByPage: true,
    },
  },
];

// ============================================================================
// TIER 3 LEMSAS (15% of CA population)
// ============================================================================

export const TIER3_LEMSAS: LEMSAConfig[] = [
  {
    name: 'Central California EMS Agency',
    counties: ['Fresno', 'Kings', 'Madera', 'Tulare'],
    protocolUrl: 'https://www.centralcalems.com/protocols',
    protocolType: 'pdf',
    population: 1891000,
    priority: 3,
    parsingRules: DEFAULT_PARSING_RULES,
  },
  {
    name: 'Northern California EMS Inc',
    counties: ['Butte', 'Colusa', 'Glenn', 'Lassen', 'Modoc', 'Plumas', 'Shasta', 'Siskiyou', 'Tehama', 'Trinity'],
    protocolUrl: 'https://www.norcalems.net/protocols',
    protocolType: 'pdf',
    population: 600000,
    priority: 3,
    parsingRules: DEFAULT_PARSING_RULES,
  },
  {
    name: 'Sierra-Sacramento Valley EMS Agency',
    counties: ['Nevada', 'Placer', 'Sierra', 'Sutter', 'Yuba'],
    protocolUrl: 'https://www.ssvems.com/protocols',
    protocolType: 'pdf',
    population: 550000,
    priority: 3,
    parsingRules: DEFAULT_PARSING_RULES,
  },
  {
    name: 'Kern County EMS',
    counties: ['Kern'],
    protocolUrl: 'https://kernpublichealth.com/ems-protocols/',
    protocolType: 'pdf',
    population: 909235,
    priority: 3,
    parsingRules: DEFAULT_PARSING_RULES,
  },
  {
    name: 'Ventura County EMS Agency',
    counties: ['Ventura'],
    protocolUrl: 'https://www.vcemsa.com/protocols',
    protocolType: 'pdf',
    population: 843843,
    priority: 3,
    parsingRules: DEFAULT_PARSING_RULES,
  },
];

// ============================================================================
// COMBINED EXPORTS
// ============================================================================

export const ALL_LEMSAS: LEMSAConfig[] = [
  ...TIER1_LEMSAS,
  ...TIER2_LEMSAS,
  ...TIER3_LEMSAS,
];

export function getLEMSAByCounty(countyName: string): LEMSAConfig | undefined {
  return ALL_LEMSAS.find(lemsa =>
    lemsa.counties.some(c =>
      c.toLowerCase() === countyName.toLowerCase() ||
      `${c} County`.toLowerCase() === countyName.toLowerCase()
    )
  );
}

export function getLEMSAByName(name: string): LEMSAConfig | undefined {
  return ALL_LEMSAS.find(lemsa =>
    lemsa.name.toLowerCase().includes(name.toLowerCase())
  );
}

export function getLEMSAsByPriority(priority: 1 | 2 | 3): LEMSAConfig[] {
  return ALL_LEMSAS.filter(lemsa => lemsa.priority === priority);
}

// ============================================================================
// CALIFORNIA STATE TOTALS
// ============================================================================

export const CA_STATS = {
  totalLEMSAs: ALL_LEMSAS.length,
  totalCounties: ALL_LEMSAS.reduce((acc, l) => acc + l.counties.length, 0),
  totalPopulation: ALL_LEMSAS.reduce((acc, l) => acc + l.population, 0),
  tier1Population: TIER1_LEMSAS.reduce((acc, l) => acc + l.population, 0),
  tier2Population: TIER2_LEMSAS.reduce((acc, l) => acc + l.population, 0),
  tier3Population: TIER3_LEMSAS.reduce((acc, l) => acc + l.population, 0),
};
