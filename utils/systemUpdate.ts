export const forceSystemUpdate = async () => {
    console.log("Iniciando atualização forçada...");
    // Unregister service workers
    if ('serviceWorker' in navigator) {
        console.log("Desregistrando service workers...");
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
            await registration.unregister();
        }
        console.log("Service workers desregistrados.");
    }
    // Clear caches
    if ('caches' in window) {
        console.log("Limpando caches...");
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log("Caches limpos.");
    }
    console.log("Recarregando página...");
    window.location.reload();
};
