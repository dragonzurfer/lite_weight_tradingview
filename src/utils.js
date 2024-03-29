import { timeParse } from "d3-time-format";
import { DATA_ADDRESS } from './server_address';

export async function fetchCandleData(symbol, tf, from, to) {
    const url = DATA_ADDRESS;
    const requestBody = {
        "Ticker": symbol,
        "TimeFrame": tf,
        "from": from,
        "to": to
    };
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const json = await response.json();
        if (json.status !== 'ok') {
            throw new Error(`Response status is not ok: ${json.status}`);
        }

        // Use the parseData function to transform the data into the expected format
        const parsedData = json.data.map(parseData(parseDate));
        return parsedData; // This will be the parsed data ready for charting
    } catch (error) {
        console.error('There was an error fetching the candle data:', error);
        throw error; // Re-throw the error for the calling code to handle
    }
}

// The parseDate function from the d3-time-format library
const parseDate = timeParse("%Y-%m-%dT%H:%M:%S%Z");

function parseData(parse) {
    return function (d) {
        d.date = parse(d.Timestamp);
        d.open = +d.Open;
        d.high = +d.High;
        d.low = +d.Low;
        d.close = +d.Close;
        d.volume = +d.Volume;
        return d;
    };
}

export const formatLocalDate = (date) => {
    const pad = (num) => (num < 10 ? `0${num}` : num);

    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1); // getMonth() returns 0-11
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};
