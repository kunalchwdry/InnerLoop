import React, { useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from 'recharts';
import { format, subDays } from 'date-fns';
import { Moon, TrendingUp } from 'lucide-react';

function sleepHours(log) {
  if (!log?.bed_time || !log?.wake_time) return 0;
  const bed = new Date(`2000-01-01T${log.bed_time}`);
  const wake = new Date(`2000-01-01T${log.wake_time}`);
  let diff = (wake - bed) / (1000 * 60 * 60);
  if (diff < 0) diff += 24;
  return diff;
}

export default function WeeklyInsights({ sleepLogs = [] }) {
  const data = useMemo(() => {
    const byDate = new Map();
    sleepLogs.forEach((log) => {
      if (log.date) byDate.set(log.date, sleepHours(log));
    });
    return Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      const key = format(d, 'yyyy-MM-dd');
      return {
        day: format(d, 'EEE'),
        hours: byDate.has(key) ? Number(byDate.get(key).toFixed(1)) : null,
      };
    });
  }, [sleepLogs]);

  const logged = data.filter((d) => d.hours != null);
  const avg = logged.length > 0 ? logged.reduce((a, b) => a + b.hours, 0) / logged.length : 0;
  const peak = logged.length > 0 ? Math.max(...logged.map((d) => d.hours)) : 0;

  return (
    <div className="bg-card rounded-3xl p-6 border border-border/60 shadow-soft">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-500/25 flex items-center justify-center">
            <Moon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Weekly Sleep</h3>
            <p className="text-xs text-muted-foreground">Last 7 nights</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-emerald-500">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="text-sm font-semibold tabular-nums">{avg.toFixed(1)}h</span>
          </div>
          <p className="text-xs text-muted-foreground">avg / night</p>
        </div>
      </div>

      <div className="h-36 mt-4 -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="sleepGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.35} />
                <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              dy={6}
            />
            <Tooltip
              cursor={{ stroke: 'hsl(var(--accent))', strokeWidth: 1, strokeDasharray: '4 4' }}
              contentStyle={{
                background: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 12,
                fontSize: 12,
                boxShadow: '0 12px 40px -8px rgb(15 23 42 / 0.18)',
              }}
              labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
              formatter={(v) => [v == null ? '—' : `${v}h`, 'Sleep']}
            />
            <Area
              type="monotone"
              dataKey="hours"
              stroke="hsl(var(--accent))"
              strokeWidth={2.5}
              fill="url(#sleepGradient)"
              connectNulls
              dot={{ r: 3, fill: 'hsl(var(--accent))', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: 'hsl(var(--accent))', strokeWidth: 2, stroke: 'hsl(var(--card))' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3 pt-4 border-t border-border/60">
        <div>
          <p className="text-xs text-muted-foreground">Best night</p>
          <p className="text-lg font-semibold text-foreground tabular-nums">{peak.toFixed(1)}h</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Nights logged</p>
          <p className="text-lg font-semibold text-foreground tabular-nums">{logged.length}/7</p>
        </div>
      </div>
    </div>
  );
}