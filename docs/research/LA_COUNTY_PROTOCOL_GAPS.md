# LA County Protocol Gaps vs National Standards

## Summary
LA County DHS treatment protocols are broadly aligned with national standards but have meaningful gaps in:
1. Refractory VF management (DSED/ECMO pathways)
2. Post-ROSC targets
3. Ketamine/fentanyl dosing standardization

---

## Cardiology: ROSC and Refractory VF

### What LA County Has
- High-quality CPR emphasis, early defib, limited interruptions
- Early epinephrine, amiodarone after 3rd shock
- Vector change (A-L to A-P) for persistent VF after 3 shocks
- Transport to STEMI-Receiving or eCPR centers for refractory VF
- ~40 min on-scene resuscitation when resources allow
- Post-ROSC: BP support, fluid resuscitation, vasopressors, avoid hyperventilation

### What's Missing (vs 2025 AHA)
- **No formal DSED procedure** (dual-sequential external defibrillation)
- **No explicit ECMO pathway** in paramedic protocol text
- Post-ROSC numeric targets not fully specified:
  - Specific BP goals
  - O2 saturation targets
  - Ventilation targets
  - Glucose management
  - Coronary angiography indications
  - Mechanical circulatory support criteria

### Evidence
- 2023-2025 AHA ACLS updates: DSED and vector change are "reasonable strategies" for refractory VF/pVT
- 2025 AHA explicitly specifies post-ROSC bundles with numeric targets

---

## Pharmacology: Ketamine

### What LA County Has
- Fentanyl for opioid analgesia
- **No ketamine** as standard analgesic or RSI induction agent

### National Standard (What Others Have)
**Low-dose (analgesia):**
- 0.1-0.3 mg/kg IV over 5-10 minutes
- Adjunct/alternative to opioids for acute pain
- Good safety, reduced opioid requirements

**Dissociative dose (sedation/RSI):**
- 1-2 mg/kg IV or 3-4 mg/kg IM
- For severe agitation, excited delirium, RSI

### Evidence
- National Model EMS Clinical Guidelines specify two-tiered ketamine structure
- Multiple regional protocols have adopted this
- Specialty consensus: sub-dissociative ≤0.3-0.5 mg/kg for pain

---

## Implications for Protocol Guide

### Feature Opportunities
1. **Gap Analysis Tool** - Compare local protocols to national standards
2. **Update Alerts** - Flag when AHA/NAEMSP guidelines change
3. **Evidence Links** - Connect protocol steps to supporting literature

### Demo Talking Points
- "Your protocols are good, but standards evolve. Protocol Guide can help crews know when national guidance has shifted."
- "DSED is now AHA-recognized but not in your protocol text - crews should know this exists."
- "Post-ROSC targets are now explicit in 2025 AHA - your crews need those numbers."

### Medical Director Value Prop
- Protocol Guide can surface these gaps
- Help standardize to national benchmarks
- Track protocol version against latest evidence

---

---

## Fentanyl Dosing Standards

**National Model EMS Guideline-Level Practice:**
- Adult IV/IN: 25-100 mcg per dose
- Titrate every 5 minutes
- Max total: 200-300 mcg

LA County fentanyl parameters should be compared dose-by-dose against these ranges if ketamine options are considered.

---

## Critical Practice-Level Discrepancies (Summary)

| Gap | LA County | National Standard |
|-----|-----------|-------------------|
| **Refractory VF** | Vector change, SRC/eCPR transport | DSED now recognized as reasonable option |
| **Post-ROSC Bundle** | Rapid stabilization, avoid hyperventilation | Explicit BP, SpO₂, PaCO₂, temp targets |
| **Ketamine** | Not included | Two-tiered: sub-dissociative (pain) + dissociative (sedation/RSI) |
| **Opioid-only Analgesia** | Fentanyl-centric | Ketamine adjunct for hypotension, polytrauma, opioid-tolerant pts |

---

## AI-Agent Digitization: Feature Roadmap

