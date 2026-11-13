/**
 * Utilitário de impressão térmica isolada via iframe oculto.
 * Evita que o layout da página principal (headers fixos, Tailwind, modais, scroll, min-h-screen)
 * gere margens ou bobina em branco antes ou depois do cupom no Chrome (--kiosk-printing).
 */
export const printThermalElement = (
    sourceElement: HTMLElement | null,
    printerWidth: number = 80
): Promise<void> => {
    return new Promise((resolve) => {
        if (!sourceElement) {
            resolve();
            return;
        }

        const htmlContent = sourceElement.innerHTML;
        if (!htmlContent || !htmlContent.trim()) {
            resolve();
            return;
        }

        const paperWidth = `${printerWidth === 58 ? 58 : 80}mm`;

        const iframe = document.createElement('iframe');
        iframe.setAttribute('aria-hidden', 'true');
        iframe.style.position = 'fixed';
        iframe.style.left = '-9999px';
        iframe.style.top = '0';
        iframe.style.width = paperWidth;
        iframe.style.height = '1px';
        iframe.style.border = '0';
        iframe.style.margin = '0';
        iframe.style.padding = '0';
        iframe.style.opacity = '0';
        iframe.style.pointerEvents = 'none';

        document.body.appendChild(iframe);

        const cleanup = () => {
            setTimeout(() => {
                if (iframe.parentNode) {
                    iframe.parentNode.removeChild(iframe);
                }
            }, 20000);
        };

        try {
            const doc = iframe.contentDocument || iframe.contentWindow?.document;
            const win = iframe.contentWindow;

            if (!doc || !win) {
                cleanup();
                window.focus();
                window.print();
                resolve();
                return;
            }

            doc.open();
            doc.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Cupom</title>
  <style>
    @page {
      margin: 0 !important;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: ${paperWidth} !important;
      max-width: ${paperWidth} !important;
      height: auto !important;
      min-height: 0 !important;
      background: #ffffff !important;
      color: #000000 !important;
      overflow: visible !important;
    }
    #thermal-receipt-container {
      display: block !important;
      position: static !important;
      width: 100% !important;
      max-width: ${paperWidth} !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #000000 !important;
    }
    style {
      display: none !important;
    }
  </style>
</head>
<body>${htmlContent}</body>
</html>`);
            doc.close();

            // Aguarda um breve frame para o Blink finalizar layout de tabelas e SVG antes do print()
            setTimeout(() => {
                try {
                    win.focus();
                    win.print();
                } catch (err) {
                    console.error('[thermalPrint] Erro ao imprimir iframe:', err);
                } finally {
                    cleanup();
                    resolve();
                }
            }, 80);
        } catch (err) {
            console.error('[thermalPrint] Falha ao preparar iframe de impressão:', err);
            cleanup();
            window.focus();
            window.print();
            resolve();
        }
    });
};
