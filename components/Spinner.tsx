
import React from 'react';

interface SpinnerProps {
  message?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ message = 'Carregando...' }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full my-8">
      <div className="w-16 h-16 border-4 border-orange-500 border-dashed rounded-full animate-spin border-t-transparent"></div>
      <p className="mt-4 text-lg font-semibold text-gray-700">{message}</p>
    </div>
  );
};

export default Spinner;