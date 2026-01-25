/**
 * LA County Protocol Data Corrections - Direct Supabase Insert
 *
 * This script adds missing critical protocols directly to Supabase
 * with embeddings generated via Voyage AI.
 *
 * Run with: npx tsx scripts/fix-la-county-protocols-supabase.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!VOYAGE_API_KEY) {
  console.error('Missing VOYAGE_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const LA_COUNTY_AGENCY_NAME = 'Los Angeles County EMS Agency';
const STATE_CODE = 'CA';
const STATE_NAME = 'California';

// ============================================================================
// CRITICAL PROTOCOLS TO ADD
// ============================================================================

const CRITICAL_PROTOCOLS = [
  // Ref 506 - Trauma Triage with PMC Criteria
  {
    protocolNumber: "506",
    protocolTitle: "Ref 506 - Trauma Triage / Pediatric Medical Center (PMC) Criteria",
    section: "Trauma",
    sourcePdfUrl: "https://file.lacounty.gov/SDSInter/dhs/206332_Ref.No.506_TraumaTriage.pdf",
    protocolYear: 2024,
    content: `REFERENCE NO. 506 - TRAUMA TRIAGE / PEDIATRIC MEDICAL CENTER (PMC) CRITERIA

SECTION I: TRAUMA CENTER DESIGNATION

Level I Trauma Centers:
• LA General Medical Center (LA+USC)
• Harbor-UCLA Medical Center
• Cedars-Sinai Medical Center
• UCLA Ronald Reagan Medical Center

Level II Trauma Centers:
• Long Beach Memorial
• Torrance Memorial
• Providence Holy Cross
• And others per LA County EMS Agency designation

PEDIATRIC TRAUMA CENTERS (PTC):
• Children's Hospital Los Angeles (CHLA)
• Harbor-UCLA Medical Center (Pediatric)
• LA General Medical Center (Pediatric)

=== PEDIATRIC MEDICAL CENTER (PMC) TRANSPORT CRITERIA ===

PMC CRITERIA - Transport pediatric trauma patients to a Pediatric Trauma Center (PTC) when ANY of the following are present:

AGE CRITERIA:
• Age <14 years with major trauma
• Pediatric patients meeting adult trauma center criteria

PHYSIOLOGIC CRITERIA (PMC):
• Pediatric Trauma Score (PTS) ≤8
• Glasgow Coma Score (GCS) ≤13
• Systolic BP <70 + (2 × age in years)
• Respiratory distress or need for assisted ventilation

ANATOMIC CRITERIA (PMC):
• Penetrating injury to head, neck, chest, abdomen, or groin
• Open skull fracture or depressed skull fracture
• Flail chest
• Two or more proximal long bone fractures (femur, humerus)
• Pelvic fracture
• Limb paralysis (spinal cord injury)
• Amputation proximal to wrist or ankle
• Burns >15% BSA or involving face/airway

MECHANISM OF INJURY (PMC):
• High-speed MVC (>40 mph impact, >20 mph if unrestrained)
• Ejection from vehicle
• Death of occupant in same vehicle
• Pedestrian/cyclist struck by vehicle
• Falls >10 feet (or 2-3x child's height)
• Significant intrusion into passenger compartment

SPECIAL PEDIATRIC CONSIDERATIONS:
• Children compensate longer then decompensate rapidly
• Tachycardia may be only early sign of shock
• Hypotension is a LATE and ominous sign in children
• Lower threshold for PTC transport in children

Provider Impressions: TRAM, TRAS, MULT, HEAD, ARTR

Cross-Reference: TP 1243 (Traumatic Arrest), TP 1244 (Traumatic Injury), Ref 814 (Determination of Death)`
  },

  // Ref 814 - Determination of Death
  {
    protocolNumber: "814",
    protocolTitle: "Ref 814 - Determination/Pronouncement of Death in the Field",
    section: "Administrative",
    sourcePdfUrl: "https://file.lacounty.gov/SDSInter/dhs/206332_Ref.No.814_DeterminationofDeath_06-21-16.pdf",
    protocolYear: 2024,
    content: `REFERENCE NO. 814 - DETERMINATION/PRONOUNCEMENT OF DEATH IN THE FIELD

SECTION I: FIELD DETERMINATION WITHOUT BASE HOSPITAL CONTACT

Death may be determined in the field WITHOUT Base Hospital contact when ANY of the following conditions are present:

OBVIOUS DEATH CRITERIA:
• Decapitation
• Massive crush injury to head and/or chest with no signs of life
• Penetrating or blunt injury with evisceration of heart, lung, or brain
• Decomposition
• Incineration (total body charring)
• Rigor mortis and/or post-mortem lividity (livor mortis)

TRAUMA CRITERIA (without Base contact):
• Pulseless, non-breathing victims with extrication time >15 minutes where resuscitation is not possible during extrication
• Penetrating trauma patients found apneic, pulseless, and asystolic WITHOUT pupillary reflexes
• Blunt trauma patients found apneic and pulseless WITHOUT organized ECG rhythm

SPECIAL CIRCUMSTANCES:
• Multiple casualty incidents with insufficient resources for all potentially viable patients (triage considerations)
• Drowning victims with submersion time >1 hour in non-cold water

ASSESSMENT REQUIREMENTS WHEN RIGOR MORTIS/LIVIDITY PRESENT:
1. Ensure open airway
2. Look, listen, and feel for respirations - auscultate lungs for minimum 30 seconds
3. Auscultate apical pulse for minimum 60 seconds
4. Palpate carotid pulse (or brachial pulse in infants) for minimum 60 seconds
5. Check for fixed and dilated pupils

SECTION II: NON-TRAUMATIC CARDIAC ARREST - 20-MINUTE RULE

Patient may be determined dead in the field after 20 minutes of quality CPR if ALL of the following criteria are met:
• Patient is ≥18 years old
• Arrest was NOT witnessed by EMS personnel
• No shockable rhythm identified at any time during resuscitation (persistent asystole)
• No return of spontaneous circulation (ROSC) at any time
• No suspected hypothermia
• Quality CPR has been confirmed (ETCO2 monitoring when available)

SECTION III: BASE HOSPITAL CONTACT REQUIRED

Contact Base Hospital for medical direction in the following circumstances:
• Any situation NOT meeting the above criteria
• Pediatric patients (<18 years) not meeting Section I obvious death criteria
• Questionable viability decisions
• Family or scene circumstances requiring medical direction support
• Suspected DNR/POLST validity questions

DOCUMENTATION:
• Document all assessment findings
• Record time of death determination
• Note criteria met for field determination
• Document any family notification
• Complete required county death documentation forms

Provider Impression: DEAD - DOA/Obvious Death`
  },

  // Ref 817 - HERT
  {
    protocolNumber: "817",
    protocolTitle: "Ref 817 - Hospital Emergency Response Team (HERT)",
    section: "Special Operations",
    sourcePdfUrl: "https://dhs.lacounty.gov/hospital-emergency-hert-training/",
    protocolYear: 2024,
    content: `REFERENCE NO. 817 - HOSPITAL EMERGENCY RESPONSE TEAM (HERT)

PURPOSE:
The Hospital Emergency Response Team (HERT) provides physician-level trauma and surgical expertise at the scene for patients with critical injuries requiring advanced intervention beyond paramedic scope of practice.

HERT TEAM COMPOSITION:
• Trauma surgeon or emergency physician
• Trauma nurse or critical care RN
• Specialized equipment for field surgical intervention
• Blood products when indicated

HERT BASE HOSPITALS:
• LA General Medical Center (LA+USC) - Level I Trauma Center
• Harbor-UCLA Medical Center - Level I Trauma Center
• Available 24 hours/day, 7 days/week

HERT ACTIVATION CRITERIA:
Contact Base Hospital to request HERT activation for:

1. CRUSH INJURIES with prolonged entrapment (>60 minutes anticipated) where patient is viable
2. TRAUMATIC AMPUTATIONS - Multiple amputations or complex traumatic amputations requiring field surgical decision-making
3. FIELD SURGICAL INTERVENTION - Patients requiring advanced hemorrhage control or surgical airway beyond paramedic capability
4. MASS CASUALTY INCIDENTS with critical patients requiring physician-level medical direction on scene
5. EXTREME ENTRAPMENT where field amputation may be life-saving

HERT CAPABILITIES:
• Field amputation for entrapped limbs (life over limb decisions)
• Advanced hemorrhage control including surgical techniques
• Field thoracotomy (rare, extreme circumstances only)
• Advanced airway management including surgical airway
• Blood product administration in the field
• Physician-level medical direction and decision-making on scene
• Sedation and analgesia beyond paramedic protocols

RESPONSE COORDINATION:
• HERT is dispatched via Base Hospital request only
• Typical response time: 20-45 minutes depending on location and traffic
• Fire Department and Base Hospital coordinate landing zone if helicopter transport indicated
• Continue standard trauma care protocols while awaiting HERT arrival
• Maintain scene safety and establish clear access for HERT personnel

DOCUMENTATION:
• Document HERT request time
• Document HERT arrival time
• Document all physician interventions performed
• Obtain physician signature on PCR when possible

Cross-Reference: TP 1242 (Crush Injury), TP 1243 (Traumatic Arrest), Ref 506 (Trauma Triage)`
  },

  // TP 1215 - Childbirth with Gestational Age
  {
    protocolNumber: "1215",
    protocolTitle: "TP 1215 - Childbirth (Mother) / Gestational Age Considerations",
    section: "OB/GYN",
    sourcePdfUrl: "https://file.lacounty.gov/SDSInter/dhs/1040599_1215Childbirth.pdf",
    protocolYear: 2024,
    content: `TREATMENT PROTOCOL 1215 - CHILDBIRTH (MOTHER) / GESTATIONAL AGE CONSIDERATIONS

=== GESTATIONAL AGE ASSESSMENT ===

Estimating gestational age is critical for determining transport destination and anticipated complications.

GESTATIONAL AGE DETERMINATION:
• Ask mother about due date and weeks pregnant
• Fundal height: Umbilicus = ~20 weeks; Xiphoid = ~36 weeks
• If unknown, assume term pregnancy and prepare for delivery

=== GESTATIONAL AGE CATEGORIES AND TRANSPORT CRITERIA ===

PREVIABLE (<24 WEEKS):
• Extremely preterm, survival unlikely outside specialized NICU
• Provide supportive care to mother
• Transport to nearest appropriate facility
• Base Hospital contact for guidance
• Focus on maternal stabilization

EXTREMELY PRETERM (24-28 WEEKS):
• High-risk delivery requiring Level III NICU
• TRANSPORT TO HOSPITAL WITH NICU LEVEL III:
  - LA General Medical Center
  - Cedars-Sinai Medical Center
  - UCLA Ronald Reagan Medical Center
  - Children's Hospital Los Angeles (for complications)
• Contact Base Hospital immediately
• Prepare for possible resuscitation of extremely premature infant

VERY PRETERM (28-32 WEEKS):
• Preterm delivery with significant risks
• TRANSPORT TO HOSPITAL WITH NICU LEVEL II OR III
• Infant will likely require NICU admission
• Prepare for neonatal resuscitation
• May need surfactant therapy

MODERATE/LATE PRETERM (32-37 WEEKS):
• "Pregnancy of 32 weeks" or "Pregnancy under 32 weeks" - see above categories
• 32-34 weeks: Still requires NICU capability
• 34-37 weeks: May deliver at facility with Level II nursery
• Transport to hospital with appropriate neonatal care level
• Higher risk than term but better outcomes than earlier preterm

TERM (37-42 WEEKS):
• Full-term delivery expected
• Transport to nearest Labor & Delivery unit
• Standard delivery precautions

POST-TERM (>42 WEEKS):
• Increased risk of complications
• Larger baby, potential shoulder dystocia
• Meconium aspiration risk
• Transport to facility with OB capability

Provider Impressions: LABR, PREG, OBGY

Cross-Reference: TP 1216 (Childbirth - Newborn), TP 1217 (Pregnancy Complication), TP 1218 (Pregnancy Labor)`
  },

  // Pediatric Sodium Bicarbonate Dosing
  {
    protocolNumber: "1210-PEDS-BICARB",
    protocolTitle: "Pediatric Medication Dosing - Sodium Bicarbonate",
    section: "Pediatric",
    sourcePdfUrl: "https://file.lacounty.gov/SDSInter/dhs/1075386_LACountyTreatmentProtocols.pdf",
    protocolYear: 2024,
    content: `SODIUM BICARBONATE - PEDIATRIC DOSING

INDICATIONS:
• Cardiac arrest (after initial resuscitation efforts)
• Severe metabolic acidosis with pH <7.1
• Hyperkalemia with ECG changes
• Tricyclic antidepressant overdose
• Sodium channel blocker toxicity

DOSING:
• Dose: 1 mEq/kg IV/IO slow push
• Maximum single dose: 50 mEq
• May repeat per Base Hospital order

CONCENTRATION:
• Standard: 8.4% solution (1 mEq/mL = 84 mg/mL)
• For neonates/infants: Dilute 1:1 with NS (creates 4.2% solution, 0.5 mEq/mL)

ADMINISTRATION:
• Give IV/IO slow push over 1-2 minutes
• Flush IV/IO line before and after administration
• INCOMPATIBLE with calcium-containing solutions - use separate line or flush well
• INCOMPATIBLE with epinephrine, dopamine, and many other medications

PRECAUTIONS:
• Do NOT give via ETT (not effective, may cause injury)
• Ensure adequate ventilation before and during administration
• Monitor for extravasation (causes tissue necrosis)
• Hypertonic solution - use caution in dehydrated patients

WEIGHT-BASED REFERENCE:
• 5 kg patient: 5 mEq (5 mL of 8.4%)
• 10 kg patient: 10 mEq (10 mL of 8.4%)
• 20 kg patient: 20 mEq (20 mL of 8.4%)
• 30 kg patient: 30 mEq (30 mL of 8.4%)
• 40 kg patient: 40 mEq (40 mL of 8.4%)
• ≥50 kg patient: 50 mEq maximum (50 mL of 8.4%)

Cross-Reference: TP 1210 (Cardiac Arrest), TP 1242 (Crush Injury/Hyperkalemia), MCG 1309 (Pediatric Equipment Sizing)`
  },

  // TP 1335 - Needle Thoracostomy Enhanced
  {
    protocolNumber: "1335",
    protocolTitle: "TP 1335 - Needle Thoracostomy (Needle Decompression)",
    section: "Trauma",
    sourcePdfUrl: "https://file.lacounty.gov/SDSInter/dhs/1040599_1335-NeedleThoracostomy.pdf",
    protocolYear: 2024,
    content: `TREATMENT PROTOCOL 1335 - NEEDLE THORACOSTOMY (NEEDLE DECOMPRESSION)

INDICATIONS:
Suspected tension pneumothorax with ALL of the following:
• Significant respiratory distress AND
• Absent or markedly decreased breath sounds on affected side AND
• One or more of the following:
  - Tracheal deviation away from affected side
  - Jugular venous distension (JVD)
  - Hypotension/shock
  - Cyanosis
  - Cardiac arrest with suspected tension pneumothorax

CONTRAINDICATIONS:
• Simple pneumothorax without tension physiology
• Uncertainty about diagnosis (contact Base Hospital)
• Hemothorax alone (will not resolve with needle decompression)

ANATOMICAL LANDMARKS:
PRIMARY SITE: 2nd intercostal space (ICS), midclavicular line (MCL)
• Locate sternal notch, follow clavicle laterally to midpoint
• Identify 2nd rib (first palpable rib below clavicle)
• Insert ABOVE the 3rd rib (2nd intercostal space)

ALTERNATIVE SITE: 4th-5th intercostal space, anterior axillary line (AAL)
• May have better success in obese patients
• Identify nipple line (4th ICS in males)
• Insert at anterior axillary line

EQUIPMENT:
• 14-gauge angiocatheter
• Preferred length: 3.25 inch (8 cm) for adults
• Pediatric: Size based on patient (typically 1.5-3.25 inch)
• Alcohol/betadine prep
• Tape for securing catheter

PROCEDURE:
1. Identify anatomical landmarks (2nd ICS, MCL)
2. Prep insertion site with alcohol or betadine
3. Insert 14-gauge angiocatheter perpendicular to chest wall
4. Advance needle over SUPERIOR border of rib (3rd rib) to avoid neurovascular bundle
5. Listen/feel for rush of air (indicates successful decompression)
6. Advance catheter fully while removing needle
7. Leave catheter in place - do NOT remove
8. Secure catheter with tape, apply transparent dressing
9. Reassess breath sounds, vital signs, and clinical status

POST-PROCEDURE:
• If open chest wound present, apply vented chest seal (Asherman or equivalent)
• Monitor for recurrence of tension - may need repeat decompression
• Prepare for chest tube placement at hospital
• Transport to appropriate trauma center
• Consider bilateral decompression in cardiac arrest if indicated

PEDIATRIC CONSIDERATIONS:
• Use appropriate catheter length (typically 1.5-2.5 inch)
• Landmarks same as adult
• Lower threshold for Base Hospital contact

DOCUMENTATION:
• Document indication and clinical findings pre-procedure
• Record anatomical site used
• Note presence/absence of air rush
• Document post-procedure reassessment findings
• Record any complications

Provider Impressions: TRAM, TRAS, RARF, CANT, ARTR

Cross-Reference: TP 1243 (Traumatic Arrest), TP 1244 (Traumatic Injury), Ref 506 (Trauma Triage)`
  },

  // TP 1242 - Crush Injury Enhanced with HERT
  {
    protocolNumber: "1242",
    protocolTitle: "TP 1242 - Crush Injury / Crush Syndrome",
    section: "Trauma",
    sourcePdfUrl: "https://file.lacounty.gov/SDSInter/dhs/1040420_1242CrushInjury2018-04-25.pdf",
    protocolYear: 2024,
    content: `TREATMENT PROTOCOL 1242 - CRUSH INJURY / CRUSH SYNDROME

DEFINITION:
Crush injury occurs when body part is subjected to compression. Crush syndrome develops when compression is released, allowing rhabdomyolysis products (potassium, myoglobin, acids) to enter systemic circulation.

RISK FACTORS FOR CRUSH SYNDROME:
• Entrapment >1 hour (high risk)
• Entrapment >4-6 hours (very high risk)
• Large muscle mass involved (thigh, buttocks, trunk)
• Multiple extremities trapped

TREATMENT - WHILE ENTRAPPED:

ESTABLISH IV/IO ACCESS IMMEDIATELY:
• IV access remote from injured extremity
• Contact Base Hospital if unable to establish access

FLUID RESUSCITATION:
• Normal Saline 20 mL/kg IV/IO rapid infusion
• Repeat x1 (maximum 40 mL/kg or 2 liters before Base Hospital contact)
• Goal: Aggressive volume expansion BEFORE release

CARDIAC MONITORING:
Assess for hyperkalemia (elevated potassium from muscle breakdown):
• Peaked T waves
• Widened QRS complex
• Loss of P waves
• Sine wave pattern (pre-arrest)
• Bradycardia progressing to asystole

IF HYPERKALEMIA ECG CHANGES PRESENT:
1. CALCIUM CHLORIDE 10%: 20 mg/kg IV/IO slow push (max 1 gram)
   - Stabilizes cardiac membrane
   - May repeat x1 if ECG changes persist

2. SODIUM BICARBONATE: 1 mEq/kg IV/IO slow push
   - Shifts potassium intracellularly
   - May repeat x1

3. ALBUTEROL: 5 mg nebulized continuously
   - Additional potassium shifting
   - Continue until ECG normalizes

CONTACT BASE HOSPITAL FOR:
• Persistent ECG changes despite treatment
• Hemodynamic instability
• Entrapment >60 minutes with viable patient (HERT consideration)
• Field amputation consideration

=== HERT ACTIVATION (Ref 817) ===

Contact Base Hospital to request HERT (Hospital Emergency Response Team) for:
• Entrapment >60 minutes anticipated with viable patient
• Multiple victims with prolonged entrapment
• Consideration of field amputation (life over limb)
• Need for physician-level medical direction on scene

HERT TEAMS AVAILABLE:
• LA General Medical Center - Level I Trauma Center
• Harbor-UCLA Medical Center - Level I Trauma Center
• Response time: 20-45 minutes

Provider Impression: CRUS

Cross-Reference: Ref 817 (HERT), TP 1244 (Traumatic Injury), TP 1243 (Traumatic Arrest)`
  },

  // Provider Impression Codes
  {
    protocolNumber: "1200.3",
    protocolTitle: "TP 1200.3 - Provider Impression Codes",
    section: "Documentation",
    sourcePdfUrl: "https://dhs.lacounty.gov/emergency-medical-services-agency/home/resources-ems/prehospital-care-manual/",
    protocolYear: 2024,
    content: `TREATMENT PROTOCOL 1200.3 - PROVIDER IMPRESSION CODES

Provider impressions are 4-letter codes assigned after patient assessment to categorize the primary clinical presentation. Select the most appropriate code based on your assessment findings.

CARDIAC:
• ARNA - Cardiac Arrest (Asystole/PEA)
• ARNV - Cardiac Arrest (VF/VT - Shockable Rhythm)
• BRDY - Bradycardia (Symptomatic)
• CANT - Cardiac Arrest Non-Traumatic
• CHFF - Congestive Heart Failure / Pulmonary Edema
• CPMI - Chest Pain - STEMI (ST-Elevation MI)
• CPSC - Chest Pain - Suspected Cardiac
• SYNC - Syncope
• TACD - Tachycardia (Stable)
• TACS - Tachycardia (Unstable)

RESPIRATORY:
• ASTH - Asthma / Reactive Airway Disease
• CHOK - Airway Obstruction / Choking
• RARF - Respiratory Arrest / Respiratory Failure
• RESP - Respiratory Distress (General)
• SOBB - Respiratory Distress / Bronchospasm

NEUROLOGICAL:
• ALOC - Altered Level of Consciousness (not hypoglycemia/seizure)
• CVA - Stroke / TIA (Cerebrovascular Accident)
• SEIZ - Seizure

TRAUMA:
• ARTR - Traumatic Arrest
• BURN - Burns (Thermal, Chemical, Electrical)
• CRUS - Crush Injury
• ELEC - Electrical Injury
• FALL - Fall Injury
• HEAD - Head Injury / Traumatic Brain Injury
• MULT - Multi-System Trauma
• SPIN - Spinal Injury
• STAB - Stab / Penetrating Wound
• TRAF - Traffic Collision
• TRAM - Traumatic Injury (Minor)
• TRAS - Traumatic Injury (Serious)

MEDICAL:
• ABOP - Abdominal Pain / Problems
• ALRX - Allergic Reaction
• ANPH - Anaphylaxis
• BITE - Bite / Sting (Animal, Insect, Marine)
• DIAB - Diabetic Emergency (Hypoglycemia)
• ENVC - Environmental Emergency - Cold (Hypothermia)
• ENVH - Environmental Emergency - Heat (Hyperthermia)
• ETOH - Alcohol Intoxication
• FEVR - Fever
• GI-B - GI Bleed (Gastrointestinal Hemorrhage)
• HYGL - Hyperglycemia / DKA
• SEPT - Sepsis
• SICK - General Illness (Non-Specific)

TOXICOLOGY:
• AGDE - Agitated Delirium / Excited Delirium
• ODRU - Overdose / Ingestion - Known Drug
• ODUN - Overdose / Ingestion - Unknown Substance

OB/GYN:
• LABR - Pregnancy / Labor
• OBGY - OB/GYN Emergency
• PREG - Pregnancy Complications

OTHER:
• DEAD - DOA / Obvious Death
• DIAL - Dialysis Patient / Complication
• DROW - Drowning / Near Drowning
• ENTP - ENT / Dental Emergencies
• EXNT - Extremity Pain/Swelling (Non-Traumatic)
• EYEP - Eye Problem
• GUDO - Genitourinary Disorder
• HEMO - Hemorrhage (Non-Traumatic)
• NOBL - Epistaxis (Nosebleed)
• PEDI - Pediatric Medical (Non-Specific)
• PSYC - Psychiatric Emergency

SPECIAL SITUATIONS:

FISTULA/DIALYSIS ACCESS:
• Use provider impression: DIAL
• Assess fistula for active hemorrhage
• Apply direct pressure if bleeding
• Establish IV access REMOTE from fistula site
• Do NOT use fistula for IV access
• Do NOT apply tourniquet to fistula arm
• Transport for evaluation - do not release on scene

DOCUMENTATION REQUIREMENTS:
• Select ONE primary provider impression
• Provider impression drives protocol selection
• Document secondary findings in narrative
• Update impression if assessment changes en route`
  }
];

// ============================================================================
// EMBEDDING GENERATION
// ============================================================================

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VOYAGE_API_KEY}`
    },
    body: JSON.stringify({
      model: 'voyage-large-2',
      input: text.substring(0, 8000),
      input_type: 'document'
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Voyage API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log("=".repeat(70));
  console.log("LA COUNTY PROTOCOL DATA CORRECTIONS - DIRECT SUPABASE");
  console.log("=".repeat(70));
  console.log(`\nAgency: ${LA_COUNTY_AGENCY_NAME}`);
  console.log(`Protocols to add: ${CRITICAL_PROTOCOLS.length}`);

  // Get existing agency_id from LA County protocols
  console.log("\n1. Finding existing LA County agency_id...");
  const { data: existingProtocols } = await supabase
    .from('manus_protocol_chunks')
    .select('agency_id')
    .eq('agency_name', LA_COUNTY_AGENCY_NAME)
    .not('agency_id', 'is', null)
    .limit(1);

  const agencyId = existingProtocols?.[0]?.agency_id || null;
  console.log(`   agency_id: ${agencyId || 'will use denormalized columns'}`);

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  console.log("\n2. Processing protocols...\n");

  for (const protocol of CRITICAL_PROTOCOLS) {
    try {
      process.stdout.write(`   ${protocol.protocolNumber}: `);

      // Check if protocol already exists
      const { data: existing } = await supabase
        .from('manus_protocol_chunks')
        .select('id')
        .eq('agency_name', LA_COUNTY_AGENCY_NAME)
        .eq('protocol_number', protocol.protocolNumber)
        .limit(1);

      // Generate embedding
      const textForEmbedding = [
        protocol.protocolTitle,
        protocol.section,
        protocol.content
      ].join('\n');

      const embedding = await generateEmbedding(textForEmbedding);

      const record: Record<string, unknown> = {
        protocol_number: protocol.protocolNumber,
        protocol_title: protocol.protocolTitle,
        section: protocol.section,
        content: protocol.content,
        source_pdf_url: protocol.sourcePdfUrl,
        protocol_year: protocol.protocolYear,
        embedding,
        agency_name: LA_COUNTY_AGENCY_NAME,
        state_code: STATE_CODE,
        state_name: STATE_NAME,
        last_verified_at: new Date().toISOString()
      };

      if (agencyId) {
        record.agency_id = agencyId;
      }

      if (existing && existing.length > 0) {
        // Update existing
        const { error } = await supabase
          .from('manus_protocol_chunks')
          .update(record as never)
          .eq('id', existing[0].id);

        if (error) throw error;
        console.log(`↻ Updated (id: ${existing[0].id})`);
      } else {
        // Insert new
        record.created_at = new Date().toISOString();
        const { error } = await supabase
          .from('manus_protocol_chunks')
          .insert(record as never);

        if (error) throw error;
        console.log(`✓ Inserted`);
      }

      successCount++;

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (err: any) {
      console.log(`❌ Error: ${err.message}`);
      errorCount++;
    }
  }

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("SUMMARY");
  console.log("=".repeat(70));
  console.log(`\n  Total protocols: ${CRITICAL_PROTOCOLS.length}`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Errors: ${errorCount}`);

  if (errorCount === 0) {
    console.log("\n✅ All protocols added successfully!");
    console.log("\n⚠️  NEXT STEP:");
    console.log("Run: npx tsx scripts/verify-la-county-protocols.ts");
  } else {
    console.log("\n⚠️  Some protocols had errors. Review output above.");
  }
}

main().catch(console.error);
