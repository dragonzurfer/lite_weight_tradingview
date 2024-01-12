import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { format } from "d3-format";
import { timeFormat } from "d3-time-format";
import { ChartCanvas, Chart } from "react-stockcharts";
import { BarSeries, AreaSeries, CandlestickSeries, LineSeries } from "react-stockcharts/lib/series";
import { XAxis, YAxis } from "react-stockcharts/lib/axes";
import { CrossHairCursor, EdgeIndicator, CurrentCoordinate, MouseCoordinateX, MouseCoordinateY } from "react-stockcharts/lib/coordinates";
import { discontinuousTimeScaleProviderBuilder } from "react-stockcharts/lib/scale";
import { OHLCTooltip, MovingAverageTooltip } from "react-stockcharts/lib/tooltip";
import { ema, sma, macd } from "react-stockcharts/lib/indicator";
import { fitWidth } from "react-stockcharts/lib/helper";
import { fetchCandleData } from "./utils";

const LENGTH_TO_SHOW = 180;
const macdAppearance = { /* ... */ };

function getMaxUndefined(calculators) {
    return calculators.map(each => each.undefinedLength()).reduce((a, b) => Math.max(a, b));
}

function getChartProps(data,maxWindowSize,ema12,ema26,smaVolume50) {
    const dataToCalculate = data.slice(-LENGTH_TO_SHOW - maxWindowSize);
    const calculatedData = ema26(ema12(smaVolume50(dataToCalculate)));
    const indexCalculator = discontinuousTimeScaleProviderBuilder().indexCalculator();
    const { index } = indexCalculator(calculatedData);
    /* SERVER - END */

    const xScaleProvider = discontinuousTimeScaleProviderBuilder()
        .withIndex(index);
    const { data: linearData, xScale, xAccessor, displayXAccessor } = xScaleProvider(calculatedData.slice(-LENGTH_TO_SHOW));
    return { linearData, xScale, xAccessor, displayXAccessor };
}

const CandleStickChartPanToLoadMore = ({ symbol, timeFrame,initialData, width, height,onUpdateData }) => {
    const [data, setData] = useState([]);
    const [loadingMoreData, setLoadingMoreData] = useState(false);
    const [xScale, setXScale] = useState();
    const [xAccessor, setXAccessor] = useState();
    const [displayXAccessor, setDisplayXAccessor] = useState();

    const ema26 = ema().id(0).options({ windowSize: 26 }).merge((d, c) => {d.ema26 = c;}).accessor(d => d.ema26);
    const ema12 = ema().id(1).options({ windowSize: 12 }).merge((d, c) => {d.ema12 = c;}).accessor(d => d.ema12);
    const macdCalc = macd().options({ fast: 12, slow: 26, signal: 9 }).merge((d, c) => {d.macd = c;}).accessor(d => d.macd);
    const smaVolume50 = sma().id(3).options({ windowSize: 50, sourcePath: "volume" }).merge((d, c) => {d.smaVolume50 = c;}).accessor(d => d.smaVolume50);
    const maxWindowSize = getMaxUndefined([ema26, ema12, macdCalc, smaVolume50]);
    useEffect(() => {
		const { linearData, xScale, xAccessor, displayXAccessor } = getChartProps(initialData,maxWindowSize,ema12,ema26,smaVolume50);
        setData([...linearData]);
        setXScale(() => xScale);
        setXAccessor(() => xAccessor);
        setDisplayXAccessor(() => displayXAccessor);
        console.log("init data",initialData.length,initialData[initialData.length-1].close);
    }, [symbol, timeFrame, initialData]);

    if (!data || !xScale || !xAccessor || !displayXAccessor) {
        // console.log(initialData);
        console.log(xScale);
        return <div>Loading chart...</div>; // Render a loading state or null
    }

    // Render chart with necessary props and components
    return (
        <ChartCanvas key={data.length} ratio={1} width={width} height={height}
        margin={{ left: 70, right: 70, top: 20, bottom: 30 }} type="hybrid"
        seriesName="MSFT"
        data={data}
        xScale={xScale} xAccessor={xAccessor} displayXAccessor={displayXAccessor}>
				<Chart id={1} height={height*0.8}
						yExtents={[d => [d.high, d.low], ema26.accessor(), ema12.accessor()]}
						padding={{ top: 10, bottom: 20 }}>
					{/* <XAxis axisAt="bottom" orient="bottom" showTicks={false} outerTickSize={0} /> */}
					<YAxis axisAt="right" orient="right" ticks={2} />

					<MouseCoordinateX
						at="bottom"
						orient="bottom"
						displayFormat={timeFormat("%Y-%m-%d %H:%M")} />
					<MouseCoordinateY
						at="right"
						orient="right"
						displayFormat={format(".2f")} />

					<CandlestickSeries />
					{/* <LineSeries yAccessor={ema26.accessor()} stroke={ema26.stroke()}/>
					<LineSeries yAccessor={ema12.accessor()} stroke={ema12.stroke()}/> */}

					<CurrentCoordinate yAccessor={ema26.accessor()} fill={ema26.stroke()} />
					<CurrentCoordinate yAccessor={ema12.accessor()} fill={ema12.stroke()} />

					<EdgeIndicator itemType="last" orient="right" edgeAt="right"
						yAccessor={d => d.close} fill={d => d.close > d.open ? "#6BA583" : "#FF0000"}/>

					<OHLCTooltip origin={[-40, 0]}/>
					<MovingAverageTooltip
						onClick={(e) => console.log(e)}
						origin={[-38, 15]}
						options={[
							{
								yAccessor: ema26.accessor(),
								type: ema26.type(),
								stroke: ema26.stroke(),
								...ema26.options(),
							},
							{
								yAccessor: ema12.accessor(),
								type: ema12.type(),
								stroke: ema12.stroke(),
								...ema12.options(),
							},
						]}
						/>
				</Chart>
				<Chart id={2} height={height*0.2}
						yExtents={[d => d.volume, smaVolume50.accessor()]}
						origin={(w, h) => [0, h - 300]}>
					<YAxis axisAt="left" orient="left" ticks={5} tickFormat={format(".2s")}/>

					<MouseCoordinateY
						at="left"
						orient="left"
						displayFormat={format(".4s")} />

					<BarSeries yAccessor={d => d.volume} fill={d => d.close > d.open ? "#6BA583" : "#FF0000"} />
					<AreaSeries yAccessor={smaVolume50.accessor()} stroke={smaVolume50.stroke()} fill={smaVolume50.fill()}/>
					<XAxis axisAt="bottom" orient="bottom"/>
				</Chart>
				<CrossHairCursor />
			</ChartCanvas>

    );
    
};

CandleStickChartPanToLoadMore.propTypes = {
    symbol: PropTypes.string.isRequired,
    timeFrame: PropTypes.string.isRequired,
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
};

export default fitWidth(CandleStickChartPanToLoadMore);
