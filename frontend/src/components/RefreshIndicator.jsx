import PropTypes from 'prop-types';

function RefreshIndicator({ timeRemaining, totalTime, isActive }) {
    const progress = totalTime > 0 ? ((totalTime - timeRemaining) / totalTime) * 100 : 0;
    const circumference = 2 * Math.PI * 35; // raggio di 35px
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className={`refresh-indicator ${!isActive ? 'inactive' : ''}`}>
            <div className="progress-circle">
                <svg className="progress-svg" width="80" height="80">
                    {/* Cerchio di sfondo */}
                    <circle
                        className="progress-bg"
                        cx="40"
                        cy="40"
                        r="35"
                    />
                    {/* Cerchio di progresso */}
                    <circle
                        className="progress-bar"
                        cx="40"
                        cy="40"
                        r="35"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                    />
                </svg>
                
                {/* Testo al centro */}
                <div className="progress-text">
                    <div className="progress-time">{Math.ceil(timeRemaining)}s</div>
                    <div className="progress-label">
                        {isActive ? 'rimanenti' : 'fermo'}
                    </div>
                </div>
            </div>
            
            <div className="refresh-info">
                <div className="refresh-title">Aggiornamento automatico</div>
                <div className="refresh-status">
                    {isActive ? 'Attivo' : 'Disattivato'}
                    {isActive && ` (ogni ${totalTime}s)`}
                </div>
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
