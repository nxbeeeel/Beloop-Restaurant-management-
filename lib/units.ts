export const UNIT_CATEGORIES = {
    weight: {
        label: "Weight",
        units: [
            { value: "kg", label: "Kilogram (kg)", baseUnit: "kg", factor: 1 },
            { value: "g", label: "Gram (g)", baseUnit: "kg", factor: 0.001 },
            { value: "mg", label: "Milligram (mg)", baseUnit: "kg", factor: 0.000001 },
        ]
    },
    volume: {
        label: "Volume",
        units: [
            { value: "L", label: "Liter (L)", baseUnit: "L", factor: 1 },
            { value: "ml", label: "Milliliter (ml)", baseUnit: "L", factor: 0.001 },
        ]
    },
    count: {
        label: "Count",
        units: [
            { value: "pcs", label: "Pieces", baseUnit: "pcs", factor: 1 },
            { value: "dozen", label: "Dozen", baseUnit: "pcs", factor: 12 },
        ]
    }
} as const;

export type UnitValue =
    | "kg" | "g" | "mg"
    | "L" | "ml"
    | "pcs" | "dozen";

export interface UnitInfo {
    value: UnitValue;
    label: string;
    baseUnit: string;
    factor: number;
}

// Get all units as a flat array for dropdown
export function getAllUnits(): UnitInfo[] {
    return Object.values(UNIT_CATEGORIES).flatMap(category => category.units);
}

// Get unit info by value
export function getUnitInfo(unit: string): UnitInfo | undefined {
    return getAllUnits().find(u => u.value === unit);
}

// Calculate cost per unit
export function calculateCostPerUnit(
    totalCost: number,
    quantity: number
): number {
    if (quantity === 0) return 0;
    return totalCost / quantity;
}

// Convert between units
export function convertUnits(
    value: number,
    fromUnit: string,
    toUnit: string
): number {
    const fromInfo = getUnitInfo(fromUnit);
    const toInfo = getUnitInfo(toUnit);

    if (!fromInfo || !toInfo) {
        throw new Error(`Invalid unit conversion: ${fromUnit} to ${toUnit}`);
    }

    // Can only convert within same base unit
    if (fromInfo.baseUnit !== toInfo.baseUnit) {
        throw new Error(`Cannot convert ${fromUnit} to ${toUnit} - different unit types`);
    }

    // Convert to base unit, then to target unit
    const baseValue = value * fromInfo.factor;
    return baseValue / toInfo.factor;
}

// Format unit display
export function formatUnit(value: number, unit: string): string {
    return `${value.toFixed(2)} ${unit}`;
}

// Get base unit for a given unit
export function getBaseUnit(unit: string): string {
    const info = getUnitInfo(unit);
    return info?.baseUnit || unit;
}

// Get conversion factor for a given unit
export function getConversionFactor(unit: string): number {
    const info = getUnitInfo(unit);
    return info?.factor || 1;
}
