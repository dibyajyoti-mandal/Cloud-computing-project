// StockDataPage.jsx (UPDATED)

import React, { useState, useEffect } from 'react';
import { Rocket, ArrowUp, ArrowDown } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceDot
} from 'recharts';


const formatVolume = (volume) => {
    if (volume > 1_000_000_000) return `${(volume / 1_000_000_000).toFixed(2)}B`;
    if (volume > 1_000_000) return `${(volume / 1_000_000).toFixed(2)}M`;
    if (volume > 1_000) return `${(volume / 1_000).toFixed(2)}K`;
    return volume;
};


const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload; // Get the full data point
        
        let price, title, color;
        
        // Check if we are hovering over a prediction or historical point
        if (data.predictionClose !== null && data.predictionClose !== undefined) {
            price = data.predictionClose;
            title = 'Predicted Close';
            color = 'text-orange-300';
        } else if (data.historicalClose !== null && data.historicalClose !== undefined) {
            price = data.historicalClose;
            title = 'Close';
            color = 'text-purple-400';
        } else {
             // Fallback for safety
            return null;
        }

        if (price === null || price === undefined) return null;

        return (
            <div className="p-3 bg-gray-700/80 backdrop-blur-sm border border-gray-600 rounded-lg shadow-lg">
                <p className="label text-gray-200 font-semibold">{`${label}`}</p>
                <p className={`intro ${color}`}>
                    {title}: ${price.toFixed(2)}
                </p>
            </div>
        );
    }
    return null;
};


