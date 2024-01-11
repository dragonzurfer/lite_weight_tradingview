import React from 'react';
import { render } from 'react-dom';
import SymbolChartComponent from './SymbolChart';


class ChartComponent extends React.Component {
    state = {
        data: null,
        splitView: false,
        heightAdjustment: 0,
        symbol: 'MCX:CRUDEOIL24JANFUT', // Default symbol
        timeFrame: '5minute', // Default time frame
    };

    toggleView = () => {
        this.setState(prevState => ({ splitView: !prevState.splitView }));
    };

    render() {
        const { splitView, heightAdjustment } = this.state;

        const parentWidth = window.innerWidth;
        const parentHeight = window.innerHeight - heightAdjustment; // Use the dynamic height adjustment
        const chartWidth = splitView ? parentWidth / 2 : parentWidth;

        return (
            <div style={{ overflow: 'hidden', height: parentHeight }}>
                <button ref={this.buttonRef} onClick={this.toggleView}>Toggle View</button>
                <div style={{ display: 'flex', width: '100%', height: parentHeight }}>
                    <div style={{ width: chartWidth, height: '100%', boxSizing: 'border-box' }}>
                    <SymbolChartComponent 
                        width={chartWidth} 
                        height={parentHeight} 
                        symbol={this.state.symbol} 
                        timeFrame={this.state.timeFrame} 
                    />
                    </div>
                    {splitView && (
                        <div style={{ width: chartWidth, height: '100%', boxSizing: 'border-box' }}>
                            <SymbolChartComponent 
                                width={chartWidth} 
                                height={parentHeight} 
                                symbol="MCX:GOLD24FEBFUT" 
                                timeFrame={this.state.timeFrame} 
                            />
                        </div>
                    )}
                </div>
            </div>
        );
    }
}

render(
    <ChartComponent />,
    document.getElementById("root")
);