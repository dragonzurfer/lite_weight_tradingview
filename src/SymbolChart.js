import React from 'react';
import Chart from './ChartClass';
import {fetchCandleData, formatLocalDate} from './utils';
import { WS_ADDRESS } from './server_address';
class SymbolChartComponent extends React.Component {
    state = {
        data: null,
    };

    componentDidMount() {
        this.connectWebSocket();
        this.fetchInitialData();
        this.setupDataFetchTimer(this.props.timeFrame);
    }

    componentDidUpdate(prevProps) {
        if (this.props.symbol !== prevProps.symbol || this.props.timeFrame !== prevProps.timeFrame) {
            this.updateSubscription();
            this.fetchInitialData();
        }
    }

    componentWillUnmount() {
        if (this.ws) {
            this.ws.close();
        }
        
        this.data = null;
        if (this.timer) {
            clearTimeout(this.timer);
        }

        if (this.interval) {
            clearInterval(this.interval);
        }
    }

    connectWebSocket = () => {
        this.ws = new WebSocket(WS_ADDRESS);

        this.ws.onopen = () => {
            console.log("Websock connected");
            this.ws.send("subscribe:"+this.props.symbol);
        };

        this.ws.onmessage = (event) => {
            this.handleNewTick(event.data);
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket Error:', error);
        };

        this.ws.onclose = () => {
            console.log('WebSocket Disconnected');
        };
    };

    handleNewTick = (message) => {
        const cleanedMessage = message.replace(/\[|\]/g, '');
        const lastHyphenIndex = cleanedMessage.lastIndexOf("-");
        const ltp = parseFloat(cleanedMessage.substring(lastHyphenIndex + 1));
        this.lastTickPrice = ltp;
        this.setState(prevState => {
            if (prevState.data == null) return { data: null };
            const newData = [...prevState.data];
            const lastCandle = {...newData[newData.length - 1], close: ltp};

            if (ltp > lastCandle.high) {
                lastCandle.high = ltp;
            }
            if (ltp < lastCandle.low) {
                lastCandle.low = ltp;
            }

            newData[newData.length - 1] = lastCandle;
            return { data: newData };
        });
    };

    handleTickTimer = () => {
        if (this.state.data == null || !this.lastTickPrice) {
            return;
        }
        
        const timeFrameMinutes = parseInt(this.props.timeFrame.replace('minute', ''), 10);
        const lastCandle = this.state.data[this.state.data.length - 1];
    
        // Parse the last candle's date and add timeFrame minutes
        const newCandleDate = new Date(lastCandle.date);
        newCandleDate.setMinutes(newCandleDate.getMinutes() + timeFrameMinutes);
        const newCandle = {
            open: this.lastTickPrice, // Assuming this.lastTickPrice is maintained
            high: this.lastTickPrice,
            low: this.lastTickPrice,
            close: this.lastTickPrice,
            date: newCandleDate, // Set the current time as timestamp
        };
        console.log("creating new candle");
        this.setState(prevState => ({
            data: [...prevState.data, newCandle]
        }));
    };

    fetchInitialData = async () => {
        const toDate = new Date();
        toDate.setHours(23,59,59,999);
        const fromDate = new Date();
        fromDate.setHours(0,0,0,0);
        fromDate.setDate(toDate.getDate() - 7); // Subtract 7 days from the current date
        
        // Format the dates to 'YYYY-MM-DD HH:MM:SS' string format
        const toDateString = formatLocalDate(toDate);
        const fromDateString = formatLocalDate(fromDate);
        console.log("calling data",this.props.symbol,toDateString);

        try {
            const candleData = await fetchCandleData(this.props.symbol,this.props.timeFrame, fromDateString, toDateString);
            this.setState({ data: candleData });
        } catch (error) {
            console.error('Error fetching candle data:', error);
        }
    }

    updateSubscription = () => {
        // Update WebSocket subscription if symbol or time frame changes
        this.ws.close();
        this.connectWebSocket();
    };

    setupDataFetchTimer = (timeFrame = '5minute') => {
        const timeFrameMinutes = parseInt(timeFrame.replace('minute', ''), 10);
        const now = new Date();
        const minutes = now.getMinutes();
        const nextIntervalMinute = (Math.floor(minutes / timeFrameMinutes) + 1) * timeFrameMinutes;
        const nextInterval = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), nextIntervalMinute, 0, 0);
    
        // If the calculated next interval is actually in the past (which can happen if the minutes are exactly on the interval),
        // add 5 minutes to shift to the next interval.
        // if(nextInterval <= now) {
        //     nextInterval.setMinutes(nextInterval.getMinutes() + timeFrameMinutes);
        // }
    
        const delay = nextInterval - now; // Time until the next 5-minute interval + some buffer
        console.log('Next 5-minute interval:', delay);
    
        // Clear any existing timer to avoid multiple instances
        if (this.timer) {
            clearTimeout(this.timer);
        }
        if (this.interval) {
            clearInterval(this.interval);
        }
    
        this.timer = setTimeout(() => {
            this.handleTickTimer();
            // After the first timeout, set an interval for subsequent fetches
            this.interval = setInterval(this.handleTickTimer, timeFrameMinutes * 60 * 1000); // 5 minutes interval
        }, delay);
    };

    updateDataFromChild = (newData) => {
        this.setState({ data: newData });
    };

    render() {
        const { height, width } = this.props;
        const { data } = this.state;

        if (data == null) {
            return <div>Loading...</div>;
        }

        return (
            <Chart 
            key={`chart-${this.props.symbol}-${this.props.timeFrame}`}
            type="hybrid" symbol={this.props.symbol} timeFrame={this.props.timeFrame} data={this.state.data} width={width} height={height}
            onUpdateData={this.updateDataFromChild}
             />
        );
    }
}

export default SymbolChartComponent;
