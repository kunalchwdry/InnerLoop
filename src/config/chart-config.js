// Centralized chart styling that respects light/dark design tokens.
export const CHART_TOOLTIP = {
  backgroundColor: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '12px',
  fontSize: '12px',
  boxShadow: '0 12px 40px -8px rgb(15 23 42 / 0.18)',
  color: 'hsl(var(--foreground))',
};

export const CHART_AXIS = { fill: 'hsl(var(--muted-foreground))', fontSize: 12 };
export const CHART_GRID = { strokeDasharray: '3 3', stroke: 'hsl(var(--border))', strokeOpacity: 0.5 };

export const CHART_COLORS = {
  blue: 'hsl(var(--chart-1))',
  indigo: 'hsl(var(--chart-2))',
  emerald: 'hsl(var(--chart-3))',
  amber: 'hsl(var(--chart-4))',
  violet: 'hsl(var(--chart-5))',
};

export const PIE_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#ec4899',
];