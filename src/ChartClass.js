
import { format } from "d3-format";
import { timeFormat } from "d3-time-format";

import React from "react";
import PropTypes from "prop-types";

import { ChartCanvas, Chart } from "react-stockcharts";
import {
	BarSeries,
	AreaSeries,
	CandlestickSeries,
	LineSeries,
	MACDSeries,
} from "react-stockcharts/lib/series";
import { XAxis, YAxis } from "react-stockcharts/lib/axes";
import {
	CrossHairCursor,
	EdgeIndicator,
	CurrentCoordinate,
	MouseCoordinateX,
	MouseCoordinateY,
} from "react-stockcharts/lib/coordinates";

import { discontinuousTimeScaleProviderBuilder } from "react-stockcharts/lib/scale";
import { OHLCTooltip, MovingAverageTooltip, MACDTooltip } from "react-stockcharts/lib/tooltip";
import { ema, sma, macd } from "react-stockcharts/lib/indicator";
import { fitWidth } from "react-stockcharts/lib/helper";
import { fetchCandleData } from "./utils";

function getMaxUndefined(calculators) {
	return calculators.map(each => each.undefinedLength()).reduce((a, b) => Math.max(a, b));
}
const LENGTH_TO_SHOW = 180;

const macdAppearance = {
	stroke: {
		macd: "#FF0000",
		signal: "#00F300",
	},
	fill: {
		divergence: "#4682B4"
	},
};

class CandleStickChartPanToLoadMore extends React.Component {
	constructor(props) {
		super(props);
		const { data: inputData, symbol,timeFrame,width,height } = props;

		const ema26 = ema()
			.id(0)
			.options({ windowSize: 26 })
			.merge((d, c) => {d.ema26 = c;})
			.accessor(d => d.ema26);

		const ema12 = ema()
			.id(1)
			.options({ windowSize: 12 })
			.merge((d, c) => {d.ema12 = c;})
			.accessor(d => d.ema12);

		const macdCalculator = macd()
			.options({
				fast: 12,
				slow: 26,
				signal: 9,
			})
			.merge((d, c) => {d.macd = c;})
			.accessor(d => d.macd);

		const smaVolume50 = sma()
			.id(3)
			.options({
				windowSize: 50,
				sourcePath: "volume",
			})
			.merge((d, c) => {d.smaVolume50 = c;})
			.accessor(d => d.smaVolume50);

		const maxWindowSize = getMaxUndefined([ema26,
			ema12,
			macdCalculator,
			smaVolume50
		]);
		/* SERVER - START */
		const dataToCalculate = inputData.slice(-LENGTH_TO_SHOW - maxWindowSize);

		const calculatedData = ema26(ema12(macdCalculator(smaVolume50(dataToCalculate))));
		const indexCalculator = discontinuousTimeScaleProviderBuilder().indexCalculator();

		// console.log(inputData.length, dataToCalculate.length, maxWindowSize)
		const { index } = indexCalculator(calculatedData);
		console.log("This is index",index);
		/* SERVER - END */

		const xScaleProvider = discontinuousTimeScaleProviderBuilder()
			.withIndex(index);
		const { data: linearData, xScale, xAccessor, displayXAccessor } = xScaleProvider(calculatedData.slice(-LENGTH_TO_SHOW));

		// console.log(head(linearData), last(linearData))
		// console.log(linearData.length)

		this.state = {
			ema26,
			ema12,
			macdCalculator,
			smaVolume50,
			linearData,
			symbol:symbol,
			timeFrame: timeFrame,
			width:width,
			height:height,
			data: linearData,
			xScale,
			xAccessor, displayXAccessor
		};
		this.handleDownloadMore = this.handleDownloadMore.bind(this);
	}

