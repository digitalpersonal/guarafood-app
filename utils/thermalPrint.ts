/**
 * Utilitário de impressão térmica isolada via iframe invisível.
 * Resolve em definitivo o problema de avanço de papel em branco (bobina vazia)
 * causado pelo layout da página principal (headers fixos, min-h-screen, modais e Tailwind).
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

        const rawHtml = sourceElement.innerHTML;
        if (!rawHtml || !rawHtml.trim()) {
            resolve();
            return;
        }

        // Remove tags <style> internas conflitantes que possam conter 'display: none' em screen
        const cleanHtml = rawHtml.replace(/<style[\s\S]*?<\/style>/gi, '');

        const paperWidth = `${printerWidth === 58 ? 58 : 80}mm`;
        const sidePadding = printerWidth === 58 ? '1mm' : '2mm';
        const baseFontSize = printerWidth === 58 ? '12px' : '13px';
        const headerFontSize = printerWidth === 58 ? '14px' : '15px';
        const titleFontSize = printerWidth === 58 ? '17px' : '18px';
        const smallFontSize = printerWidth === 58 ? '10px' : '11px';

        const iframe = document.createElement('iframe');
        iframe.setAttribute('aria-hidden', 'true');
        iframe.style.position = 'fixed';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.style.width = paperWidth;
        iframe.style.height = '600px';
        iframe.style.border = '0';
        iframe.style.margin = '0';
        iframe.style.padding = '0';
        iframe.style.opacity = '0';
        iframe.style.zIndex = '-99999';
        iframe.style.pointerEvents = 'none';

        document.body.appendChild(iframe);

        const cleanup = () => {
            setTimeout(() => {
                if (iframe.parentNode) {
                    iframe.parentNode.removeChild(iframe);
                }
            }, 25000);
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
      size: ${paperWidth} auto;
    }
    *, *::before, *::after {
      box-sizing: border-box !important;
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
      max-height: none !important;
      background: #ffffff !important;
      color: #000000 !important;
      overflow: visible !important;
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.15;
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
    #thermal-content {
      width: 100% !important;
      max-width: ${paperWidth} !important;
      margin: 0 auto !important;
      padding: 1mm ${sidePadding} 4mm ${sidePadding} !important;
      color: #000000 !important;
      box-sizing: border-box !important;
    }
    #thermal-content * {
      color: #000000 !important;
      background: #ffffff !important;
      word-wrap: break-word !important;
      overflow-wrap: anywhere !important;
      white-space: normal !important;
      font-weight: 700 !important;
      box-sizing: border-box !important;
    }
    .receipt-header {
      text-align: center;
      margin-bottom: 3px;
    }
    .order-number-box {
      font-size: ${titleFontSize};
      border: 2px solid #000;
      display: inline-block;
      padding: 3px 8px;
      margin: 3px 0;
      line-height: 1.1;
      font-weight: 900 !important;
      text-transform: uppercase;
    }
    .mode-indicator {
      font-size: ${headerFontSize};
      font-weight: 900 !important;
      text-align: center;
      padding: 3px 0;
      margin: 3px 0;
      text-transform: uppercase;
      border: 2px solid #000;
      display: block;
      width: 100%;
    }
    .section-divider {
      border-top: 1px dashed #000 !important;
      margin: 3px 0 !important;
      width: 100% !important;
      display: block !important;
    }
    .label-center {
      text-align: center;
      font-size: ${smallFontSize};
      font-weight: 900 !important;
      letter-spacing: 0.5px;
      margin: 2px 0;
    }
    .payment-box {
      border: 2px solid #000;
      padding: 4px;
      text-align: center;
      margin-top: 5px;
      font-size: ${baseFontSize};
      text-transform: uppercase;
    }
    .condiments-box {
      border: 1.5px solid #000;
      padding: 3px;
      text-align: center;
      margin: 3px 0;
      font-size: ${headerFontSize};
      font-weight: 900 !important;
    }
    .fiscal-danfe-ticket {
      display: block !important;
      width: 100% !important;
      font-family: 'Courier New', Courier, monospace !important;
      padding: 1mm ${sidePadding} 4mm ${sidePadding} !important;
    }
    table {
      display: table !important;
      width: 100% !important;
      border-collapse: collapse !important;
    }
    thead {
      display: table-header-group !important;
    }
    tbody {
      display: table-row-group !important;
    }
    tr {
      display: table-row !important;
    }
    th, td {
      display: table-cell !important;
    }
    img {
      display: block !important;
      margin: 2px auto !important;
      max-width: 100% !important;
      image-rendering: pixelated !important;
    }
    style {
      display: none !important;
    }
  </style>
</head>
<body>${cleanHtml}</body>
</html>`);
            doc.close();

            const triggerPrint = () => {
                setTimeout(() => {
                    try {
                        win.focus();
                        win.print();
                    } catch (err) {
                        console.error('[thermalPrint] Erro ao imprimir iframe:', err);
                        window.focus();
                        window.print();
                    } finally {
                        cleanup();
                        resolve();
                    }
                }, 100);
            };

            // Garante que imagens (ex: QR Code SEFAZ base64) estejam decodificadas antes da impressão
            const images = Array.from(doc.images || []);
            if (images.length > 0) {
                let loaded = 0;
                const checkDone = () => {
                    loaded++;
                    if (loaded >= images.length) {
                        triggerPrint();
                    }
                };
                images.forEach((img: HTMLImageElement) => {
                    if (img.complete) {
                        loaded++;
                    } else {
                        img.onload = checkDone;
                        img.onerror = checkDone;
                    }
                });
                if (loaded >= images.length) {
                    triggerPrint();
                }
            } else {
                triggerPrint();
            }
        } catch (err) {
            console.error('[thermalPrint] Falha ao preparar iframe de impressão:', err);
            cleanup();
            window.focus();
            window.print();
            resolve();
        }
    });
};

export default printThermalElement;
