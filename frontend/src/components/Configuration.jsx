import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faCog, 
    faCalendarAlt, 
    faSyncAlt, 
    faUtensils, 
    faPlus, 
    faInfoCircle, 
    faTrash, 
    faList, 
    faExclamationTriangle,
    faSave
} from '@fortawesome/free-solid-svg-icons';

function Configuration({ articles, initialCounters, onSave, selectedDate, refreshInterval, onRefreshIntervalChange }) {
    const [counters, setCounters] = useState(initialCounters);
    const [localSelectedDate, setLocalSelectedDate] = useState(selectedDate);
    const [localRefreshInterval, setLocalRefreshInterval] = useState(refreshInterval || 60);

    useEffect(() => {
        setCounters(initialCounters);
    }, [initialCounters]);

    useEffect(() => {
        setLocalSelectedDate(selectedDate);
    }, [selectedDate]);

    useEffect(() => {
        setLocalRefreshInterval(refreshInterval || 60);
    }, [refreshInterval]);

    const handleAddCounter = () => {
        const newCounter = {
            id: `counter_${Date.now()}`,
            name: `Contatore ${counters.length + 1}`,
            trackedItems: [],
        };
        setCounters([...counters, newCounter]);
    };

    const handleCounterNameChange = (index, newName) => {
        const updatedCounters = [...counters];
        updatedCounters[index].name = newName;
        setCounters(updatedCounters);
    };

    const handleRemoveCounter = (index) => {
        const updatedCounters = counters.filter((_, i) => i !== index);
        setCounters(updatedCounters);
    };

    const handleAddItem = (counterIndex) => {
        const updatedCounters = [...counters];
        updatedCounters[counterIndex].trackedItems.push({
            articleId: '',
            descrizione: '',
            moltiplicatore: 1,
        });
        setCounters(updatedCounters);
    };

    const handleItemChange = (counterIndex, itemIndex, field, value) => {
        const updatedCounters = [...counters];
        const item = updatedCounters[counterIndex].trackedItems[itemIndex];
        
        if (field === 'articleId') {
            const selectedArticle = articles.find(a => a.id === parseInt(value));
            item.articleId = value;
            item.descrizione = selectedArticle ? selectedArticle.descrizione : '';
        } else {
            item[field] = value;
        }
        
        setCounters(updatedCounters);
    };

    const handleRemoveItem = (counterIndex, itemIndex) => {
        const updatedCounters = [...counters];
        updatedCounters[counterIndex].trackedItems.splice(itemIndex, 1);
        setCounters(updatedCounters);
    };

    const handleSave = () => {
        // Filter out empty counters or items
        const cleanedCounters = counters
            .map(counter => ({
                ...counter,
                trackedItems: counter.trackedItems.filter(item => item.articleId && item.moltiplicatore > 0),
            }))
            .filter(counter => counter.name && counter.trackedItems.length > 0);

        onSave(cleanedCounters, localSelectedDate);
        if (onRefreshIntervalChange) {
            onRefreshIntervalChange(localRefreshInterval);
        }
    };

    return (
        <div className="configuration fade-in-up">
            {/* General Settings */}
            <div className="config-section">
                <h3>
                    <FontAwesomeIcon icon={faCog} className="me-2" />
                    Impostazioni Generali
                </h3>
                <div className="row g-3">
                    <div className="col-md-6">
                        <label htmlFor="config-date" className="form-label fw-medium">
                            <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                            Seleziona Data:
                        </label>
                        <input
                            type="date"
                            id="config-date"
                            className="form-control"
                            value={localSelectedDate}
                            onChange={(e) => setLocalSelectedDate(e.target.value)}
                        />
                    </div>
                    
                    <div className="col-md-6">
                        <label htmlFor="refresh-interval" className="form-label fw-medium">
                            <FontAwesomeIcon icon={faSyncAlt} className="me-2" />
                            Intervallo aggiornamento (sec):
                        </label>
                        <div className="input-group">
                            <input
                                type="number"
                                id="refresh-interval"
                                className="form-control"
                                min="10"
                                max="600"
                                value={localRefreshInterval}
                                onChange={(e) => setLocalRefreshInterval(parseInt(e.target.value, 10) || 60)}
                            />
                            <span className="input-group-text">sec</span>
                        </div>
                        <div className="form-text">
                            Inserisci un valore tra 10 e 600 secondi (predefinito: 60 secondi)
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Counters Header */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h3 className="mb-0">
                    <FontAwesomeIcon icon={faUtensils} className="me-2" />
                    Configurazione Contatori
                </h3>
                <button onClick={handleAddCounter} className="btn btn-success">
                    <FontAwesomeIcon icon={faPlus} className="me-2" />
                    Aggiungi Contatore
                </button>
            </div>
            
            {counters.length === 0 ? (
                <div className="alert alert-info">
                    <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                    Nessun contatore configurato. Clicca su "Aggiungi Contatore" per iniziare.
                </div>
            ) : (
                <div className="counter-cards-container mb-4">
                    {counters.map((counter, counterIndex) => (
                        <div key={counter.id} className="config-section">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h4 className="mb-0 text-primary fw-bold">
                                    <FontAwesomeIcon icon={faUtensils} className="me-2" />
                                    Contatore #{counterIndex + 1}
                                </h4>
                                <button 
                                    onClick={() => handleRemoveCounter(counterIndex)} 
                                    className="btn btn-outline-danger btn-sm"
                                >
                                    <FontAwesomeIcon icon={faTrash} className="me-1" />
                                    Rimuovi
                                </button>
                            </div>
                            
                            <div className="mb-4">
                                <label className="form-label fw-medium">Nome Contatore:</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={counter.name}
                                    onChange={(e) => handleCounterNameChange(counterIndex, e.target.value)}
                                    placeholder="Nome Contatore"
                                />
                            </div>
                            
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h6 className="mb-0 fw-medium">
                                    <FontAwesomeIcon icon={faList} className="me-2" />
                                    Pietanze Tracciate
                                </h6>
                                <button 
                                    onClick={() => handleAddItem(counterIndex)} 
                                    className="btn btn-outline-success btn-sm"
                                >
                                    <FontAwesomeIcon icon={faPlus} className="me-1" />
                                    Aggiungi Pietanza
                                </button>
                            </div>
                            
                            {counter.trackedItems.length === 0 ? (
                                <div className="alert alert-warning">
                                    <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                                    Nessuna pietanza configurata per questo contatore.
                                </div>
                            ) : (
                                <div className="row g-3">
                                    {counter.trackedItems.map((item, itemIndex) => (
                                        <div key={itemIndex} className="col-12">
                                            <div className="card bg-light">
                                                <div className="card-body">
                                                    <div className="row align-items-end g-3">
                                                        <div className="col-md-6">
                                                            <label className="form-label small fw-medium mb-1">Pietanza:</label>
                                                            <select
                                                                className="form-select"
                                                                value={item.articleId}
                                                                onChange={(e) => handleItemChange(counterIndex, itemIndex, 'articleId', e.target.value)}
                                                            >
                                                                <option value="">Seleziona pietanza</option>
                                                                {articles.map(article => (
                                                                    <option key={article.id} value={article.id}>
                                                                        {article.descrizione}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="col-8 col-md-4">
                                                            <label className="form-label small fw-medium mb-1">Moltiplicatore:</label>
                                                            <input
                                                                type="number"
                                                                className="form-control"
                                                                min="1"
                                                                value={item.moltiplicatore}
                                                                onChange={(e) => handleItemChange(counterIndex, itemIndex, 'moltiplicatore', parseInt(e.target.value, 10))}
                                                                placeholder="1"
                                                            />
                                                        </div>
                                                        <div className="col-4 col-md-2">
                                                            <button 
                                                                onClick={() => handleRemoveItem(counterIndex, itemIndex)} 
                                                                className="btn btn-outline-danger btn-sm w-100"
                                                            >
                                                                <FontAwesomeIcon icon={faTrash} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            
            {/* Save Button */}
            <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                <button onClick={handleSave} className="btn btn-primary btn-lg">
                    <FontAwesomeIcon icon={faSave} className="me-2" />
                    <span className="d-none d-sm-inline">Salva Configurazione</span>
                    <span className="d-sm-none">Salva</span>
                </button>
            </div>
        </div>
    );
}

Configuration.propTypes = {
    articles: PropTypes.array.isRequired,
    initialCounters: PropTypes.array.isRequired,
    onSave: PropTypes.func.isRequired,
    selectedDate: PropTypes.string.isRequired,
    refreshInterval: PropTypes.number,
    onRefreshIntervalChange: PropTypes.func,
};

export default Configuration;
