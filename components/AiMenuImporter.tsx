import React, { useState, useRef } from 'react';
import { useNotification } from '../hooks/useNotification';

interface AiMenuImporterProps {
  restaurantId: number;
  onImportComplete: (data: any) => void;
  onCancel: () => void;
}

const AiMenuImporter: React.FC<AiMenuImporterProps> = ({ restaurantId, onImportComplete, onCancel }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [failedFiles, setFailedFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useNotification();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    setFiles(prev => {
      const newFiles = [...prev];
      if (direction === 'up' && index > 0) {
        [newFiles[index - 1], newFiles[index]] = [newFiles[index], newFiles[index - 1]];
      } else if (direction === 'down' && index < newFiles.length - 1) {
        [newFiles[index + 1], newFiles[index]] = [newFiles[index], newFiles[index + 1]];
      }
      return newFiles;
    });
  }

  const handleAnalyze = async () => {
    if (files.length === 0) {
      addToast({ message: 'Selecione pelo menos um arquivo', type: 'error' });
      return;
    }

    setIsProcessing(true);
    setPreviewData(null);
    setFailedFiles([]);

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    try {
      const response = await fetch('/api/import-menu', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao processar arquivos');
      }

      const data = await response.json();
      setPreviewData(data.categories);
      setFailedFiles(data.failedFiles || []);
      
      if (data.failedFiles && data.failedFiles.length > 0) {
          addToast({ message: `Análise concluída com avisos: ${data.failedFiles.length} arquivo(s) falharam.`, type: 'warning' });
      } else {
          addToast({ message: 'Análise concluída com sucesso', type: 'success' });
      }
    } catch (error: any) {
      addToast({ message: error.message || 'Erro na comunicação com o servidor', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (previewData) {
      onImportComplete(previewData);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Importar Cardápio por Imagem/PDF</h2>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!previewData && (
          <div className="space-y-6">
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors">
              <input
                type="file"
                multiple
                accept="image/*,.pdf"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-orange-100 text-orange-700 px-6 py-3 rounded-lg font-bold hover:bg-orange-200 transition-colors"
                disabled={isProcessing}
              >
                + Adicionar Arquivos (Imagens ou PDFs)
              </button>
              <p className="mt-2 text-sm text-gray-500">
                Selecione várias páginas de uma vez. O sistema processará tudo em conjunto.
              </p>
            </div>

            {files.length > 0 && (
              <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <h3 className="font-semibold text-gray-700">Arquivos Selecionados ({files.length})</h3>
                  <p className="text-xs text-gray-500">Organize na ordem correta, se necessário.</p>
                </div>
                <ul className="divide-y divide-gray-100">
                  {files.map((file, index) => (
                    <li key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span className="text-2xl">
                           {file.type.includes('pdf') ? '📄' : '📷'}
                        </span>
                        <span className="text-sm font-medium text-gray-700 truncate max-w-[200px] sm:max-w-md">
                          {file.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => moveFile(index, 'up')}
                          disabled={index === 0 || isProcessing}
                          className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30"
                          title="Mover para cima"
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>
                        </button>
                        <button
                           onClick={() => moveFile(index, 'down')}
                           disabled={index === files.length - 1 || isProcessing}
                           className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-30"
                           title="Mover para baixo"
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                        </button>
                        <button
                          onClick={() => removeFile(index)}
                          disabled={isProcessing}
                          className="p-1 text-gray-400 hover:text-red-500 ml-2 disabled:opacity-30"
                          title="Remover arquivo"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={onCancel}
                disabled={isProcessing}
                className="px-6 py-2 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleAnalyze}
                disabled={files.length === 0 || isProcessing}
                className="px-6 py-2 rounded-lg bg-orange-600 text-white font-bold hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analisando cardápio...
                  </>
                ) : (
                  'Analisar Cardápio'
                )}
              </button>
            </div>
          </div>
        )}

        {previewData && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl flex items-start gap-3">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 shrink-0 mt-0.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               <div>
                  <h3 className="font-bold">Análise Concluída!</h3>
                  <p className="text-sm opacity-90 mt-1">Revise os itens encontrados abaixo. Clique em Confirmar para importá-los para o seu cardápio. Nenhum dado foi salvo ainda.</p>
               </div>
            </div>

            {failedFiles.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-xl flex items-start gap-3">
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 shrink-0 mt-0.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                   <div>
                      <h3 className="font-bold">Aviso de Processamento</h3>
                      <p className="text-sm opacity-90 mt-1">Os seguintes arquivos não puderam ser analisados (verifique se estão corrompidos ou ilegíveis):</p>
                      <ul className="list-disc pl-5 mt-2 text-sm">
                          {failedFiles.map((file, idx) => (
                              <li key={idx}>{file}</li>
                          ))}
                      </ul>
                   </div>
                </div>
            )}

            <div className="max-h-[50vh] overflow-y-auto pr-2 space-y-6">
              {previewData.map((category, catIndex) => (
                <div key={catIndex} className="bg-white border rounded-xl overflow-hidden">
                  <div className="bg-gray-100 px-4 py-3 border-b flex justify-between items-center">
                    <h4 className="font-bold text-gray-800 text-lg">{category.name}</h4>
                    <span className="bg-white text-gray-600 text-xs px-2 py-1 rounded-full border">{category.items?.length || 0} produtos</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {category.items?.map((item: any, itemIndex: number) => (
                      <div key={itemIndex} className="p-4 hover:bg-gray-50 flex justify-between">
                        <div>
                          <div className="font-medium text-gray-800">{item.name}</div>
                          {item.description && (
                            <div className="text-sm text-gray-500 mt-1">{item.description}</div>
                          )}
                        </div>
                        <div className="font-bold text-green-700 ml-4 whitespace-nowrap">
                          R$ {Number(item.price || 0).toFixed(2).replace('.', ',')}
                        </div>
                      </div>
                    ))}
                    {(!category.items || category.items.length === 0) && (
                       <div className="p-4 text-gray-500 text-sm text-center">Nenhum item encontrado nesta categoria.</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button
                onClick={() => setPreviewData(null)}
                className="px-6 py-2 rounded-lg text-gray-600 hover:bg-gray-100"
              >
                Voltar e editar arquivos
              </button>
              <button
                onClick={handleConfirm}
                className="px-6 py-2 rounded-lg bg-green-600 text-white font-bold hover:bg-green-700 flex items-center gap-2"
              >
                Confirmar Importação
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiMenuImporter;
