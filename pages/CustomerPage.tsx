import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { User } from '../types';
import * as storage from '../services/storageService';
import CoffeeCard from '../components/CoffeeCard';

interface CustomerPageProps {
    barId: string;
}

const CustomerPage: React.FC<CustomerPageProps> = ({ barId }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [name, setName] = useState('');
    const [qrValue, setQrValue] = useState<string>('');
    
    const LOGGED_IN_USER_ID_KEY = `coffee_loyalty_${barId}_logged_in_user_id`;

    useEffect(() => {
        const loggedInUserId = localStorage.getItem(LOGGED_IN_USER_ID_KEY);
        if (loggedInUserId) {
            const user = storage.getUser(barId, loggedInUserId);
            setCurrentUser(user);
        }
    }, [barId, LOGGED_IN_USER_ID_KEY]);

    useEffect(() => {
        if (currentUser) {
            const generateSecurePayload = () => {
                const payload = {
                    userId: currentUser.id,
                    barId: barId,
                    timestamp: Date.now(),
                    token: crypto.randomUUID(), // One-time use token part
                    isRedemption: currentUser.coffees >= 10,
                };
                setQrValue(JSON.stringify(payload));
            };

            generateSecurePayload();
            const interval = setInterval(generateSecurePayload, 20000); // Regenerate QR every 20 seconds

            return () => clearInterval(interval);
        }
    }, [currentUser, barId]);

    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            const newUser = storage.createUser(barId, name.trim());
            localStorage.setItem(LOGGED_IN_USER_ID_KEY, newUser.id);
            setCurrentUser(newUser);
            setName('');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem(LOGGED_IN_USER_ID_KEY);
        setCurrentUser(null);
    };

    if (!currentUser) {
        return (
            <div className="bg-white p-8 rounded-lg shadow-lg animate-fade-in">
                <h2 className="text-2xl font-bold text-center text-amber-900 mb-2">Benvenuto!</h2>
                <p className="text-center text-stone-600 mb-6">Registrati per iniziare la tua raccolta punti.</p>
                <form onSubmit={handleRegister}>
                    <div className="mb-4">
                        <label htmlFor="name" className="block text-sm font-medium text-stone-700 mb-1">Il tuo nome</label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-800"
                            placeholder="Es. Mario Rossi"
                            required
                        />
                    </div>
                    <button type="submit" className="w-full bg-amber-800 text-white font-bold py-3 px-4 rounded-md hover:bg-amber-900 transition-colors">
                        Crea la mia tessera
                    </button>
                </form>
            </div>
        );
    }
    
    const coffeesNeeded = 10 - currentUser.coffees;
    const isReadyForRedemption = currentUser.coffees >= 10;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
                <h2 className="text-2xl font-bold text-amber-900">Ciao, {currentUser.name}!</h2>
                <p className="text-stone-600 mt-1">Questa è la tua tessera virtuale.</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center gap-4">
                <h3 className="text-lg font-semibold">Il tuo QR Code</h3>
                <div className={`p-4 bg-stone-50 border rounded-lg animate-pulse-qr transition-all ${isReadyForRedemption ? 'border-green-500 border-2 shadow-lg shadow-green-100' : ''}`}>
                    {qrValue ? <QRCodeSVG value={qrValue} size={200} /> : <div className="w-[200px] h-[200px] bg-stone-200 animate-pulse rounded-md"></div>}
                </div>
                <p className="text-center text-sm text-stone-600 max-w-xs">
                    {isReadyForRedemption ? (
                        <span className="font-bold text-green-600">Mostra questo QR code per il tuo caffè omaggio!</span>
                    ) : (
                        <>Mostra questo QR code in cassa. <span className="font-semibold">Si aggiorna ogni 20 secondi.</span></>
                    )}
                </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg">
                <CoffeeCard count={currentUser.coffees} />
                 {currentUser.coffees < 10 && (
                    <p className="text-center mt-4 text-stone-700">
                        Ancora <span className="font-bold text-amber-900">{coffeesNeeded}</span> caffè e il prossimo è in omaggio!
                    </p>
                )}
            </div>
            
            <button onClick={handleLogout} className="w-full bg-stone-500 text-white font-bold py-3 px-4 rounded-md hover:bg-stone-600 transition-colors">
                Esci
            </button>
        </div>
    );
};

export default CustomerPage;