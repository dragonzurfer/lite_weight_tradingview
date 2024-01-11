import React from 'react';
import Chart from './ChartClass';
import {fetchCandleData} from './utils';
import { WS_ADDRESS } from './server_address';

class SymbolChartComponent extends React.Component {
    state = {
        data: null,
    };

    componentDidMount() {
        this.connectWebSocket();
        this.fetchInitialData();
        this.setupDataFetchTimer();
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

    fetchInitialData = async () => {
        console.log("Calling for candles");
        const toDate = new Date();
        const fromDate = new Date();
        fromDate.setDate(toDate.getDate() - 7); // Subtract 7 days from the current date

        // Format the dates to 'YYYY-MM-DD HH:MM:SS' string format
        const toDateString = toDate.toISOString().slice(0, 19).replace('T', ' ');
        const fromDateString = fromDate.toISOString().slice(0, 19).replace('T', ' ');

        try {
            const candleData = await fetchCandleData(this.props.symbol, fromDateString, toDateString);
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

    setupDataFetchTimer = () => {
        const now = new Date();
        const nextInterval = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), Math.ceil(now.getMinutes() / 5) * 5,0,0);
    
        const delay = nextInterval - now; // Time until the next 5-minute interval
    
        this.timer = setTimeout(() => {
            this.fetchInitialData();
            this.interval = setInterval(this.getCandleDataForLastSevenDays, 5 * 60 * 1000); // 5 minutes interval
        }, delay);
    }

    render() {
        console.log("hello");
        const { height, width } = this.props;
        const { data } = this.state;

        if (data == null) {
            return <div>Loading...</div>;
        }

        return (
            <Chart type='cnavas+svg' symbol={this.props.symbol} timeFrame={this.props.timeFrame} data={data} width={width} height={height} />
        );
    }
}

export default SymbolChartComponent;
