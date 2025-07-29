import { useState, useEffect, useCallback, useRef } from 'react';
import Dashboard from './components/Dashboard';
import Configuration from './components/Configuration';
import './App.css';

function App() {
    const [articles, setArticles] = useState([]);
    const [counters, setCounters] = useState(() => {
        const savedCounters = localStorage.getItem('counters');
        return savedCounters ? JSON.parse(savedCounters) : [];
    });
    const [orders, setOrders] = useState([]);
    const [cookedCounts, setCookedCounts] = useState(() => {
        const savedCookedCounts = localStorage.getItem('cookedCounts');
        return savedCookedCounts ? JSON.parse(savedCookedCounts) : {};
    });
    const [error, setError] = useState(null);
    const [view, setView] = useState('dashboard'); // 'dashboard' o 'config'
    const [selectedDate, setSelectedDate] = useState(() => {
        const savedDate = localStorage.getItem('selectedDate');
        return savedDate || new Date().toISOString().split('T')[0];
    });
    const [refreshInterval, setRefreshInterval] = useState(() => {
        const savedInterval = localStorage.getItem('refreshInterval');
        return savedInterval ? parseInt(savedInterval, 10) : 60; // default 60 secondi
    });
    const [refreshIndicator, setRefreshIndicator] = useState({
        timeRemaining: 60,
        totalTime: 60,
        isActive: false,
    });
    const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
    const [isLoading, setIsLoading] = useState(false);

    // Refs per accedere ai valori correnti senza causare re-render
    const ordersRef = useRef([]);
    const countersRef = useRef([]);
    const selectedDateRef = useRef('');

    // Aggiorna i ref quando cambiano i valori
    useEffect(() => {
        ordersRef.current = orders;
    }, [orders]);

    useEffect(() => {
        countersRef.current = counters;
    }, [counters]);

    useEffect(() => {
        selectedDateRef.current = selectedDate;
    }, [selectedDate]);

    // Carica gli articoli all'avvio
    useEffect(() => {
        fetch('/api/articles')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Errore nel caricamento degli articoli');
                }
                return response.json();
            })
            .then(data => setArticles(data))
            .catch(error => {
                console.error("Errore:", error);
                setError(error.message);
            });
    }, []);

    // Funzione centralizzata per caricare gli ordini
    const loadOrders = useCallback(async (onlyNew = false) => {
        const currentCounters = countersRef.current;
        const currentDate = selectedDateRef.current;
        const currentOrders = ordersRef.current;

        if (currentCounters.length === 0) {
            setOrders([]);
            return;
        }

        const allTrackedDescriptions = currentCounters.flatMap(c => c.trackedItems.map(item => item.descrizione));
        if (allTrackedDescriptions.length === 0) {
            setOrders([]);
            return;
        }

        setIsLoading(true);
        try {
            let requestBody = {
                descrizioni: allTrackedDescriptions,
                data: currentDate,
            };

            // Se richiediamo solo i nuovi ordini e abbiamo già degli ordini, 
            // includiamo l'ora dell'ultimo ordine
            if (onlyNew && currentOrders.length > 0) {
                const sortedOrders = [...currentOrders].sort((a, b) => {
                    if (a.ora && b.ora) {
                        return b.ora.localeCompare(a.ora);
                    }
                    return b.id_ordine - a.id_ordine;
                });
                
                if (sortedOrders.length > 0 && sortedOrders[0].ora) {
                    requestBody.ora = sortedOrders[0].ora;
                }
            }

            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                throw new Error('Errore di rete o del server nel caricamento degli ordini');
            }

            const newOrders = await response.json();
            
            if (onlyNew) {
                // Integra i nuovi ordini con quelli esistenti, evitando duplicati
                setOrders(prevOrders => {
                    const existingOrderIds = new Set(prevOrders.map(o => o.id_ordine));
                    const filteredNewOrders = newOrders.filter(o => !existingOrderIds.has(o.id_ordine));
                    return [...prevOrders, ...filteredNewOrders];
                });
            } else {
                setOrders(newOrders);
            }
            
            setError(null);
        } catch (error) {
            console.error("Errore nel caricamento degli ordini:", error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    }, []); // Nessuna dipendenza - usa solo i ref

    // Funzione per il refresh manuale
    const handleManualRefresh = useCallback(() => {
        loadOrders(true); // Carica solo i nuovi ordini
    }, [loadOrders]);

    // Carica gli ordini quando i contatori cambiano o la data cambia
    useEffect(() => {
        loadOrders(false); // Carica tutti gli ordini
    }, [counters, selectedDate, loadOrders]);

    // Gestisce l'aggiornamento automatico degli ordini
    useEffect(() => {
        if (!autoRefreshEnabled || view !== 'dashboard' || counters.length === 0) {
            setRefreshIndicator(prev => ({ ...prev, isActive: false }));
            return;
        }

        setRefreshIndicator({
            timeRemaining: refreshInterval,
            totalTime: refreshInterval,
            isActive: true,
        });

        const interval = setInterval(() => {
            setRefreshIndicator(prev => {
                const newTimeRemaining = prev.timeRemaining - 1;
                
                if (newTimeRemaining <= 0) {
                    // È il momento di aggiornare gli ordini
                    loadOrders(true); // Carica solo i nuovi ordini
                    return {
                        timeRemaining: refreshInterval,
                        totalTime: refreshInterval,
                        isActive: true,
                    };
                }
                
                return {
                    ...prev,
                    timeRemaining: newTimeRemaining,
                };
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [autoRefreshEnabled, view, counters.length, refreshInterval, loadOrders]);

    // Salva i contatori e i prodotti cucinati nel localStorage
    useEffect(() => {
        localStorage.setItem('counters', JSON.stringify(counters));
    }, [counters]);

    useEffect(() => {
        localStorage.setItem('cookedCounts', JSON.stringify(cookedCounts));
    }, [cookedCounts]);

    // Salva la data selezionata nel localStorage
    useEffect(() => {
        localStorage.setItem('selectedDate', selectedDate);
    }, [selectedDate]);

    // Salva l'intervallo di refresh nel localStorage
    useEffect(() => {
        localStorage.setItem('refreshInterval', refreshInterval.toString());
    }, [refreshInterval]);

    const handleSaveCounters = (newCounters, newDate) => {
        setCounters(newCounters);
        if (newDate && newDate !== selectedDate) {
            setSelectedDate(newDate);
        }
        // Dopo aver salvato i contatori, ricarica tutti gli ordini
        // Non chiamiamo loadOrders qui perché il useEffect si occuperà del caricamento
        // quando counters o selectedDate cambiano
        setView('dashboard');
    };

    const handleRefreshIntervalChange = (newInterval) => {
        const clampedInterval = Math.max(10, Math.min(600, newInterval)); // Limita tra 10 e 600 secondi
        setRefreshInterval(clampedInterval);
    };

    const handleCookedCountChange = (counterId, newCount) => {
        setCookedCounts(prevCounts => ({
            ...prevCounts,
            [counterId]: newCount,
        }));
    };

    const toggleAutoRefresh = () => {
        setAutoRefreshEnabled(prev => !prev);
    };

    return (
        <>
            <header>
                <h1>Sagra Metrics Dashboard</h1>
                <nav>
                    <div className="nav-buttons">
                        <button onClick={() => setView('dashboard')} disabled={view === 'dashboard'}>
                            Dashboard
                        </button>
                        <button onClick={() => setView('config')} disabled={view === 'config'}>
                            Configurazione
                        </button>
                    </div>
                    <a 
                        href="https://github.com/fiocchidavide/dashboardstandgastronomico" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="github-link"
                        title="Visualizza su GitHub"
                    >
                        <svg className="github-icon" viewBox="0 0 24 24">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                        GitHub
                    </a>
                </nav>
            </header>
            <main className="card">
                {error && <p style={{ color: 'red' }}>Errore: {error}</p>}
                
                {view === 'dashboard' ? (
                    <Dashboard
                        counters={counters}
                        orders={orders}
                        cookedCounts={cookedCounts}
                        onCookedCountChange={handleCookedCountChange}
                        selectedDate={selectedDate}
                        refreshIndicator={refreshIndicator}
                        onToggleAutoRefresh={toggleAutoRefresh}
                        onManualRefresh={handleManualRefresh}
                        isLoading={isLoading}
                    />
                ) : (
                    <Configuration
                        articles={articles}
                        initialCounters={counters}
                        onSave={handleSaveCounters}
                        selectedDate={selectedDate}
                        refreshInterval={refreshInterval}
                        onRefreshIntervalChange={handleRefreshIntervalChange}
                    />
                )}
            </main>
        </>
    );
}

export default App;