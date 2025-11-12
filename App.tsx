import React, { useState, useEffect, useCallback } from 'react';
import CustomerPage from './pages/CustomerPage';
import ManagerPage from './pages/ManagerPage';
import Header from './components/Header';
import { checkBarStatus, ActivationStatus } from './services/activationService';

type ActivationState = 'checking' | 'active' | 'suspended' | 'config_error' | 'service_error';


const App: React.FC = () => {
    const [view, setView] = useState<'customer' | 'manager'>('customer');
    const [barId, setBarId] = useState<string | null>(null);
    const [activationState, setActivationState] = useState<ActivationState>('checking');
    const [isTransitioning, setIsTransitioning] = useState(false);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const currentBarId = urlParams.get('bar');
        const currentView = urlParams.get('view');

        if (!currentBarId) {
            setActivationState('config_error');
            return;
        }

        const verifyActivation = async () => {
            const status: ActivationStatus = await checkBarStatus(currentBarId);
            switch (status) {
                case 'active':
                    setBarId(currentBarId);
                    if (currentView === 'manager') {
                        setView('manager');
                    } else {
                        setView('customer');
                    }
                    setActivationState('active');
                    break;
                case 'suspended':
                case 'not_found':
                    setActivationState('suspended');
                    break;
                case 'error':
                    setActivationState('service_error');
                    break;
            }
        };

        verifyActivation();
    }, []);
    
    const switchView = useCallback(() => {
        setIsTransitioning(true); // Start the exit animation

        setTimeout(() => {
            setView(prevView => {
                const newView = prevView === 'customer' ? 'manager' : 'customer';
                const urlParams = new URLSearchParams(window.location.search);
                if (newView === 'manager') {
                    urlParams.set('view', 'manager');
                } else {
                    urlParams.delete('view');
                }
                window.history.pushState({}, '', `${window.location.pathname}?${urlParams.toString()}`);
                return newView;
            });
            setIsTransitioning(false);
        }, 300); // This duration must match the CSS animation
    }, []);
    
    if (activationState === 'checking') {
         return (
             <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-4 text-center">
                 <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-800"></div>
                 <p className="mt-4 text-stone-600 font-semibold">Verifica del servizio in corso...</p>
             </div>
         );
    }
    
    if (activationState === 'suspended') {
        return (
            <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4 font-sans">
                <div className="max-w-md w-full mx-auto bg-white p-8 rounded-xl shadow-lg text-center border border-stone-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    <h1 className="text-2xl font-bold text-orange-700 mt-4 mb-2">Servizio Sospeso</h1>
                    <p className="text-stone-600 text-base">
                        Il servizio per questo locale non è al momento attivo.
                    </p>
                    <p className="text-stone-500 text-sm mt-4">
                        Si prega di contattare il gestore del locale per informazioni.
                    </p>
                </div>
            </div>
        );
    }

    if (activationState === 'config_error' || activationState === 'service_error') {
        const errorTitle = activationState === 'config_error' ? 'Errore di Configurazione' : 'Errore di Servizio';
        const errorText = activationState === 'config_error' 
            ? "ID del locale non specificato."
            : "Impossibile verificare lo stato del servizio. Controlla la connessione e riprova.";

        return (
            <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4 font-sans">
                <div className="max-w-md w-full mx-auto bg-white p-8 rounded-xl shadow-lg text-center border border-stone-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h1 className="text-2xl font-bold text-red-700 mt-4 mb-2">{errorTitle}</h1>
                    <p className="text-stone-600 text-base">
                        {errorText}
                    </p>
                    {activationState === 'config_error' && (
                        <>
                            <p className="text-stone-600 text-base mt-2">
                                Per funzionare, l'URL deve includere l'identificativo univoco del bar.
                            </p>
                            <p className="text-stone-500 text-sm mt-6">
                                Esempio di link da fornire al barista:
                            </p>
                            <code className="block bg-stone-100 text-amber-900 p-2 rounded-md mt-1 text-sm break-all">
                                https://la-tua-app.com/?bar=nome_del_bar
                            </code>
                        </>
                    )}
                </div>
            </div>
        );
    }
    
    if (!barId) return null; // Should not happen if activationState is 'active'

    return (
        <div className="min-h-screen bg-stone-100 font-sans text-stone-800">
            <Header onSwitchView={switchView} />
            <main className="p-4 sm:p-6">
                <div className="max-w-md mx-auto">
                    <div className={isTransitioning ? 'page-exit' : ''}>
                        {view === 'customer' ? <CustomerPage barId={barId} /> : <ManagerPage barId={barId} />}
                    </div>
                </div>
            </main>
        </div>
    );
}

export default App;