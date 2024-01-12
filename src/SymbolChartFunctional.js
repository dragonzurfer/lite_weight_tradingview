import React, { useState, useEffect, useRef } from 'react';
import Chart from './FunctionalChart';
import { fetchCandleData, formatLocalDate } from './utils';
import { WS_ADDRESS } from './server_address';

const SymbolChartComponent = ({ symbol, timeFrame, width, height }) => {
    let [data, setData] = useState(null);
    let dataRef = useRef(data); // Ref to hold the current data state
    let lastTickPrice = useRef(null);
    const ws = useRef(null);
    const timer = useRef(null);
    const interval = useRef(null);
    let state = {
        data,
        lastTickPrice,
        ws
    }

    useEffect(() => {
        dataRef.current = data; // Update the ref whenever data changes
    }, [data]);

    useEffect(() => {
        connectWebSocket();
        fetchInitialData();
        setupDataFetchTimer(timeFrame);

        return () => {
            if (ws.current) {
                ws.current.close();
            }
            if (timer.current) {
                clearTimeout(timer.current);
            }
            if (interval.current) {
                clearInterval(interval.current);
            }
        };
    }, []); // Only on mount and unmount

    useEffect(() => {
        updateSubscription();
        console.log("symbol or tf changed");
        fetchInitialData();
        setupDataFetchTimer(timeFrame);
    }, [symbol, timeFrame]); // On symbol or timeFrame change

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

    const handleNewTick = async (message) => {
        const cleanedMessage = message.replace(/\[|\]/g, '');
        const lastHyphenIndex = cleanedMessage.lastIndexOf("-");
        const ltp = parseFloat(cleanedMessage.substring(lastHyphenIndex + 1));
        lastTickPrice.current = ltp;
        
        setData(prevData => {
            if (dataRef.current == null) return null;
            const newData = [...dataRef.current];
            const lastCandle = newData.length > 0 ? { ...newData[newData.length - 1] } : null;
            if (lastCandle) {
                lastCandle.close = ltp;
                if (ltp > lastCandle.high) {
                    lastCandle.high = ltp;
                }
                if (ltp < lastCandle.low) {
                    lastCandle.low = ltp;
                }
                newData[newData.length - 1] = lastCandle;
            }
            console.log("tick",newData.length);
            return newData;
        });
    };

    const handleTickTimer = () => {
        if (!dataRef.current || !lastTickPrice.current) {
            return;
        }
        const timeFrameMinutes = parseInt(timeFrame.replace('minute', ''), 10);
        const lastCandle = dataRef.current[dataRef.current.length - 1];
    
        const newCandleDate = new Date(lastCandle ? lastCandle.date : new Date());
        newCandleDate.setMinutes(newCandleDate.getMinutes() + timeFrameMinutes);
    
        const newCandle = {
            open: lastTickPrice.current,
            high: lastTickPrice.current,
            low: lastTickPrice.current,
            close: lastTickPrice.current,
            date: newCandleDate
        };
    
        setData(prevData => [...(prevData || []), newCandle]);
    };
    
    const fetchInitialData = async () => {
        const toDate = new Date();
        toDate.setHours(23,59,59,999);
        const fromDate = new Date();
        fromDate.setHours(0,0,0,0);
        fromDate.setDate(toDate.getDate() - 30); // Subtract 7 days
    
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

    const setupDataFetchTimer = (tf) => {
        console.log(data,"before start timer");
        const timeFrameMinutes = 1;//parseInt(tf.replace('minute', ''), 10);
        const now = new Date();
        const minutes = now.getMinutes();
        const nextIntervalMinute = (Math.floor(minutes / timeFrameMinutes) + 1) * timeFrameMinutes;
        const nextInterval = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), nextIntervalMinute, 0, 0);
    
        const delay = nextInterval - now; // Time until the next interval
        console.log("next in",delay);
        if (timer.current) {
            clearTimeout(timer.current);
        }
        if (interval.current) {
            clearInterval(interval.current);
        }
    
        timer.current = setTimeout(() => {
            handleTickTimer();
            interval.current = setInterval(handleTickTimer, timeFrameMinutes * 60 * 1000);
        }, delay);
    };
    if (data == null) {
        return <div>Loading...</div>;
    }

    return (
        <Chart 
            key = {{symbol,timeFrame}}
            type="hybrid" 
            symbol={symbol} 
            timeFrame={timeFrame} 
            initialData={data} 
            width={width} 
            height={height}
        />
    );
};

export default SymbolChartComponent;
