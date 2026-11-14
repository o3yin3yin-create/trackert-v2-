"use client";
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const CustomCursor = ({ x, y, width, height }) => (
  <rect
    x={x - 4}
    y={y}
    width={width + 8}
    height={height}
    rx={16}
    ry={16}
    fill="url(#cursorGradient)"
  />
);

export default function SleepBarChart({ data, themeColor }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} barGap={4} barCategoryGap={8}>
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#8E8E93', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em' }}
          dy={10}
        />
        <YAxis yAxisId="score" orientation="right" hide domain={[0, 100]} />
        <YAxis yAxisId="focus" orientation="right" hide domain={[0, 180]} />

        <Tooltip
          cursor={<CustomCursor />}
          contentStyle={{
            backgroundColor: '#1C1C1E',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            color: '#FFFFFF',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          }}
          itemStyle={{ color: '#FFFFFF', fontWeight: 600, fontSize: '12px' }}
          formatter={(value, name) => {
            if (name === 'Focus') return [`${value} min`, 'Focus'];
            return [`${value.toFixed(0)}%`, 'Score'];
          }}
        />

        <Bar yAxisId="score" dataKey="score" fill={themeColor} radius={[3, 3, 3, 3]} barSize={6} name="Score" />
        <Bar yAxisId="focus" dataKey="focus" fill="#22d3ee" radius={[3, 3, 3, 3]} barSize={6} name="Focus" />
      </BarChart>
    </ResponsiveContainer>
  );
}
