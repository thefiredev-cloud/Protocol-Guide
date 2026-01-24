/**
 * LA County Bids DOCX Report Generator
 *
 * Generates a professional Word document analyzing LA County open solicitations.
 *
 * Input:  scripts/output/la-county-bids-data.json
 * Output: scripts/output/LA-County-Bids-Report.docx
 */

const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  Header,
  Footer,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  WidthType,
  ShadingType,
  PageNumber,
  PageBreak,
  LevelFormat,
} = require('docx');
const fs = require('fs');
const path = require('path');

// Load data
const dataPath = path.join(__dirname, 'output/la-county-bids-data.json');
if (!fs.existsSync(dataPath)) {
  console.error('Error: la-county-bids-data.json not found.');
  console.error('Run la-county-bids-scraper.ts first: npx tsx scripts/la-county-bids-scraper.ts');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Formatting helpers
const fmt = (n) =>
  n >= 1e9
    ? `$${(n / 1e9).toFixed(2)}B`
    : n >= 1e6
    ? `$${(n / 1e6).toFixed(2)}M`
    : n >= 1e3
    ? `$${(n / 1e3).toFixed(0)}K`
    : `$${n.toLocaleString()}`;

const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border };

// Cell helper
function makeCell(text, opts = {}) {
  const { header, right, center, bold, color, size, fill } = opts;
  return new TableCell({
    borders,
    shading: { fill: fill || (header ? '1a5276' : 'FFFFFF'), type: ShadingType.CLEAR },
    children: [
      new Paragraph({
        alignment: right ? AlignmentType.RIGHT : center ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [
          new TextRun({
            text: String(text),
            bold: bold || header,
            color: color || (header ? 'FFFFFF' : '000000'),
            size: size || 20,
          }),
        ],
      }),
    ],
  });
}

// Prepare data
const topDepts = Object.entries(data.byDepartment)
  .sort((a, b) => b[1].totalValue - a[1].totalValue)
  .slice(0, 10);

const topCategories = Object.entries(data.byCategory)
  .sort((a, b) => b[1].totalValue - a[1].totalValue);

const upcomingBids = data.upcomingClosings.slice(0, 10);
const largeBids = data.bids
  .filter((b) => b.estimatedValue >= 5000000)
  .sort((a, b) => b.estimatedValue - a.estimatedValue)
  .slice(0, 10);

const totalValue = data.bids.reduce((sum, b) => sum + (b.estimatedValue || 0), 0);

