/**
 * LA County Fire Department Funding Analysis Report
 * Addressed to IAFF Local 1014 President David Gillotte
 *
 * Data Sources:
 * - CA State Controller's Office (bythenumbers.sco.ca.gov)
 * - County Financial Transactions Reports (2003-2024)
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
} = require('docx');
const fs = require('fs');
const path = require('path');

// Load data files
const fireSpending = JSON.parse(fs.readFileSync(path.join(__dirname, 'output/la-fire-spending.json'), 'utf8'));
const countyComparison = JSON.parse(fs.readFileSync(path.join(__dirname, 'output/county-fire-comparison.json'), 'utf8'));

// Format currency
const fmt = (n) => n >= 1e9 ? `$${(n/1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n/1e6).toFixed(1)}M` : `$${n.toLocaleString()}`;

// Population data (from CA State Controller)
const population = {
  2019: 10253716,
  2020: 10172951,
  2021: 9931338,
  2022: 9861224,
  2023: 9761210,
  2024: 9824091,
};

// Fire spending data
const fireByYear = fireSpending.by_year;

// Calculate per capita for recent years
const perCapita = {};
for (const year of ['2019', '2020', '2021', '2022', '2023', '2024']) {
  const spending = fireByYear[year] || 0;
  const pop = population[parseInt(year)] || 0;
  if (pop > 0) {
    perCapita[year] = spending / pop;
  }
}

// Year-over-year growth
const recentYears = ['2020', '2021', '2022', '2023', '2024'];
const growth = {};
for (let i = 1; i < recentYears.length; i++) {
  const prevYear = recentYears[i-1];
  const currYear = recentYears[i];
  const prev = fireByYear[prevYear] || 0;
  const curr = fireByYear[currYear] || 0;
  if (prev > 0) {
    growth[currYear] = ((curr - prev) / prev) * 100;
  }
}

// Format date
const reportDate = new Date().toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border };

function makeCell(text, opts = {}) {
  const { header, right, center, bold, color, size, fill } = opts;
  return new TableCell({
    borders,
    shading: { fill: fill || (header ? 'B71C1C' : 'FFFFFF'), type: ShadingType.CLEAR },
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

// Build document
const children = [
  // Date
  new Paragraph({
    alignment: AlignmentType.RIGHT,
    spacing: { after: 400 },
    children: [new TextRun({ text: reportDate, size: 22 })],
  }),

  // Recipient
  new Paragraph({ children: [new TextRun({ text: 'David Gillotte', bold: true, size: 26 })] }),
  new Paragraph({ children: [new TextRun({ text: 'President, IAFF Local 1014', size: 22 })] }),
  new Paragraph({ children: [new TextRun({ text: 'Los Angeles County Fire Fighters', size: 22 })] }),
  new Paragraph({ spacing: { after: 400 }, children: [new TextRun({ text: 'Los Angeles, California', size: 22 })] }),

  // Subject
  new Paragraph({
    spacing: { after: 300 },
    children: [
      new TextRun({ text: 'RE: ', bold: true, size: 22 }),
      new TextRun({ text: 'Los Angeles County Fire Department Funding Analysis', bold: true, size: 22 }),
    ],
  }),

  // Salutation
  new Paragraph({
    spacing: { after: 200 },
    children: [new TextRun({ text: 'President Gillotte,', size: 22 })],
  }),

  // Opening
  new Paragraph({
    spacing: { after: 200 },
    children: [
      new TextRun({ text: 'This report provides a comprehensive analysis of Los Angeles County Fire Department funding based on official financial data from the California State Controller\'s Office. The data spans fiscal years 2019-20 through 2024-25 and includes peer county comparisons.', size: 22 }),
    ],
  }),

  // Executive Summary Box
  new Table({
    columnWidths: [9360],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            shading: { fill: 'FFEBEE', type: ShadingType.CLEAR },
            children: [
              new Paragraph({
                spacing: { before: 150 },
                children: [new TextRun({ text: 'EXECUTIVE SUMMARY', bold: true, size: 28, color: 'B71C1C' })],
              }),
              new Paragraph({
                numbering: { reference: 'bullets', level: 0 },
                children: [
                  new TextRun({ text: 'FY 2024-25 Fire Budget: ', bold: true, size: 22 }),
                  new TextRun({ text: fmt(fireByYear['2024'] || 0), size: 22 }),
                ],
              }),
              new Paragraph({
                numbering: { reference: 'bullets', level: 0 },
                children: [
                  new TextRun({ text: '5-Year Growth (FY20 to FY25): ', bold: true, size: 22 }),
                  new TextRun({ text: `${(((fireByYear['2024'] || 0) / (fireByYear['2019'] || 1) - 1) * 100).toFixed(1)}%`, size: 22 }),
                ],
              }),
              new Paragraph({
                numbering: { reference: 'bullets', level: 0 },
                children: [
                  new TextRun({ text: 'FY 2024-25 Per Capita: ', bold: true, size: 22 }),
                  new TextRun({ text: `$${perCapita['2024']?.toFixed(2) || 'N/A'} per resident`, size: 22 }),
                ],
              }),
              new Paragraph({
                numbering: { reference: 'bullets', level: 0 },
                children: [
                  new TextRun({ text: 'County Population: ', bold: true, size: 22 }),
                  new TextRun({ text: `${population[2024]?.toLocaleString() || 'N/A'} (2024 est.)`, size: 22 }),
                ],
              }),
              new Paragraph({
                numbering: { reference: 'bullets', level: 0 },
                spacing: { after: 150 },
                children: [
                  new TextRun({ text: 'Ranking: ', bold: true, size: 22 }),
                  new TextRun({ text: '#1 largest county fire department budget in California', size: 22 }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  }),

  new Paragraph({ children: [new PageBreak()] }),

  // Title
  new Paragraph({
    heading: HeadingLevel.TITLE,
    children: [new TextRun({ text: 'LA County Fire Department', color: 'B71C1C' })],
  }),
  new Paragraph({
    heading: HeadingLevel.TITLE,
    spacing: { after: 300 },
    children: [new TextRun({ text: 'Funding Analysis Report', color: 'B71C1C' })],
  }),

  // Historical Spending Table
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun('Fire Protection Expenditures (FY 2019-2025)')],
  }),
  new Paragraph({
    spacing: { after: 200 },
    children: [new TextRun('Official expenditure data from California State Controller\'s County Financial Transactions Reports:')],
  }),
  new Table({
    columnWidths: [2500, 2500, 2000, 2360],
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          makeCell('Fiscal Year', { header: true }),
          makeCell('Fire Expenditures', { header: true, right: true }),
          makeCell('YoY Change', { header: true, center: true }),
          makeCell('Per Capita', { header: true, right: true }),
        ],
      }),
      ...['2019', '2020', '2021', '2022', '2023', '2024'].map((year, i) => {
        const spending = fireByYear[year] || 0;
        const yoy = growth[year];
        const pc = perCapita[year];
        return new TableRow({
          children: [
            makeCell(`FY ${year}-${(parseInt(year)+1).toString().slice(2)}`, { fill: i % 2 === 0 ? 'FFF3E0' : 'FFFFFF', bold: true }),
            makeCell(fmt(spending), { right: true, fill: i % 2 === 0 ? 'FFF3E0' : 'FFFFFF' }),
            makeCell(yoy ? `${yoy > 0 ? '+' : ''}${yoy.toFixed(1)}%` : '—', {
              center: true,
              fill: i % 2 === 0 ? 'FFF3E0' : 'FFFFFF',
              color: yoy > 0 ? '2E7D32' : yoy < 0 ? 'C62828' : '000000',
            }),
            makeCell(pc ? `$${pc.toFixed(2)}` : '—', { right: true, fill: i % 2 === 0 ? 'FFF3E0' : 'FFFFFF' }),
          ],
        });
      }),
    ],
  }),

  new Paragraph({ spacing: { after: 300 }, children: [] }),

  // Peer County Comparison
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun('Peer County Comparison (FY 2024-25)')],
  }),
  new Paragraph({
    spacing: { after: 200 },
    children: [new TextRun('Fire protection expenditures for major California counties:')],
  }),
  new Table({
    columnWidths: [3500, 2800, 3060],
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          makeCell('County', { header: true }),
          makeCell('FY 2023-24', { header: true, right: true }),
          makeCell('FY 2024-25', { header: true, right: true }),
        ],
      }),
      ...Object.entries(countyComparison)
        .filter(([county]) => ['Los Angeles', 'Riverside', 'San Bernardino', 'San Diego', 'Santa Clara', 'Alameda'].includes(county))
        .sort((a, b) => (b[1]['2024'] || 0) - (a[1]['2024'] || 0))
        .map(([county, years], i) => new TableRow({
          children: [
            makeCell(county, {
              fill: county === 'Los Angeles' ? 'FFCDD2' : i % 2 === 0 ? 'F5F5F5' : 'FFFFFF',
              bold: county === 'Los Angeles',
            }),
            makeCell(fmt(years['2023'] || 0), {
              right: true,
              fill: county === 'Los Angeles' ? 'FFCDD2' : i % 2 === 0 ? 'F5F5F5' : 'FFFFFF',
            }),
            makeCell(fmt(years['2024'] || 0), {
              right: true,
              fill: county === 'Los Angeles' ? 'FFCDD2' : i % 2 === 0 ? 'F5F5F5' : 'FFFFFF',
              bold: county === 'Los Angeles',
            }),
          ],
        })),
    ],
  }),

  new Paragraph({ spacing: { after: 200 }, children: [] }),

  // Note about Orange County
  new Table({
    columnWidths: [9360],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            shading: { fill: 'E3F2FD', type: ShadingType.CLEAR },
            children: [
              new Paragraph({
                spacing: { before: 100, after: 100 },
                children: [
                  new TextRun({ text: 'NOTE: ', bold: true, size: 18 }),
                  new TextRun({ text: 'Orange County and Sacramento County are not listed because their fire services are provided by separate fire authorities (OCFA, Sacramento Metro Fire) rather than county departments, so their expenditures appear under different reporting entities.', size: 18, italics: true }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  }),

  new Paragraph({ children: [new PageBreak()] }),

  // Key Findings
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun('Key Findings')],
  }),

  new Paragraph({
    spacing: { before: 150, after: 100 },
    children: [new TextRun({ text: '1. Budget Growth Trajectory', bold: true, size: 24 })],
  }),
  new Paragraph({
    spacing: { after: 150 },
    children: [
      new TextRun({ text: `LA County Fire Department expenditures have grown from ${fmt(fireByYear['2019'] || 0)} in FY 2019-20 to ${fmt(fireByYear['2024'] || 0)} in FY 2024-25, representing a `, size: 22 }),
      new TextRun({ text: `${(((fireByYear['2024'] || 0) / (fireByYear['2019'] || 1) - 1) * 100).toFixed(1)}% increase`, bold: true, size: 22 }),
      new TextRun({ text: ' over five years.', size: 22 }),
    ],
  }),

  new Paragraph({
    spacing: { before: 150, after: 100 },
    children: [new TextRun({ text: '2. Per Capita Investment', bold: true, size: 24 })],
  }),
  new Paragraph({
    spacing: { after: 150 },
    children: [
      new TextRun({ text: `Current per capita fire protection spending is `, size: 22 }),
      new TextRun({ text: `$${perCapita['2024']?.toFixed(2) || 'N/A'}`, bold: true, size: 22 }),
      new TextRun({ text: ` per resident, serving a population of ${population[2024]?.toLocaleString()} across approximately 4,084 square miles of unincorporated territory.`, size: 22 }),
    ],
  }),

  new Paragraph({
    spacing: { before: 150, after: 100 },
    children: [new TextRun({ text: '3. Statewide Leadership', bold: true, size: 24 })],
  }),
  new Paragraph({
    spacing: { after: 150 },
    children: [
      new TextRun({ text: `LA County Fire Department is the largest county fire department in California by budget, with expenditures `, size: 22 }),
      new TextRun({ text: `${((fireByYear['2024'] || 0) / (countyComparison['Riverside']?.['2024'] || 1)).toFixed(1)}x larger`, bold: true, size: 22 }),
      new TextRun({ text: ` than the next largest county (Riverside).`, size: 22 }),
    ],
  }),

  new Paragraph({
    spacing: { before: 150, after: 100 },
    children: [new TextRun({ text: '4. Year-Over-Year Growth', bold: true, size: 24 })],
  }),
  new Paragraph({
    spacing: { after: 150 },
    children: [
      new TextRun({ text: `The FY 2024-25 budget represents a ${growth['2024']?.toFixed(1) || 'N/A'}% increase over FY 2023-24, continuing the upward trend in fire protection investment.`, size: 22 }),
    ],
  }),

  new Paragraph({ children: [new PageBreak()] }),

  // Data Sources
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun('Data Sources & Methodology')],
  }),
  new Paragraph({
    spacing: { after: 150 },
    children: [
      new TextRun({ text: 'Primary Source: ', bold: true, size: 22 }),
      new TextRun({ text: 'California State Controller\'s Office', size: 22 }),
    ],
  }),
  new Paragraph({
    spacing: { after: 150 },
    children: [
      new TextRun({ text: 'Dataset: ', bold: true, size: 22 }),
      new TextRun({ text: 'County Financial Transactions Reports - Expenditures (2002-2024)', size: 22 }),
    ],
  }),
  new Paragraph({
    spacing: { after: 150 },
    children: [
      new TextRun({ text: 'Portal: ', bold: true, size: 22 }),
      new TextRun({ text: 'bythenumbers.sco.ca.gov', size: 22 }),
    ],
  }),
  new Paragraph({
    spacing: { after: 150 },
    children: [
      new TextRun({ text: 'Category: ', bold: true, size: 22 }),
      new TextRun({ text: 'Public Protection > Fire Protection (Operating Expenditures + Capital Outlay)', size: 22 }),
    ],
  }),
  new Paragraph({
    spacing: { after: 300 },
    children: [
      new TextRun({ text: 'Population Data: ', bold: true, size: 22 }),
      new TextRun({ text: 'CA State Controller Estimated Population from County Per Capita Reports', size: 22 }),
    ],
  }),

  // Closing
  new Paragraph({
    spacing: { before: 200, after: 150 },
    children: [
      new TextRun({ text: 'This data is publicly available and can be independently verified at the California State Controller\'s Open Data Portal. All figures represent official financial transactions as reported by Los Angeles County to the State Controller.', size: 22 }),
    ],
  }),

  new Paragraph({
    spacing: { before: 200 },
    children: [new TextRun({ text: 'Should you require additional analysis, historical trends, or specific breakdowns, please do not hesitate to request supplementary reports.', size: 22 })],
  }),

  new Paragraph({
    spacing: { before: 400 },
    children: [new TextRun({ text: 'Respectfully submitted,', size: 22 })],
  }),

  // Disclaimer
  new Paragraph({ spacing: { before: 400 }, children: [] }),
  new Table({
    columnWidths: [9360],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            shading: { fill: 'F5F5F5', type: ShadingType.CLEAR },
            children: [
              new Paragraph({
                spacing: { before: 100, after: 100 },
                children: [
                  new TextRun({ text: 'DISCLAIMER: ', bold: true, size: 16 }),
                  new TextRun({ text: 'This report is generated from publicly available data published by the California State Controller\'s Office. All figures reflect official County Financial Transactions Reports as filed with the State. Data is subject to revision. For the most current figures, verify at bythenumbers.sco.ca.gov.', size: 16, italics: true }),
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
        run: { size: 44, bold: true, color: 'B71C1C' },
        paragraph: { spacing: { after: 100 }, alignment: AlignmentType.CENTER },
      },
      {
        id: 'Heading1',
        name: 'Heading 1',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { size: 32, bold: true, color: 'B71C1C' },
        paragraph: { spacing: { before: 300, after: 150 }, outlineLevel: 0 },
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
                new TextRun({ text: 'IAFF Local 1014 - Confidential', italics: true, size: 18, color: '666666' }),
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
const outPath = path.join(__dirname, 'output/LA-Fire-Funding-Report.docx');
Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(outPath, buffer);
  console.log(`Report saved: ${outPath}`);
  console.log('');
  console.log('=== Report Summary ===');
  console.log(`Addressed to: David Gillotte, President IAFF Local 1014`);
  console.log(`FY 2024-25 Fire Budget: ${fmt(fireByYear['2024'] || 0)}`);
  console.log(`5-Year Growth: ${(((fireByYear['2024'] || 0) / (fireByYear['2019'] || 1) - 1) * 100).toFixed(1)}%`);
  console.log(`Per Capita (2024): $${perCapita['2024']?.toFixed(2) || 'N/A'}`);
  console.log(`Data Source: CA State Controller (bythenumbers.sco.ca.gov)`);
});
