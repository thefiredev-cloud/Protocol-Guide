/**
 * Post-ROSC Bundle Checklist Types
 * 
 * Based on 2025 AHA Guidelines and LA County 1210 Protocol
 */

export type VitalStatus = 'normal' | 'caution' | 'critical' | 'unknown';

export type ChecklistItemCategory = 
  | 'vitals'
  | 'airway'
  | 'circulation'
  | 'neuro'
  | 'transport';

export interface VitalTarget {
  /** Display name */
  name: string;
  /** Abbreviation */
  abbrev: string;
  /** Unit of measurement */
  unit: string;
  /** Normal/target range low bound */
  normalMin: number;
  /** Normal/target range high bound */
  normalMax: number;
  /** Critical low (red zone) */
  criticalLow?: number;
  /** Critical high (red zone) */
  criticalHigh?: number;
  /** Clinical note about this target */
  note: string;
  /** 2025 AHA citation */
  evidence: string;
}

export interface ChecklistItem {
  /** Unique identifier */
  id: string;
  /** Display text */
  title: string;
  /** Detailed description */
  description?: string;
  /** Category for grouping */
  category: ChecklistItemCategory;
  /** Priority (1 = highest) */
  priority: number;
  /** Recommended timing after ROSC (minutes) */
  timing?: {
    target: number;
    max?: number;
  };
  /** Related vital target if applicable */
  vitalTarget?: VitalTarget;
  /** LA County protocol reference */
  protocolRef?: string;
  /** Is this a critical/must-do item? */
  critical: boolean;
  /** Sub-items for grouped actions */
  subItems?: string[];
}

export interface ChecklistState {
  /** Items that have been completed */
  completedItems: Set<string>;
  /** ROSC timestamp */
  roscTime: number | null;
  /** Current vital values entered */
  vitalValues: Record<string, number | null>;
}

export interface CategoryMeta {
  id: ChecklistItemCategory;
  label: string;
  icon: string;
  color: string;
}

export const CATEGORY_META: CategoryMeta[] = [
  { id: 'vitals', label: 'Vital Signs', icon: 'heart.fill', color: '#EF4444' },
  { id: 'airway', label: 'Airway & Ventilation', icon: 'lungs.fill', color: '#3B82F6' },
  { id: 'circulation', label: 'Circulation', icon: 'cross.vial.fill', color: '#8B5CF6' },
  { id: 'neuro', label: 'Neuro Protection', icon: 'brain.head.profile', color: '#F59E0B' },
  { id: 'transport', label: 'Transport Decision', icon: 'location.fill', color: '#10B981' },
];

export function getCategoryMeta(category: ChecklistItemCategory): CategoryMeta {
  return CATEGORY_META.find(c => c.id === category) ?? CATEGORY_META[0];
}

/**
 * Determine vital status based on value and target ranges
 */
export function getVitalStatus(
  value: number | null | undefined,
  target: VitalTarget
): VitalStatus {
  if (value === null || value === undefined) return 'unknown';
  
  // Check critical ranges first
  if (target.criticalLow !== undefined && value < target.criticalLow) return 'critical';
  if (target.criticalHigh !== undefined && value > target.criticalHigh) return 'critical';
  
  // Check normal range
  if (value >= target.normalMin && value <= target.normalMax) return 'normal';
  
  // Everything else is caution
  return 'caution';
}

/**
 * Format elapsed time since ROSC
 */
export function formatElapsedTime(roscTime: number | null): string {
  if (!roscTime) return '--:--';
  
  const elapsed = Math.floor((Date.now() - roscTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format elapsed time as friendly text
 */
export function formatElapsedFriendly(roscTime: number | null): string {
  if (!roscTime) return 'Not started';
  
  const elapsed = Math.floor((Date.now() - roscTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  
  if (minutes === 0) return 'Just now';
  if (minutes === 1) return '1 minute';
  if (minutes < 60) return `${minutes} minutes`;
  
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  
  if (hours === 1) {
    return remainingMins > 0 ? `1 hr ${remainingMins} min` : '1 hour';
  }
  return remainingMins > 0 ? `${hours} hrs ${remainingMins} min` : `${hours} hours`;
}
