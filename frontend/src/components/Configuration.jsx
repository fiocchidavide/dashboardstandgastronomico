import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

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
        <div className="configuration">
            <div className="date-selector" style={{ marginBottom: '20px' }}>
                <label htmlFor="config-date">Seleziona Data: </label>
                <input
                    type="date"
                    id="config-date"
                    value={localSelectedDate}
                    onChange={(e) => setLocalSelectedDate(e.target.value)}
                />
            </div>
            <div className="refresh-interval-selector" style={{ marginBottom: '20px' }}>
                <label htmlFor="refresh-interval">Intervallo aggiornamento automatico (secondi): </label>
                <input
                    type="number"
                    id="refresh-interval"
                    min="10"
                    max="600"
                    value={localRefreshInterval}
                    onChange={(e) => setLocalRefreshInterval(parseInt(e.target.value, 10) || 60)}
                />
                <small style={{ display: 'block', color: '#666', marginTop: '5px' }}>
                    Inserisci un valore tra 10 e 600 secondi (di default 60 secondi)
                </small>
            </div>
            <h2>Configurazione Contatori</h2>
            {counters.map((counter, counterIndex) => (
                <div key={counter.id} className="counter-config">
                    <input
                        type="text"
                        value={counter.name}
                        onChange={(e) => handleCounterNameChange(counterIndex, e.target.value)}
                        placeholder="Nome Contatore"
                    />
                    <button onClick={() => handleRemoveCounter(counterIndex)} className="remove-btn">Rimuovi Contatore</button>
                    
                    <h4>Pietanze Tracciate</h4>
                    {counter.trackedItems.map((item, itemIndex) => (
                        <div key={itemIndex} className="tracked-item-config">
                            <select
                                value={item.articleId}
                                onChange={(e) => handleItemChange(counterIndex, itemIndex, 'articleId', e.target.value)}
                            >
                                <option value="">Seleziona pietanza</option>
                                {articles.map(article => (
                                    <option key={article.id} value={article.id}>{article.descrizione}</option>
                                ))}
                            </select>
                            <input
                                type="number"
                                min="1"
                                value={item.moltiplicatore}
                                onChange={(e) => handleItemChange(counterIndex, itemIndex, 'moltiplicatore', parseInt(e.target.value, 10))}
                                placeholder="Moltiplicatore"
                            />
                            <button onClick={() => handleRemoveItem(counterIndex, itemIndex)} className="remove-item-btn">x</button>
                        </div>
                    ))}
                    <button onClick={() => handleAddItem(counterIndex)}>Aggiungi Pietanza</button>
                </div>
            ))}
            <button onClick={handleAddCounter}>Aggiungi Contatore</button>
            <button onClick={handleSave} className="save-btn">Salva Configurazione</button>
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
