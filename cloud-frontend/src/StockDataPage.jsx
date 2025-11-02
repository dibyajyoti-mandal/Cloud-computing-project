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
  Area
} from 'recharts';


// Helper function to format large numbers 
const formatVolume = (volume) => {
    if (volume > 1_000_000_000) return `${(volume / 1_000_000_000).toFixed(2)}B`;
    if (volume > 1_000_000) return `${(volume / 1_000_000).toFixed(2)}M`;
    if (volume > 1_000) return `${(volume / 1_000).toFixed(2)}K`;
    return volume;
};


const dummyData = {
    "ticker": "AAPL",
    "days": 5,
    "data": [
      { "Open": 212.18917192393894, "High": 213.69746987061376, "Low": 210.34127831689767, "Close": 212.08929443359375, "Volume": 49325800 },
      { "Open": 210.71086343228015, "High": 212.71859464512332, "Low": 209.30245815432872, "Close": 211.21029663085938, "Volume": 45029500 },
      { "Open": 212.11926693678467, "High": 212.32903558469047, "Low": 209.53220664773164, "Close": 211.0205078125, "Volume": 54737900 },
      { "Open": 207.67431083672193, "High": 209.24252311349682, "Low": 204.02843943795537, "Close": 208.54331970214844, "Volume": 46140500 },
      { "Open": 207.4345828831543, "High": 208.2336790492342, "Low": 204.79757620413463, "Close": 206.62550354003906, "Volume": 42496600 },
      { "Open": 204.93741112479617, "High": 206.80528635778637, "Low": 200.4824756537251, "Close": 201.86090087890625, "Volume": 59211800 },
      { "Open": 200.48247209416806, "High": 202.52015274475195, "Low": 199.4736073247078, "Close": 201.13172912597656, "Volume": 46742400 },
      { "Open": 193.45045269257122, "High": 197.4758830409797, "Low": 193.24069928507132, "Close": 195.04864501953125, "Volume": 78432900 },
      { "Open": 198.07520901450675, "High": 200.51244545494848, "Low": 197.20618488735448, "Close": 199.98304748535156, "Volume": 56288500 },
      { "Open": 200.36260025266836, "High": 202.50017366149785, "Low": 199.67338002302156, "Close": 200.1927947998047, "Volume": 45339700 },
      { "Open": 203.3492174371598, "High": 203.57895243464628, "Low": 198.28495762525483, "Close": 199.72332763671875, "Volume": 51396800 },
      { "Open": 199.14398126681596, "High": 201.73105672211125, "Low": 196.55692105301176, "Close": 200.622314453125, "Volume": 70819900 },
      { "Open": 200.05295557621693, "High": 201.9008644592711, "Low": 199.89313329888972, "Close": 201.47134399414062, "Volume": 35423300 },
      { "Open": 201.1217444882778, "High": 203.5389992121068, "Low": 200.7321872237246, "Close": 203.03956604003906, "Volume": 46381600 },
      { "Open": 202.67998220748078, "High": 206.00620910456834, "Low": 201.8709028727957, "Close": 202.590087890625, "Volume": 43604000 },
      { "Open": 203.26931435006063, "High": 204.5178973620389, "Low": 199.92310578136215, "Close": 200.40257263183594, "Volume": 55126100 },
      { "Open": 202.76987228695742, "High": 205.4668084267123, "Low": 201.82095228760733, "Close": 203.68882751464844, "Volume": 46607700 },
      { "Open": 204.15830357568726, "High": 205.76647909477697, "Low": 199.79326227022588, "Close": 201.2216339111328, "Volume": 72862600 },
      { "Open": 200.3726011094186, "High": 204.11835001917973, "Low": 200.34263633745982, "Close": 202.44024658203125, "Volume": 54672600 },
      { "Open": 203.26930749599725, "High": 204.26817387189894, "Low": 198.18508130061548, "Close": 198.55465698242188, "Volume": 60989900 },
      { "Open": 198.85432303920933, "High": 199.45363372918547, "Low": 197.13627162659284, "Close": 198.97418212890625, "Volume": 43904600 },
      { "Open": 199.50357538920457, "High": 200.1428492549886, "Low": 195.47814514596445, "Close": 196.227294921875, "Volume": 51447300 },
      { "Open": 197.07634287373045, "High": 198.46476655376847, "Low": 196.33717625414866, "Close": 198.195068359375, "Volume": 43020700 },
      { "Open": 196.97644196425614, "High": 198.16509536417735, "Low": 194.98870767431248, "Close": 195.418212890625, "Volume": 38856200 },
      { "Open": 195.71787336797544, "High": 197.3460303816964, "Low": 194.84886452825484, "Close": 196.35714721679688, "Volume": 45394700 },
      { "Open": 198.01527480684123, "High": 201.47134391409438, "Low": 196.6368343380514, "Close": 200.7721405029297, "Volume": 96813500 },
      { "Open": 201.40143343464243, "High": 202.07067208145295, "Low": 198.73446202428119, "Close": 201.27157592773438, "Volume": 55814300 },
      { "Open": 202.36033429336192, "High": 203.2093768046809, "Low": 199.9730442780961, "Close": 200.07293701171875, "Volume": 54064000 },
      { "Open": 201.2216365357081, "High": 203.43912119943792, "Low": 200.39257558111612, "Close": 201.33151245117188, "Volume": 39525700 },
      { "Open": 201.20164572639828, "High": 202.41028074115465, "Low": 199.23389299836737, "Close": 200.7721405029297, "Volume": 50799100 },
      { "Open": 201.66113009938155, "High": 202.98962419564972, "Low": 199.77327327657756, "Close": 200.85205078125, "Volume": 73188600 },
      { "Open": 201.78098710410558, "High": 207.15489297707504, "Low": 199.0341046248948, "Close": 204.93740844726562, "Volume": 91912800 },
      { "Open": 206.4357061767528, "High": 209.95171998702364, "Low": 205.90630823197938, "Close": 207.58441162109375, "Volume": 78788900 },
      { "Open": 208.6731759252599, "High": 213.09814660534315, "Low": 207.9040445567577, "Close": 212.1991729736328, "Volume": 67941800 },
      { "Open": 211.90950026104147, "High": 214.40666625629999, "Low": 211.56988934364432, "Close": 213.30792236328125, "Volume": 34955800 },
      { "Open": 212.43889126622693, "High": 215.9848699115094, "Low": 208.56330013289198, "Close": 209.7119903564453, "Volume": 50229000 },
      { "Open": 209.86183643928914, "High": 211.1903153368944, "Low": 208.213697736729, "Close": 209.7719268798828, "Volume": 42848900 },
      { "Open": 209.2924745188519, "High": 211.09043707809712, "Low": 206.98509558510867, "Close": 210.90065002441406, "Volume": 48749400 },
      { "Open": 210.27134950514616, "High": 213.23798377907798, "Low": 209.7918979255535, "Close": 212.16920471191406, "Volume": 44443600 },
      { "Open": 210.33129628612954, "High": 211.88952536572023, "Low": 209.6220944658076, "Close": 210.92062377929688, "Volume": 39765800 },
      { "Open": 209.69201166358403, "High": 210.67091168904602, "Low": 207.3047216270235, "Close": 208.3834991455078, "Volume": 38840100 },
      { "Open": 208.9828312368767, "High": 211.64980271899068, "Low": 208.6831682659836, "Close": 208.87295532226562, "Volume": 42296300 },
      { "Open": 210.06160887608695, "High": 212.1592191902425, "Low": 208.40348697906978, "Close": 209.92176818847656, "Volume": 47490500 },
      { "Open": 210.33130094399476, "High": 211.5599023237274, "Low": 209.35240091776063, "Close": 209.78192138671875, "Volume": 48068100 },
      { "Open": 210.63095139102305, "High": 211.54990664350106, "Low": 209.46227954032304, "Close": 210.9405975341797, "Volume": 48974600 },
      { "Open": 211.8595616297783, "High": 215.53538252867688, "Low": 211.39009321998003, "Close": 212.23912048339844, "Volume": 51377400 },
      { "Open": 212.89838571641525, "High": 214.7063314773177, "Low": 211.9894136266437, "Close": 214.15695190429688, "Volume": 46404100 },
      { "Open": 214.75626907170553, "High": 214.90609293027538, "Low": 212.1692088371252, "Close": 213.9072265625, "Volume": 46989300 },
      { "Open": 213.65751035981805, "High": 215.44548969662856, "Low": 213.28793468034502, "Close": 213.51766967773438, "Volume": 46022600 },
      { "Open": 214.45660521718813, "High": 214.9960015887686, "Low": 213.15807589620647, "Close": 213.63754272460938, "Volume": 40268800 },
      { "Open": 213.78737619229818, "High": 214.60645396318566, "Low": 212.81847455673218, "Close": 213.80735778808594, "Volume": 37858000 },
      { "Open": 213.93719187335407, "High": 214.5664825639156, "Low": 210.58101550100253, "Close": 211.03050231933594, "Volume": 51411700 },
      { "Open": 211.65977882345743, "High": 212.14922883427738, "Low": 207.48452469073794, "Close": 208.81301879882812, "Volume": 45512500 },
      { "Open": 208.25365677749065, "High": 209.60211724381097, "Low": 206.92516266487007, "Close": 207.33470153808594, "Volume": 80698400 },
      { "Open": 210.63095505795985, "High": 213.33788973606855, "Low": 201.27158167093614, "Close": 202.1505889892578, "Volume": 104434500 },
      { "Open": 204.27816503495924, "High": 207.64435521756303, "Low": 201.4513712516652, "Close": 203.11949157714844, "Volume": 75109300 },
      { "Open": 203.1694082424696, "High": 205.1072113881769, "Low": 201.93082373064988, "Close": 202.68995666503906, "Volume": 44155100 },
      { "Open": 205.39689808550258, "High": 215.1358452662651, "Low": 205.35693489516686, "Close": 213.0082550048828, "Volume": 108483100 },
      { "Open": 218.63187314031333, "High": 220.59964108330854, "Low": 216.33447747046458, "Close": 219.7805633544922, "Volume": 90224800 },
      { "Open": 220.57966572513484, "High": 230.73813503605493, "Low": 219.00145500716468, "Close": 229.0900115966797, "Volume": 113854000 },
      { "Open": 227.9199981689453, "High": 229.55999755859375, "Low": 224.75999450683594, "Close": 227.17999267578125, "Volume": 61806100 },
      { "Open": 228.00999450683594, "High": 230.8000030517578, "Low": 227.07000732421875, "Close": 229.64999389648438, "Volume": 55626200 },
      { "Open": 231.07000732421875, "High": 235.0, "Low": 230.42999267578125, "Close": 233.3300018310547, "Volume": 69878500 },
      { "Open": 234.05999755859375, "High": 235.1199951171875, "Low": 230.85000610351562, "Close": 232.77999877929688, "Volume": 51916300 },
      { "Open": 234.0, "High": 234.27999877929688, "Low": 229.33999633789062, "Close": 231.58999633789062, "Volume": 56038700 },
      { "Open": 231.6999969482422, "High": 233.1199951171875, "Low": 230.11000061035156, "Close": 230.88999938964844, "Volume": 37476200 },
      { "Open": 231.27999877929688, "High": 232.8699951171875, "Low": 229.35000610351562, "Close": 230.55999755859375, "Volume": 39402600 },
      { "Open": 229.97999572753906, "High": 230.47000122070312, "Low": 225.77000427246094, "Close": 226.00999450683594, "Volume": 42263900 },
      { "Open": 226.27000427246094, "High": 226.52000427246094, "Low": 223.77999877929688, "Close": 224.89999389648438, "Volume": 30621200 },
      { "Open": 226.1699981689453, "High": 229.08999633789062, "Low": 225.41000366210938, "Close": 227.75999450683594, "Volume": 42477800 },
      { "Open": 226.47999572753906, "High": 229.3000030517578, "Low": 226.22999572753906, "Close": 227.16000366210938, "Volume": 30983100 },
      { "Open": 226.8699951171875, "High": 229.49000549316406, "Low": 224.69000244140625, "Close": 229.30999755859375, "Volume": 54575100 },
      { "Open": 228.61000061035156, "High": 230.89999389648438, "Low": 228.25999450683594, "Close": 230.49000549316406, "Volume": 31259500 },
      { "Open": 230.82000732421875, "High": 233.41000366210938, "Low": 229.33999633789062, "Close": 232.55999755859375, "Volume": 38074700 },
      { "Open": 232.50999450683594, "High": 233.3800048828125, "Low": 231.3699951171875, "Close": 232.13999938964844, "Volume": 39418400 },
      { "Open": 229.25, "High": 230.85000610351562, "Low": 226.97000122070312, "Close": 229.72000122070312, "Volume": 44075600 },
      { "Open": 237.2100067138672, "High": 238.85000610351562, "Low": 234.36000061035156, "Close": 238.47000122070312, "Volume": 66427800 },
      { "Open": 238.4499969482422, "High": 239.89999389648438, "Low": 236.74000549316406, "Close": 239.77999877929688, "Volume": 47549400 },
      { "Open": 240.0, "High": 241.32000732421875, "Low": 238.49000549316406, "Close": 239.69000244140625, "Volume": 54870400 },
      { "Open": 239.3000030517578, "High": 240.14999389648438, "Low": 236.33999633789062, "Close": 237.8800048828125, "Volume": 48999500 },
      { "Open": 237.0, "High": 238.77999877929688, "Low": 233.36000061035156, "Close": 234.35000610351562, "Volume": 66313900 },
      { "Open": 232.19000244140625, "High": 232.4199981689453, "Low": 225.9499969482422, "Close": 226.7899932861328, "Volume": 83440800 },
      { "Open": 226.8800048828125, "High": 230.4499969482422, "Low": 226.64999389648438, "Close": 230.02999877929688, "Volume": 50208600 },
      { "Open": 229.22000122070312, "High": 234.50999450683594, "Low": 229.02000427246094, "Close": 234.07000732421875, "Volume": 55824200 },
      { "Open": 237.0, "High": 238.19000244140625, "Low": 235.02999877929688, "Close": 236.6999969482422, "Volume": 42699500 },
      { "Open": 237.17999267578125, "High": 241.22000122070312, "Low": 236.32000732421875, "Close": 238.14999389648438, "Volume": 63421100 },
      { "Open": 238.97000122070312, "High": 240.10000610351562, "Low": 237.72999572753906, "Close": 238.99000549316406, "Volume": 46508000 },
      { "Open": 239.97000122070312, "High": 241.1999969482422, "Low": 236.64999389648438, "Close": 237.8800048828125, "Volume": 44249600 },
      { "Open": 241.22999572753906, "High": 246.3000030517578, "Low": 240.2100067138672, "Close": 245.5, "Volume": 163741300 },
      { "Open": 248.3000030517578, "High": 256.6400146484375, "Low": 248.1199951171875, "Close": 256.0799865722656, "Volume": 105517400 },
      { "Open": 255.8800048828125, "High": 257.3399963378906, "Low": 253.5800018310547, "Close": 254.42999267578125, "Volume": 60275200 },
      { "Open": 255.22000122070312, "High": 255.74000549316406, "Low": 251.0399932861328, "Close": 252.30999755859375, "Volume": 42303700 },
      { "Open": 253.2100067138672, "High": 257.1700134277344, "Low": 251.7100067138672, "Close": 256.8699951171875, "Volume": 55202100 },
      { "Open": 254.10000610351562, "High": 257.6000061035156, "Low": 253.77999877929688, "Close": 255.4600067138672, "Volume": 46076300 },
      { "Open": 254.55999755859375, "High": 255.0, "Low": 253.00999450683594, "Close": 254.42999267578125, "Volume": 40127700 },
      { "Open": 254.86000061035156, "High": 255.9199981689453, "Low": 253.11000061035156, "Close": 254.6300048828125, "Volume": 37704300 },
      { "Open": 255.0399932861328, "High": 258.7900085449219, "Low": 254.92999267578125, "Close": 255.4499969482422, "Volume": 48713900 },
      { "Open": 256.5799865722656, "High": 258.17999267578125, "Low": 254.14999389648438, "Close": 257.1300048828125, "Volume": 42630200 },
      { "Open": 254.6699981689453, "High": 259.239990234375, "Low": 253.9499969482422, "Close": 258.0199890136719, "Volume": 49155600 },
      { "Open": 257.989990234375, "High": 259.07000732421875, "Low": 255.0500030517578, "Close": 256.69000244140625, "Volume": 44664100 },
      { "Open": 256.80999755859375, "High": 257.3999938964844, "Low": 255.42999267578125, "Close": 256.4800109863281, "Volume": 31955800 },
      { "Open": 256.5199890136719, "High": 258.5199890136719, "Low": 256.1099853515625, "Close": 258.05999755859375, "Volume": 36496900 },
      { "Open": 257.80999755859375, "High": 258.0, "Low": 253.13999938964844, "Close": 254.0399932861328, "Volume": 38322000 },
      { "Open": 254.94000244140625, "High": 256.3800048828125, "Low": 244.0, "Close": 245.27000427246094, "Volume": 61999100 },
      { "Open": 249.3800048828125, "High": 249.69000244140625, "Low": 245.55999755859375, "Close": 247.66000366210938, "Volume": 38142900 },
      { "Open": 271.989990234375, "High": 274.1400146484375, "Low": 268.4800109863281, "Close": 271.3999938964844, "Volume": 69886500 },
      { "Open": 276.989990234375, "High": 277.32000732421875, "Low": 269.1600036621094, "Close": 270.3699951171875, "Volume": 86096700 }
    ]
};

