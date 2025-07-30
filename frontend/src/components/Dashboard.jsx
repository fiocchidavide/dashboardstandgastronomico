import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
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
    faHashtag,
    faUser,
    faClock,
    faInbox
} from '@fortawesome/free-solid-svg-icons';
import RefreshIndicator from './RefreshIndicator';

function Dashboard({ 
    counters, 
    orders, 
    cookedCounts, 
    onCookedCountChange, 
    selectedDate, 
    refreshIndicator, 
    onToggleAutoRefresh, 
    onManualRefresh, 
    isLoading 
}) {

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
        return (
            <div className="alert alert-info" role="alert">
                <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                Per favore, imposta almeno un contatore nella configurazione.
            </div>
        );
    }

    return (
        <div className="dashboard fade-in-up">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="text-primary mb-0">
                    <FontAwesomeIcon icon={faChartBar} className="me-2" />
                    Dashboard
                </h2>
                <div className="badge bg-secondary fs-6 px-3 py-2">
                    <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                    {selectedDate}
                </div>
            </div>

            {/* Auto Refresh Status */}
            {refreshIndicator && (
                <div className={`card mb-4 border-start-primary ${refreshIndicator.isActive ? 'border-success' : 'border-secondary'}`}>
                    <div className="card-body">
                        <div className="row align-items-center">
                            <div className="col-6">
                                <div className="d-flex align-items-center">
                                    <div className={`rounded-circle me-3 d-inline-flex align-items-center justify-content-center ${
                                        refreshIndicator.isActive ? 'bg-success' : 'bg-secondary'
                                    }`} style={{ 
                                        width: '40px', 
                                        height: '40px',
                                        minWidth: '40px',
                                        minHeight: '40px',
                                        flexShrink: 0
                                    }}>
                                        <FontAwesomeIcon 
                                            icon={refreshIndicator.isActive ? faSyncAlt : faPause} 
                                            className={`text-white ${refreshIndicator.isActive ? 'fa-spin' : ''}`}
                                        />
                                    </div>
                                    <div>
                                        <h6 className="mb-0 fw-bold">
                                            {refreshIndicator.isActive ? 'Aggiornamento Automatico' : 'Aggiornamento Disattivato'}
                                        </h6>
                                        <small className={refreshIndicator.isActive ? 'text-success' : 'text-muted'}>
                                            {refreshIndicator.isActive ? 'Attivo' : 'Non attivo'}
                                        </small>
                                    </div>
                                </div>
                            </div>
                            <div className="col-6">
                                <div className="d-flex gap-2 justify-content-end">
                                    {onToggleAutoRefresh && (
                                        <button
                                            onClick={onToggleAutoRefresh}
                                            className={`btn btn-sm ${refreshIndicator.isActive ? 'btn-outline-danger' : 'btn-success'}`}
                                        >
                                            <FontAwesomeIcon icon={refreshIndicator.isActive ? faPause : faPlay} className="me-1" />
                                            {refreshIndicator.isActive ? 'Disattiva' : 'Attiva'}
                                        </button>
                                    )}
                                    {onManualRefresh && (
                                        <button
                                            onClick={onManualRefresh}
                                            disabled={isLoading}
                                            className="btn btn-outline-primary btn-sm"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-1"></span>
                                                    Caricando...
                                                </>
                                            ) : (
                                                <>
                                                    <FontAwesomeIcon icon={faSyncAlt} className="me-1" />
                                                    Aggiorna
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="row align-items-center mt-3">

                            <div className="col-12">
                                {refreshIndicator.isActive ? (
                                    <RefreshIndicator
                                        timeRemaining={refreshIndicator.timeRemaining}
                                        totalTime={refreshIndicator.totalTime}
                                        isActive={refreshIndicator.isActive}
                                    />
                                ) : (
                                    <small className="text-muted">
                                        <FontAwesomeIcon icon={faInfoCircle} className="me-1" />
                                        Aggiornamento manuale
                                    </small>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Counter Cards */}
            <div className="counter-cards-container d-flex overflow-auto pb-2 mb-3" style={{ gap: '1rem' }}>
                {counters.map(counter => {
                    const ordered = counterTotals[counter.id].ordered;
                    const cooked = counterTotals[counter.id].cooked;
                    const remaining = Math.max(0, ordered - cooked);
                    const progressPercentage = ordered > 0 ? (cooked / ordered) * 100 : 0;
                    
                    return (
                        <div key={counter.id} className="counter-card" style={{ minWidth: '350px', flex: '0 0 auto' }}>
                            <div className="card h-100">
                                <div className="card-header text-center">
                                    <h5 className="card-title mb-0 fw-bold">
                                        <FontAwesomeIcon icon={faUtensils} className="me-2" />
                                        {counter.name}
                                    </h5>
                                </div>
                                <div className="card-body">
                                    {/* Main Numbers */}
                                    <div className="row text-center mb-3">
                                        <div className="col-4">
                                            <div className="fs-3 fw-bold text-info">{ordered}</div>
                                            <small className="text-muted">Ordinati</small>
                                        </div>
                                        <div className="col-4">
                                            <div className="fs-3 fw-bold text-success">{cooked}</div>
                                            <small className="text-muted">Fatti</small>
                                        </div>
                                        <div className="col-4">
                                            <div className="fs-3 fw-bold text-warning">{remaining}</div>
                                            <small className="text-muted">Da Fare</small>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="mb-3">
                                        <div className="d-flex justify-content-between mb-2">
                                            <small className="text-muted">Progresso</small>
                                            <small className="fw-bold text-primary">{Math.round(progressPercentage)}%</small>
                                        </div>
                                        <div className="progress" style={{ height: '10px' }}>
                                            <div 
                                                className={`progress-bar ${
                                                    progressPercentage >= 100 ? 'bg-success' : 
                                                    progressPercentage >= 75 ? 'bg-info' :
                                                    progressPercentage >= 50 ? 'bg-warning' : 'bg-danger'
                                                }`}
                                                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Controls */}
                                    <div className="mb-3">
                                        <label className="form-label small fw-medium mb-2">Controllo Fatti:</label>
                                        <div className="input-group input-group-sm">
                                            <button 
                                                onClick={() => onCookedCountChange(counter.id, Math.max(0, (cookedCounts[counter.id] || 0) - 1))}
                                                className="btn btn-outline-danger"
                                            >
                                                <FontAwesomeIcon icon={faMinus} />
                                            </button>
                                            <input
                                                type="number"
                                                className="form-control text-center fw-bold"
                                                value={cookedCounts[counter.id] || 0}
                                                onChange={(e) => {
                                                    const value = parseInt(e.target.value, 10);
                                                    onCookedCountChange(counter.id, isNaN(value) || value < 0 ? 0 : value);
                                                }}
                                                min="0"
                                            />
                                            <button 
                                                onClick={() => onCookedCountChange(counter.id, (cookedCounts[counter.id] || 0) + 1)}
                                                className="btn btn-outline-success"
                                            >
                                                <FontAwesomeIcon icon={faPlus} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Quick Adjustment */}
                                    <div>
                                        <label className="form-label small fw-medium mb-2">Aggiustamento rapido:</label>
                                        <div className="input-group input-group-sm">
                                            <input
                                                type="number"
                                                placeholder="±"
                                                className="form-control"
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
                                                    const input = e.target.closest('.input-group').querySelector('input');
                                                    const value = parseInt(input.value, 10);
                                                    if (!isNaN(value)) {
                                                        const newTotal = Math.max(0, (cookedCounts[counter.id] || 0) + value);
                                                        onCookedCountChange(counter.id, newTotal);
                                                        input.value = '';
                                                    }
                                                }}
                                                className="btn btn-outline-primary"
                                            >
                                                <FontAwesomeIcon icon={faCheck} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Orders Table */}
            <div className="card">
                <div className="card-header text-center">
                    <h5 className="card-title mb-0 fw-bold">
                        <FontAwesomeIcon icon={faListAlt} className="me-2" />
                        Ordini del {selectedDate}
                    </h5>
                </div>
                <div className="card-body p-0">
                    {isLoading && (
                        <div className="alert alert-info m-3 mb-0">
                            <div className="d-flex align-items-center">
                                <div className="spinner-border spinner-border-sm me-2"></div>
                                Caricamento ordini in corso...
                            </div>
                        </div>
                    )}
                    
                    <div className="table-responsive">
                        <table className="table table-hover mb-0 table-sm table-uniform">
                            <thead className="table-light">
                                <tr>
                                    <th className="text-center">
                                        <FontAwesomeIcon icon={faHashtag} className="me-1" />
                                        ID Ordine
                                    </th>
                                    <th className="d-none d-sm-table-cell text-center">
                                        <FontAwesomeIcon icon={faUser} className="me-1" />
                                        Cliente
                                    </th>
                                    <th className="text-center">
                                        <FontAwesomeIcon icon={faClock} className="me-1" />
                                        Ora
                                    </th>
                                    {counters.map(counter => (
                                        <th key={counter.id} className="text-center">
                                            {counter.name}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {displayedOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan={3 + counters.length} className="text-center text-muted py-5">
                                            <div className="d-flex flex-column align-items-center">
                                                <FontAwesomeIcon icon={faInbox} className="fa-2x mb-3" />
                                                <p className="mb-0">Nessun ordine trovato per la data selezionata</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    displayedOrders.map((order) => (
                                        <tr key={order.id_ordine}>
                                            <td className="fw-bold text-center">
                                                <span className="badge bg-primary">{order.id_ordine}</span>
                                            </td>
                                            <td className="d-none d-sm-table-cell text-center">
                                                <span className="text-truncate d-inline-block">
                                                    {order.cliente}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <span className="badge bg-light text-dark">{order.ora}</span>
                                            </td>
                                            {counters.map(counter => {
                                                const contribution = calculateOrderContribution(order, counter);
                                                const cellColorClass = getCellColor(contribution, counter.id, order);
                                                
                                                let cellClass = 'text-center';
                                                
                                                if (cellColorClass === 'cell-green') {
                                                    cellClass += ' bg-success bg-opacity-25';
                                                } else if (cellColorClass === 'cell-yellow') {
                                                    cellClass += ' bg-warning bg-opacity-25';
                                                } else if (cellColorClass === 'cell-red') {
                                                    cellClass += ' bg-danger bg-opacity-25';
                                                }
                                                
                                                return (
                                                    <td key={counter.id} className={cellClass}>
                                                        {contribution > 0 ? (
                                                            contribution
                                                        ) : (
                                                            "-"
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
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
