import React from 'react';
import { View } from 'react-native';
import Svg, { Polygon, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg';

interface HexFrameProps {
  size: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  gradientColors?: [string, string];
  children?: React.ReactNode;
  style?: object;
}

export default function HexFrame({
  size,
  fill = '#0c1155',
  stroke = '#c9952a',
  strokeWidth = 2,
  gradientColors,
  children,
  style,
}: HexFrameProps) {
  const id = `hex-${size}-${fill.replace('#', '')}`;
  const pts = '50,2 93,26 93,74 50,98 7,74 7,26';

  return (
    <View
      style={[
        { width: size, height: size, alignItems: 'center', justifyContent: 'center' },
        style,
      ]}
    >
      <Svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        {gradientColors && (
          <Defs>
            <SvgGrad id={id} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={gradientColors[0]} />
              <Stop offset="1" stopColor={gradientColors[1]} />
            </SvgGrad>
          </Defs>
        )}
        <Polygon
          points={pts}
          fill={gradientColors ? `url(#${id})` : fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      </Svg>
      {children}
    </View>
  );
}
