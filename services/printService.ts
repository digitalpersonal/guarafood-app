import qz from 'qz-tray';

let connectionPromise: Promise<boolean> | null = null;

export const PrintService = {
  async connect() {
    if (qz.websocket.isActive()) {
      return true;
    }

    if (connectionPromise) {
      return connectionPromise;
    }

    connectionPromise = (async () => {
      try {
        await qz.websocket.connect();
        return true;
      } catch (error) {
        connectionPromise = null;
        console.error('Erro ao conectar ao QZ Tray:', error);
        throw new Error('Não foi possível conectar ao QZ Tray. Certifique-se de que o software QZ Tray está instalado e rodando (ícone "Q" verde na barra de tarefas do Windows).');
      }
    })();

    return connectionPromise;
  },

  async getPrinters() {
    try {
      const connected = await this.connect();
      if (!connected) {
        throw new Error('QZ Tray não está respondendo. Verifique se o aplicativo está rodando.');
      }
      return await qz.printers.find();
    } catch (error) {
      console.error('Erro ao buscar impressoras:', error);
      throw error; // Re-throw to handle in UI
    }
  },

  async print(printerName: string, data: any) {
    try {
      await this.connect();
      const config = qz.configs.create(printerName);
      await qz.print(config, [data]);
      return true;
    } catch (error) {
      console.error('Erro ao imprimir:', error);
      return false;
    }
  },

  async printHtml(printerName: string, htmlContent: string) {
    try {
      await this.connect();
      // Configure print settings (you can add options like margins here if needed)
      const config = qz.configs.create(printerName);
      
      const data = [{
        type: 'pixel',
        format: 'html',
        flavor: 'plain',
        data: htmlContent
      }];
      
      await qz.print(config, data);
      return true;
    } catch (error) {
      console.error('Erro ao imprimir HTML via QZ Tray:', error);
      return false;
    }
  }
};
