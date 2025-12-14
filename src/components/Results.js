import React from 'react';
import { RotateCcw, Home, Award } from 'lucide-react';
import './Results.css';

function Results({ score, total, country, onRestart, onRetry }) {
    const percentage = Math.round((score / total) * 100);

    // Determine performance message
    const getMessage = () => {
        if (percentage === 100) return 'Perfect! Outstanding!';
        if (percentage >= 80) return 'Excellent! Well done!';
        if (percentage >= 60) return 'Good job!';
        if (percentage >= 40) return 'Not bad!';
        return 'Keep practicing!';
    };

    const getEmoji = () => {
        if (percentage === 100) return '🎉';
        if (percentage >= 80) return '🌟';
        if (percentage >= 60) return '👍';
        if (percentage >= 40) return '📚';
        return '💪';
    };

    return (
        <div className="app-container">
            <div className="results">
                <div className="results-content">
                    <div className="results-icon">
                        <Award size={64} strokeWidth={1.5} />
                    </div>

                    <h1>Quiz Complete!</h1>

                    <div className="results-country">
                        <p className="text-secondary">{country}</p>
                    </div>

                    <div className="results-score">
                        <div className="score-circle">
                            <span className="score-number">{score}</span>
                            <span className="score-divider">/</span>
                            <span className="score-total">{total}</span>
                        </div>
                        <p className="score-percentage">{percentage}%</p>
                    </div>

                    <div className="results-message">
                        <span className="message-emoji">{getEmoji()}</span>
                        <p>{getMessage()}</p>
                    </div>

                    <div className="results-actions">
                        <button onClick={onRetry} className="retry-button">
                            <RotateCcw size={20} />
                            Try Again
                        </button>
                        <button onClick={onRestart} className="home-button secondary">
                            <Home size={20} />
                            Choose Another Country
                        </button>
                    </div>

                    <div className="results-footer">
                        <p className="text-secondary">
                            Share your score and challenge your friends!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Results;
