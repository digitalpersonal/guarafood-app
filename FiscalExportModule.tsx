import React, { useState } from 'react';

interface FiscalExportModuleProps {
  restaurantId: number;
}

export const FiscalExportModule: React.FC<FiscalExportModuleProps> = ({ restaurantId }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (!startDate || !endDate) return alert('Selecione as datas');
    setLoading(true);

    try {
      const response = await fetch(`/api/fiscal/export?restaurantId=${restaurantId}&startDate=${startDate}T00:00:00Z&endDate=${endDate}T23:59:59Z`);
      const data = await response.json();

      if (data.files && data.files.length > 0) {
        // Trigger downloads
        data.files.forEach((file: any) => {
          if (file.fiscal_xml_url) window.open(file.fiscal_xml_url, '_blank');
          if (file.fiscal_danfe_url) window.open(file.fiscal_danfe_url, '_blank');
        });
        alert(`Iniciando download de ${data.files.length} pedidos.`);
      } else {
        alert('Nenhum arquivo encontrado para este período.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao buscar arquivos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      <h3 className="text-lg font-bold mb-4">Exportar Arquivos Fiscais</h3>
      <div className="flex gap-4 mb-4">
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border p-2 rounded" />
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border p-2 rounded" />
      </div>
      <button 
        onClick={handleExport} 
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Buscando...' : 'Baixar XMLs e DANFEs'}
      </button>
    </div>
  );
};
