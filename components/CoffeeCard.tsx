import React from 'react';
import { CoffeeIcon } from './icons/CoffeeIcon';
import { GiftIcon } from './icons/GiftIcon';

interface CoffeeCardProps {
    count: number;
    animatedIndex?: number | null;
}

const CoffeeCard: React.FC<CoffeeCardProps> = ({ count, animatedIndex }) => {
    const totalCups = 10;
    const [playTada, setPlayTada] = React.useState(false);
    
    const prevCountRef = React.useRef<number>();
    React.useEffect(() => {
        const prevCount = prevCountRef.current;
        if (prevCount !== undefined && prevCount < totalCups && count >= totalCups) {
            setPlayTada(true);
            const timer = setTimeout(() => setPlayTada(false), 1000); // Animation duration
            return () => clearTimeout(timer);
        }
        prevCountRef.current = count;
    }, [count]);


    return (
        <div className="bg-stone-50 p-4 rounded-lg border border-stone-200">
            <h3 className="text-center font-semibold text-stone-600 mb-4">La tua raccolta punti</h3>
            <div className="grid grid-cols-5 gap-4">
                {Array.from({ length: totalCups }).map((_, index) => {
                    const isFilled = index < count;
                    const isGift = index === totalCups - 1;
                    const isAnimated = index === animatedIndex;
                    const popInAnimationClass = isAnimated ? 'animate-pop-in' : '';

                    if (isGift) {
                        const tadaAnimationClass = playTada ? 'animate-tada' : '';
                        const combinedAnimationClass = `${tadaAnimationClass} ${popInAnimationClass}`.trim();
                        return (
                            <div key={index} className={`relative flex items-center justify-center aspect-square rounded-full transition-all duration-300 ${isFilled ? 'bg-green-400 text-white' : 'bg-stone-200 text-stone-400'} ${combinedAnimationClass}`}>
                                <GiftIcon className="w-7 h-7" />
                                 {isFilled && (
                                    <div className="absolute -top-1 -right-1 bg-white p-0.5 rounded-full">
                                        <div className="bg-green-500 rounded-full p-0.5">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    }
                    return (
                        <div key={index} className={`flex items-center justify-center aspect-square rounded-full transition-all duration-300 ${isFilled ? 'bg-amber-800 text-white' : 'bg-stone-200 text-stone-400'} ${popInAnimationClass}`}>
                            <CoffeeIcon className="w-7 h-7" />
                        </div>
                    );
                })}
            </div>
             {count >= 10 && (
                <p className="text-center mt-4 text-lg font-bold text-green-600 animate-pulse">
                    Complimenti! Hai un caffè in omaggio!
                </p>
            )}
        </div>
    );
};

export default CoffeeCard;