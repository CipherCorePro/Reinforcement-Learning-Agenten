
import React from 'react';

interface GaugeProps {
    label: string;
    value: number;
    min?: number;
    max?: number;
    color?: string;
}

const Gauge: React.FC<GaugeProps> = ({ label, value, min = 0, max = 1, color = '#22d3ee' }) => {
    const size = 80;
    const strokeWidth = 8;
    const center = size / 2;
    const radius = center - strokeWidth;
    const circumference = 2 * Math.PI * radius;

    const range = max - min;
    const correctedValue = value - min;
    const percentage = Math.max(0, Math.min(1, correctedValue / range));

    const offset = circumference - percentage * circumference;

    return (
        <div className="flex flex-col items-center justify-center gap-1">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke="#374151"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${center} ${center})`}
                    style={{ transition: 'stroke-dashoffset 0.3s ease-in-out' }}
                />
                <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dy=".3em"
                    className="text-lg font-bold fill-current text-white"
                >
                    {value.toFixed(1)}
                </text>
            </svg>
            <span className="text-xs font-medium text-gray-400">{label}</span>
        </div>
    );
};

export default Gauge;