export default function StockDataPage() {
    const [historicalData, setHistoricalData] = useState([]);
    const [showPredictionMessage, setShowPredictionMessage] = useState(false);

    // Process data for both table and chart
    useEffect(() => {
        const processed = dummyData.data.slice().reverse().map((day, index) => {
            const date = new Date();
            date.setDate(date.getDate() - (dummyData.data.length - 1 - index));
            const prevDayClose = index > 0 ? dummyData.data.slice().reverse()[index - 1].Close : day.Open;
            const change = day.Close - prevDayClose;
            
            return {
                ...day,
                displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                change: change,
            };
        });
        setHistoricalData(processed);
    }, []);

    const handlePredictClick = () => {
        setShowPredictionMessage(true);
        setTimeout(() => setShowPredictionMessage(false), 3000);
    };

    // Custom Tooltip for the chart for a better look
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="p-3 bg-gray-700/80 backdrop-blur-sm border border-gray-600 rounded-lg shadow-lg">
                    <p className="label text-gray-200 font-semibold">{`${label}`}</p>
                    <p className="intro text-purple-400">{`Close : $${payload[0].value.toFixed(2)}`}</p>
                </div>
            );
        }
        return null;
    };

    return (
        
        <div className="min-h-screen w-full bg-gray-900 text-gray-300 font-sans p-6 lg:p-10">
            <main className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
                    
                    
                    <div className="lg:col-span-2">
                        <div className="mb-6">
                            <h1 className="text-7xl font-black text-center text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-pink-500 to-purple-500
                                           filter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                                {dummyData.ticker}
                            </h1>
                            <p className="text-center text-gray-400 text-lg">Historical Price Data</p>
                        </div>

                  
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
                    </div>

                  
                    <div className="lg:col-span-3 flex flex-col justify-center">
                         <h2 className="text-2xl font-bold mb-4 text-white">Closing Price Trend</h2>
                        <div className="w-full h-[500px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    data={historicalData}
                                    margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                                >
                                    <defs>
                                        <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.05}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="displayDate" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} domain={['dataMin - 10', 'dataMax + 10']} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="Close" stroke="#A78BFA" fillOpacity={1} fill="url(#colorClose)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                
                <div className="text-center mt-12">
                    <button
                        onClick={handlePredictClick}
                        className="relative inline-flex items-center justify-center gap-3 px-10 py-4 bg-purple-600 text-white font-bold text-lg rounded-lg shadow-lg
                                   hover:bg-purple-700 transition-all duration-300 ease-in-out transform hover:scale-105
                                   focus:outline-none focus:ring-4 focus:ring-purple-500 focus:ring-opacity-50
                                   shadow-[0_0_20px_rgba(168,85,247,0.5)] hover:shadow-[0_0_35px_rgba(168,85,247,0.8)]"
                    >
                        <Rocket size={24} />
                        Predict Next {dummyData.days} Days
                    </button>
                </div>
            </main>
        </div>
    );
}
