import React, { useState, useEffect } from 'react';
import { render } from 'react-dom';
import SymbolChartComponent from './SymbolChart';

const IndividualChart = ({ initialSymbol, initialTimeFrame, width, height, onSelected }) => {
    const [symbol, setSymbol] = useState(initialSymbol);
    const [timeFrame, setTimeFrame] = useState(initialTimeFrame);

    // Additional logic and effects if needed
    // ...

    useEffect(() => {
        setSymbol(initialSymbol);
        setTimeFrame(initialTimeFrame);
    }, [initialSymbol, initialTimeFrame]);

    return (
        <div onClick={onSelected} style={{ width, height, boxSizing: 'border-box' }}>
            <SymbolChartComponent 
                symbol={symbol}
                timeFrame={timeFrame}
                width={width}
                height={height}
                // Other props if needed
            />
        </div>
    );
};

const ChartComponent = () => {
    const [selectedChart, setSelectedChart] = useState(null);
    const [symbol, setSymbol] = useState('MCX:CRUDEOIL24JANFUT');
    const [timeFrame, setTimeFrame] = useState('5minute');
    const [splitView, setSplitView] = useState(false);

    const parentWidth = window.innerWidth;
    const parentHeight = window.innerHeight; // Adjust as needed

    const handleSymbolChange = (event) => {
        setSymbol(event.target.value);
    };

    const handleTimeFrameChange = (event) => {
        console.log("timeframe changed in ChartComp");
        setTimeFrame(event.target.value);
    };

    const toggleView = () => {
        setSplitView(!splitView);
    };

    const chartWidth = splitView ? parentWidth / 2 : parentWidth;

    return (
        <div style={{ overflow: 'hidden', height: parentHeight }}>
            <button onClick={toggleView}>Toggle View</button>
            <input 
                type="text" 
                value={symbol} 
                onChange={handleSymbolChange} 
                placeholder="Enter Symbol"
            />
            <select value={timeFrame} onChange={handleTimeFrameChange}>
                <option value="5minute">5 minutes</option>
                <option value="15minute">15 minutes</option>
                <option value="30minute">30 minutes</option>
                <option value="60minute">60 minutes</option>
            </select>
            <div style={{ display: 'flex', width: '100%', height: parentHeight }}>
                <IndividualChart 
                    initialSymbol={symbol}
                    initialTimeFrame={timeFrame}
                    width={chartWidth}
                    height={parentHeight}
                    onSelected={() => setSelectedChart('chart1')}
                />
                {splitView && (
                    <IndividualChart 
                        initialSymbol={symbol} // Or different symbol for the second chart
                        initialTimeFrame={timeFrame}
                        width={chartWidth}
                        height={parentHeight}
                        onSelected={() => setSelectedChart('chart2')}
                    />
                )}
            </div>
        </div>
    );
};

render(
    <React.StrictMode>
      <ChartComponent />
    </React.StrictMode>,
    document.getElementById('root')
);