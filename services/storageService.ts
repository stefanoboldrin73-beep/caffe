import type { User } from '../types';

export interface ScanRecord {
    userId: string;
    scanDate: number; // timestamp
}

const getUsersKey = (locationId: string) => `coffee_loyalty_${locationId}_users`;
const getUsedTokensKey = (locationId: string) => `coffee_loyalty_${locationId}_used_tokens`;
const getScanHistoryKey = (locationId: string) => `coffee_loyalty_${locationId}_scan_history`;

const getUsers = (locationId: string): User[] => {
    try {
        const usersJson = localStorage.getItem(getUsersKey(locationId));
        return usersJson ? JSON.parse(usersJson) : [];
    } catch (error) {
        console.error("Failed to parse users from localStorage", error);
        return [];
    }
};

const saveUsers = (locationId: string, users: User[]): void => {
    localStorage.setItem(getUsersKey(locationId), JSON.stringify(users));
};

export const getAllUsers = (locationId: string): User[] => {
    return getUsers(locationId);
};

export const getUser = (locationId: string, userId: string): User | null => {
    const users = getUsers(locationId);
    return users.find(user => user.id === userId) || null;
};

export const createUser = (locationId: string, name: string): User => {
    const users = getUsers(locationId);
    const newUser: User = {
        id: crypto.randomUUID(),
        name,
        coffees: 0,
    };
    users.push(newUser);
    saveUsers(locationId, users);
    return newUser;
};

export const addCoffee = (locationId: string, userId: string): User | null => {
    const users = getUsers(locationId);
    const userIndex = users.findIndex(user => user.id === userId);
    if (userIndex !== -1 && users[userIndex].coffees < 10) {
        users[userIndex].coffees += 1;
        saveUsers(locationId, users);
        return users[userIndex];
    }
    return null;
};

export const redeemFreeCoffee = (locationId: string, userId: string): User | null => {
    const users = getUsers(locationId);
    const userIndex = users.findIndex(user => user.id === userId);
    if (userIndex !== -1 && users[userIndex].coffees >= 10) {
        users[userIndex].coffees = 0;
        saveUsers(locationId, users);
        return users[userIndex];
    }
    return null;
};

export const updateUserPoints = (locationId: string, userId: string, newCoffeeCount: number): User | null => {
    const users = getUsers(locationId);
    const userIndex = users.findIndex(user => user.id === userId);
    if (userIndex !== -1) {
        // Clamp the value between 0 and 10 to prevent invalid states
        const updatedCount = Math.max(0, Math.min(10, newCoffeeCount));
        users[userIndex].coffees = updatedCount;
        saveUsers(locationId, users);
        return users[userIndex];
    }
    return null;
}

// --- Secure Token Management ---
const getUsedTokens = (locationId: string): { [key: string]: number } => {
    try {
        const tokensJson = localStorage.getItem(getUsedTokensKey(locationId));
        return tokensJson ? JSON.parse(tokensJson) : {};
    } catch (error) {
        console.error("Failed to parse used tokens", error);
        return {};
    }
};

const saveUsedTokens = (locationId: string, tokens: { [key: string]: number }): void => {
    localStorage.setItem(getUsedTokensKey(locationId), JSON.stringify(tokens));
};

export const isTokenUsed = (locationId: string, token: string): boolean => {
    const usedTokens = getUsedTokens(locationId);
    return !!usedTokens[token];
};

export const markTokenAsUsed = (locationId: string, token: string): void => {
    const usedTokens = getUsedTokens(locationId);
    const now = Date.now();
    // Clean up old tokens (older than 5 minutes)
    for (const t in usedTokens) {
        if (now - usedTokens[t] > 5 * 60 * 1000) {
            delete usedTokens[t];
        }
    }
    usedTokens[token] = now;
    saveUsedTokens(locationId, usedTokens);
};

// --- Scan History Management ---
const getScanHistory = (locationId: string): ScanRecord[] => {
    try {
        const historyJson = localStorage.getItem(getScanHistoryKey(locationId));
        return historyJson ? JSON.parse(historyJson) : [];
    } catch (error) {
        console.error("Failed to parse scan history", error);
        return [];
    }
};

const saveScanHistory = (locationId: string, history: ScanRecord[]): void => {
    localStorage.setItem(getScanHistoryKey(locationId), JSON.stringify(history));
};

export const addScanToHistory = (locationId: string, userId: string): void => {
    const history = getScanHistory(locationId);
    const newRecord: ScanRecord = {
        userId,
        scanDate: Date.now(),
    };
    history.push(newRecord);
    saveScanHistory(locationId, history);
};

export const getUsersScannedOnDate = (locationId: string, date: string): User[] => {
    const history = getScanHistory(locationId);
    const allUsers = getUsers(locationId);
    
    const selectedDate = new Date(date);
    // Adjust for timezone offset to correctly compare local dates
    const timezoneOffset = selectedDate.getTimezoneOffset() * 60000;
    const correctedDate = new Date(selectedDate.getTime() + timezoneOffset);

    const startOfDay = new Date(correctedDate.getFullYear(), correctedDate.getMonth(), correctedDate.getDate()).getTime();
    const endOfDay = new Date(correctedDate.getFullYear(), correctedDate.getMonth(), correctedDate.getDate() + 1).getTime();

    const userIdsForDay = new Set<string>();
    history.forEach(record => {
        if (record.scanDate >= startOfDay && record.scanDate < endOfDay) {
            userIdsForDay.add(record.userId);
        }
    });

    // We need to return the most up-to-date user object
    const userMap = new Map<string, User>();
    allUsers.forEach(user => userMap.set(user.id, user));

    const result: User[] = [];
    userIdsForDay.forEach(id => {
        const user = userMap.get(id);
        if (user) {
            result.push(user);
        }
    });

    return result;
};

// --- Data Backup and Restore ---

interface BackupData {
    barId: string;
    exportDate: string;
    users: User[];
    usedTokens: { [key: string]: number };
    scanHistory: ScanRecord[];
}

export const exportDataForBar = (locationId: string): BackupData => {
    const users = getUsers(locationId);
    const usedTokens = getUsedTokens(locationId);
    const scanHistory = getScanHistory(locationId);

    return {
        barId: locationId,
        exportDate: new Date().toISOString(),
        users,
        usedTokens,
        scanHistory,
    };
};

export const importDataForBar = (locationId: string, data: BackupData): { success: boolean; message: string } => {
    // Basic validation
    if (!data || !Array.isArray(data.users) || typeof data.usedTokens !== 'object' || !Array.isArray(data.scanHistory)) {
        return { success: false, message: "File di backup non valido o corrotto." };
    }
    
    if (data.barId !== locationId) {
        return { success: false, message: "File di backup per un altro locale." };
    }

    try {
        saveUsers(locationId, data.users);
        saveUsedTokens(locationId, data.usedTokens);
        saveScanHistory(locationId, data.scanHistory);
        return { success: true, message: "Dati importati con successo!" };
    } catch (error) {
        console.error("Failed to import data:", error);
        return { success: false, message: "Si è verificato un errore durante l'importazione." };
    }
};
