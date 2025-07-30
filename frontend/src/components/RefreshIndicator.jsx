import PropTypes from 'prop-types';

function RefreshIndicator({ timeRemaining, totalTime, isActive }) {
    const progress = totalTime > 0 ? ((totalTime - timeRemaining) / totalTime) * 100 : 0;
    
    return (
        <div className="w-100">
            <div className="d-flex justify-content-between align-items-center mb-1">
                <small className="text-muted">
                    {isActive ? `Aggiornamento ogni ${totalTime}s` : 'Aggiornamento manuale'}
                </small>
                {isActive && (
                    <small className="fw-bold text-primary">{timeRemaining}s rimanenti</small>
                )}
            </div>
            <div className="progress" style={{ height: '12px' }}>
                <div 
                    className={`progress-bar ${isActive ? 'progress-bar-striped progress-bar-animated bg-success' : 'bg-secondary'}`}
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
        </div>
    );
}

RefreshIndicator.propTypes = {
    timeRemaining: PropTypes.number.isRequired,
    totalTime: PropTypes.number.isRequired,
    isActive: PropTypes.bool.isRequired,
};

export default RefreshIndicator;
