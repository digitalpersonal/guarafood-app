const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;
let printWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    // Em desenvolvimento, carrega o localhost. Em produção, carregaria o arquivo estático.
    const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:5173';
    mainWindow.loadURL(startUrl);

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});

// --- Lógica de Impressão Silenciosa (Térmica) ---
ipcMain.handle('print-order', async (event, { html, printerWidth }) => {
    try {
        // Cria uma janela invisível para renderizar o cupom
        printWindow = new BrowserWindow({ 
            show: false, 
            width: printerWidth === 58 ? 300 : 400, // Ajusta largura baseada no papel
            webPreferences: { nodeIntegration: false } 
        });

        // Carrega o HTML do cupom
        const printContent = `
            <html>
            <head>
                <style>
                    body { margin: 0; padding: 0; background: white; font-family: 'Courier New', monospace; }
                    /* Garante que o conteúdo seja visível para o Electron imprimir */
                    #thermal-receipt { visibility: visible !important; position: static !important; width: 100% !important; }
                </style>
            </head>
            <body>${html}</body>
            </html>
        `;

        await printWindow.loadURL('data:text/html;charset=utf-8,' + encodeURI(printContent));

        // Aguarda renderização
        await new Promise(resolve => setTimeout(resolve, 500));

        // Imprime
        // silent: true evita a caixa de diálogo do sistema
        await printWindow.webContents.print({
            silent: true,
            printBackground: true,
            deviceName: '' // Deixe vazio para usar a impressora padrão do sistema
        });

        printWindow.close();
        return { success: true };
    } catch (error) {
        console.error("Erro na impressão:", error);
        if (printWindow) printWindow.close();
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-version', () => {
    return app.getVersion();
});