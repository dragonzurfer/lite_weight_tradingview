import React, { useState, useEffect, useRef } from 'react';
import Chart from './FunctionalChart';
import { fetchCandleData, formatLocalDate } from './utils';
import { WS_ADDRESS } from './server_address';

const SymbolChartComponent = ({ symbol, timeFrame, width, height }) => {
    let [data, setData] = useState(null);
    let dataRef = useRef(null);
    let lastTickPrice = useRef(null);
    const ws = useRef(null);
    const timer = useRef(null);
    const interval = useRef(null);
    useEffect(() => {
        connectWebSocket();
        fetchInitialData();
    }, []); // Only on mount and unmount

    useEffect(() => {
        updateSubscription();
        console.log("symbol or tf changed");
        fetchInitialData();
    }, [symbol, timeFrame]); // On symbol or timeFrame change

    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    const connectWebSocket = () => {
        ws.current = new WebSocket(WS_ADDRESS);
        ws.current.onopen = () => {
            console.log("WebSocket connected");
            ws.current.send("subscribe:" + symbol);
        };
        ws.current.onmessage = (event) => {
            handleNewTick(event.data);
        };
        ws.current.onerror = (error) => {
            console.error('WebSocket Error:', error);
        };
        ws.current.onclose = () => {
            console.log('WebSocket Disconnected');
        };
    };

    const handleNewTick = (message) => {
        const cleanedMessage = message.replace(/\[|\]/g, '');
        const lastHyphenIndex = cleanedMessage.lastIndexOf("-");
        const ltp = parseFloat(cleanedMessage.substring(lastHyphenIndex + 1));
        lastTickPrice.current = ltp;

        setData(prevData => {
            if (!prevData || prevData.length === 0) return null;
            const newData = [...prevData];
            const lastCandle = { ...newData[newData.length - 1] };
            const currentTime = new Date();

            // Calculate the start time for the next candle based on the last candle's date
            const timeFrameMinutes = parseInt(timeFrame.replace('minute', ''), 10);
            const nextCandleStartTime = new Date(lastCandle.date);
            nextCandleStartTime.setMinutes(nextCandleStartTime.getMinutes() + timeFrameMinutes);

            if (currentTime >= nextCandleStartTime) {
                // Time to start a new candle
                console.log("appending new candle");
                const newCandle = {
                    date: nextCandleStartTime,
                    open: ltp,
                    high: ltp,
                    low: ltp,
                    close: ltp,
                    volume: 0 // Adjust the volume as necessary
                };
                newData.push(newCandle);
            } else {
                // Update the last candle with the new LTP
                lastCandle.close = ltp;
                lastCandle.high = Math.max(lastCandle.high, ltp);
                lastCandle.low = Math.min(lastCandle.low, ltp);
                newData[newData.length - 1] = lastCandle;
            }

            return newData;
        });
    };


    const fetchInitialData = async () => {
        const toDate = new Date();
        toDate.setHours(23, 59, 59, 999);
        const fromDate = new Date();
        fromDate.setHours(0, 0, 0, 0);
        fromDate.setDate(toDate.getDate() - 40); // Subtract 7 days

        const toDateString = formatLocalDate(toDate);
        const fromDateString = formatLocalDate(fromDate);
        console.log("Fetching data", symbol, toDateString);

        try {
            const candleData = await fetchCandleData(symbol, timeFrame, fromDateString, toDateString);
            setData(candleData);
        } catch (error) {
            console.error('Error fetching candle data:', error);
        }
    };

    const updateSubscription = () => {
        if (ws.current) {
            ws.current.close();
            connectWebSocket(); // Reconnect the WebSocket with the new symbol
        }
    };

    const loadMore = async (start, end) => {
        console.log(start, end, ": loading more");
        try {
            console.log("Fetching additional data", symbol, start, end);

            const additionalData = await fetchCandleData(symbol, timeFrame, start, end);
            // Concatenate the new data at the front of the existing data
            setData(existingData => [...additionalData, ...existingData]);
        } catch (error) {
            console.error('Error fetching additional candle data:', error);
        }
    };


    if (data == null) {
        return <div>Loading...</div>;
    }

    return (
        <Chart
            key={{ symbol, timeFrame }}
            type="hybrid"
            symbol={symbol}
            timeFrame={timeFrame}
            initialData={data}
            width={width}
            height={height}
            onUpdateData={loadMore}
        />
    );
};

export default SymbolChartComponent;
