
import React from 'react';

interface ChartData {
  label: string;
  value: number;
}

interface BarChartProps {
  data: ChartData[];
  title: string;
}

const BarChart: React.FC<BarChartProps> = ({ data, title }) => {
    const maxValue = Math.max(...data.map(item => item.value), 0);

    return (
        <div>
            <h3 className="text-lg font-bold text-gray-800 mb-4">{title}</h3>
            <div className="flex items-end h-64 space-x-2 border-l border-b border-gray-200 p-2">
                {data.map((item, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center justify-end group">
                        <div 
                            className="w-full bg-orange-400 hover:bg-orange-600 transition-colors"
                            style={{ height: `${(item.value / maxValue) * 100}%` }}
                            title={`${item.label}: ${item.value} pedidos`}
                        >
                             <span className="relative -top-5 text-center w-full text-xs font-bold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                                {item.value}
                            </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 whitespace-nowrap transform -rotate-45">
                            {item.label}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BarChart;