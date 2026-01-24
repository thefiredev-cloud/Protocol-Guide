/**
 * LA County Bids DOCX Report Generator
 *
 * Generates a professional Word document from real LA County solicitation data.
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
  ShadingType,
  PageNumber,
  PageBreak,
  LevelFormat,
  ExternalHyperlink,
} = require('docx');
const fs = require('fs');
const path = require('path');

// Load data
const dataPath = path.join(__dirname, 'output/la-county-bids-data.json');
if (!fs.existsSync(dataPath)) {
  console.error('Error: la-county-bids-data.json not found.');
  console.error('Run: npx tsx scripts/la-county-bids-scraper.ts');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

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
  .sort((a, b) => b[1].count - a[1].count)
  .slice(0, 15);

const bidTypes = Object.entries(data.byBidType)
  .sort((a, b) => b[1].count - a[1].count);

const topCommodities = Object.entries(data.byCommodity)
  .sort((a, b) => b[1].count - a[1].count)
  .slice(0, 15);

const upcomingBids = (data.upcomingClosings || []).slice(0, 15);
const closingSoon = (data.closingSoon || []).slice(0, 10);

// Build document content
const children = [
  // Title
  new Paragraph({
    heading: HeadingLevel.TITLE,
    children: [new TextRun('Los Angeles County')],
  }),
  new Paragraph({
    heading: HeadingLevel.TITLE,
    spacing: { after: 100 },
    children: [new TextRun('Open Solicitations Report')],
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
          hour: '2-digit',
          minute: '2-digit',
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
      new TextRun('This report contains '),
      new TextRun({ text: `${data.totalBids} active open solicitations`, bold: true }),
      new TextRun(' currently available from Los Angeles County government departments. '),
      new TextRun('Data is sourced directly from the official LA County Bids Portal maintained by the Internal Services Department.'),
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
                children: [new TextRun(`${data.totalBids} total open solicitations`)],
              }),
              new Paragraph({
                numbering: { reference: 'bullets', level: 0 },
                children: [new TextRun(`${topDepts.length} departments with active bids`)],
              }),
              new Paragraph({
                numbering: { reference: 'bullets', level: 0 },
                children: [new TextRun(`${closingSoon.length} solicitations closing within 3 days`)],
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

  // Urgent Alert if there are bids closing soon
  ...(closingSoon.length > 0
    ? [
        new Paragraph({ spacing: { before: 200 }, children: [] }),
        new Table({
          columnWidths: [9360],
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  borders,
                  shading: { fill: 'FDEDEC', type: ShadingType.CLEAR },
                  children: [
                    new Paragraph({
                      spacing: { before: 100 },
                      children: [new TextRun({ text: '⚠️ CLOSING WITHIN 3 DAYS', bold: true, size: 22, color: 'C0392B' })],
                    }),
                    ...closingSoon.slice(0, 5).map(
                      (bid) =>
                        new Paragraph({
                          spacing: { before: 50 },
                          children: [
                            new TextRun({ text: `${bid.bidNumber}: `, bold: true, size: 18 }),
                            new TextRun({ text: bid.title.substring(0, 60) + (bid.title.length > 60 ? '...' : ''), size: 18 }),
                            new TextRun({ text: ` (${bid.closingDate})`, size: 18, color: 'C0392B' }),
                          ],
                        })
                    ),
                    new Paragraph({ spacing: { after: 100 }, children: [] }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ]
    : []),

  new Paragraph({ children: [new PageBreak()] }),

  // Department Analysis
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun('Solicitations by Department')],
  }),
  new Paragraph({
    spacing: { after: 200 },
    children: [new TextRun('Distribution of open solicitations across LA County departments:')],
  }),
  new Table({
    columnWidths: [6000, 1800, 1560],
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          makeCell('Department', { header: true }),
          makeCell('Open Bids', { header: true, center: true }),
          makeCell('% of Total', { header: true, right: true }),
        ],
      }),
      ...topDepts.map(([dept, stats], i) =>
        new TableRow({
          children: [
            makeCell(dept.length > 50 ? dept.slice(0, 47) + '...' : dept, {
              fill: i % 2 === 0 ? 'F4F6F6' : 'FFFFFF',
            }),
            makeCell(stats.count, { center: true, fill: i % 2 === 0 ? 'F4F6F6' : 'FFFFFF' }),
            makeCell(`${((stats.count / data.totalBids) * 100).toFixed(1)}%`, {
              right: true,
              fill: i % 2 === 0 ? 'F4F6F6' : 'FFFFFF',
            }),
          ],
        })
      ),
    ],
  }),

  new Paragraph({ spacing: { after: 300 }, children: [] }),

  // Bid Types
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun('Solicitation Types')],
  }),
  new Paragraph({
    spacing: { after: 200 },
    children: [new TextRun('Breakdown by procurement type:')],
  }),
  new Table({
    columnWidths: [5000, 2000, 1360],
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          makeCell('Type', { header: true }),
          makeCell('Count', { header: true, center: true }),
          makeCell('% of Total', { header: true, right: true }),
        ],
      }),
      ...bidTypes.map(([type, stats], i) =>
        new TableRow({
          children: [
            makeCell(type, { fill: i % 2 === 0 ? 'F4F6F6' : 'FFFFFF' }),
            makeCell(stats.count, { center: true, fill: i % 2 === 0 ? 'F4F6F6' : 'FFFFFF' }),
            makeCell(`${((stats.count / data.totalBids) * 100).toFixed(1)}%`, {
              right: true,
              fill: i % 2 === 0 ? 'F4F6F6' : 'FFFFFF',
            }),
          ],
        })
      ),
    ],
  }),

  new Paragraph({ children: [new PageBreak()] }),

  // Commodity Categories
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun('Top Commodity Categories')],
  }),
  new Paragraph({
    spacing: { after: 200 },
    children: [new TextRun('Most common procurement categories:')],
  }),
  new Table({
    columnWidths: [6500, 1500, 1360],
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          makeCell('Commodity Category', { header: true }),
          makeCell('Count', { header: true, center: true }),
          makeCell('% of Total', { header: true, right: true }),
        ],
      }),
      ...topCommodities.map(([cat, stats], i) =>
        new TableRow({
          children: [
            makeCell(cat.length > 55 ? cat.slice(0, 52) + '...' : cat, {
              fill: i % 2 === 0 ? 'F4F6F6' : 'FFFFFF',
            }),
            makeCell(stats.count, { center: true, fill: i % 2 === 0 ? 'F4F6F6' : 'FFFFFF' }),
            makeCell(`${((stats.count / data.totalBids) * 100).toFixed(1)}%`, {
              right: true,
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
          columnWidths: [1500, 4000, 2000, 1860],
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                makeCell('Bid #', { header: true }),
                makeCell('Title', { header: true }),
                makeCell('Department', { header: true }),
                makeCell('Closes', { header: true, center: true }),
              ],
            }),
            ...upcomingBids.map((bid, i) =>
              new TableRow({
                children: [
                  makeCell(bid.bidNumber, { fill: i % 2 === 0 ? 'FEF9E7' : 'FFFFFF', size: 18 }),
                  makeCell(bid.title.length > 40 ? bid.title.slice(0, 37) + '...' : bid.title, {
                    fill: i % 2 === 0 ? 'FEF9E7' : 'FFFFFF',
                    size: 18,
                  }),
                  makeCell(
                    bid.department.length > 18 ? bid.department.slice(0, 15) + '...' : bid.department,
                    { fill: i % 2 === 0 ? 'FEF9E7' : 'FFFFFF', size: 18 }
                  ),
                  makeCell(bid.closingDate.split(' ')[0], {
                    center: true,
                    fill: i % 2 === 0 ? 'FEF9E7' : 'FFFFFF',
                    color: 'B7950B',
                    size: 18,
                  }),
                ],
              })
            ),
          ],
        }),
      ]
    : [new Paragraph({ children: [new TextRun({ text: 'No solicitations closing within 14 days.', italics: true })] })]),

  new Paragraph({ children: [new PageBreak()] }),

  // Sample Bid Details
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun('Sample Solicitation Details')],
  }),
  new Paragraph({
    spacing: { after: 200 },
    children: [new TextRun('Detailed information for 5 representative solicitations:')],
  }),
  ...data.bids.slice(0, 5).flatMap((bid, idx) => [
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
                  spacing: { before: 100 },
                  children: [
                    new TextRun({ text: bid.bidNumber, bold: true, size: 22, color: '1a5276' }),
                  ],
                }),
                new Paragraph({
                  children: [new TextRun({ text: bid.title, bold: true, size: 20 })],
                }),
                new Paragraph({
                  spacing: { before: 80 },
                  children: [
                    new TextRun({ text: 'Department: ', bold: true, size: 18 }),
                    new TextRun({ text: bid.department, size: 18 }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: 'Type: ', bold: true, size: 18 }),
                    new TextRun({ text: bid.bidType, size: 18 }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: 'Commodity: ', bold: true, size: 18 }),
                    new TextRun({ text: bid.commodityDescription || 'N/A', size: 18 }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: 'Opens: ', bold: true, size: 18 }),
                    new TextRun({ text: bid.openDate, size: 18 }),
                    new TextRun({ text: '  |  Closes: ', bold: true, size: 18 }),
                    new TextRun({ text: bid.closingDate, size: 18, color: 'C0392B' }),
                  ],
                }),
                new Paragraph({
                  spacing: { after: 100 },
                  children: [
                    new TextRun({ text: 'Contact: ', bold: true, size: 18 }),
                    new TextRun({ text: `${bid.contactName} - ${bid.contactPhone} - ${bid.contactEmail}`, size: 18 }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ spacing: { after: 150 }, children: [] }),
  ]),

  new Paragraph({ children: [new PageBreak()] }),

  // Data Source
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun('Data Source & Methodology')],
  }),
  new Paragraph({
    spacing: { after: 150 },
    children: [
      new TextRun({ text: 'Source: ', bold: true }),
      new TextRun(data.source),
    ],
  }),
  new Paragraph({
    spacing: { after: 150 },
    children: [
      new TextRun({ text: 'Portal URL: ', bold: true }),
      new TextRun(data.sourceUrl),
    ],
  }),
  new Paragraph({
    spacing: { after: 150 },
    children: [
      new TextRun({ text: 'Data Retrieved: ', bold: true }),
      new TextRun(new Date(data.generatedAt).toLocaleString()),
    ],
  }),
  new Paragraph({
    spacing: { after: 200 },
    children: [
      new TextRun({ text: 'Total Records: ', bold: true }),
      new TextRun(`${data.totalBids} open solicitations`),
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
                  new TextRun({ text: 'DISCLAIMER: ', bold: true, size: 18 }),
                  new TextRun({
                    text:
                      'This report is generated from publicly available data on the LA County Bids Portal. Solicitation details may change. Always verify current information directly at camisvr.co.la.ca.us/lacobids before submitting bids.',
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
        run: { size: 44, bold: true, color: '1a5276' },
        paragraph: { spacing: { after: 100 }, alignment: AlignmentType.CENTER },
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
                  text: 'LA County Open Solicitations',
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
  console.log(`Total solicitations: ${data.totalBids}`);
  console.log(`Source: ${data.source}`);
});
