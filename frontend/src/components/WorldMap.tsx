/**
 * 世界地图组件
 */

import React from 'react';
import { Tooltip } from 'antd';

interface WorldMapProps {
  data: Record<string, number>;
  interactive?: boolean;
  showTooltip?: boolean;
  colorScheme?: string;
  onClick?: (country: string) => void;
}

export const WorldMap: React.FC<WorldMapProps> = ({
  data,
  interactive = false,
  showTooltip = false,
  colorScheme = 'blue',
  onClick
}) => {
  // 简化的世界地图实现
  const countries = Object.entries(data);
  const maxValue = Math.max(...Object.values(data));

  const getCountryColor = (value: number) => {
    const intensity = value / maxValue;
    const opacity = Math.max(0.2, intensity);
    return `rgba(24, 144, 255, ${opacity})`;
  };

  return (
    <div className="world-map" style={{ width: '100%', height: '400px', position: 'relative' }}>
      <svg width="100%" height="100%" viewBox="0 0 800 400">
        {countries.map(([countryCode, value], index) => {
          const x = (index % 10) * 80;
          const y = Math.floor(index / 10) * 40;
          
          const rect = (
            <rect
              key={countryCode}
              x={x}
              y={y}
              width={70}
              height={30}
              fill={getCountryColor(value)}
              stroke="#fff"
              strokeWidth={1}
              style={{ cursor: interactive ? 'pointer' : 'default' }}
              onClick={() => interactive && onClick?.(countryCode)}
            />
          );

          if (showTooltip) {
            return (
              <Tooltip key={countryCode} title={`${countryCode}: ${value}`}>
                {rect}
              </Tooltip>
            );
          }

          return rect;
        })}
      </svg>
      
      <div style={{ marginTop: '16px', textAlign: 'center' }}>
        <small>全球分布地图 - {countries.length} 个国家</small>
      </div>
    </div>
  );
};