// --- Main StockDataPage Component ---
export default function StockDataPage() {
    
    // --- NEW STATE ---
    // We'll use "AMZN" as the default. This could come from props or URL params later.
    const [tickerSymbol, setTickerSymbol] = useState('GOOG'); 
    
    // State for all data fetched from /api/stock/:ticker
    const [stockData, setStockData] = useState(null); 
    
    // Derived state for tables and charts
    const [historicalData, setHistoricalData] = useState([]);
    const [predictionData, setPredictionData] = useState([]);
    const [chartData, setChartData] = useState([]);
    
    // UI state
    const [isPredicted, setIsPredicted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

   
useEffect(() => {
    const fetchHistoricalData = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await fetch(`/api/stock/${tickerSymbol}`);
            
            // Get the raw text of the response first to check it
            const rawText = await response.text();

            if (!response.ok) {
                // If the error response has a message, try to parse it.
                let errorMessage = `Failed to fetch data (${response.status})`;
                try {
                    const errData = JSON.parse(rawText);
                    errorMessage = errData.message || errorMessage;
                } catch (e) {
                    // It wasn't JSON, just use the raw text if it's not empty
                    if (rawText) {
                        errorMessage = rawText;
                    }
                }
                throw new Error(errorMessage);
            }

            // Now, safely parse the "OK" response
            if (!rawText) {
                throw new Error("Received empty data from server (Response OK).");
            }
            
            const fetchedData = JSON.parse(rawText); // This is { ticker, days, data: [...] }

            if (!fetchedData.data || !Array.isArray(fetchedData.data)) {
                 throw new Error("Server response was valid JSON but missing 'data' array.");
            }

            setStockData(fetchedData); // Save the full response

            // Process data
            const processed = fetchedData.data.slice().reverse().map((day, index) => {
                const dateStr = day.Date || day.date; // Handle 'Date' or 'date'
                
                // --- THIS IS THE FIX ---
                let date = new Date(dateStr); 
                // --- END FIX ---
                
                if (isNaN(date.getTime())) { // Check for invalid date
                    const newDate = new Date();
                    newDate.setDate(newDate.getDate() - (fetchedData.data.length - 1 - index));
                    date = newDate;
                }

                const prevDayClose = index > 0 ? fetchedData.data.slice().reverse()[index - 1].Close : day.Open;
                const change = day.Close - prevDayClose;
                
                return {
                    ...day,
                    date: date,
                    displayDate: date.toLocaleString('en-US', { month: 'short', day: 'numeric' }),
                    change: change,
                    historicalClose: day.Close,
                    predictionClose: null,
                    isPrediction: false
                };
            });
            
            setHistoricalData(processed);
            setChartData(processed);
            
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    fetchHistoricalData();
}, [tickerSymbol]);
            
   
       
          
      
        
                     

    // --- UPDATED handlePredictClick to call /api/predict ---
    const handlePredictClick = async () => {
        if (isPredicted || !stockData) return; // Don't run if already predicted or no data

        setIsPredicted(true); // Mark as predicted
        
        try {
            // This is the API call to your Express backend
            const response = await fetch('/api/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ticker: tickerSymbol,
                    days: 5 // We'll hardcode 5 days for this example
                }),
            });

            if (!response.ok) {
                 const errData = await response.json();
                 throw new Error(errData.message || `Failed to get prediction (${response.status})`);
            }

            const predictionResult = await response.json(); // This is { predictions: [...] }

            // 1. Get last date from historicalData
            const lastHistoricalDate = historicalData.length > 0
                ? new Date(historicalData[historicalData.length - 1].date)
                : new Date();
            
            const lastHistoricalClose = historicalData.length > 0 
                ? historicalData[historicalData.length - 1].Close 
                : 0;

            // 2. Generate predictedDays array from the API response
            const predictedDays = predictionResult.predictions.map((price, index) => {
                const date = new Date(lastHistoricalDate);
                date.setDate(lastHistoricalDate.getDate() + 1 + index);
                return {
                    Open: null, High: null, Low: null, Volume: null,
                    date: date,
                    displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    Close: price,
                    change: index === 0 ? price - lastHistoricalClose : price - predictionResult.predictions[index - 1],
                    historicalClose: null, 
                    predictionClose: price,
                    isPrediction: true
                };
            });

            // 3. Create bridge point
            const lastHistoricalPoint = historicalData[historicalData.length - 1];
            const bridgePoint = {
                ...lastHistoricalPoint,
                historicalClose: null,
                predictionClose: lastHistoricalPoint.Close
            };
            
            // 4. Create new chart data
            const slicedHistoricalData = historicalData.slice(-5);
            
            // 5. Set new data
            setChartData([...slicedHistoricalData, bridgePoint, ...predictedDays]);
            setPredictionData(predictedDays); // Set data for the new table

        } catch (err) {
            console.error("Prediction Error:", err);
            setError(err.message); // Show prediction error
            setIsPredicted(false); // Allow user to try again
        }
    };
    
    // --- RENDER LOGIC ---
    
    // Handle Loading State
    if (isLoading) {
        return (
            <div className="min-h-screen w-full bg-gray-900 text-gray-300 flex items-center justify-center">
                <p className="text-2xl animate-pulse">Loading Stock Data...</p>
            </div>
        );
    }
    
    // Handle Error State
    if (error) {
        return (
            <div className="min-h-screen w-full bg-gray-900 text-red-400 flex flex-col items-center justify-center">
                <h2 className="text-3xl font-bold mb-4">An Error Occurred</h2>
                <p className="text-lg bg-gray-800 p-4 rounded-md">{error}</p>
                 <button 
                    onClick={() => window.location.reload()}
                    className="mt-6 px-6 py-3 bg-purple-600 text-white font-bold rounded-lg shadow-lg hover:bg-purple-700"
                 >
                    Try Again
                 </button>
            </div>
        );
    }

    // Main component render (JSX is mostly unchanged, just uses new state)
    return (
        <div className="min-h-screen w-full bg-gray-900 text-gray-300 font-sans p-6 lg:p-10">
            <main>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
                    
                    {/* === LEFT COLUMN: HEADER & DYNAMIC TABLE === */}
                    <div className="lg:col-span-2">
                        <div className="mb-6">
                            <h1 className="text-7xl font-black text-center text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-pink-500 to-purple-500
                                           filter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                                {/* Use ticker from fetched data */}
                                {stockData ? stockData.ticker : "Stock"}
                            </h1>
                            <p className="text-center text-gray-400 text-lg">
                                {isPredicted ? "Predicted Price Data" : "Historical Price Data"}
                            </p>
                        </div>

                        {/* === DYNAMIC TABLE RENDER (This JSX is unchanged) === */}
                        {!isPredicted ? (
                            /* === ENHANCED HISTORICAL TABLE === */
                            <div className="rounded-lg bg-gray-800/50 border border-gray-700 shadow-xl max-h-[70vh] overflow-y-auto">
                                <table className="w-full text-left table-fixed">
                                    <thead className="sticky top-0 bg-gray-800/90 backdrop-blur-sm z-10">
                                        <tr>
                                            <th className="p-4 text-sm font-semibold text-gray-300 uppercase tracking-wider w-1/5">Date</th>
                                            <th className="p-4 text-sm font-semibold text-gray-300 uppercase tracking-wider text-right w-1/5 border-l border-gray-700">High</th>
                                            <th className="p-4 text-sm font-semibold text-gray-300 uppercase tracking-wider text-right w-1/5 border-l border-gray-700">Low</th>
                                            <th className="p-4 text-sm font-semibold text-gray-300 uppercase tracking-wider text-right w-1/5 border-l border-gray-700">Close</th>
                                            <th className="p-4 text-sm font-semibold text-gray-300 uppercase tracking-wider text-right w-1/5 border-l border-gray-700">Volume</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700/50">
                                        {historicalData.slice().reverse().map((day, i) => {
                                            const isPositive = day.change >= 0;
                                            return (
                                                <tr key={i} className="hover:bg-gray-700/60 transition-colors duration-200">
                                                    <td className="p-4 whitespace-nowrap text-base font-medium text-gray-200">{day.displayDate}</td>
                                                    <td className="p-4 whitespace-nowrap text-base font-mono text-green-300 text-right border-l border-gray-700">{day.High.toFixed(2)}</td>
                                                    <td className="p-4 whitespace-nowrap text-base font-mono text-red-300 text-right border-l border-gray-700">{day.Low.toFixed(2)}</td>
                                                    <td className={`p-4 whitespace-nowrap text-base font-mono font-bold text-right border-l border-gray-700 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                                                        {day.Close.toFixed(2)}
                                                    </td>
                                                    <td className="p-4 whitespace-nowrap text-base font-mono text-gray-400 text-right border-l border-gray-700">{formatVolume(day.Volume)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            /* === NEW PREDICTION TABLE === */
                            <div className="rounded-lg bg-gray-800/50 border border-gray-700 shadow-xl max-h-[70vh] overflow-y-auto">
                                <table className="w-full text-left table-fixed">
                                    <thead className="sticky top-0 bg-gray-800/90 backdrop-blur-sm z-10">
                                        <tr>
                                            <th className="p-4 text-sm font-semibold text-gray-300 uppercase tracking-wider w-1/2">Date</th>
                                            <th className="p-4 text-sm font-semibold text-gray-300 uppercase tracking-wider text-right w-1/2">Predicted Close</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700/50">
                                        {predictionData.map((day, i) => (
                                            <tr key={`pred-${i}`} className="hover:bg-gray-700/60 transition-colors duration-200">
                                                <td className="p-4 whitespace-nowrap text-base font-medium text-gray-200">{day.displayDate}</td>
                                                <td className="p-4 whitespace-nowrap text-base font-mono text-orange-300 font-bold text-right">
                                                    ${day.Close.toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* === RIGHT COLUMN: COMBINED RECHARTS GRAPH (This JSX is unchanged) === */}
                    <div className="lg:col-span-3 flex flex-col justify-center">
                         <h2 className="text-2xl font-bold mb-4 text-white">
                            {isPredicted ? "Historical & Predicted Trend" : "Historical Closing Price Trend"}
                         </h2>
                        <div className="w-full h-[500px] bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    data={chartData} 
                                    margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                                >
                                    <defs>
                                        <linearGradient id="colorHistorical" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.05}/>
                                        </linearGradient>
                                        <linearGradient id="colorPrediction" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#F97316" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#F97316" stopOpacity={0.05}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="displayDate" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} domain={['dataMin - 10', 'dataMax + 10']} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area 
                                        type="monotone" 
                                        dataKey="historicalClose" 
                                        stroke="#A78BFA" 
                                        fillOpacity={1} 
                                        fill="url(#colorHistorical)" 
                                        strokeWidth={2} 
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="predictionClose" 
                                        stroke="#F97316"
                                        fillOpacity={1} 
                                        fill="url(#colorPrediction)" 
                                        strokeWidth={2}
                                        strokeDasharray="5 5"
                                    />
                                    {chartData.filter(d => d.isPrediction).map((day, index) => (
                                        <ReferenceDot
                                            key={`pred-dot-${index}`}
                                            x={day.displayDate}
                                            y={day.Close}
                                            r={6}
                                            fill="#F97316"
                                            stroke="#FFFFFF"
                                            strokeWidth={2}
                                            ifOverflow="visible"
                                        />
                                    ))}
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* === PREDICT BUTTON (This JSX is mostly unchanged) === */}
                <div className="text-center mt-12">
                    <button
                        onClick={handlePredictClick}
                        disabled={isPredicted}
                        className="relative inline-flex items-center justify-center gap-3 px-10 py-4 bg-purple-600 text-white font-bold text-lg rounded-lg shadow-lg
                                   hover:bg-purple-700 transition-all duration-300 ease-in-out transform hover:scale-105
                                   focus:outline-none focus:ring-4 focus:ring-purple-500 focus:ring-opacity-50
                                   shadow-[0_0_20px_rgba(168,85,247,0.5)] hover:shadow-[0_0_35px_rgba(168,85,247,0.8)]
                                   disabled:bg-gray-500 disabled:shadow-none disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                       
                        {isPredicted ? "Predictions Loaded" : `Predict Next 5 Days`}
                    </button>
                    {/* (Removed the showPredictionMessage state as it's covered by 'isPredicted' button state) */}
                </div>
            </main>
        </div>
    );
}




