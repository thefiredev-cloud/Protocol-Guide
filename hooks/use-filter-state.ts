import { useState, useEffect, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import type { Agency, StateCoverage } from "@/types/search.types";

interface UseFilterStateOptions {
  initialState?: string | null;
  initialAgencyId?: number | null;
}

export function useFilterState(options: UseFilterStateOptions = {}) {
  // Default to California for LA County focus - user can change via filter
  const { initialState = "CA", initialAgencyId = null } = options;
  const [selectedState, setSelectedState] = useState<string | null>(initialState);
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [showAgencyDropdown, setShowAgencyDropdown] = useState(false);
  const initialAgencyIdRef = useRef(initialAgencyId);

  const [statesData, setStatesData] = useState<StateCoverage[]>([]);
  const [statesLoading, setStatesLoading] = useState(true);
  const [agenciesData, setAgenciesData] = useState<Agency[]>([]);
  const [agenciesLoading, setAgenciesLoading] = useState(false);

  // tRPC queries
  const { data: coverageData, isLoading: coverageLoading, error: coverageError } =
    trpc.search.coverageByState.useQuery();
  const { data: agenciesResult, isLoading: agenciesQueryLoading } =
    trpc.search.agenciesByState.useQuery(
      { state: selectedState || '' },
      { enabled: !!selectedState }
    );

  // Transform coverage data
  useEffect(() => {
    if (coverageData) {
      const sortedStates = coverageData
        .filter((s: StateCoverage) => s.chunks > 0)
        .sort((a: StateCoverage, b: StateCoverage) => a.state.localeCompare(b.state));
      setStatesData(sortedStates);
    }
    setStatesLoading(coverageLoading);
  }, [coverageData, coverageLoading]);

  // Transform agencies
  useEffect(() => {
    if (!selectedState) {
      setAgenciesData([]);
      return;
    }
    if (agenciesResult) {
      const agencies: Agency[] = agenciesResult
        .filter((a: { id: number | null; protocolCount: number }) => a.id != null && a.protocolCount > 0)
        .map((a: { id: number; name: string; state: string; protocolCount: number }) => ({
          id: a.id,
          name: a.name,
          state: a.state,
          protocolCount: a.protocolCount,
        }))
        .sort((a: Agency, b: Agency) => (b.protocolCount ?? 0) - (a.protocolCount ?? 0));
      setAgenciesData(agencies);
      
      // Set initial agency from route params if provided
      if (initialAgencyIdRef.current && !selectedAgency) {
        const matchingAgency = agencies.find(a => a.id === initialAgencyIdRef.current);
        if (matchingAgency) {
          setSelectedAgency(matchingAgency);
          initialAgencyIdRef.current = null; // Clear so it doesn't re-trigger
        }
      }
    }
    setAgenciesLoading(agenciesQueryLoading);
  }, [selectedState, agenciesResult, agenciesQueryLoading, selectedAgency]);

  // Reset agency when state changes
  useEffect(() => {
    setSelectedAgency(null);
  }, [selectedState]);

  const handleClearFilters = useCallback(() => {
    setSelectedState(null);
    setSelectedAgency(null);
  }, []);

  return {
    selectedState,
    setSelectedState,
    selectedAgency,
    setSelectedAgency,
    showStateDropdown,
    setShowStateDropdown,
    showAgencyDropdown,
    setShowAgencyDropdown,
    statesData,
    statesLoading,
    agenciesData,
    agenciesLoading,
    coverageError,
    handleClearFilters,
  };
}