	handleDownloadMore = async (start, end) => {
		if (this.state.loadingMoreData) {
			// Exit early if we are already loading data
			return;
		  }
		
		  this.setState({ loadingMoreData: true });
		
		  try {
			// Find the earliest date in the current dataset
			const earliestDate = this.state.data[0].date;
		
			// Calculate the new start date to fetch from (7 days before the earliest date)
			const startDate = new Date(earliestDate);
			startDate.setDate(startDate.getDate() - 7);
		
			// Format dates to 'YYYY-MM-DD HH:MM:SS' format
			const fromDateString = startDate.toISOString().slice(0, 19).replace('T', ' ');
			const toDateString = earliestDate.toISOString().slice(0, 19).replace('T', ' ');
		
			// Fetch more data
			const moreData = await fetchCandleData(this.state.symbol,this.state.timeFrame,fromDateString, toDateString);
		
			// Combine new data with existing data
			const combinedData = moreData.concat(this.state.data);
	
		  	// Update the state with the combined data
		  	const { ema26, ema12, macdCalculator, smaVolume50 } = this.state;

  			// Recalculate the scale with the new combined data
			const calculatedData = ema26(ema12(macdCalculator(smaVolume50(combinedData))));
			const indexCalculator = discontinuousTimeScaleProviderBuilder().indexCalculator();

			// Recalculate the index with the newly combined data
			const { index } = indexCalculator(calculatedData);
			const xScaleProvider = discontinuousTimeScaleProviderBuilder().withIndex(index);
			const { data: linearData, xScale, xAccessor, displayXAccessor } = xScaleProvider(calculatedData);

  			// Update the state with the new data and the recalculated scale
			this.setState({
					data: linearData, // This is the combined data with the recalculated indices
					xScale,
					xAccessor,
					displayXAccessor,
					loadingMoreData: false,
				}, () => {
				// After the state has been updated, adjust the xScale domain to create a buffer
				const { xScale, xAccessor, data } = this.state;
				this.props.onUpdateData(this.state.data);
				const totalPoints = data.length;
				const bufferPoints = 5; // Number of points to leave as a buffer to the right
				const startPoint = xAccessor(data[Math.max(0, totalPoints - bufferPoints)]);
				const endPoint = xAccessor(data[totalPoints - 1]);

				// Set the visible scale domain to show data up to the buffer
				xScale.domain([startPoint, endPoint]);

				// Force update to re-render the chart with the new domain
				this.forceUpdate();
			});
		} catch (error) {
		  console.error('Error fetching more candle data:', error);
		  this.setState({ loadingMoreData: false });
		}
	};
	componentDidUpdate(prevProps) {
		if(this.props.data != null) {
			if (this.props.data !== prevProps.data) {
				this.setState({
					width:this.props.width,
					height:this.props.height
				});
				// Update the state with new data
				// You might need to re-calculate anything that depends on the data
				const newData = this.props.data;
		
				// Example: Re-calculating using your existing methods
				const calculatedData = this.state.ema26(this.state.ema12(this.state.macdCalculator(this.state.smaVolume50(newData))));
				const xScaleProvider = discontinuousTimeScaleProviderBuilder().withIndex(this.state.index);
				const { data: linearData, xScale, xAccessor, displayXAccessor } = xScaleProvider(calculatedData);
				// console.log("setting:",linearData,this.props.timeFrame);
				this.setState({
					data: linearData,
					xScale,
					xAccessor,
					displayXAccessor,
					width:this.props.width,
					height:this.props.height,
				});
			}
			if(this.props.timeFrame != this.state.timeFrame) {
				const newData = this.props.data;
		
				// Example: Re-calculating using your existing methods
				const calculatedData = this.state.ema26(this.state.ema12(this.state.macdCalculator(this.state.smaVolume50(newData))));
				const xScaleProvider = discontinuousTimeScaleProviderBuilder().withIndex(this.state.index);
				const { data: linearData, xScale, xAccessor, displayXAccessor } = xScaleProvider(calculatedData);
				// console.log("setting:",linearData,this.props.timeFrame);
				this.setState({
					data: linearData,
					xScale,
					xAccessor,
					displayXAccessor,
				});
			}
		}
	}
	render() {
		const { type, ratio } = this.props;
		const { data,width,height, ema26, ema12, smaVolume50, xScale, xAccessor, displayXAccessor } = this.state;

		return (
			<ChartCanvas ratio={ratio} width={width} height={height}
					key={`chart-${this.props.symbol}-${this.props.timeFrame}`}
					margin={{ left: 70, right: 70, top: 20, bottom: 30 }} type={type}
					seriesName="MSFT"
					data={data}
					xScale={xScale} xAccessor={xAccessor} displayXAccessor={displayXAccessor}
					onLoadMore={this.handleDownloadMore}>
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
	}
}

/*

*/

CandleStickChartPanToLoadMore.propTypes = {
	data: PropTypes.array.isRequired,
	width: PropTypes.number.isRequired,
	ratio: PropTypes.number.isRequired,
	type: PropTypes.oneOf(["svg", "hybrid"]).isRequired,
};

CandleStickChartPanToLoadMore.defaultProps = {
	type: "svg",
};

CandleStickChartPanToLoadMore = fitWidth(CandleStickChartPanToLoadMore);

export default CandleStickChartPanToLoadMore;
