# Protocol Guide User Research Plan

## Executive Summary

This research plan investigates how EMS professionals (paramedics and EMTs) access medical protocols in field conditions. Our goal is to understand current workflows, identify pain points with existing solutions (PDF binders, printed protocols), and prioritize features for Protocol Guide.

**Research Timeline**: 6-8 weeks
**Target Participants**: 40-60 EMS professionals across experience levels and environments

---

## Research Objectives

### Primary Questions

1. **Current Protocol Access**
   - How do EMS professionals currently access protocols during calls?
   - What devices do they use? Personal phone, agency tablet, printed materials?
   - How do they access protocols during high-stress situations?

2. **Pain Points with PDF Binders/Printed Protocols**
   - How long does it take to find the right protocol?
   - What happens when protocols are outdated?
   - How do physical conditions (gloves, lighting, movement) affect usability?

3. **Feature Prioritization**
   - Voice search: How valuable is hands-free access?
   - Offline mode: How critical is connectivity reliability?
   - Search speed: What's the acceptable response time?
   - Calculator tools: Which medication calculators are most needed?

---

## Target User Segments

### Segment 1: New EMTs (0-2 years experience)
- **Characteristics**: Rely heavily on protocol reference, lower confidence, high app usage
- **Recruitment Target**: 12-15 participants
- **Sources**: EMT academies, new hire training programs

### Segment 2: Experienced Paramedics (5+ years)
- **Characteristics**: Occasional lookup, edge cases, teaching orientation
- **Recruitment Target**: 12-15 participants
- **Sources**: Field Training Officers, union contacts

### Segment 3: Rural/Remote EMS
- **Characteristics**: Long transports, limited connectivity, extended scope
- **Recruitment Target**: 8-10 participants
- **Sources**: Volunteer fire departments, rural health clinics

### Segment 4: Urban High-Volume 911
- **Characteristics**: High call volume, time pressure, diverse call types
- **Recruitment Target**: 8-10 participants
- **Sources**: Metropolitan fire departments, private ambulance services

---

## Research Methods

### Phase 1: Discovery Interviews (Weeks 1-3)
**Method**: Semi-structured interviews (45-60 minutes)
**Participants**: 20 EMS professionals across all segments
**Format**: Remote video calls + 5 in-person ride-along observations
**Deliverables**: Interview transcripts, affinity diagram, preliminary personas

### Phase 2: Contextual Inquiry (Weeks 3-4)
**Method**: Field observation during actual shifts
**Participants**: 6 ride-along sessions (8-12 hour shifts)
**Focus Areas**:
- Device handling with gloves
- Protocol lookup during actual calls
- Ambulance environment (lighting, motion, noise)
- Communication patterns with dispatch/hospitals

**Requirements**:
- Agency partnership agreements
- Liability waivers
- HIPAA acknowledgment (no patient data collection)

### Phase 3: Quantitative Survey (Weeks 4-5)
**Method**: Online survey (10-15 minutes)
**Participants**: 200+ EMS professionals
**Distribution**: EMS Facebook groups, Reddit r/ems, agency partnerships, EMS conferences
**Deliverables**: Statistical analysis, feature prioritization matrix

### Phase 4: Usability Testing (Weeks 6-7)
**Method**: Task-based testing with Protocol Guide prototype
**Participants**: 15 EMS professionals (mix of all segments)
**Format**: Remote moderated sessions (30-45 minutes)
**Scenarios**: Simulated high-stress protocol lookups

### Phase 5: Synthesis & Reporting (Week 8)
**Deliverables**:
- Executive research report
- Updated user personas
- Feature prioritization recommendations
- Journey maps (current state vs. Protocol Guide)

---

## Recruitment Channels

### Online Communities
- Reddit: r/ems (380K+ members), r/NewToEMS, r/Paramedics
- Facebook: EMS groups (search "EMS", "Paramedic", "EMT" + state names)
- EMS1.com community forums
- JEMS Connect

