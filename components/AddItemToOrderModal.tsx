
import React, { useState, useMemo } from 'react';
import type { MenuItem, Combo } from '../types.ts';
import OptimizedImage from './OptimizedImage.tsx';

interface AddItemToOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    restaurantName: string;
    allMenuItems: MenuItem[];
    allCombos: Combo[];
    onSelectMenuItem: (item: MenuItem) => void;
    onSelectCombo: (combo: Combo) => void;
}

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);
const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);

const AddItemToOrderModal: React.FC<AddItemToOrderModalProps> = ({
    isOpen,
    onClose,
    restaurantName,
    allMenuItems,
    allCombos,
    onSelectMenuItem,
    onSelectCombo,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showCombos, setShowCombos] = useState(true);

    const filteredItems = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        return allMenuItems.filter(item => 
            item.name.toLowerCase().includes(lowerSearch) || 
            item.description.toLowerCase().includes(lowerSearch)
        );
    }, [allMenuItems, searchTerm]);

    const filteredCombos = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        return allCombos.filter(combo => 
            combo.name.toLowerCase().includes(lowerSearch) || 
            combo.description.toLowerCase().includes(lowerSearch)
        );
    }, [allCombos, searchTerm]);

    if (!isOpen) return null;

    const hasCustomization = (item: MenuItem) => 
        item.isPizza || item.isAcai || (item.availableAddonIds && item.availableAddonIds.length > 0) || (item.sizes && item.sizes.length > 0);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose} aria-modal="true" role="dialog" aria-labelledby="add-item-modal-title">
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                    <h2 id="add-item-modal-title" className="text-xl sm:text-2xl font-bold text-gray-800">Adicionar Item ao Pedido</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 p-1">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="mb-4">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder={`Buscar no cardápio de ${restaurantName}...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full p-3 pl-10 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-orange-400 focus:outline-none"
                        />
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex justify-center mt-3 bg-gray-100 rounded-lg p-1">
                        <button 
                            onClick={() => setShowCombos(true)} 
                            className={`flex-1 py-1.5 px-3 rounded-md text-sm font-semibold transition-colors ${showCombos ? 'bg-white shadow text-orange-600' : 'text-gray-600'}`}
                        >
                            Combos
                        </button>
                        <button 
                            onClick={() => setShowCombos(false)} 
                            className={`flex-1 py-1.5 px-3 rounded-md text-sm font-semibold transition-colors ${!showCombos ? 'bg-white shadow text-orange-600' : 'text-gray-600'}`}
                        >
                            Itens
                        </button>
                    </div>
                </div>

                <div className="overflow-y-auto flex-grow space-y-4">
                    {showCombos ? (
                        <>
                            <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-3">Combos ({filteredCombos.length})</h3>
                            {filteredCombos.length === 0 ? (
                                <p className="text-center text-gray-500 py-4">Nenhum combo encontrado.</p>
                            ) : (
                                <div className="space-y-3">
                                    {filteredCombos.map(combo => (
                                        <div key={combo.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border">
                                            <OptimizedImage src={combo.imageUrl} alt={combo.name} className="w-16 h-16 rounded-md object-cover flex-shrink-0" />
                                            <div className="flex-grow">
                                                <p className="font-semibold text-gray-800">{combo.name}</p>
                                                <p className="text-sm text-gray-600">R$ {combo.price.toFixed(2)}</p>
                                            </div>
                                            <button 
                                                onClick={() => onSelectCombo(combo)} 
                                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold flex-shrink-0"
                                            >
                                                Adicionar
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-3">Itens do Cardápio ({filteredItems.length})</h3>
                            {filteredItems.length === 0 ? (
                                <p className="text-center text-gray-500 py-4">Nenhum item encontrado.</p>
                            ) : (
                                <div className="space-y-3">
                                    {filteredItems.map(item => (
                                        <div key={item.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border">
                                            <OptimizedImage src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-md object-cover flex-shrink-0" />
                                            <div className="flex-grow">
                                                <p className="font-semibold text-gray-800">{item.name}</p>
                                                <p className="text-sm text-gray-600">R$ {item.price.toFixed(2)}</p>
                                            </div>
                                            <button 
                                                onClick={() => onSelectMenuItem(item)} 
                                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold flex-shrink-0"
                                            >
                                                {hasCustomization(item) ? 'Customizar' : 'Adicionar'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="mt-6 pt-4 border-t flex justify-end">
                    <button onClick={onClose} className="px-6 py-2 rounded-lg bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddItemToOrderModal;
