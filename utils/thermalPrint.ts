export interface PrintDiagnosticContext {
    mode?: string;
    orderId?: string;
    orderNumber?: number | string;
    itemCount?: number;
    source?: string;
}

const getMobilePrintDiagnostics = () => {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isStandalonePWA = typeof window !== 'undefined' && (
        Boolean(window.matchMedia?.('(display-mode: standalone)')?.matches) ||
        Boolean((window.navigator as any)?.standalone)
    );
    const userActivation = typeof navigator !== 'undefined' ? (navigator as any).userActivation : undefined;
    const hasActiveGesture = userActivation ? Boolean(userActivation.isActive) : undefined;
    return { userAgent, isMobile, isStandalonePWA, hasActiveGesture };
};

/**
 * Utilitário de impressão térmica isolada via iframe invisível.
 * Resolve em definitivo o problema de avanço de papel em branco (bobina vazia)
 * causado pelo layout da página principal (headers fixos, min-h-screen, modais e Tailwind).
 */
export const printThermalElement = (
    sourceElement: HTMLElement | null,
    printerWidth: number = 80,
    context?: PrintDiagnosticContext
): Promise<void> => {
    return new Promise((resolve) => {
        const diag = getMobilePrintDiagnostics();
        const tag = diag.isMobile ? '[thermalPrint][MOBILE]' : '[thermalPrint]';

        if (!sourceElement) {
            console.error(`${tag} Abortando impressão: sourceElement é null (componente de cupom não montado).`, {
                ...diag,
                printerWidth,
                context,
            });
            resolve();
            return;
        }

        const rawHtml = sourceElement.innerHTML;
        if (!rawHtml || !rawHtml.trim()) {
            console.error(`${tag} Abortando impressão: innerHTML do sourceElement está vazio (payload não chegou ou PrintableOrder retornou null).`, {
                ...diag,
                printerWidth,
                rawHtmlLength: rawHtml?.length || 0,
                context,
            });
            resolve();
            return;
        }

        // Remove tags <style> internas conflitantes que possam conter 'display: none' em screen
        const cleanHtml = rawHtml.replace(/<style[\s\S]*?<\/style>/gi, '');
        if (!cleanHtml.trim()) {
            console.error(`${tag} Abortando impressão: HTML após limpeza ficou vazio.`, {
                ...diag,
                printerWidth,
                rawHtmlLength: rawHtml.length,
                context,
            });
            resolve();
            return;
        }

        if (diag.isMobile && diag.hasActiveGesture === false) {
            console.error(`${tag} User Activation perdido antes de acionar impressão (userActivation.isActive = false). Navegadores mobile (iOS Safari / Android Chrome) podem bloquear o diálogo de impressão.`, {
                ...diag,
                printerWidth,
                context,
            });
        }

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
        iframe.style.left = '-10000px';
        iframe.style.width = paperWidth;
        iframe.style.height = diag.isMobile ? 'auto' : '600px';
        iframe.style.opacity = '0';
        iframe.style.border = '0';
        iframe.style.margin = '0';
        iframe.style.padding = '0';
        iframe.style.pointerEvents = 'none';

        document.body.appendChild(iframe);

        let isCleanedUp = false;
        const cleanup = (delayMs = 25000) => {
            setTimeout(() => {
                if (!isCleanedUp && iframe.parentNode) {
                    isCleanedUp = true;
                    iframe.parentNode.removeChild(iframe);
                }
            }, delayMs);
        };

        try {
            const doc = iframe.contentDocument || iframe.contentWindow?.document;
            const win = iframe.contentWindow;

            if (!doc || !win) {
                console.error(`${tag} Falha ao acessar contentDocument/contentWindow do iframe de impressão.`, {
                    ...diag,
                    hasDoc: Boolean(doc),
                    hasWin: Boolean(win),
                    context,
                });
                cleanup();
                try {
                    window.focus();
                    if (typeof window.print === 'function') {
                        window.print();
                    } else {
                        console.error(`${tag} window.print() indisponível neste dispositivo/WebView.`, { ...diag, context });
                    }
                } catch (fallbackErr) {
                    console.error(`${tag} Erro no fallback window.print() após falha do iframe:`, fallbackErr, { ...diag, context });
                }
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
      font-family: Arial, Helvetica, sans-serif !important;
      font-weight: 700 !important;
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

            const invokePrintNow = () => {
                const invokeDiag = getMobilePrintDiagnostics();
                if (invokeDiag.isMobile && invokeDiag.hasActiveGesture === false) {
                    console.error(`${tag} Executando print() sem userActivation ativo no dispositivo mobile (risco de bloqueio silencioso pelo navegador).`, {
                        ...invokeDiag,
                        context,
                    });
                }

                try {
                    win.onafterprint = () => {
                        cleanup(1000);
                    };
                    const startedAt = Date.now();
                    win.focus();
                    if (typeof win.print === 'function') {
                        win.print();
                        const elapsed = Date.now() - startedAt;
                        if (!invokeDiag.isMobile && invokeDiag.hasActiveGesture !== true && elapsed > 1200) {
                            window.dispatchEvent(new CustomEvent('guarafood:print-dialog-opened', { detail: { context, elapsed } }));
                        }
                    } else if (typeof window.print === 'function') {
                        console.error(`${tag} iframe.contentWindow.print indisponível — usando fallback window.print().`, {
                            ...invokeDiag,
                            context,
                        });
                        window.focus();
                        window.print();
                    } else {
                        console.error(`${tag} Nem iframe.contentWindow.print nem window.print estão disponíveis neste navegador/WebView.`, {
                            ...invokeDiag,
                            context,
                        });
                    }
                } catch (err) {
                    console.error(`${tag} Exceção ao disparar win.print() no iframe:`, err, {
                        ...invokeDiag,
                        context,
                    });
                    try {
                        window.focus();
                        if (typeof window.print === 'function') {
                            window.print();
                        } else {
                            console.error(`${tag} Fallback window.print() indisponível neste dispositivo.`, { ...invokeDiag, context });
                        }
                    } catch (fallbackErr) {
                        console.error(`${tag} Falha total no fallback window.print():`, fallbackErr, {
                            ...invokeDiag,
                            context,
                        });
                    }
                } finally {
                    cleanup();
                    resolve();
                }
            };

            const triggerPrintAsync = () => {
                if (typeof requestAnimationFrame === 'function') {
                    requestAnimationFrame(() => setTimeout(invokePrintNow, 60));
                } else {
                    setTimeout(invokePrintNow, 80);
                }
            };

            // Garante que imagens (ex: QR Code SEFAZ base64) estejam decodificadas antes da impressão
            const images = Array.from(doc.images || []);
            if (images.length > 0) {
                let loaded = 0;
                const checkDone = () => {
                    loaded++;
                    if (loaded >= images.length) {
                        triggerPrintAsync();
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
                    if (diag.isMobile || diag.hasActiveGesture === true) {
                        invokePrintNow();
                    } else {
                        triggerPrintAsync();
                    }
                }
            } else {
                // Preserva gesto imediato em cliques manuais/mobile; em auto-print via webhook aguarda layout do iframe
                if (diag.isMobile || diag.hasActiveGesture === true) {
                    invokePrintNow();
                } else {
                    triggerPrintAsync();
                }
            }
        } catch (err) {
            console.error(`${tag} Falha crítica ao preparar iframe de impressão:`, err, {
                ...diag,
                context,
            });
            cleanup();
            try {
                window.focus();
                if (typeof window.print === 'function') {
                    window.print();
                } else {
                    console.error(`${tag} window.print() indisponível após erro de iframe.`, { ...diag, context });
                }
            } catch (fallbackErr) {
                console.error(`${tag} Falha no fallback window.print() após erro de iframe:`, fallbackErr, { ...diag, context });
            }
            resolve();
        }
    });
};

export default printThermalElement;
