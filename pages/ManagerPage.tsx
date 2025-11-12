import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Html5Qrcode } from 'html5-qrcode';
import type { User } from '../types';
import * as storage from '../services/storageService';
import CoffeeCard from '../components/CoffeeCard';
import { CoffeeIcon } from '../components/icons/CoffeeIcon';

interface ManagerPageProps {
    barId: string;
}

const ManagerPage: React.FC<ManagerPageProps> = ({ barId }) => {
    const [isScanning, setIsScanning] = useState(false);
    // Daily Scans State
    const [dailyScannedUsers, setDailyScannedUsers] = useState<User[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [dailySearchQuery, setDailySearchQuery] = useState<string>('');
    // All Users State
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [allUsersSearchQuery, setAllUsersSearchQuery] = useState<string>('');
    // General State
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [animatedCupInfo, setAnimatedCupInfo] = useState<{ userId: string; cupIndex: number } | null>(null);

    const scannerRef = useRef<Html5Qrcode | null>(null);
    const readerId = "qr-reader";

    const loadScansForDate = useCallback(() => {
        const users = storage.getUsersScannedOnDate(barId, selectedDate);
        setDailyScannedUsers(users);
        setDailySearchQuery(''); // Reset search on date change
    }, [barId, selectedDate]);
    
    const loadAllUsers = useCallback(() => {
        const users = storage.getAllUsers(barId);
        setAllUsers(users);
    }, [barId]);

    useEffect(() => {
        loadScansForDate();
        loadAllUsers();
    }, [loadScansForDate, loadAllUsers]);
    
    const filteredDailyUsers = dailyScannedUsers.filter(user =>
        user.name.toLowerCase().includes(dailySearchQuery.toLowerCase())
    );
    
    const filteredAllUsers = allUsers.filter(user =>
        user.name.toLowerCase().includes(allUsersSearchQuery.toLowerCase())
    );

    const stopScanning = useCallback(() => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            scannerRef.current.stop()
                .then(() => { scannerRef.current = null; setIsScanning(false); })
                .catch(err => {
                    console.error("Failed to stop scanner", err);
                    setIsScanning(false);
                });
        } else {
            setIsScanning(false);
        }
    }, []);

    useEffect(() => {
        if (isScanning && !scannerRef.current) {
            const scanner = new (window as any).Html5Qrcode(readerId, { verbose: false });
            scannerRef.current = scanner;
            const config = { fps: 5, qrbox: { width: 250, height: 250 } };
            
            const onScanSuccess = (decodedText: string) => {
                try {
                    const payload = JSON.parse(decodedText);
                    
                    if (payload.barId !== barId) throw new Error("Tessera di un altro locale.");
                    if (Date.now() - payload.timestamp > 30000) throw new Error("QR code scaduto. Fanne generare uno nuovo al cliente.");
                    if (storage.isTokenUsed(barId, payload.token)) throw new Error("Questo QR code è già stato utilizzato.");

                    const user = storage.getUser(barId, payload.userId);
                    if (user) {
                        storage.markTokenAsUsed(barId, payload.token);
                        storage.addScanToHistory(barId, user.id);
                        
                        loadAllUsers(); // Refresh all users list in case of a new user
                        
                        const today = new Date().toISOString().split('T')[0];
                        if (selectedDate !== today) {
                             setSelectedDate(today);
                        } else {
                            loadScansForDate();
                        }
                        
                        const successMessage = payload.isRedemption
                            ? `Tessera di ${user.name} pronta per un caffè omaggio!`
                            : `Tessera di ${user.name} scansionata.`;

                        setMessage({ text: successMessage, type: 'success' });
                        setTimeout(() => setMessage(null), 3000);
                        stopScanning();
                    } else {
                        throw new Error("Tessera non trovata. QR code non valido.");
                    }
                } catch (e: any) {
                    setMessage({ text: e.message || "QR Code non valido.", type: "error" });
                    setTimeout(() => setMessage(null), 4000);
                }
            };

            scanner.start({ facingMode: "environment" }, config, onScanSuccess, (error) => {/* ignore */})
                .catch(() => {
                    setMessage({ text: "Impossibile avviare la fotocamera.", type: "error"});
                    setIsScanning(false);
                });
        }
    }, [isScanning, barId, stopScanning, loadScansForDate, selectedDate, loadAllUsers]);

    const handleAddCoffee = (userId: string) => {
        const updatedUser = storage.addCoffee(barId, userId);
        if (updatedUser) {
            setDailyScannedUsers(prevUsers => prevUsers.map(u => u.id === userId ? updatedUser : u));
            setAllUsers(prevUsers => prevUsers.map(u => u.id === userId ? updatedUser : u)); // Sync all users list
            setMessage({ text: `Caffè aggiunto a ${updatedUser.name}!`, type: "success" });
            setAnimatedCupInfo({ userId, cupIndex: updatedUser.coffees - 1 });
            setTimeout(() => {
                setMessage(null);
                setAnimatedCupInfo(null);
            }, 2000);
        }
    };

    const handleRedeemCoffee = (userId: string) => {
        const updatedUser = storage.redeemFreeCoffee(barId, userId);
        if (updatedUser) {
            setDailyScannedUsers(prevUsers => prevUsers.map(u => u.id === userId ? updatedUser : u));
            setAllUsers(prevUsers => prevUsers.map(u => u.id === userId ? updatedUser : u)); // Sync all users list
            setMessage({ text: `Caffè omaggio riscattato per ${updatedUser.name}!`, type: "success" });
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const handleManualUpdate = (userId: string, newCoffeeCount: number) => {
        const updatedUser = storage.updateUserPoints(barId, userId, newCoffeeCount);
        if (updatedUser) {
            setAllUsers(prevUsers => prevUsers.map(u => u.id === userId ? updatedUser : u));
            setDailyScannedUsers(prevUsers => prevUsers.map(u => u.id === userId ? updatedUser : u));
            setMessage({ text: `Punti di ${updatedUser.name} aggiornati.`, type: 'success' });
            setTimeout(() => setMessage(null), 2000);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg animate-fade-in space-y-6">
            <h2 className="text-2xl font-bold text-center text-amber-900">Area Gestore</h2>
            
            {/* Scanner UI */}
            {isScanning ? (
                 <div className="space-y-4">
                    <div id={readerId}></div>
                    <button onClick={stopScanning} className="w-full bg-red-600 text-white font-bold py-3 px-4 rounded-md hover:bg-red-700 transition-colors">
                        Interrompi Scansione
                    </button>
                </div>
            ) : (
                <button onClick={() => setIsScanning(true)} className="w-full bg-amber-800 text-white font-bold py-3 px-4 rounded-md hover:bg-amber-900 transition-colors flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4h4m12 0h-4v4m0 12v-4h4m-12 0H4v-4" />
                    </svg>
                    Scansiona QR Code
                </button>
            )}

            {message && (
                <div className={`p-3 rounded-md text-center font-semibold ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {message.text}
                </div>
            )}
            
            {/* Daily Scans Section */}
            <div className="space-y-4 pt-4">
                 <h3 className="text-xl font-semibold text-stone-700 border-b pb-2">Clienti di Oggi</h3>
                <div>
                    <label htmlFor="scan-date" className="block text-sm font-medium text-stone-700 mb-1">Visualizza scansioni del</label>
                    <input 
                        type="date" 
                        id="scan-date"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                        className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-800"
                    />
                </div>
                <div>
                    <label htmlFor="search-user-daily" className="block text-sm font-medium text-stone-700 mb-1">Cerca tra i clienti di oggi</label>
                    <input 
                        type="text" 
                        id="search-user-daily"
                        placeholder="Es. Mario Rossi..."
                        value={dailySearchQuery}
                        onChange={e => setDailySearchQuery(e.target.value)}
                        className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-800"
                    />
                </div>
            
                <div className="space-y-4">
                    {filteredDailyUsers.length > 0 ? (
                        filteredDailyUsers.map(user => (
                            <div key={user.id} className="bg-stone-50 p-4 rounded-lg border border-stone-200">
                                <p className="font-bold text-lg text-amber-900">{user.name}</p>
                                <div className="my-3">
                                    <CoffeeCard 
                                        count={user.coffees} 
                                        animatedIndex={animatedCupInfo?.userId === user.id ? animatedCupInfo.cupIndex : null}
                                    />
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <button
                                        onClick={() => handleAddCoffee(user.id)}
                                        disabled={user.coffees >= 10}
                                        className="flex-1 bg-amber-800 text-white font-bold py-2 px-4 rounded-md hover:bg-amber-900 transition-colors disabled:bg-stone-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <CoffeeIcon className="w-5 h-5" />
                                        Aggiungi
                                    </button>
                                    <button
                                        onClick={() => handleRedeemCoffee(user.id)}
                                        disabled={user.coffees < 10}
                                        className="flex-1 bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-700 transition-colors disabled:bg-stone-300 disabled:cursor-not-allowed"
                                    >
                                        Riscatta Omaggio
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-stone-500 py-4">
                            {dailyScannedUsers.length === 0 ? "Nessun utente scansionato in questa data." : "Nessun utente trovato con questo nome."}
                        </p>
                    )}
                </div>
            </div>

            {/* All Users Section */}
             <div className="space-y-4 pt-6">
                 <h3 className="text-xl font-semibold text-stone-700 border-b pb-2">Tutti i Clienti Registrati</h3>
                <div>
                    <label htmlFor="search-user-all" className="block text-sm font-medium text-stone-700 mb-1">Cerca tra tutti i clienti</label>
                    <input 
                        type="text" 
                        id="search-user-all"
                        placeholder="Trova un cliente per nome..."
                        value={allUsersSearchQuery}
                        onChange={e => setAllUsersSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-800"
                    />
                </div>
                 <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                    {filteredAllUsers.length > 0 ? (
                        filteredAllUsers.map(user => (
                            <div key={user.id} className="bg-stone-50 p-3 rounded-lg border border-stone-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <p className="font-semibold text-stone-800 flex-1">{user.name}</p>
                                <div className="flex items-center gap-2 justify-end">
                                    <button
                                        onClick={() => handleManualUpdate(user.id, user.coffees - 1)}
                                        className="w-8 h-8 flex items-center justify-center bg-stone-200 text-stone-700 font-bold rounded-full hover:bg-stone-300 transition-colors"
                                        aria-label="Diminuisci punti"
                                    >
                                        -
                                    </button>
                                    <span className="text-center font-mono text-stone-800 w-16">
                                        <span className="font-bold text-amber-900">{user.coffees}</span> / 10
                                    </span>
                                    <button
                                        onClick={() => handleManualUpdate(user.id, user.coffees + 1)}
                                        className="w-8 h-8 flex items-center justify-center bg-stone-200 text-stone-700 font-bold rounded-full hover:bg-stone-300 transition-colors"
                                        aria-label="Aumenta punti"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                         <p className="text-center text-stone-500 py-4">
                            {allUsers.length === 0 ? "Non ci sono ancora clienti registrati." : "Nessun utente trovato con questo nome."}
                        </p>
                    )}
                 </div>
            </div>
        </div>
    );
};

export default ManagerPage;