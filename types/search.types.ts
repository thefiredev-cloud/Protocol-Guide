export type Agency = {
  id: number;
  name: string;
  state: string;
  protocolCount: number;
};

export type Message = {
  id: string;
  type: "user" | "summary" | "error";
  text: string;
  protocolTitle?: string;
  protocolNumber?: string;
  protocolYear?: number;
  sourcePdfUrl?: string | null;
  timestamp: Date;
};

export interface StateCoverage {
  state: string;
  stateCode: string;
  chunks: number;
  counties: number;
}
