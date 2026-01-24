export type SearchResult = {
  id: number;
  protocolNumber: string;
  protocolTitle: string;
  section: string | null;
  content: string;
  fullContent: string;
  sourcePdfUrl: string | null;
  relevanceScore: number;
  countyId: number;
  // Protocol currency information
  protocolEffectiveDate: string | null;
  lastVerifiedAt: string | null;
  protocolYear: number | null;
};
