import PropTypes from 'prop-types';
import RefreshIndicator from './RefreshIndicator';

function Dashboard({ counters, orders, cookedCounts, onCookedCountChange, selectedDate, refreshIndicator, onToggleAutoRefresh, onManualRefresh, isLoading }) {

    const calculateOrderContribution = (order, counter) => {
        let contribution = 0;
        const trackedDescriptions = counter.trackedItems.map(item => item.descrizione);
        
        for (const desc of trackedDescriptions) {
            if (order.quantità[desc]) {
                const item = counter.trackedItems.find(it => it.descrizione === desc);
                contribution += order.quantità[desc] * (item?.moltiplicatore || 1);
            }
        }
        return contribution;
    };

    const getCounterTotals = () => {
        const totals = {};
        counters.forEach(counter => {
            const totalOrdered = orders.reduce((sum, order) => {
                return sum + calculateOrderContribution(order, counter);
            }, 0);
            totals[counter.id] = {
                ordered: totalOrdered,
                cooked: cookedCounts[counter.id] || 0,
            };
        });
        return totals;
    };

    const counterTotals = getCounterTotals();

    // Ordiniamo gli ordini dal più recente al più vecchio per la visualizzazione
    const displayedOrders = [...orders].sort((a, b) => {
        // Se gli ordini hanno un campo ora, ordiniamo per ora (dal più recente al più vecchio)
        if (a.ora && b.ora) {
            return b.ora.localeCompare(a.ora);
        }
        // Altrimenti ordiniamo per ID ordine (assumendo che ID più alti = ordini più recenti)
        return b.id_ordine - a.id_ordine;
    });

    // Ordiniamo gli ordini dal più vecchio al più recente per la logica di colorazione
    const ordersForColoring = [...orders].sort((a, b) => {
        // Se gli ordini hanno un campo ora, ordiniamo per ora (dal più vecchio al più recente)
        if (a.ora && b.ora) {
            return a.ora.localeCompare(b.ora);
        }
        // Altrimenti ordiniamo per ID ordine (assumendo che ID più bassi = ordini più vecchi)
        return a.id_ordine - b.id_ordine;
    });

    const getCellColor = (orderContribution, counterId, currentOrder) => {
        if (orderContribution === 0) return '';

        // Troviamo l'indice dell'ordine corrente nell'array ordinato per colorazione
        const orderIndexInColoringArray = ordersForColoring.findIndex(o => o.id_ordine === currentOrder.id_ordine);
        
        const cumulativeOrderedUpToThis = ordersForColoring
            .slice(0, orderIndexInColoringArray + 1)
            .reduce((sum, o) => sum + calculateOrderContribution(o, counters.find(c => c.id === counterId)), 0);
        
        const cookedTotal = counterTotals[counterId].cooked;

        if (cookedTotal >= cumulativeOrderedUpToThis) {
            return 'cell-green';
        }
        
        const cumulativeOrderedBeforeThis = cumulativeOrderedUpToThis - orderContribution;
        if (cookedTotal > cumulativeOrderedBeforeThis) {
            return 'cell-yellow';
        }

        return 'cell-red';
    };

    if (counters.length === 0) {
        return <p>Per favore, imposta almeno un contatore nella configurazione.</p>;
    }

    return (
        <div className="dashboard">
            <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>Dashboard</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    {refreshIndicator && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <RefreshIndicator
                                timeRemaining={refreshIndicator.timeRemaining}
                                totalTime={refreshIndicator.totalTime}
                                isActive={refreshIndicator.isActive}
                            />
                            {onToggleAutoRefresh && (
                                <button
                                    onClick={onToggleAutoRefresh}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '4px',
                                        border: '1px solid #ddd',
                                        backgroundColor: refreshIndicator.isActive ? '#f44336' : '#4caf50',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontSize: '12px'
                                    }}
                                    title={refreshIndicator.isActive ? 'Disattiva aggiornamento automatico' : 'Attiva aggiornamento automatico'}
                                >
                                    {refreshIndicator.isActive ? 'Stop Auto' : 'Start Auto'}
                                </button>
                            )}
                            {onManualRefresh && (
                                <button
                                    onClick={onManualRefresh}
                                    disabled={isLoading}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '4px',
                                        border: '1px solid #ddd',
                                        backgroundColor: isLoading ? '#ccc' : '#2196f3',
                                        color: 'white',
                                        cursor: isLoading ? 'not-allowed' : 'pointer',
                                        fontSize: '12px',
                                        opacity: isLoading ? 0.6 : 1
                                    }}
                                    title="Ricarica manualmente gli ordini"
                                >
                                    {isLoading ? 'Caricando...' : '🔄 Aggiorna'}
                                </button>
                            )}
                        </div>
                    )}
                    <div className="current-date">
                        <strong>Data selezionata: {selectedDate}</strong>
                    </div>
                </div>
            </div>
            <div className="counter-summary">
                {counters.map(counter => {
                    const ordered = counterTotals[counter.id].ordered;
                    const cooked = counterTotals[counter.id].cooked;
                    const remaining = Math.max(0, ordered - cooked);
                    const progressPercentage = ordered > 0 ? (cooked / ordered) * 100 : 0;
                    
                    return (
                        <div key={counter.id} className="counter-stats">
                            <h3>{counter.name}</h3>
                            
                            {/* Numeri principali */}
                            <div className="counter-numbers">
                                <div className="number-item">
                                    <span className="number-label">Ordinati:</span>
                                    <span className="number-value ordered">{ordered}</span>
                                </div>
                                <div className="number-item">
                                    <span className="number-label">Fatti:</span>
                                    <span className="number-value cooked">{cooked}</span>
                                </div>
                                <div className="number-item">
                                    <span className="number-label">Da Fare:</span>
                                    <span className="number-value remaining">{remaining}</span>
                                </div>
                            </div>

                            {/* Barra di progresso */}
                            <div className="progress-container">
                                <div className="progress-bar">
                                    <div 
                                        className="progress-fill" 
                                        style={{ 
                                            width: `${Math.min(progressPercentage, 100)}%`,
                                            backgroundColor: progressPercentage >= 100 ? '#4caf50' : 
                                                            progressPercentage >= 50 ? '#ff9800' : '#f44336'
                                        }}
                                    ></div>
                                </div>
                                <span className="progress-text">{Math.round(progressPercentage)}%</span>
                            </div>

                            {/* Controlli per i fatti */}
                            <div className="cooked-controls">
                                <label>Fatti:</label>
                                <button onClick={() => onCookedCountChange(counter.id, Math.max(0, (cookedCounts[counter.id] || 0) - 1))}>-</button>
                                <input
                                    type="number"
                                    value={cookedCounts[counter.id] || 0}
                                    onChange={(e) => {
                                        const value = parseInt(e.target.value, 10);
                                        onCookedCountChange(counter.id, isNaN(value) || value < 0 ? 0 : value);
                                    }}
                                />
                                <button onClick={() => onCookedCountChange(counter.id, (cookedCounts[counter.id] || 0) + 1)}>+</button>
                            </div>

                            {/* Casella per modifiche rapide */}
                            <div className="adjustment-controls">
                                <label>Aggiungi/Togli:</label>
                                <input
                                    type="number"
                                    placeholder="±"
                                    className="adjustment-input"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const value = parseInt(e.target.value, 10);
                                            if (!isNaN(value)) {
                                                const newTotal = Math.max(0, (cookedCounts[counter.id] || 0) + value);
                                                onCookedCountChange(counter.id, newTotal);
                                                e.target.value = '';
                                            }
                                        }
                                    }}
                                />
                                <button 
                                    onClick={(e) => {
                                        const input = e.target.parentElement.querySelector('.adjustment-input');
                                        const value = parseInt(input.value, 10);
                                        if (!isNaN(value)) {
                                            const newTotal = Math.max(0, (cookedCounts[counter.id] || 0) + value);
                                            onCookedCountChange(counter.id, newTotal);
                                            input.value = '';
                                        }
                                    }}
                                    className="apply-btn"
                                >
                                    Applica
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="orders-table-container">
                {isLoading && (
                    <div style={{ 
                        padding: '10px', 
                        backgroundColor: '#e3f2fd', 
                        border: '1px solid #2196f3', 
                        borderRadius: '4px', 
                        marginBottom: '10px',
                        textAlign: 'center',
                        color: '#1976d2'
                    }}>
                        🔄 Caricamento ordini in corso...
                    </div>
                )}
                <table className="orders-table">
                    <thead>
                        <tr>
                            <th>ID Ordine</th>
                            <th>Cliente</th>
                            <th>Ora</th>
                            {counters.map(counter => (
                                <th key={counter.id}>{counter.name}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {displayedOrders.map((order, orderIndex) => (
                            <tr key={order.id_ordine}>
                                <td>{order.id_ordine}</td>
                                <td>{order.cliente}</td>
                                <td>{order.ora}</td>
                                {counters.map(counter => {
                                    const contribution = calculateOrderContribution(order, counter);
                                    const cellColorClass = getCellColor(contribution, counter.id, order);
                                    return (
                                        <td key={counter.id} className={cellColorClass}>
                                            {contribution > 0 ? contribution : ''}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

Dashboard.propTypes = {
    counters: PropTypes.array.isRequired,
    orders: PropTypes.array.isRequired,
    cookedCounts: PropTypes.object.isRequired,
    onCookedCountChange: PropTypes.func.isRequired,
    selectedDate: PropTypes.string.isRequired,
    refreshIndicator: PropTypes.shape({
        timeRemaining: PropTypes.number.isRequired,
        totalTime: PropTypes.number.isRequired,
        isActive: PropTypes.bool.isRequired,
    }),
    onToggleAutoRefresh: PropTypes.func,
    onManualRefresh: PropTypes.func,
    isLoading: PropTypes.bool,
};

export default Dashboard;
