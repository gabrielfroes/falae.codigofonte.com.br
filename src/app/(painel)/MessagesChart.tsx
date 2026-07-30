"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";

interface MessagesChartProps {
  dates: string[];
  dm: number[];
  respostas: number[];
}

export function MessagesChart({ dates, dm, respostas }: MessagesChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = echarts.init(containerRef.current);
    chart.setOption({
      tooltip: { trigger: "axis" },
      legend: { data: ["DM", "Resposta pública"], bottom: 0 },
      grid: { left: 36, right: 16, top: 24, bottom: 40, containLabel: true },
      xAxis: {
        type: "category",
        data: dates,
        axisLabel: { formatter: (value: string) => value.slice(5).replace("-", "/") },
      },
      yAxis: { type: "value", minInterval: 1 },
      series: [
        { name: "DM", type: "bar", stack: "total", data: dm, itemStyle: { color: "#111827" } },
        {
          name: "Resposta pública",
          type: "bar",
          stack: "total",
          data: respostas,
          itemStyle: { color: "#9ca3af" },
        },
      ],
    });

    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.dispose();
    };
  }, [dates, dm, respostas]);

  return <div ref={containerRef} style={{ width: "100%", height: 320 }} />;
}
