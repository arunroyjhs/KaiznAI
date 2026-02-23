'use client';

interface DataPoint {
  time: string;
  control?: number;
  treatment?: number;
  ciLower?: number;
  ciUpper?: number;
}

interface SignalChartProps {
  data: DataPoint[];
  targetValue?: number;
  killThreshold?: number;
  baselineValue?: number;
  launchDate?: string;
  title?: string;
  unit?: string;
}

export function SignalChart({
  data,
  targetValue,
  killThreshold,
  baselineValue,
  launchDate,
  title,
  unit,
}: SignalChartProps) {
  // Get value bounds for Y axis
  const allValues = data.flatMap((d) =>
    [d.control, d.treatment, d.ciLower, d.ciUpper].filter(
      (v): v is number => v !== undefined,
    ),
  );
  const refValues = [targetValue, killThreshold, baselineValue].filter(
    (v): v is number => v !== undefined,
  );
  const allNums = [...allValues, ...refValues];
  const minVal = allNums.length > 0 ? Math.min(...allNums) : 0;
  const maxVal = allNums.length > 0 ? Math.max(...allNums) : 1;
  const padding = (maxVal - minVal) * 0.1 || 0.05;
  const yMin = minVal - padding;
  const yMax = maxVal + padding;

  const chartWidth = 800;
  const chartHeight = 300;
  const marginLeft = 60;
  const marginRight = 20;
  const marginTop = 20;
  const marginBottom = 40;
  const plotWidth = chartWidth - marginLeft - marginRight;
  const plotHeight = chartHeight - marginTop - marginBottom;

  const xScale = (i: number) => marginLeft + (i / Math.max(data.length - 1, 1)) * plotWidth;
  const yScale = (v: number) =>
    marginTop + plotHeight - ((v - yMin) / (yMax - yMin)) * plotHeight;

  // Build paths
  const controlPath = data
    .map((d, i) => (d.control !== undefined ? `${i === 0 ? 'M' : 'L'}${xScale(i)},${yScale(d.control)}` : ''))
    .filter(Boolean)
    .join(' ');

  const treatmentPath = data
    .map((d, i) => (d.treatment !== undefined ? `${i === 0 ? 'M' : 'L'}${xScale(i)},${yScale(d.treatment)}` : ''))
    .filter(Boolean)
    .join(' ');

  // Confidence interval area
  const ciUpperPath = data
    .map((d, i) => (d.ciUpper !== undefined ? `${i === 0 ? 'M' : 'L'}${xScale(i)},${yScale(d.ciUpper)}` : ''))
    .filter(Boolean)
    .join(' ');
  const ciLowerPath = data
    .slice()
    .reverse()
    .map((d, i) => {
      const origIdx = data.length - 1 - i;
      return d.ciLower !== undefined ? `L${xScale(origIdx)},${yScale(d.ciLower)}` : '';
    })
    .filter(Boolean)
    .join(' ');
  const ciAreaPath = ciUpperPath && ciLowerPath ? `${ciUpperPath} ${ciLowerPath} Z` : '';

  // Grid lines (5 horizontal)
  const gridLines = Array.from({ length: 5 }, (_, i) => {
    const v = yMin + ((yMax - yMin) * i) / 4;
    return { y: yScale(v), label: v.toFixed(3) };
  });

  // Launch date marker
  const launchIdx = launchDate ? data.findIndex((d) => d.time >= launchDate) : -1;

  return (
    <div className="bg-surface rounded-lg border border-border p-5">
      {title && (
        <h3 className="text-sm font-medium text-text-primary mb-4">{title}</h3>
      )}
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto">
        {/* Grid */}
        {gridLines.map((line, i) => (
          <g key={i}>
            <line
              x1={marginLeft}
              y1={line.y}
              x2={chartWidth - marginRight}
              y2={line.y}
              stroke="#27272A"
              strokeOpacity={0.5}
              strokeWidth={1}
            />
            <text
              x={marginLeft - 8}
              y={line.y + 4}
              textAnchor="end"
              fill="#52525B"
              fontSize={11}
              fontFamily="monospace"
            >
              {line.label}
              {unit ? ` ${unit}` : ''}
            </text>
          </g>
        ))}

        {/* Target line (green dashed) */}
        {targetValue !== undefined && (
          <line
            x1={marginLeft}
            y1={yScale(targetValue)}
            x2={chartWidth - marginRight}
            y2={yScale(targetValue)}
            stroke="#10B981"
            strokeWidth={1.5}
            strokeDasharray="6 4"
          />
        )}

        {/* Kill threshold (red dashed) */}
        {killThreshold !== undefined && (
          <line
            x1={marginLeft}
            y1={yScale(killThreshold)}
            x2={chartWidth - marginRight}
            y2={yScale(killThreshold)}
            stroke="#EF4444"
            strokeWidth={1.5}
            strokeDasharray="6 4"
          />
        )}

        {/* Baseline (amber dashed) */}
        {baselineValue !== undefined && (
          <line
            x1={marginLeft}
            y1={yScale(baselineValue)}
            x2={chartWidth - marginRight}
            y2={yScale(baselineValue)}
            stroke="#F59E0B"
            strokeWidth={1.5}
            strokeDasharray="6 4"
          />
        )}

        {/* Launch marker */}
        {launchIdx >= 0 && (
          <g>
            <line
              x1={xScale(launchIdx)}
              y1={marginTop}
              x2={xScale(launchIdx)}
              y2={chartHeight - marginBottom}
              stroke="#A1A1AA"
              strokeWidth={1}
              strokeDasharray="4 3"
            />
            <text
              x={xScale(launchIdx)}
              y={marginTop - 4}
              textAnchor="middle"
              fill="#A1A1AA"
              fontSize={10}
            >
              Launch
            </text>
          </g>
        )}

        {/* Confidence interval band */}
        {ciAreaPath && (
          <path d={ciAreaPath} fill="#6366F1" fillOpacity={0.1} />
        )}

        {/* Control line */}
        {controlPath && (
          <path
            d={controlPath}
            fill="none"
            stroke="#52525B"
            strokeWidth={2}
          />
        )}

        {/* Treatment line */}
        {treatmentPath && (
          <path
            d={treatmentPath}
            fill="none"
            stroke="#6366F1"
            strokeWidth={2}
          />
        )}

        {/* X-axis labels */}
        {data
          .filter((_, i) => i % Math.ceil(data.length / 6) === 0 || i === data.length - 1)
          .map((d, i) => {
            const origIdx = data.indexOf(d);
            return (
              <text
                key={i}
                x={xScale(origIdx)}
                y={chartHeight - 8}
                textAnchor="middle"
                fill="#52525B"
                fontSize={10}
              >
                {d.time}
              </text>
            );
          })}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-3 text-xs text-text-muted">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-[#52525B]" />
          <span>Control</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-[#6366F1]" />
          <span>Treatment</span>
        </div>
        {targetValue !== undefined && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 border-t border-dashed border-[#10B981]" />
            <span>Target</span>
          </div>
        )}
        {baselineValue !== undefined && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 border-t border-dashed border-[#F59E0B]" />
            <span>Baseline</span>
          </div>
        )}
      </div>
    </div>
  );
}
