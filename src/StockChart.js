import React, { useEffect } from 'react';
import { ChartCanvas, Chart } from 'react-stockcharts';
import { XAxis, YAxis } from 'react-stockcharts/lib/axes';
import { CandlestickSeries,LineSeries, BarSeries } from 'react-stockcharts/lib/series';
import { discontinuousTimeScaleProvider } from 'react-stockcharts/lib/scale';
import { CrossHairCursor,EdgeIndicator,CurrentCoordinate, MouseCoordinateX, MouseCoordinateY } from 'react-stockcharts/lib/coordinates';
import { fitWidth } from 'react-stockcharts/lib/helper';
import { format } from "d3-format";

import { timeFormat } from "d3-time-format";
import { OHLCTooltip, MovingAverageTooltip } from "react-stockcharts/lib/tooltip";

const StockChart = ({ data, width, height }) => {
  const xScaleProvider = discontinuousTimeScaleProvider.inputDateAccessor((d) => d.date);
  const { data: displayData, xScale, xAccessor, displayXAccessor } = xScaleProvider(data);
useEffect(() => {
  console.log(data);
}, [data]);
  return (
    <ChartCanvas
      width={width}
      height={height}
      ratio={1}
      margin={{ left: 50, right: 50, top: 10, bottom: 30 }}
      type="svg"
      seriesName="Candlestick Chart"
      data={displayData}
      xScale={xScale}
      xAccessor={xAccessor}
      displayXAccessor={displayXAccessor}
    >
      <Chart height={height * 0.8}
                   yExtents={[d => [d.high, d.low]]}
                   // other necessary chart props
            >
                <CandlestickSeries />
                <LineSeries yAccessor={d => d.ema26} stroke="#00f" />
                <LineSeries yAccessor={d => d.ema12} stroke="#f00" />
                <CurrentCoordinate yAccessor={d => d.close} fill="#0f0" />
                <EdgeIndicator itemType="last" orient="right" edgeAt="right"
                               yAccessor={d => d.close} fill={d => d.close > d.open ? "#6BA583" : "#FF0000"} />
                <OHLCTooltip origin={[-40, 0]} />
                <MovingAverageTooltip
                    onClick={(e) => console.log(e)}
                    origin={[-38, 15]}
                    options={[
                        {
                            yAccessor: d => d.ema26,
                            type: "EMA",
                            stroke: "#00f",
                            windowSize: 26,
                        },
                        {
                            yAccessor: d => d.ema12,
                            type: "EMA",
                            stroke: "#f00",
                            windowSize: 12,
                        },
                    ]}
                />
                <MouseCoordinateX
                    at="bottom"
                    orient="bottom"
                    displayFormat={timeFormat("%Y-%m-%d %H:%M")} />
                <MouseCoordinateY
                    at="right"
                    orient="right"
                    displayFormat={format(".2f")} />
                <YAxis axisAt="right" orient="right" ticks={5} />
            </Chart>
            {/* <Chart id={2} height={height * 0.2}
                   yExtents={d => d.volume}
                   // other necessary chart props
            >
                <BarSeries yAccessor={d => d.volume} fill={d => d.close > d.open ? "#6BA583" : "#FF0000"} />
                <XAxis axisAt="bottom" orient="bottom" />
                <MouseCoordinateX
                    at="bottom"
                    orient="bottom"
                    displayFormat={timeFormat("%Y-%m-%d %H:%M")} />
                <YAxis axisAt="left" orient="left" ticks={5} />
            </Chart> */}
            <CrossHairCursor />
    </ChartCanvas>
  );
};

export default fitWidth(StockChart);
