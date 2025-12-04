// Purchase Units (Physical counting - what staff counts)
export const PURCHASE_UNITS = {
    container: {
        label: "Containers",
        units: [
            { value: "tub", label: "Tub" },
            { value: "bottle", label: "Bottle" },
            { value: "jar", label: "Jar" },
            { value: "can", label: "Can" },
        ]
    },
    packaging: {
        label: "Packaging",
        units: [
            { value: "bag", label: "Bag" },
            { value: "box", label: "Box" },
            { value: "packet", label: "Packet" },
            { value: "carton", label: "Carton" },
        ]
    },
    bakery: {
        label: "Bakery/Custom",
        units: [
            { value: "layer", label: "Layer" },
            { value: "sheet", label: "Sheet" },
            { value: "slice", label: "Slice" },
        ]
    }
} as const;

// Usage Units (Recipe/Consumption - what recipes use)
export const USAGE_UNITS = {
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
    custom: {
        label: "Custom/Bakery",
        units: [
            { value: "scoop", label: "Scoop", baseUnit: "scoop", factor: 1 },
            { value: "layer", label: "Layer", baseUnit: "layer", factor: 1 },
            { value: "sheet", label: "Sheet", baseUnit: "sheet", factor: 1 },
            { value: "slice", label: "Slice", baseUnit: "slice", factor: 1 },
        ]
    }
} as const;

export type PurchaseUnitValue =
    | "tub" | "bottle" | "jar" | "can"
    | "bag" | "box" | "packet" | "carton"
    | "pcs" | "dozen"
    | "layer" | "sheet" | "slice";

export type UsageUnitValue =
    | "kg" | "g" | "mg"
    | "L" | "ml"
    | "scoop" | "layer" | "sheet" | "slice";

export interface UsageUnitInfo {
    value: UsageUnitValue;
    label: string;
    baseUnit: string;
    factor: number;
}

// Get all purchase units as flat array
export function getAllPurchaseUnits() {
    return Object.values(PURCHASE_UNITS).flatMap(category => category.units as readonly any[]);
}

// Get all usage units as flat array
export function getAllUsageUnits(): UsageUnitInfo[] {
    return Object.values(USAGE_UNITS).flatMap(category => category.units as readonly any[]) as unknown as UsageUnitInfo[];
}

// Get usage unit info by value
export function getUsageUnitInfo(unit: string): UsageUnitInfo | undefined {
    return getAllUsageUnits().find(u => u.value === unit);
}

// Calculate cost per usage unit from purchase cost
// Example: ₹3007.50 per tub ÷ 2.5 kg per tub = ₹1203/kg
export function calculateCostPerUsageUnit(
    costPerPurchaseUnit: number,
    qtyPerUnit: number
): number {
    if (qtyPerUnit === 0) return 0;
    return costPerPurchaseUnit / qtyPerUnit;
}

// Convert stock from purchase units to usage units
// Example: 3 tubs × 2.5 kg/tub = 7.5 kg
export function convertStockToUsageUnits(
    stockInPurchaseUnits: number,
    qtyPerUnit: number
): number {
    return stockInPurchaseUnits * qtyPerUnit;
}

// Convert usage amount to purchase units for stock deduction
// Example: 50g ÷ 2500g/tub = 0.02 tubs
export function convertUsageToPurchaseUnits(
    usageAmount: number,
    qtyPerUnit: number
): number {
    if (qtyPerUnit === 0) return 0;
    return usageAmount / qtyPerUnit;
}

// Convert between usage units (e.g., g to kg)
export function convertBetweenUsageUnits(
    value: number,
    fromUnit: string,
    toUnit: string
): number {
    const fromInfo = getUsageUnitInfo(fromUnit);
    const toInfo = getUsageUnitInfo(toUnit);

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

// Format dual unit display
// Example: "3 tubs (7.5 kg)"
export function formatDualUnit(
    purchaseStock: number,
    purchaseUnit: string,
    qtyPerUnit: number,
    usageUnit: string
): string {
    const usageStock = convertStockToUsageUnits(purchaseStock, qtyPerUnit);
    return `${purchaseStock.toFixed(2)} ${purchaseUnit} (${usageStock.toFixed(2)} ${usageUnit})`;
}

// Get base unit for a given usage unit
export function getBaseUnit(unit: string): string {
    const info = getUsageUnitInfo(unit);
    return info?.baseUnit || unit;
}

// Get conversion factor for a given usage unit
export function getConversionFactor(unit: string): number {
    const info = getUsageUnitInfo(unit);
    return info?.factor || 1;
}
