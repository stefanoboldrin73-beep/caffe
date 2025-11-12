/**
 * Servizio per verificare se un bar ha il permesso di utilizzare l'applicazione.
 * Questo sistema permette un controllo centralizzato delle attivazioni.
 */

// --- ISTRUZIONI PER IL VENDITORE ---
// 1. Crea un file JSON online (es. usando https://gist.github.com/) con la lista dei tuoi bar.
//    Esempio di contenuto del file:
//    {
//      "bar-sole": { "status": "active", "expires": "2025-12-31" },
//      "bar-sprint": { "status": "active" },
//      "bar-moroso": { "status": "suspended" }
//    }
// 2. Ottieni l'URL "Raw" del file.
// 3. Sostituisci l'URL segnaposto qui sotto con il tuo URL.
//
// NOTA: Questa è una soluzione semplice per un controllo base.
// Per un prodotto commerciale su larga scala, è raccomandato un backend sicuro.

const ACTIVATION_DATABASE_URL = 'https://gist.githubusercontent.com/NOME_UTENTE/ID_GIST/raw/COMMIT_HASH/bars.json'; // <-- SOSTITUISCI QUESTO URL!

interface BarActivationInfo {
    status: 'active' | 'suspended';
    expires?: string; // Data di scadenza opzionale in formato YYYY-MM-DD
}

export type ActivationStatus = 'active' | 'suspended' | 'not_found' | 'error';

/**
 * Controlla lo stato di attivazione di un bar contattando il database JSON remoto.
 * @param barId L'ID del bar da verificare.
 * @returns Lo stato di attivazione del bar.
 */
export const checkBarStatus = async (barId: string): Promise<ActivationStatus> => {
    
    // Se l'URL non è stato modificato, restituisce un errore per ricordarlo.
    if (ACTIVATION_DATABASE_URL.includes('NOME_UTENTE')) {
        console.error("ERRORE: L'URL del database di attivazione non è stato configurato in services/activationService.ts");
        return 'error';
    }

    try {
        // Aggiungiamo un parametro casuale per evitare problemi di cache
        const response = await fetch(`${ACTIVATION_DATABASE_URL}?cachebust=${new Date().getTime()}`);
        
        if (!response.ok) {
            console.error("Errore nel recuperare il file di attivazione:", response.statusText);
            return 'error';
        }

        const activationData: { [key: string]: BarActivationInfo } = await response.json();
        
        const barInfo = activationData[barId];

        if (!barInfo) {
            return 'not_found';
        }
        
        // Se c'è una data di scadenza, controlliamola
        if (barInfo.expires) {
            // Aggiungiamo 'T00:00:00' per assicurarci che il confronto sia corretto a livello di giorno
            const expiryDate = new Date(`${barInfo.expires}T00:00:00`);
            const today = new Date();
            // Resettiamo l'ora di oggi per confrontare solo le date
            today.setHours(0, 0, 0, 0);

            if (expiryDate < today) {
                return 'suspended'; // Abbonamento scaduto
            }
        }

        return barInfo.status;

    } catch (error) {
        console.error("Errore durante la verifica dello stato di attivazione del bar:", error);
        return 'error';
    }
};