### 1. Dynamic Arrest/ROSC Flow
- Step paramedics through cardiac arrest in real time
- Time epinephrine doses, track shock count
- Prompt vector change, suggest DSED or eCPR transport when criteria met
- Reduce mental tracking of complex branching algorithms under stress

### 2. Dose and Indication Guardrails
- Patient-specific dosing (weight-based ketamine/fentanyl)
- Hard dose ceilings
- Contraindication alerts
- Offload mental math and cross-checking

### 3. Context-Aware Protocol Surfacing
- Infer protocol sets from narrative input and vital signs
- "refractory VF arrest" → surface only relevant sections
- "post-ROSC hypotension" → target those protocols
- Decrease search time and working-memory load

### 4. Closed-Loop Checklisting
- AI-driven, voice-compatible checklists
- Airway steps, post-ROSC stabilization, analgesia titration
- Real-time confirmation and reminders
- Transport decision criteria prompts

### 5. Training and Feedback Layer
- Log protocol deviations
- Track timing of key interventions
- Generate after-action reviews
- Targeted refresher training on guideline changes
- Crews don't have to track every update manually

---

## Sources
- [1] LA County Treatment Protocols https://file.lacounty.gov/SDSInter/dhs/1075386_LACountyTreatmentProtocols.pdf
- [2] LA County Cardiac Arrest Protocol https://file.lacounty.gov/SDSInter/dhs/1040387_1210CardiacArrest2018-05-30.pdf
- [3] EMCrit 412 - 2025 AHA ACLS Guidelines https://emcrit.org/emcrit/2025-aha-acls-guidelines/
- [4] AHA Post-Cardiac Arrest Care 2025 https://pubmed.ncbi.nlm.nih.gov/41122894/
- [5] National Model EMS Clinical Guidelines 2022 https://flemsc.emergency.med.jax.ufl.edu/wordpress/files/2023/08/National-Model-EMS-Clinical-Guidelines_2022.pdf
- [6] LA County Cardiac Arrest 1210 http://file.lacounty.gov/SDSInter/dhs/1040511_1210CardiacArrest.pdf
- [7] Regional ECMO Program for Refractory VF https://emergencymed.org.il/wp-content/uploads/2023/02/2-Implementation-of-a-regional-ECMO-program-for-refractory-VF-OHCA.pdf
- [8] Out-of-Hospital Cardiac Arrest Review https://pmc.ncbi.nlm.nih.gov/articles/PMC10010215/
- [9] Post-Cardiac Arrest Syndrome Management https://pmc.ncbi.nlm.nih.gov/articles/PMC6849015/
- [10] UH EMS Pharmacy PHRiday Week 18 https://uhems.org/blog/2025/05/02/Pharmacy-PHRiday---Week-18
- [11] San Diego County Protocol Standards https://www.sandiegocounty.gov/content/dam/sdc/ems/Policies_Protocols/2024/2024-2025%20Protocol%20Packet%20v2.pdf
- [12] Ketamine in Trauma Review https://assets.cureus.com/uploads/review_article/pdf/182993/20231101-32575-1k3dx4z.pdf
- [13] Ketamine Safety in ED https://escholarship.org/content/qt6853k0hc/qt6853k0hc.pdf
- [14] ASRA Ketamine Guidelines https://pmc.ncbi.nlm.nih.gov/articles/PMC6023582/
- [15] Ketamine Meta-Analysis for Acute Pain https://pmc.ncbi.nlm.nih.gov/articles/PMC10069507/
- [16] Iowa County ICAS Protocols 2025 https://iowacounty.iowa.gov/files/ems/icas_protocals_94835.pdf
- [17] National EMS Scope of Practice Model 2019 https://www.nremt.org/getmedia/d82edd97-1425-423f-954c-fdd63cf1daa3/National_EMS_Scope_of_Practice_Model_2019_Change_Notices_1_and-_2_August_2021.pdf
- [18] AI-Based Decision Support in EMS https://ijsret.com/wp-content/uploads/IJSRET_V11_issue3_987.pdf
- [19] JEMS - Preparing EMS for Next Era https://www.jems.com/patient-care/preparing-ems-for-the-next-era-of-patient-care/
