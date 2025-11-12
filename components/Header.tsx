import React, { useRef } from 'react';
import { CoffeeIcon } from './icons/CoffeeIcon';

interface HeaderProps {
    onSwitchView: () => void;
}

const Header: React.FC<HeaderProps> = ({ onSwitchView }) => {
    // Fix: In a browser environment, setTimeout returns a number, not a NodeJS.Timeout object.
    const pressTimer = useRef<number | null>(null);

    const handlePressStart = () => {
        pressTimer.current = setTimeout(() => {
            onSwitchView();
        }, 2000); // 2 seconds for long press
    };

    const handlePressEnd = () => {
        if (pressTimer.current) {
            clearTimeout(pressTimer.current);
            pressTimer.current = null;
        }
    };

    return (
        <header 
            className="bg-amber-800 p-4 shadow-md select-none cursor-pointer"
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            onMouseLeave={handlePressEnd}
            title="Tieni premuto per cambiare vista"
        >
            <div className="max-w-md mx-auto flex justify-center items-center">
                <div className="flex items-center gap-3">
                    <CoffeeIcon className="w-8 h-8 text-white" />
                    <h1 className="text-xl font-bold text-white">Tessera Caffè</h1>
                </div>
            </div>
        </header>
    );
};

export default Header;