// Build document content
const children = [
  // Title
  new Paragraph({
    heading: HeadingLevel.TITLE,
    children: [new TextRun('LA County Open Solicitations Analysis')],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
    children: [
      new TextRun({
        text: `Generated: ${new Date(data.generatedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}`,
        size: 20,
        color: '666666',
      }),
    ],
  }),

  // Executive Summary
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun('Executive Summary')],
  }),
  new Paragraph({
    spacing: { after: 150 },
    children: [
      new TextRun('This report analyzes '),
      new TextRun({ text: `${data.totalBids} open solicitations`, bold: true }),
      new TextRun(' from Los Angeles County departments, with estimated total value of '),
      new TextRun({ text: fmt(totalValue), bold: true, color: '1a5276' }),
      new TextRun(
        '. The analysis covers procurement opportunities across all major county departments and identifies high-value contracts for potential vendor engagement.'
      ),
    ],
  }),

  // Key Statistics Box
  new Table({
    columnWidths: [9360],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            shading: { fill: 'E8F6F3', type: ShadingType.CLEAR },
            children: [
              new Paragraph({
                spacing: { before: 100 },
                children: [new TextRun({ text: 'KEY STATISTICS', bold: true, size: 24, color: '117864' })],
              }),
              new Paragraph({
                numbering: { reference: 'bullets', level: 0 },
                children: [new TextRun(`${data.totalBids} active open solicitations`)],
              }),
              new Paragraph({
                numbering: { reference: 'bullets', level: 0 },
                children: [new TextRun(`Total estimated value: ${fmt(totalValue)}`)],
              }),
              new Paragraph({
                numbering: { reference: 'bullets', level: 0 },
                children: [new TextRun(`${largeBids.length} contracts valued over $5M`)],
              }),
              new Paragraph({
                numbering: { reference: 'bullets', level: 0 },
                spacing: { after: 100 },
                children: [new TextRun(`${upcomingBids.length} solicitations closing within 14 days`)],
              }),
            ],
          }),
        ],
      }),
    ],
  }),

  new Paragraph({ children: [new PageBreak()] }),

  // Department Analysis
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun('Open Bids by Department')],
  }),
  new Paragraph({
    spacing: { after: 200 },
    children: [new TextRun('Top departments by estimated contract value:')],
  }),
  new Table({
    columnWidths: [4500, 1800, 2060],
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          makeCell('Department', { header: true }),
          makeCell('Open Bids', { header: true, center: true }),
          makeCell('Est. Total Value', { header: true, right: true }),
        ],
      }),
      ...topDepts.map(([dept, stats], i) =>
        new TableRow({
          children: [
            makeCell(dept.length > 40 ? dept.slice(0, 37) + '...' : dept, {
              fill: i % 2 === 0 ? 'F4F6F6' : 'FFFFFF',
            }),
            makeCell(stats.count, { center: true, fill: i % 2 === 0 ? 'F4F6F6' : 'FFFFFF' }),
            makeCell(fmt(stats.totalValue), {
              right: true,
              bold: stats.totalValue > 20e6,
              fill: i % 2 === 0 ? 'F4F6F6' : 'FFFFFF',
            }),
          ],
        })
      ),
    ],
  }),

  new Paragraph({ spacing: { after: 300 }, children: [] }),

  // Category Breakdown
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun('Bids by Category')],
  }),
  new Paragraph({
    spacing: { after: 200 },
    children: [new TextRun('Distribution of solicitations across procurement categories:')],
  }),
  new Table({
    columnWidths: [4000, 1800, 2560],
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          makeCell('Category', { header: true }),
          makeCell('Count', { header: true, center: true }),
          makeCell('Est. Value', { header: true, right: true }),
        ],
      }),
      ...topCategories.map(([cat, stats], i) =>
        new TableRow({
          children: [
            makeCell(cat, { fill: i % 2 === 0 ? 'F4F6F6' : 'FFFFFF' }),
            makeCell(stats.count, { center: true, fill: i % 2 === 0 ? 'F4F6F6' : 'FFFFFF' }),
            makeCell(fmt(stats.totalValue), { right: true, fill: i % 2 === 0 ? 'F4F6F6' : 'FFFFFF' }),
          ],
        })
      ),
    ],
  }),

  new Paragraph({ children: [new PageBreak()] }),

  // Value Distribution
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun('Contract Value Distribution')],
  }),
  new Paragraph({
    spacing: { after: 200 },
    children: [new TextRun('Breakdown of solicitations by estimated contract size:')],
  }),
  new Table({
    columnWidths: [4000, 2000, 2360],
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          makeCell('Value Range', { header: true }),
          makeCell('Count', { header: true, center: true }),
          makeCell('Percentage', { header: true, right: true }),
        ],
      }),
      new TableRow({
        children: [
          makeCell('Under $100K', { fill: 'F4F6F6' }),
          makeCell(data.valueDistribution.under100k, { center: true, fill: 'F4F6F6' }),
          makeCell(`${((data.valueDistribution.under100k / data.totalBids) * 100).toFixed(1)}%`, {
            right: true,
            fill: 'F4F6F6',
          }),
        ],
      }),
      new TableRow({
        children: [
          makeCell('$100K - $500K'),
          makeCell(data.valueDistribution.from100kTo500k, { center: true }),
          makeCell(`${((data.valueDistribution.from100kTo500k / data.totalBids) * 100).toFixed(1)}%`, {
            right: true,
          }),
        ],
      }),
      new TableRow({
        children: [
          makeCell('$500K - $1M', { fill: 'F4F6F6' }),
          makeCell(data.valueDistribution.from500kTo1M, { center: true, fill: 'F4F6F6' }),
          makeCell(`${((data.valueDistribution.from500kTo1M / data.totalBids) * 100).toFixed(1)}%`, {
            right: true,
            fill: 'F4F6F6',
          }),
        ],
      }),
      new TableRow({
        children: [
          makeCell('$1M - $5M'),
          makeCell(data.valueDistribution.from1MTo5M, { center: true }),
          makeCell(`${((data.valueDistribution.from1MTo5M / data.totalBids) * 100).toFixed(1)}%`, {
            right: true,
          }),
        ],
      }),
      new TableRow({
        children: [
          makeCell('Over $5M', { fill: 'F4F6F6', bold: true }),
          makeCell(data.valueDistribution.over5M, { center: true, fill: 'F4F6F6', bold: true }),
          makeCell(`${((data.valueDistribution.over5M / data.totalBids) * 100).toFixed(1)}%`, {
            right: true,
            fill: 'F4F6F6',
            bold: true,
          }),
        ],
      }),
    ],
  }),

  new Paragraph({ spacing: { after: 300 }, children: [] }),

  // High-Value Opportunities
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun('High-Value Opportunities')],
  }),
  new Paragraph({
    spacing: { after: 200 },
    children: [new TextRun('Contracts with estimated value over $5 million:')],
  }),
  new Table({
    columnWidths: [4500, 2500, 1360],
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          makeCell('Solicitation', { header: true }),
          makeCell('Department', { header: true }),
          makeCell('Est. Value', { header: true, right: true }),
        ],
      }),
      ...largeBids.map((bid, i) =>
        new TableRow({
          children: [
            makeCell(bid.title.length > 45 ? bid.title.slice(0, 42) + '...' : bid.title, {
              fill: i % 2 === 0 ? 'F4F6F6' : 'FFFFFF',
            }),
            makeCell(bid.department.length > 20 ? bid.department.slice(0, 17) + '...' : bid.department, {
              fill: i % 2 === 0 ? 'F4F6F6' : 'FFFFFF',
            }),
            makeCell(fmt(bid.estimatedValue), {
              right: true,
              bold: true,
              color: '117864',
              fill: i % 2 === 0 ? 'F4F6F6' : 'FFFFFF',
            }),
          ],
        })
      ),
    ],
  }),

  new Paragraph({ children: [new PageBreak()] }),

  // Upcoming Deadlines
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun('Upcoming Closing Dates')],
  }),
  new Paragraph({
    spacing: { after: 200 },
    children: [new TextRun('Solicitations closing within the next 14 days:')],
  }),
  ...(upcomingBids.length > 0
    ? [
        new Table({
          columnWidths: [3500, 2500, 1500, 860],
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                makeCell('Solicitation', { header: true }),
                makeCell('Department', { header: true }),
                makeCell('Closes', { header: true, center: true }),
                makeCell('Value', { header: true, right: true }),
              ],
            }),
            ...upcomingBids.map((bid, i) =>
              new TableRow({
                children: [
                  makeCell(bid.title.length > 35 ? bid.title.slice(0, 32) + '...' : bid.title, {
                    fill: i % 2 === 0 ? 'FEF9E7' : 'FFFFFF',
                  }),
                  makeCell(
                    bid.department.length > 20 ? bid.department.slice(0, 17) + '...' : bid.department,
                    { fill: i % 2 === 0 ? 'FEF9E7' : 'FFFFFF' }
                  ),
                  makeCell(
                    new Date(bid.closingDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    }),
                    { center: true, fill: i % 2 === 0 ? 'FEF9E7' : 'FFFFFF', color: 'B7950B' }
                  ),
                  makeCell(fmt(bid.estimatedValue), {
                    right: true,
                    fill: i % 2 === 0 ? 'FEF9E7' : 'FFFFFF',
                  }),
                ],
              })
            ),
          ],
        }),
      ]
    : [new Paragraph({ children: [new TextRun({ text: 'No solicitations closing within 14 days.', italics: true })] })]),

  new Paragraph({ spacing: { after: 300 }, children: [] }),

  // Methodology
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun('Methodology & Data Sources')],
  }),
  new Paragraph({
    spacing: { after: 150 },
    children: [
      new TextRun({ text: 'Data Source: ', bold: true }),
      new TextRun('LA County CEO Budget Office (ceo.lacounty.gov/budget/)'),
    ],
  }),
  new Paragraph({
    spacing: { after: 150 },
    children: [
      new TextRun({ text: 'Budget Year: ', bold: true }),
      new TextRun('FY 2024-25 ($49.2 billion total county budget)'),
    ],
  }),
  new Paragraph({
    spacing: { after: 200 },
    children: [
      new TextRun({ text: 'Analysis Method: ', bold: true }),
      new TextRun(
        'Solicitation data is modeled based on historical procurement patterns and departmental budget allocations. Estimated contract values reflect typical ranges for each procurement category.'
      ),
    ],
  }),

  // Disclaimer
  new Table({
    columnWidths: [9360],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            shading: { fill: 'EBF5FB', type: ShadingType.CLEAR },
            children: [
              new Paragraph({
                spacing: { before: 100, after: 100 },
                children: [
                  new TextRun({ text: 'NOTE: ', bold: true, size: 18 }),
                  new TextRun({
                    text:
                      'LA County does not maintain a public API for bid data. This analysis uses budget allocation data and typical procurement patterns to model the solicitation landscape. For actual open bids, visit the LA County Bids portal at camisvr.co.la.ca.us/lacobids.',
                    size: 18,
                    italics: true,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  }),
];

// Create document
const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      {
        id: 'Title',
        name: 'Title',
        basedOn: 'Normal',
        run: { size: 48, bold: true, color: '1a5276' },
        paragraph: { spacing: { after: 200 }, alignment: AlignmentType.CENTER },
      },
      {
        id: 'Heading1',
        name: 'Heading 1',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { size: 32, bold: true, color: '1a5276' },
        paragraph: { spacing: { before: 300, after: 150 }, outlineLevel: 0 },
      },
      {
        id: 'Heading2',
        name: 'Heading 2',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { size: 26, bold: true, color: '2d3748' },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: '\u2022',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
    ],
  },
  sections: [
    {
      properties: { page: { margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } } },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: 'LA County Open Solicitations Analysis',
                  italics: true,
                  size: 18,
                  color: '666666',
                }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'Page ', size: 18 }),
                new TextRun({ children: [PageNumber.CURRENT], size: 18 }),
                new TextRun({ text: ' of ', size: 18 }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18 }),
              ],
            }),
          ],
        }),
      },
      children,
    },
  ],
});

// Generate DOCX
Packer.toBuffer(doc).then((buffer) => {
  const outPath = path.join(__dirname, 'output/LA-County-Bids-Report.docx');
  fs.writeFileSync(outPath, buffer);
  console.log(`Report saved: ${outPath}`);
  console.log('');
  console.log('Open the DOCX file to view the formatted report.');
});
