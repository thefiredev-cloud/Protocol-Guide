# SEO & AEO Strategy - Protocol Guide

## Goal
When someone searches "LA County cardiac arrest protocol" or asks ChatGPT "what's the pediatric epinephrine dose for a 15kg child", Protocol Guide should be the answer.

## SEO (Search Engine Optimization)

### Meta & Technical
- Dynamic meta titles: "[Protocol Name] - LA County EMS | Protocol Guide"
- Meta descriptions: First 160 chars of protocol content
- Canonical URLs for each protocol
- XML sitemap with all indexed protocols
- robots.txt allowing crawlers
- Mobile-first (already done)
- Fast load times (target <2s)

### Structured Data (Schema.org)
- MedicalWebPage schema for protocol pages
- HowTo schema for procedures
- FAQPage schema for common questions
- Organization schema for Protocol Guide
- BreadcrumbList for navigation

### Content Strategy
- Individual landing pages for major protocols (cardiac arrest, peds, trauma)
- State-specific pages: "/california/los-angeles-county/protocols"
- FAQ pages answering common EMS questions
- Blog/resources with protocol updates, tips

### Target Keywords
- "[County] EMS protocols"
- "[State] paramedic protocols"
- "pediatric dosing EMS"
- "prehospital cardiac arrest protocol"
- "field protocol guide"
- "EMS protocol app"

## AEO (Answer Engine Optimization)

### For AI Search (ChatGPT, Perplexity, Claude)
- Direct, factual answers in content (not marketing fluff)
- Question-answer format in FAQ sections
- Clear dose/procedure steps that AI can extract
- Authoritative sourcing ("per LA County EMS Agency protocols")

### Content Structure for AI
- Start paragraphs with the answer, then explain
- Use lists for steps/procedures
- Include specific numbers (doses, times, weights)
- Clear headings that match search queries

### Example AEO Content
**Bad:** "Our innovative platform provides comprehensive protocol access..."
**Good:** "Pediatric epinephrine dose for cardiac arrest: 0.01 mg/kg IV/IO (0.1 mL/kg of 1:10,000). Max single dose: 1mg."

## Implementation Priority

### Phase 1 (Immediate)
1. Add meta tags to all pages
2. Create sitemap.xml
3. Add structured data to protocol pages
4. Optimize page titles

### Phase 2 (This Week)
1. Create state/county landing pages
2. Add FAQ section with common protocol questions
3. Protocol-specific URLs (/protocols/la-county/cardiac-arrest)

### Phase 3 (Ongoing)
1. Blog with protocol updates
2. Backlink building (EMS publications, training sites)
3. Google Search Console monitoring
4. Content refresh as protocols update

## Technical Notes
- Use Next.js metadata API for dynamic meta tags
- next-sitemap for sitemap generation
- Structured data via JSON-LD in head
- Ensure SSR/SSG for crawlability (no client-only content)
