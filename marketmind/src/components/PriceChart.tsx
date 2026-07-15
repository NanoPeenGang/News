"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart, ColorType, IChartApi, ISeriesApi, LineStyle, Time, CandlestickData, HistogramData,
} from "lightweight-charts";
import { ema, vwap as vwapSeries } from "@/lib/indicators";

export interface ChartBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartLevels {
  entryLow?: number;
  entryHigh?: number;
  stopLoss?: number;
  target1?: number;
  target2?: number;
}

interface Props {
  bars: ChartBar[];
  levels?: ChartLevels;
  livePrice?: number;
  height?: number;
  showEma?: boolean;
  showVwap?: boolean;
}

export function PriceChart({ bars, levels, livePrice, height = 420, showEma = true, showVwap = true }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [zoneBox, setZoneBox] = useState<{ top: number; height: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current || bars.length === 0) return;
    const el = containerRef.current;

    const chart = createChart(el, {
      width: el.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#7C8AA0",
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.03)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      crosshair: {
        vertLine: { color: "rgba(45,212,191,0.3)", labelBackgroundColor: "#0D9488" },
        horzLine: { color: "rgba(45,212,191,0.3)", labelBackgroundColor: "#0D9488" },
      },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.07)" },
      timeScale: { borderColor: "rgba(255,255,255,0.07)", timeVisible: true, secondsVisible: false },
    });
    chartRef.current = chart;

    const candles = chart.addCandlestickSeries({
      upColor: "#22C55E",
      downColor: "#EF4444",
      borderUpColor: "#22C55E",
      borderDownColor: "#EF4444",
      wickUpColor: "rgba(34,197,94,0.6)",
      wickDownColor: "rgba(239,68,68,0.6)",
    });
    candleRef.current = candles;
    const candleData: CandlestickData[] = bars.map((b) => ({
      time: b.time as Time, open: b.open, high: b.high, low: b.low, close: b.close,
    }));
    candles.setData(candleData);

    const volume = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
    });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    volume.setData(
      bars.map<HistogramData>((b) => ({
        time: b.time as Time,
        value: b.volume,
        color: b.close >= b.open ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)",
      }))
    );

    const closes = bars.map((b) => b.close);
    const addLine = (values: number[], color: string, width: 1 | 2 = 1) => {
      const s = chart.addLineSeries({ color, lineWidth: width, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
      s.setData(
        values.map((v, i) => ({ time: bars[i].time as Time, value: v })).filter((p) => isFinite(p.value) && !isNaN(p.value))
      );
      return s;
    };
    if (showEma) {
      addLine(ema(closes, 9), "rgba(45,212,191,0.7)");
      addLine(ema(closes, 21), "rgba(96,165,250,0.6)");
      addLine(ema(closes, 50), "rgba(245,158,11,0.5)");
    }
    if (showVwap) {
      addLine(vwapSeries(bars), "rgba(217,70,239,0.55)", 2);
    }

    if (levels) {
      const pl = (price: number | undefined, color: string, title: string, style = LineStyle.Dashed) => {
        if (price === undefined) return;
        candles.createPriceLine({ price, color, lineWidth: 1, lineStyle: style, axisLabelVisible: true, title });
      };
      pl(levels.entryLow, "#2DD4BF", "Entry Low", LineStyle.Solid);
      pl(levels.entryHigh, "#2DD4BF", "Entry High", LineStyle.Solid);
      pl(levels.stopLoss, "#EF4444", "Stop");
      pl(levels.target1, "#22C55E", "T1 · 2R");
      pl(levels.target2, "#22C55E", "T2 · 3R");
    }

    chart.timeScale().fitContent();

    // Shaded entry-zone band, tracked to chart coordinates
    const updateZone = () => {
      if (!levels?.entryLow || !levels?.entryHigh) return setZoneBox(null);
      const top = candles.priceToCoordinate(levels.entryHigh);
      const bottom = candles.priceToCoordinate(levels.entryLow);
      if (top === null || bottom === null) return setZoneBox(null);
      setZoneBox({ top, height: Math.max(bottom - top, 2) });
    };
    updateZone();
    const sub = chart.timeScale().subscribeVisibleLogicalRangeChange(updateZone);
    const interval = setInterval(updateZone, 500);

    const onResize = () => {
      chart.applyOptions({ width: el.clientWidth });
      updateZone();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(el);

    return () => {
      clearInterval(interval);
      ro.disconnect();
      void sub;
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bars, levels?.entryLow, levels?.entryHigh, levels?.stopLoss, levels?.target1, levels?.target2, height, showEma, showVwap]);

  // Stream the live price into the last candle
  useEffect(() => {
    if (!candleRef.current || !livePrice || bars.length === 0) return;
    const lastBar = bars[bars.length - 1];
    candleRef.current.update({
      time: lastBar.time as Time,
      open: lastBar.open,
      high: Math.max(lastBar.high, livePrice),
      low: Math.min(lastBar.low, livePrice),
      close: livePrice,
    });
  }, [livePrice, bars]);

  if (bars.length === 0) return <div className="skeleton w-full" style={{ height }} />;

  return (
    <div className="relative w-full overflow-hidden rounded-lg" style={{ height }}>
      <div ref={containerRef} className="h-full w-full" />
      {zoneBox && (
        <div
          className="pointer-events-none absolute left-0 right-16 border-y border-teal-glow/30 bg-teal-glow/[0.07]"
          style={{ top: zoneBox.top, height: zoneBox.height }}
        />
      )}
    </div>
  );
}