### Professional Associations
- National Association of EMTs (NAEMT)
- National Association of EMS Physicians (NAEMSP)
- State EMS associations

### Direct Agency Partnerships
- Target 5-10 agencies for ride-along access
- Offer free Protocol Guide Pro subscriptions as incentive
- Work through medical directors for approval

### Training Programs
- EMT/Paramedic schools
- Continuing education providers
- Fire academy programs

---

## Participant Incentives

| Method | Incentive | Rationale |
|--------|-----------|-----------|
| Interview (60 min) | $75 Amazon gift card | Above-market rate for specialized expertise |
| Ride-Along | $100 gift card + agency donation | Time commitment + coordination effort |
| Survey (15 min) | $10 gift card + Pro subscription draw | Low barrier, high volume |
| Usability Test | $50 gift card | Moderate time commitment |

---

## Ethical Considerations

### Participant Protection
- Voluntary participation with clear opt-out
- No recording during active patient care
- All data anonymized before analysis
- No personal identifying information in reports

### HIPAA Compliance
- No patient information collected
- Observations focus on EMS professional behavior only
- Agency-level data aggregated, not identified

### Scheduling Sensitivity
- Respect shift schedules (24/48, Kelly days)
- Offer multiple time slots across days/nights
- Allow rescheduling without penalty

### Vulnerable Population Awareness
- EMS professionals may have PTSD/stress from job
- Avoid triggering questions about difficult calls
- Provide mental health resources if needed

---

## Key Metrics to Measure

### Current State Metrics (Baseline)
- Time to locate correct protocol (seconds)
- Protocol lookup attempts before success
- Frequency of protocol access per shift
- Confidence level in protocol accuracy

### Protocol Guide Success Metrics
- Task completion rate (finding correct protocol)
- Time-on-task compared to PDF/binder
- Voice search success rate
- Offline reliability satisfaction
- Net Promoter Score (NPS)

---

## Research Repository

All research artifacts will be stored in `/research/studies/` with the following structure:

```
/research/studies/2025-q1-field-research/
  /raw-data/
    - interview-transcripts/
    - survey-responses/
    - observation-notes/
  /analysis/
    - affinity-diagrams/
    - journey-maps/
    - persona-updates/
  /reports/
    - executive-summary.md
    - full-report.pdf
    - presentation.pptx
```

---

## Success Criteria

This research is successful if we can:

1. **Quantify** current protocol access times and pain points
2. **Prioritize** features with statistical confidence (n>200 survey)
3. **Validate** that Protocol Guide solves real problems for EMS professionals
4. **Identify** 3-5 critical usability issues for field conditions
5. **Create** actionable recommendations for next development sprint

---

## Timeline Summary

| Week | Phase | Key Activities |
|------|-------|----------------|
| 1-2 | Discovery | Recruit participants, conduct 10 interviews |
| 3 | Discovery + Contextual | Complete interviews, begin ride-alongs |
| 4 | Contextual + Survey | Complete ride-alongs, launch survey |
| 5 | Survey + Analysis | Close survey, begin data analysis |
| 6-7 | Usability Testing | Test Protocol Guide with users |
| 8 | Synthesis | Final report, presentation to team |

---

## Budget Estimate

| Item | Cost |
|------|------|
| Interview incentives (20 x $75) | $1,500 |
| Ride-along incentives (6 x $100) | $600 |
| Survey incentives (200 x $10) | $2,000 |
| Usability test incentives (15 x $50) | $750 |
| Survey platform (SurveyMonkey/Typeform) | $200 |
| Video conferencing (Zoom) | $50 |
| Transcription services | $500 |
| **Total** | **$5,600** |

---

## Appendices

- [Interview Guide](./interview-guide.md)
- [Survey Framework](./survey-framework.md)
- [Observation Checklist](./observation-checklist.md)
- [Consent Forms](./consent-forms/)

---

*Document Version: 1.0*
*Last Updated: 2025-01-22*
*Owner: UX Research Team*
