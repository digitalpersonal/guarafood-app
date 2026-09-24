import React, { useState, useEffect, useMemo } from 'react';
import type { Restaurant, PrinterConfig, PrinterType, MenuCategory, Order, CartItem } from '../types';
import { fetchMenuForRestaurant, updateRestaurant } from '../services/databaseService';
import { useNotification } from '../hooks/useNotification';
import PrintableOrder from './PrintableOrder';

interface PrinterManagementProps {
    restaurant: Restaurant;
    onUpdateRestaurant?: (updated: Restaurant) => void;
}

const DEFAULT_PRINTER_TYPES: { type: PrinterType; label: string; icon: string; defaultName: string; defaultId: string }[] = [
    { type: 'cashier', label: 'Balcão / Caixa', icon: '🛎️', defaultName: 'Impressora do Caixa / Balcão', defaultId: 'caixa' },
    { type: 'kitchen', label: 'Cozinha', icon: '🍳', defaultName: 'Impressora da Cozinha', defaultId: 'cozinha' },
    { type: 'bar', label: 'Bar / Bebidas', icon: '🍹', defaultName: 'Impressora do Bar / Bebidas', defaultId: 'bar' },
    { type: 'other', label: 'Outro Setor', icon: '🖨️', defaultName: 'Impressora de Produção', defaultId: 'setor_extra' }
];

