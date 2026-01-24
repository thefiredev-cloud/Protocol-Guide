import { useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const FAVORITES_KEY = "protocol_guide_favorites";

export interface FavoriteProtocol {
  id: number;
  protocolNumber: string;
  protocolTitle: string;
  section: string | null;
  content: string;
  agencyName?: string;
  savedAt: string;
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteProtocol[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Use ref to always access current favorites without causing re-renders
  const favoritesRef = useRef<FavoriteProtocol[]>([]);

  // Keep ref in sync with state
  useEffect(() => {
    favoritesRef.current = favorites;
  }, [favorites]);

  const loadFavorites = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(FAVORITES_KEY);
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error loading favorites:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load favorites on mount
  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const addFavorite = useCallback(async (protocol: Omit<FavoriteProtocol, "savedAt">) => {
    try {
      setFavorites(prevFavorites => {
        const newFavorite: FavoriteProtocol = {
          ...protocol,
          savedAt: new Date().toISOString(),
        };

        const updated = [newFavorite, ...prevFavorites.filter((f) => f.id !== protocol.id)];
        AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated)).catch(console.error);
        return updated;
      });
    } catch (error) {
      console.error("Error adding favorite:", error);
    }
  }, []);

  const removeFavorite = useCallback(async (protocolId: number) => {
    try {
      setFavorites(prevFavorites => {
        const updated = prevFavorites.filter((f) => f.id !== protocolId);
        AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated)).catch(console.error);
        return updated;
      });
    } catch (error) {
      console.error("Error removing favorite:", error);
    }
  }, []);

  // Use ref to avoid recreating this callback on every favorites change
  const isFavorite = useCallback((protocolId: number) => {
    return favoritesRef.current.some((f) => f.id === protocolId);
  }, []);

  const toggleFavorite = useCallback(async (protocol: Omit<FavoriteProtocol, "savedAt">) => {
    // Check current state using ref to avoid stale closure
    if (favoritesRef.current.some((f) => f.id === protocol.id)) {
      await removeFavorite(protocol.id);
    } else {
      await addFavorite(protocol);
    }
  }, [addFavorite, removeFavorite]);

  return {
    favorites,
    isLoading,
    addFavorite,
    removeFavorite,
    isFavorite,
    toggleFavorite,
    refreshFavorites: loadFavorites,
  };
}
