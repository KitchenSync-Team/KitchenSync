"use client";

import { Pie, PieChart, Label, Cell } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const CHART_COLORS = [
  "#3b82f6", // blue-500
  "#8b5cf6", // violet-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#06b6d4", // cyan-500
  "#f97316", // orange-500
  "#ec4899", // pink-500
  "#84cc16", // lime-500
  "#14b8a6", // teal-500
  "#a855f7", // purple-500
  "#6366f1", // indigo-500
  "#eab308", // yellow-500
  "#64748b", // slate-500
];

type LocationEntry = { name: string; totalUnits: number };

export function LocationDonutChart({ locations }: { locations: LocationEntry[] }) {
  const data = locations.filter((l) => l.totalUnits > 0);
  const total = data.reduce((sum, l) => sum + l.totalUnits, 0);

  if (data.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No items in storage yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <ChartContainer config={{}} className="mx-auto aspect-square max-h-[180px]">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Pie
            data={data}
            dataKey="totalUnits"
            nameKey="name"
            innerRadius={52}
            outerRadius={72}
            strokeWidth={2}
          >
            {data.map((_, index) => (
              <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
            <Label
              content={({ viewBox }) => {
                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                  return (
                    <text
                      x={viewBox.cx}
                      y={viewBox.cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      <tspan
                        x={viewBox.cx}
                        y={viewBox.cy}
                        className="fill-foreground text-2xl font-bold"
                      >
                        {total}
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy ?? 0) + 20}
                        className="fill-muted-foreground text-xs"
                      >
                        items
                      </tspan>
                    </text>
                  );
                }
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>

      {/* Legend */}
      <ul className="space-y-2">
        {data.map((loc, index) => (
          <li key={loc.name} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className="inline-block size-2.5 shrink-0 rounded-full"
                style={{ background: CHART_COLORS[index % CHART_COLORS.length] }}
              />
              <span className="text-sm">{loc.name}</span>
            </div>
            <span className="text-sm font-medium tabular-nums text-muted-foreground">
              {loc.totalUnits}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