export const PrinterManagement: React.FC<PrinterManagementProps> = ({ restaurant, onUpdateRestaurant }) => {
    const { addToast } = useNotification();
    
    // Lista de impressoras cadastradas
    const [printers, setPrinters] = useState<PrinterConfig[]>(() => {
        if (restaurant.printers && restaurant.printers.length > 0) {
            return restaurant.printers;
        }
        return [];
    });

    // Categorias do cardápio do restaurante
    const [categories, setCategories] = useState<MenuCategory[]>([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState(false);
    const [categorySearch, setCategorySearch] = useState('');

    // Modal de criação / edição de impressora
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPrinterId, setEditingPrinterId] = useState<string | null>(null);

    // Form state
    const [formId, setFormId] = useState('');
    const [formName, setFormName] = useState('');
    const [formType, setFormType] = useState<PrinterType>('kitchen');
    const [formWidth, setFormWidth] = useState<80 | 58>(80);
    const [formMappedCategoryIds, setFormMappedCategoryIds] = useState<number[]>([]);
    const [formIsDefault, setFormIsDefault] = useState(false);
    const [formPrintFullReceipt, setFormPrintFullReceipt] = useState(false);
    const [formPrintKitchenReceipt, setFormPrintKitchenReceipt] = useState(true);
    const [formDeviceIdentifier, setFormDeviceIdentifier] = useState('');
    const [formNotes, setFormNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Estação ativa nesta máquina local
    const [currentStationId, setCurrentStationId] = useState<string>(() => {
        return localStorage.getItem('guarafood-print-station-id') || 
               localStorage.getItem('guarafood-print-server-role') || 
               'all';
    });

    // Test print job state
    const [testPrintJob, setTestPrintJob] = useState<{ order: Order; printerWidth: number; mode: 'full' | 'kitchen' } | null>(null);

    // Carrega categorias do cardápio
    useEffect(() => {
        let isMounted = true;
        const loadCategories = async () => {
            if (!restaurant?.id) return;
            setIsLoadingCategories(true);
            try {
                const data = await fetchMenuForRestaurant(restaurant.id, true);
                if (isMounted) {
                    setCategories(data || []);
                }
            } catch (err) {
                console.error("Erro ao carregar categorias do cardápio:", err);
            } finally {
                if (isMounted) setIsLoadingCategories(false);
            }
        };
        loadCategories();
        return () => { isMounted = false; };
    }, [restaurant?.id]);

    // Atualiza estado local de impressoras caso venha da prop
    useEffect(() => {
        if (restaurant.printers) {
            setPrinters(restaurant.printers);
        }
    }, [restaurant.printers]);

    // Disparador de impressão de teste
    useEffect(() => {
        if (testPrintJob) {
            const timer = setTimeout(() => {
                window.focus();
                window.print();
                setTimeout(() => {
                    setTestPrintJob(null);
                }, 1000);
            }, 400);
            return () => clearTimeout(timer);
        }
    }, [testPrintJob]);

    // Mapa de Categoria ID -> Nome
    const categoryMap = useMemo(() => {
        const map = new Map<number, MenuCategory>();
        categories.forEach(c => map.set(c.id, c));
        return map;
    }, [categories]);

    // Mapa de Categoria ID -> Em qual(is) impressora(s) já está mapeada
    const categoryPrinterMap = useMemo(() => {
        const map = new Map<number, string[]>();
        printers.forEach(p => {
            p.mappedCategoryIds.forEach(catId => {
                const existing = map.get(catId) || [];
                existing.push(p.name || p.id);
                map.set(catId, existing);
            });
        });
        return map;
    }, [printers]);

    // Abrir modal para adicionar
    const handleOpenAdd = (presetType?: PrinterType) => {
        const selectedPreset = DEFAULT_PRINTER_TYPES.find(p => p.type === presetType) || DEFAULT_PRINTER_TYPES[1];
        
        // Gera um ID inicial não duplicado
        let initialId = selectedPreset.defaultId;
        if (printers.some(p => p.id === initialId)) {
            initialId = `${initialId}_${printers.length + 1}`;
        }

        setEditingPrinterId(null);
        setFormId(initialId);
        setFormName(selectedPreset.defaultName);
        setFormType(selectedPreset.type);
        setFormWidth(80);
        setFormMappedCategoryIds([]);
        setFormIsDefault(printers.length === 0);
        setFormPrintFullReceipt(selectedPreset.type === 'cashier');
        setFormPrintKitchenReceipt(selectedPreset.type !== 'cashier');
        setFormDeviceIdentifier('');
        setFormNotes('');
        setCategorySearch('');
        setIsModalOpen(true);
    };

    // Abrir modal para editar
    const handleOpenEdit = (printer: PrinterConfig) => {
        setEditingPrinterId(printer.id);
        setFormId(printer.id);
        setFormName(printer.name);
        setFormType(printer.type);
        setFormWidth(printer.width || 80);
        setFormMappedCategoryIds(printer.mappedCategoryIds || []);
        setFormIsDefault(printer.isDefault || false);
        setFormPrintFullReceipt(printer.printFullReceipt || false);
        setFormPrintKitchenReceipt(printer.printKitchenReceipt !== false);
        setFormDeviceIdentifier(printer.deviceIdentifier || '');
        setFormNotes(printer.notes || '');
        setCategorySearch('');
        setIsModalOpen(true);
    };

    // Salvar impressora
    const handleSavePrinter = async (e: React.FormEvent) => {
        e.preventDefault();

        const cleanId = formId.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '');
        if (!cleanId) {
            addToast({ message: 'O identificador único é obrigatório e deve conter apenas letras, números e traços.', type: 'error' });
            return;
        }

        if (!formName.trim()) {
            addToast({ message: 'Informe um nome descritivo para a impressora.', type: 'error' });
            return;
        }

        // Verifica se o ID já existe (exceto se for a que estamos editando)
        const isDuplicate = printers.some(p => p.id === cleanId && p.id !== editingPrinterId);
        if (isDuplicate) {
            addToast({ message: `Já existe uma impressora cadastrada com o identificador "${cleanId}". Use um identificador diferente.`, type: 'error' });
            return;
        }

        setIsSaving(true);
        try {
            const newPrinterConfig: PrinterConfig = {
                id: cleanId,
                name: formName.trim(),
                type: formType,
                width: formWidth,
                mappedCategoryIds: formMappedCategoryIds,
                isDefault: formIsDefault,
                printFullReceipt: formPrintFullReceipt,
                printKitchenReceipt: formPrintKitchenReceipt,
                deviceIdentifier: formDeviceIdentifier.trim() || undefined,
                notes: formNotes.trim() || undefined,
                active: true
            };

            let updatedList: PrinterConfig[];
            if (editingPrinterId) {
                updatedList = printers.map(p => p.id === editingPrinterId ? newPrinterConfig : p);
            } else {
                updatedList = [...printers, newPrinterConfig];
            }

            // Se for marcada como default, desmarca as outras
            if (formIsDefault) {
                updatedList = updatedList.map(p => p.id === cleanId ? p : { ...p, isDefault: false });
            }

            // Salva no banco de dados e localStorage
            const updatedRestaurant = await updateRestaurant(restaurant.id, { printers: updatedList });
            setPrinters(updatedList);
            if (onUpdateRestaurant && updatedRestaurant) {
                onUpdateRestaurant(updatedRestaurant);
            }

            addToast({ 
                message: editingPrinterId ? 'Impressora atualizada com sucesso!' : 'Impressora cadastrada com sucesso!', 
                type: 'success' 
            });
            setIsModalOpen(false);
        } catch (err: any) {
            console.error("Erro ao salvar impressora:", err);
            addToast({ message: `Erro ao salvar impressora: ${err.message}`, type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    // Excluir impressora
    const handleDeletePrinter = async (printer: PrinterConfig) => {
        if (!confirm(`Tem certeza que deseja excluir a impressora "${printer.name}" (${printer.id})?`)) {
            return;
        }

        try {
            let updatedList = printers.filter(p => p.id !== printer.id);
            if (printer.isDefault && updatedList.length > 0) {
                updatedList = updatedList.map((p, idx) => idx === 0 ? { ...p, isDefault: true } : p);
            }
            const fallbackWidth = updatedList[0]?.width || restaurant.printerWidth || 80;
            const updatedRestaurant = await updateRestaurant(restaurant.id, { 
                printers: updatedList,
                printerWidth: fallbackWidth
            });
            setPrinters(updatedList);
            if (onUpdateRestaurant && updatedRestaurant) {
                onUpdateRestaurant(updatedRestaurant);
            }

            // Se a estação local era essa impressora, reverte para 'all'
            if (currentStationId === printer.id) {
                handleChangeStation('all');
            }

            addToast({ message: `Impressora "${printer.name}" removida.`, type: 'info' });
        } catch (err: any) {
            console.error("Erro ao excluir impressora:", err);
            addToast({ message: `Erro ao excluir: ${err.message}`, type: 'error' });
        }
    };

    // Carregar configuração recomendada rápida (Caixa, Cozinha e Bar)
    const handleLoadPresetAll = async () => {
        if (printers.length > 0 && !confirm("Deseja substituir as impressoras atuais pela configuração recomendada (Caixa, Cozinha e Bar)?")) {
            return;
        }

        // Tenta auto-mapear categorias para Cozinha e Bar de forma inteligente
        const barKeywords = ['bebida', 'suco', 'refrigerante', 'cerveja', 'drink', 'chopp', 'vinho', 'bar', 'água', 'whisky'];
        const barCategoryIds: number[] = [];
        const kitchenCategoryIds: number[] = [];

        categories.forEach(cat => {
            const lower = cat.name.toLowerCase();
            const isBar = barKeywords.some(kw => lower.includes(kw));
            if (isBar) {
                barCategoryIds.push(cat.id);
            } else {
                kitchenCategoryIds.push(cat.id);
            }
        });

        const presetPrinters: PrinterConfig[] = [
            {
                id: 'caixa',
                name: 'Impressora do Caixa / Balcão',
                type: 'cashier',
                width: 80,
                mappedCategoryIds: [],
                isDefault: true,
                printFullReceipt: true,
                printKitchenReceipt: false,
                notes: 'Imprime conferência de contas das mesas, balcão e delivery'
            },
            {
                id: 'cozinha',
                name: 'Impressora da Cozinha',
                type: 'kitchen',
                width: 80,
                mappedCategoryIds: kitchenCategoryIds,
                isDefault: false,
                printFullReceipt: false,
                printKitchenReceipt: true,
                notes: 'Imprime comandas de lanches, pratos e pizzas para preparo'
            },
            {
                id: 'bar',
                name: 'Impressora do Bar / Bebidas',
                type: 'bar',
                width: 80,
                mappedCategoryIds: barCategoryIds,
                isDefault: false,
                printFullReceipt: false,
                printKitchenReceipt: true,
                notes: 'Imprime pedidos de bebidas e drinks para os garçons retirarem'
            }
        ];

        try {
            const updatedRestaurant = await updateRestaurant(restaurant.id, { printers: presetPrinters });
            setPrinters(presetPrinters);
            if (onUpdateRestaurant && updatedRestaurant) {
                onUpdateRestaurant(updatedRestaurant);
            }
            addToast({ message: 'Configuração recomendada carregada com sucesso! Mapeamento de categorias aplicado.', type: 'success' });
        } catch (err: any) {
            console.error("Erro ao aplicar preset:", err);
            addToast({ message: `Erro: ${err.message}`, type: 'error' });
        }
    };

    // Alterar qual impressora este computador atende
    const handleChangeStation = (stationId: string) => {
        setCurrentStationId(stationId);
        localStorage.setItem('guarafood-print-station-id', stationId);
        
        // Também sincroniza com a variável legada para compatibilidade contínua
        let role = 'all';
        if (stationId === 'cozinha' || stationId.includes('cozinha')) role = 'kitchen';
        else if (stationId === 'caixa' || stationId === 'balcao' || stationId.includes('caixa')) role = 'counter';
        else if (stationId === 'all') role = 'all';
        else role = stationId;

        localStorage.setItem('guarafood-print-server-role', role);
        localStorage.setItem('guarafood-is-print-server', 'true');

        addToast({ 
            message: stationId === 'all' 
                ? 'Este terminal está configurado como Estação Geral (imprime todas as comandas e contas).' 
                : `Este terminal está configurado como estação exclusiva da impressora: "${stationId}".`, 
            type: 'info' 
        });
    };

    // Disparar teste de impressão nesta impressora
    const handleTestPrint = (printer: PrinterConfig) => {
        const sampleItems: CartItem[] = [];

        // Adiciona itens das categorias mapeadas como demonstração
        const mappedCats = categories.filter(c => printer.mappedCategoryIds.includes(c.id));
        if (mappedCats.length > 0) {
            mappedCats.slice(0, 3).forEach((cat, idx) => {
                const item = cat.items?.[0];
                sampleItems.push({
                    id: `test-item-${cat.id}-${idx}`,
                    name: item ? item.name : `Exemplo de ${cat.name}`,
                    price: item ? item.price : 25.0,
                    basePrice: item ? item.price : 25.0,
                    imageUrl: '',
                    quantity: 1,
                    description: `Categoria: ${cat.name}`,
                    notes: idx === 0 ? 'SEM CEBOLA / CAPRICHAR NO MOLHO' : undefined,
                    categoryId: cat.id
                });
            });
        } else {
            sampleItems.push({
                id: 'test-item-1',
                name: 'Item de Teste de Impressão',
                price: 32.50,
                basePrice: 32.50,
                imageUrl: '',
                quantity: 2,
                description: 'Demonstração de impressão térmica',
                notes: 'IMPRESSÃO REALIZADA COM SUCESSO'
            });
        }

        const syntheticOrder: Order = {
            id: `TEST-${printer.id.toUpperCase()}`,
            order_number: 999,
            timestamp: new Date().toISOString(),
            status: 'Novo Pedido',
            customerName: `TESTE: ${printer.name.toUpperCase()}`,
            customerPhone: '(35) 99999-9999',
            customerAddress: {
                zipCode: '37810-000',
                street: 'Mesa de Testes',
                number: '01',
                neighborhood: `SETOR: ${printer.type.toUpperCase()}`
            },
            tableNumber: 'TESTE-01',
            items: sampleItems,
            totalPrice: sampleItems.reduce((acc, i) => acc + (i.price * i.quantity), 0),
            subtotal: sampleItems.reduce((acc, i) => acc + (i.price * i.quantity), 0),
            restaurantId: restaurant.id,
            restaurantName: `${restaurant.name} [${printer.name}]`,
            restaurantAddress: restaurant.address || 'Guaranésia - MG',
            restaurantPhone: restaurant.phone || '',
            paymentMethod: 'Dinheiro (Impressão de Teste)'
        };

        setTestPrintJob({
            order: syntheticOrder,
            printerWidth: printer.width || 80,
            mode: printer.printKitchenReceipt ? 'kitchen' : 'full'
        });

        addToast({ 
            message: `Disparando teste de impressão para "${printer.name}" (${printer.width}mm)...`, 
            type: 'info' 
        });
    };

    // Disparar teste genérico (para validação imediata mesmo sem configurar impressoras)
    const handleTestGenericPrint = (width = 80) => {
        const syntheticOrder: Order = {
            id: `TEST-${Date.now().toString().slice(-4)}`,
            order_number: 999,
            timestamp: new Date().toISOString(),
            status: 'Novo Pedido',
            customerName: 'TESTE DE COMUNICAÇÃO',
            customerPhone: '(35) 99999-9999',
            customerAddress: {
                zipCode: '37810-000',
                street: 'Terminal de Caixa',
                number: '01',
                neighborhood: 'BALCÃO / SALÃO'
            },
            tableNumber: 'TESTE',
            items: [
                {
                    id: 'test-gen-1',
                    name: 'Teste de Impressão Térmica',
                    price: 15.0,
                    basePrice: 15.0,
                    imageUrl: '',
                    quantity: 1,
                    description: 'Validação da comunicação com a impressora',
                    notes: 'COMUNICAÇÃO OK • ALINHAMENTO CORRETO'
                }
            ],
            totalPrice: 15.0,
            subtotal: 15.0,
            restaurantId: restaurant.id,
            restaurantName: restaurant.name,
            restaurantAddress: restaurant.address || 'Guaranésia - MG',
            restaurantPhone: restaurant.phone || '',
            paymentMethod: 'Teste do Sistema'
        };

        setTestPrintJob({
            order: syntheticOrder,
            printerWidth: width,
            mode: 'full'
        });

        addToast({ 
            message: `Disparando teste de impressão térmico (${width}mm)...`, 
            type: 'info' 
        });
    };

    // Disparar teste na impressora selecionada para este computador
    const handleTestCurrentStation = () => {
        if (currentStationId !== 'all') {
            const targetPrinter = printers.find(p => p.id === currentStationId);
            if (targetPrinter) {
                handleTestPrint(targetPrinter);
                return;
            }
        }
        // Se a estação for 'all' (geral), testa com a impressora padrão ou primeira cadastrada
        const defaultPrinter = printers.find(p => p.isDefault) || printers[0];
        if (defaultPrinter) {
            handleTestPrint(defaultPrinter);
        } else {
            handleTestGenericPrint(restaurant.printerWidth || 80);
        }
    };

    const [isUpdatingDefault, setIsUpdatingDefault] = useState(false);

    // Identifica a impressora padrão atual (ou a primeira, ou genérica)
    const currentDefaultPrinter = useMemo(() => {
        return printers.find(p => p.isDefault) || (printers.length > 0 ? printers[0] : null);
    }, [printers]);

    const currentDefaultPrinterId = useMemo(() => {
        if (currentDefaultPrinter) {
            return currentDefaultPrinter.id;
        }
        return restaurant.printerWidth === 58 ? 'generic-58' : 'generic-80';
    }, [currentDefaultPrinter, restaurant.printerWidth]);

    // Ação para definir impressora padrão do sistema (utilizada automaticamente)
    const handleSetDefaultPrinter = async (targetId: string) => {
        try {
            setIsUpdatingDefault(true);

            if (targetId.startsWith('generic-')) {
                const width = targetId === 'generic-58' ? 58 : 80;
                const updatedRestaurant = await updateRestaurant(restaurant.id, { printerWidth: width });
                localStorage.setItem('guarafood-printer-width', width.toString());
                if (onUpdateRestaurant && updatedRestaurant) {
                    onUpdateRestaurant(updatedRestaurant);
                }
                addToast({ 
                    message: `Largura padrão configurada para ${width}mm.`, 
                    type: 'success' 
                });
                return;
            }

            const targetPrinter = printers.find(p => p.id === targetId);
            if (!targetPrinter) return;

            const updatedList: PrinterConfig[] = printers.map(p => ({
                ...p,
                isDefault: p.id === targetId
            }));

            const targetWidth = targetPrinter.width || restaurant.printerWidth || 80;
            const updatedRestaurant = await updateRestaurant(restaurant.id, { 
                printers: updatedList,
                printerWidth: targetWidth
            });

            setPrinters(updatedList);
            localStorage.setItem('guarafood-default-printer-id', targetId);
            localStorage.setItem('guarafood-printer-width', targetWidth.toString());

            if (onUpdateRestaurant && updatedRestaurant) {
                onUpdateRestaurant(updatedRestaurant);
            }

            addToast({ 
                message: `Impressora "${targetPrinter.name}" definida como padrão para novos pedidos!`, 
                type: 'success' 
            });
        } catch (err: any) {
            console.error("Erro ao definir impressora padrão:", err);
            addToast({ message: `Erro ao definir impressora padrão: ${err.message}`, type: 'error' });
        } finally {
            setIsUpdatingDefault(false);
        }
    };

    // Categorias filtradas na busca do modal
    const filteredCategories = useMemo(() => {
        if (!categorySearch.trim()) return categories;
        const q = categorySearch.toLowerCase();
        return categories.filter(c => c.name.toLowerCase().includes(q));
    }, [categories, categorySearch]);

    // Toggle categoria no formulário
    const toggleCategorySelection = (categoryId: number) => {
        setFormMappedCategoryIds(prev => {
            if (prev.includes(categoryId)) {
                return prev.filter(id => id !== categoryId);
            } else {
                return [...prev, categoryId];
            }
        });
    };

    // Selecionar / Desmarcar todas as categorias
    const handleSelectAllCategories = () => {
        setFormMappedCategoryIds(categories.map(c => c.id));
    };
    const handleDeselectAllCategories = () => {
        setFormMappedCategoryIds([]);
    };

    return (
        <div className="space-y-6" id="printer-management-section">
            {/* CABEÇALHO DO MÓDULO */}
            <div className="bg-white p-6 rounded-2xl border-2 border-orange-200 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">🖨️</span>
                            <h3 className="text-lg font-black text-gray-900 tracking-tight">
                                Múltiplas Impressoras & Roteamento de Categorias
                            </h3>
                            <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-orange-100 text-orange-800 rounded-md">
                                Setores & Automação
                            </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1 leading-relaxed max-w-2xl">
                            Cadastre impressoras para cada setor do seu estabelecimento (ex: <strong>Caixa</strong>, <strong>Cozinha</strong>, <strong>Bar</strong>) com identificadores únicos. Vincule quais categorias de produtos imprimem em cada uma para que as comandas saiam automaticamente no destino certo.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            type="button"
                            onClick={handleTestCurrentStation}
                            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
                            title="Dispara um cupom de teste agora para validar a impressora selecionada no seu computador"
                        >
                            <span>🖨️</span> Teste de Impressão
                        </button>
                        {printers.length === 0 && (
                            <button
                                type="button"
                                onClick={handleLoadPresetAll}
                                className="px-3.5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
                                title="Cria automaticamente as impressoras de Caixa, Cozinha e Bar já mapeadas"
                            >
                                <span>⚡</span> Configuração Recomendada
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => handleOpenAdd()}
                            className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
                        >
                            <span>➕</span> Cadastrar Impressora
                        </button>
                    </div>
                </div>

                {/* PAINEL DE CONTROLE: SELETOR DE IMPRESSORA PADRÃO & ESTAÇÃO LOCAL */}
                <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* 1. SELECIONAR IMPRESSORA PADRÃO DO SISTEMA */}
                    <div className="bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-amber-50/90 p-4 sm:p-5 rounded-2xl border-2 border-amber-300 shadow-2xs flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">🌟</span>
                                    <h4 className="font-black text-sm uppercase text-amber-950 tracking-tight">
                                        Selecionar Impressora Padrão
                                    </h4>
                                </div>
                                <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-amber-200 text-amber-900 rounded-md">
                                    Automático
                                </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                                Define o dispositivo utilizado <strong>automaticamente</strong> para novos pedidos e cupons, sem precisar de seleção manual a cada impressão.
                            </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-amber-200/70">
                            <label htmlFor="select-default-printer" className="block text-[10px] font-black uppercase tracking-wider text-amber-900 mb-1.5 flex items-center justify-between">
                                <span>Dispositivo Padrão dos Pedidos:</span>
                                {isUpdatingDefault && <span className="text-[10px] text-amber-700 animate-pulse font-bold">Salvando...</span>}
                            </label>
                            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                <select
                                    id="select-default-printer"
                                    value={currentDefaultPrinterId}
                                    onChange={(e) => handleSetDefaultPrinter(e.target.value)}
                                    disabled={isUpdatingDefault}
                                    className="flex-1 min-w-[200px] px-3 py-2.5 bg-white border-2 border-amber-300 rounded-xl font-bold text-xs text-gray-900 focus:ring-2 focus:ring-amber-500 outline-none shadow-2xs disabled:opacity-50"
                                >
                                    {printers.length > 0 ? (
                                        printers.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.type === 'kitchen' ? '🍳' : p.type === 'bar' ? '🍹' : p.type === 'cashier' ? '🛎️' : '🖨️'} {p.name} ({p.width}mm) {p.isDefault ? '★ [Padrão Atual]' : ''}
                                            </option>
                                        ))
                                    ) : (
                                        <>
                                            <option value="generic-80">🖨️ Impressora Térmica do Sistema (80mm - Padrão)</option>
                                            <option value="generic-58">🖨️ Impressora Térmica Pequena (58mm)</option>
                                        </>
                                    )}
                                </select>

                                <button
                                    type="button"
                                    onClick={() => {
                                        if (currentDefaultPrinter) {
                                            handleTestPrint(currentDefaultPrinter);
                                        } else {
                                            handleTestGenericPrint(restaurant.printerWidth || 80);
                                        }
                                    }}
                                    className="px-3.5 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-xs transition-all flex items-center gap-1.5 shrink-0"
                                    title="Disparar cupom de teste na impressora padrão"
                                >
                                    <span>🖨️</span>
                                    <span>Testar Padrão</span>
                                </button>
                            </div>

                            <div className="mt-2.5 flex items-center gap-2 text-[11px] text-amber-900 font-medium">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                                <span className="truncate">
                                    Dispositivo ativo: <strong>{currentDefaultPrinter ? currentDefaultPrinter.name : `Térmica (${restaurant.printerWidth || 80}mm)`}</strong> ({currentDefaultPrinter?.width || restaurant.printerWidth || 80}mm)
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 2. ESTAÇÃO ATIVA DESTE COMPUTADOR / TERMINAL */}
                    <div className="bg-gradient-to-br from-orange-50/70 to-orange-100/40 p-4 sm:p-5 rounded-2xl border-2 border-orange-200 shadow-2xs flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">🖥️</span>
                                    <h4 className="font-black text-sm uppercase text-gray-900 tracking-tight">
                                        Estação Deste Terminal
                                    </h4>
                                </div>
                                <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-orange-200 text-orange-900 rounded-md">
                                    Terminal Local
                                </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                                Selecione qual impressora física está conectada por cabo USB ou Rede nesta máquina específica:
                            </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-orange-200/70">
                            <label className="block text-[10px] font-black uppercase tracking-wider text-orange-950 mb-1.5">
                                Filtrar Impressão Por Este Terminal:
                            </label>
                            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                <select
                                    value={currentStationId}
                                    onChange={e => handleChangeStation(e.target.value)}
                                    className="flex-1 min-w-[200px] px-3 py-2.5 bg-white border-2 border-orange-300 rounded-xl font-bold text-xs text-gray-900 focus:ring-2 focus:ring-orange-500 outline-none shadow-2xs"
                                >
                                    <option value="all">🌟 Estação Geral (Imprime Todos os Setores)</option>
                                    {printers.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.type === 'kitchen' ? '🍳' : p.type === 'bar' ? '🍹' : p.type === 'cashier' ? '🛎️' : '🖨️'} {p.name} (ID: {p.id})
                                        </option>
                                    ))}
                                </select>

                                <button
                                    type="button"
                                    onClick={handleTestCurrentStation}
                                    className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-xs transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
                                    title="Envia um cupom de teste agora para a impressora selecionada neste computador"
                                >
                                    <span>🖨️</span>
                                    <span>Testar Terminal</span>
                                </button>
                            </div>

                            <div className="mt-2.5 flex items-center gap-2 text-[11px] text-orange-900 font-medium">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                                <span className="truncate">
                                    Modo: <strong>{currentStationId === 'all' ? 'Imprime todos os setores' : `Filtrado para ${printers.find(p => p.id === currentStationId)?.name || currentStationId}`}</strong>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* LISTA DE IMPRESSORAS CADASTRADAS */}
            {printers.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border-2 border-dashed border-gray-300 text-center space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-orange-50 flex items-center justify-center text-3xl">
                        🖨️
                    </div>
                    <div>
                        <h4 className="font-black text-gray-900 text-base">Nenhuma impressora cadastrada ainda</h4>
                        <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                            Cadastre as impressoras do seu estabelecimento para enviar lanches para a cozinha, bebidas para o bar e contas para o caixa.
                        </p>
                    </div>
                    <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
                        <button
                            type="button"
                            onClick={() => handleTestGenericPrint(restaurant.printerWidth || 80)}
                            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
                            title="Testa a comunicação com a impressora térmica física antes mesmo de configurar setores"
                        >
                            <span>🖨️</span> Teste de Impressão Rápido
                        </button>
                        <button
                            type="button"
                            onClick={handleLoadPresetAll}
                            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95"
                        >
                            ⚡ Carregar Caixa, Cozinha e Bar
                        </button>
                        <button
                            type="button"
                            onClick={() => handleOpenAdd()}
                            className="px-4 py-2.5 bg-gray-800 hover:bg-black text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all active:scale-95"
                        >
                            ➕ Cadastrar Manualmente
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {printers.map(printer => {
                        const typeInfo = DEFAULT_PRINTER_TYPES.find(t => t.type === printer.type) || DEFAULT_PRINTER_TYPES[3];
                        const isCurrentStation = currentStationId === printer.id;
                        const mappedCats = categories.filter(c => printer.mappedCategoryIds.includes(c.id));

                        return (
                            <div 
                                key={printer.id} 
                                className={`bg-white rounded-2xl border-2 transition-all p-5 flex flex-col justify-between shadow-xs ${
                                    isCurrentStation ? 'border-orange-500 ring-2 ring-orange-200' : 'border-gray-200 hover:border-orange-300'
                                }`}
                            >
                                <div className="space-y-3">
                                    {/* Topo do Card */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xl">{typeInfo.icon}</span>
                                                <h4 className="font-black text-gray-900 text-base leading-snug">
                                                    {printer.name}
                                                </h4>
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                <span className="font-mono text-[10px] font-black uppercase px-2 py-0.5 bg-gray-100 text-gray-800 rounded-md border border-gray-200">
                                                    ID: {printer.id}
                                                </span>
                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-orange-100 text-orange-900 rounded-md">
                                                    {printer.width}mm
                                                </span>
                                                {printer.isDefault && (
                                                    <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-md flex items-center gap-1 shadow-2xs">
                                                        <span>⭐</span> Padrão
                                                    </span>
                                                )}
                                                {isCurrentStation && (
                                                    <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                                                        Este PC
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Regras de impressão */}
                                    <div className="text-[11px] text-gray-600 space-y-1 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                                        <div className="flex items-center gap-1.5">
                                            <span>{printer.printKitchenReceipt ? '✅' : '⚪'}</span>
                                            <span>Comandas de Produção: <strong>{printer.printKitchenReceipt ? 'Ativo' : 'Desativado'}</strong></span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span>{printer.printFullReceipt ? '✅' : '⚪'}</span>
                                            <span>Conferência de Conta / Cupom: <strong>{printer.printFullReceipt ? 'Ativo' : 'Desativado'}</strong></span>
                                        </div>
                                        {printer.deviceIdentifier && (
                                            <div className="text-[10px] text-gray-500 truncate pt-1 border-t border-gray-200/60">
                                                Dispositivo: <code>{printer.deviceIdentifier}</code>
                                            </div>
                                        )}
                                    </div>

                                    {/* Categorias Mapeadas */}
                                    <div>
                                        <div className="flex items-center justify-between text-xs mb-1.5">
                                            <span className="font-bold text-gray-700">Categorias Mapeadas:</span>
                                            <span className="text-[11px] font-semibold text-gray-500">
                                                {printer.mappedCategoryIds.length} {printer.mappedCategoryIds.length === 1 ? 'categoria' : 'categorias'}
                                            </span>
                                        </div>

                                        {printer.mappedCategoryIds.length === 0 ? (
                                            <p className="text-[11px] text-gray-400 italic bg-gray-50 p-2 rounded-lg border border-dashed border-gray-200">
                                                {printer.isDefault 
                                                    ? '🌟 Impressora Padrão: Imprime produtos sem categoria específica.' 
                                                    : 'Nenhuma categoria vinculada. (Pode receber contas ou cupons gerais)'
                                                }
                                            </p>
                                        ) : (
                                            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1 bg-gray-50 rounded-xl border border-gray-100">
                                                {mappedCats.map(cat => (
                                                    <span 
                                                        key={cat.id}
                                                        className="text-[10px] font-bold px-2 py-0.5 bg-white border border-gray-200 text-gray-800 rounded-md shadow-2xs"
                                                    >
                                                        {cat.name}
                                                    </span>
                                                ))}
                                                {printer.mappedCategoryIds.length > mappedCats.length && (
                                                    <span className="text-[10px] font-medium text-gray-500 px-1 py-0.5">
                                                        +{printer.mappedCategoryIds.length - mappedCats.length} outras
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Botões de Ação */}
                                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleTestPrint(printer)}
                                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 active:scale-95 shadow-2xs"
                                        title={`Disparar teste de impressão direto na impressora "${printer.name}"`}
                                    >
                                        <span>🖨️</span> Testar Impressão
                                    </button>

                                    <div className="flex items-center gap-1">
                                        {!printer.isDefault && (
                                            <button
                                                type="button"
                                                disabled={isUpdatingDefault}
                                                onClick={() => handleSetDefaultPrinter(printer.id)}
                                                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-black transition-all flex items-center gap-1 active:scale-95 shadow-2xs disabled:opacity-50"
                                                title={`Definir "${printer.name}" como a impressora padrão automática`}
                                            >
                                                <span>⭐</span> Tornar Padrão
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => handleOpenEdit(printer)}
                                            className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-bold transition-all active:scale-95"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeletePrinter(printer)}
                                            className="px-2 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold transition-all"
                                            title="Excluir impressora"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* MODAL DE CADASTRO / EDIÇÃO */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border-2 border-orange-300 my-8 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">
                                    {DEFAULT_PRINTER_TYPES.find(t => t.type === formType)?.icon || '🖨️'}
                                </span>
                                <div>
                                    <h3 className="font-black text-gray-900 text-lg">
                                        {editingPrinterId ? 'Editar Impressora' : 'Cadastrar Nova Impressora'}
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        Identificador único e mapeamento de categorias
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold flex items-center justify-center text-sm"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSavePrinter} className="mt-5 space-y-5">
                            {/* LINHA 1: TIPO DE SETOR */}
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-700 mb-2">
                                    1. Setor / Função da Impressora:
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {DEFAULT_PRINTER_TYPES.map(t => (
                                        <button
                                            key={t.type}
                                            type="button"
                                            onClick={() => {
                                                setFormType(t.type);
                                                if (!editingPrinterId && !formName) {
                                                    setFormName(t.defaultName);
                                                }
                                                if (t.type === 'cashier') {
                                                    setFormPrintFullReceipt(true);
                                                }
                                            }}
                                            className={`p-3 rounded-xl border-2 text-center transition-all flex flex-col items-center gap-1 ${
                                                formType === t.type 
                                                    ? 'bg-orange-50 border-orange-600 text-orange-950 font-black shadow-xs' 
                                                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-orange-300'
                                            }`}
                                        >
                                            <span className="text-xl">{t.icon}</span>
                                            <span className="text-xs font-bold">{t.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* LINHA 2: IDENTIFICADOR ÚNICO & NOME DESCRITIVO */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-xs font-black uppercase text-gray-700">
                                            Identificador Único (ID): *
                                        </label>
                                        <span className="text-[10px] text-gray-400">ex: cozinha, bar, caixa</span>
                                    </div>
                                    <input
                                        type="text"
                                        value={formId}
                                        onChange={e => setFormId(e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, ''))}
                                        placeholder="ex: cozinha_1"
                                        required
                                        className="w-full p-3 border-2 border-gray-300 rounded-xl font-mono font-bold text-gray-900 bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm"
                                    />
                                    {/* Sugestões rápidas de ID */}
                                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                        <span className="text-[10px] text-gray-400">Sugestões:</span>
                                        {['caixa', 'cozinha', 'bar', 'pizzaria', 'chapa', 'copa'].map(sug => (
                                            <button
                                                key={sug}
                                                type="button"
                                                onClick={() => setFormId(sug)}
                                                className="text-[10px] font-bold px-1.5 py-0.5 bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-900 rounded transition-colors"
                                            >
                                                +{sug}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-black uppercase text-gray-700 mb-1">
                                        Nome Amigável da Impressora: *
                                    </label>
                                    <input
                                        type="text"
                                        value={formName}
                                        onChange={e => setFormName(e.target.value)}
                                        placeholder="Ex: Impressora da Cozinha Quente"
                                        required
                                        className="w-full p-3 border-2 border-gray-300 rounded-xl font-bold text-gray-900 bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">Nome exibido nos relatórios e nos terminais</p>
                                </div>
                            </div>

                            {/* LINHA 3: LARGURA DA BOBINA FÍSICA */}
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-700 mb-1.5">
                                    Largura da Bobina Térmica:
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormWidth(80)}
                                        className={`p-3 rounded-xl border-2 text-center transition-all flex items-center justify-center gap-2 ${
                                            formWidth === 80 
                                                ? 'bg-orange-50 border-orange-600 text-orange-950 font-black shadow-xs' 
                                                : 'bg-gray-50 border-gray-200 text-gray-600'
                                        }`}
                                    >
                                        <span className="text-base font-black">80mm</span>
                                        <span className="text-[10px] uppercase font-bold text-gray-500">(Padrão Balcão / Cozinha)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormWidth(58)}
                                        className={`p-3 rounded-xl border-2 text-center transition-all flex items-center justify-center gap-2 ${
                                            formWidth === 58 
                                                ? 'bg-orange-50 border-orange-600 text-orange-950 font-black shadow-xs' 
                                                : 'bg-gray-50 border-gray-200 text-gray-600'
                                        }`}
                                    >
                                        <span className="text-base font-black">58mm</span>
                                        <span className="text-[10px] uppercase font-bold text-gray-500">(Portátil / Bluetooth)</span>
                                    </button>
                                </div>
                            </div>

                            {/* LINHA 4: MAPEAMENTO DE CATEGORIAS DE PRODUTOS */}
                            <div className="bg-orange-50/60 p-4 rounded-2xl border border-orange-200 space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div>
                                        <label className="block text-xs font-black uppercase text-gray-900">
                                            2. Mapeamento de Categorias de Produtos:
                                        </label>
                                        <p className="text-[11px] text-gray-600">
                                            Selecione quais categorias de produtos imprimirão nesta impressora:
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={handleSelectAllCategories}
                                            className="text-[10px] font-bold px-2 py-1 bg-white border border-orange-300 text-orange-900 rounded-lg hover:bg-orange-100 transition-colors"
                                        >
                                            Selecionar Todas
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleDeselectAllCategories}
                                            className="text-[10px] font-bold px-2 py-1 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                                        >
                                            Limpar Seleção
                                        </button>
                                    </div>
                                </div>

                                {/* Busca rápida de categoria */}
                                {categories.length > 6 && (
                                    <input
                                        type="text"
                                        value={categorySearch}
                                        onChange={e => setCategorySearch(e.target.value)}
                                        placeholder="Filtrar categorias..."
                                        className="w-full p-2 border border-orange-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                                    />
                                )}

                                {/* Grid de categorias */}
                                {isLoadingCategories ? (
                                    <div className="p-4 text-center text-xs text-gray-500">
                                        Carregando categorias do cardápio...
                                    </div>
                                ) : categories.length === 0 ? (
                                    <div className="p-4 text-center text-xs text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                                        Nenhuma categoria cadastrada no cardápio. Cadastre categorias na aba "Cardápio" para mapeá-las aqui.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1">
                                        {filteredCategories.map(cat => {
                                            const isSelected = formMappedCategoryIds.includes(cat.id);
                                            const otherPrinters = (categoryPrinterMap.get(cat.id) || []).filter(name => {
                                                return editingPrinterId ? name !== formName && name !== editingPrinterId : true;
                                            });

                                            return (
                                                <div
                                                    key={cat.id}
                                                    onClick={() => toggleCategorySelection(cat.id)}
                                                    className={`p-2.5 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between gap-2 select-none ${
                                                        isSelected 
                                                            ? 'bg-white border-orange-600 shadow-xs' 
                                                            : 'bg-white/80 border-gray-200 hover:border-orange-200'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => {}} // tratado no onClick do container
                                                            className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500 cursor-pointer"
                                                        />
                                                        <div className="truncate">
                                                            <p className="font-bold text-xs text-gray-900 truncate">
                                                                {cat.name}
                                                            </p>
                                                            {cat.items && (
                                                                <p className="text-[10px] text-gray-400">
                                                                    {cat.items.length} {cat.items.length === 1 ? 'item' : 'itens'}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {otherPrinters.length > 0 && !isSelected && (
                                                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded shrink-0" title={`Já mapeada em: ${otherPrinters.join(', ')}`}>
                                                            {otherPrinters[0]}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                <div className="text-[11px] text-orange-900/80 font-medium">
                                    {formMappedCategoryIds.length} de {categories.length} categorias selecionadas para esta impressora.
                                </div>
                            </div>

                            {/* LINHA 5: OPÇÕES DE IMPRESSÃO */}
                            <div className="space-y-2 text-xs">
                                <label className="block font-black uppercase text-gray-700 mb-1">
                                    3. Regras de Disparo:
                                </label>

                                <label className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer hover:bg-orange-50/50">
                                    <input
                                        type="checkbox"
                                        checked={formPrintKitchenReceipt}
                                        onChange={e => setFormPrintKitchenReceipt(e.target.checked)}
                                        className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                                    />
                                    <div>
                                        <span className="font-bold text-gray-900">Imprimir Comandas de Produção</span>
                                        <p className="text-[11px] text-gray-500">Imprime os itens a preparar das categorias mapeadas (padrão para Cozinha e Bar).</p>
                                    </div>
                                </label>

                                <label className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer hover:bg-orange-50/50">
                                    <input
                                        type="checkbox"
                                        checked={formPrintFullReceipt}
                                        onChange={e => setFormPrintFullReceipt(e.target.checked)}
                                        className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                                    />
                                    <div>
                                        <span className="font-bold text-gray-900">Imprimir Cupom de Conta / Conferência / Balcão</span>
                                        <p className="text-[11px] text-gray-500">Imprime o resumo completo com valores financeiros quando solicitado na mesa ou balcão (padrão para Caixa).</p>
                                    </div>
                                </label>

                                <label className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer hover:bg-orange-50/50">
                                    <input
                                        type="checkbox"
                                        checked={formIsDefault}
                                        onChange={e => setFormIsDefault(e.target.checked)}
                                        className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                                    />
                                    <div>
                                        <span className="font-bold text-gray-900">Impressora Padrão de Fallback</span>
                                        <p className="text-[11px] text-gray-500">Recebe os itens de categorias que não foram associadas a nenhuma impressora específica.</p>
                                    </div>
                                </label>
                            </div>

                            {/* LINHA 6: DISPOSITIVO FÍSICO / OBSERVAÇÕES (OPCIONAL) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">
                                        Identificador no Sistema / IP (Opcional):
                                    </label>
                                    <input
                                        type="text"
                                        value={formDeviceIdentifier}
                                        onChange={e => setFormDeviceIdentifier(e.target.value)}
                                        placeholder="Ex: EPSON TM-T20X ou 192.168.1.150"
                                        className="w-full p-2.5 border border-gray-300 rounded-xl text-xs font-medium text-gray-800 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">
                                        Observações / Localização:
                                    </label>
                                    <input
                                        type="text"
                                        value={formNotes}
                                        onChange={e => setFormNotes(e.target.value)}
                                        placeholder="Ex: Bancada dos cozinheiros"
                                        className="w-full p-2.5 border border-gray-300 rounded-xl text-xs font-medium text-gray-800 bg-white"
                                    />
                                </div>
                            </div>

                            {/* BOTÕES DO FORMULÁRIO */}
                            <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                                {editingPrinterId ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const currentPrinter = printers.find(p => p.id === editingPrinterId);
                                            if (currentPrinter) {
                                                handleTestPrint({
                                                    ...currentPrinter,
                                                    name: formName || currentPrinter.name,
                                                    width: formWidth,
                                                    printKitchenReceipt: formPrintKitchenReceipt,
                                                    printFullReceipt: formPrintFullReceipt,
                                                });
                                            }
                                        }}
                                        className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95"
                                        title="Dispara um cupom de teste com os parâmetros atuais"
                                    >
                                        <span>🖨️</span> Testar Impressão
                                    </button>
                                ) : <div />}

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50"
                                    >
                                        {isSaving ? 'Salvando...' : editingPrinterId ? 'Salvar Alterações' : 'Cadastrar Impressora'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ELEMENTO OCULTO PARA DISPARO DE IMPRESSÃO DE TESTE */}
            <div className="hidden print:block">
                {testPrintJob && (
                    <PrintableOrder
                        order={testPrintJob.order}
                        printerWidth={testPrintJob.printerWidth}
                        printMode={testPrintJob.mode}
                    />
                )}
            </div>
        </div>
    );
};

export default PrinterManagement;
