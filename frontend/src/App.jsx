import { useState, useEffect, useCallback, useRef } from 'react';
import Dashboard from './components/Dashboard';
import Configuration from './components/Configuration';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { 
    faChartLine, 
    faCog, 
    faExclamationTriangle,
    faInfoCircle,
    faChartBar,
    faPause,
    faPlay,
    faSyncAlt,
    faCalendarAlt,
    faUtensils,
    faMinus,
    faPlus,
    faCheck,
    faListAlt,
    faTrash,
    faList,
    faSave,
    faSync
} from '@fortawesome/free-solid-svg-icons';
import { faGithub as faGithubBrand } from '@fortawesome/free-brands-svg-icons';
import './App.css';

// Add icons to the library
library.add(
    faChartLine, 
    faCog, 
    faExclamationTriangle, 
    faGithubBrand,
    faInfoCircle,
    faChartBar,
    faPause,
    faPlay,
    faSyncAlt,
    faCalendarAlt,
    faUtensils,
    faMinus,
    faPlus,
    faCheck,
    faListAlt,
    faTrash,
    faList,
    faSave,
    faSync
);

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
        <div className="app-wrapper">
            <div className="app-content d-flex flex-column min-vh-100">
                <header className="app-header sticky-top">
                    <div className="container-fluid px-4">
                        <nav className="navbar navbar-expand-lg navbar-light py-3 flex-nowrap">
                            <div className="navbar-brand flex-shrink-0">
                                <h1 className="app-title h3 mb-0 text-nowrap">
                                    <FontAwesomeIcon icon="utensils" className="me-2" />
                                    <span className="d-none d-md-inline">Dashboard Stand Gastronomico</span>
                                </h1>
                            </div>
                            
                            <div className="navbar-nav ms-auto d-flex flex-row align-items-center flex-shrink-0">
                                <div className="btn-group me-3" role="group">
                                    <button 
                                        onClick={() => setView('dashboard')} 
                                        disabled={view === 'dashboard'}
                                        className={`btn ${view === 'dashboard' ? 'btn-primary' : 'btn-outline-primary'} text-nowrap`}
                                    >
                                        <FontAwesomeIcon icon="chart-line" className="" />
                                        <span className="d-none d-md-inline ms-2">Dashboard</span>
                                    </button>
                                    <button 
                                        onClick={() => setView('config')} 
                                        disabled={view === 'config'}
                                        className={`btn ${view === 'config' ? 'btn-primary' : 'btn-outline-primary'} text-nowrap`}
                                    >
                                        <FontAwesomeIcon icon="cog" className="" />
                                        <span className="d-none d-md-inline ms-2">Configurazione</span>
                                    </button>
                                </div>
                                <a 
                                    href="https://github.com/fiocchidavide/dashboardstandgastronomico" 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="d-flex align-items-center text-dark flex-shrink-0"
                                >
                                    <FontAwesomeIcon icon={['fab', 'github']} className="" />
                                </a>
                            </div>
                        </nav>
                    </div>
                </header>
                
                <main className="app-main flex-grow-1">
                    <div className="container-fluid">
                        {error && (
                            <div className="alert alert-danger alert-dismissible fade show mb-4">
                                <FontAwesomeIcon icon="exclamation-triangle" className="me-2" />
                                <strong>Errore:</strong> {error}
                                <button type="button" className="btn-close" onClick={() => setError(null)}></button>
                            </div>
                        )}
                        <div className='row justify-content-center'>
                            <div className='app-view-container col-md-10'>
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
                            </div>
                        </div>
                        
                    </div>
                </main>
            </div>
        </div>
    );
}

export default App;