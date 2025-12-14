import React from 'react';
import { Globe, Zap } from 'lucide-react';
import './CountrySelector.css';

function CountrySelector({ countries, onSelect, totalPeople }) {
    return (
        <div className="app-container">
            <div className="country-selector">
                <div className="country-selector-header">
                    <Globe size={48} strokeWidth={1.5} className="globe-icon" />
                    <h1>Wikidata People Quiz</h1>
                    <p className="text-secondary">
                        Endless multiple-choice quiz testing your knowledge of notable people from around the world
                    </p>
                </div>

                <div className="quiz-stats-preview">
                    <div className="stat-preview">
                        <strong>{countries.length}</strong>
                        <span>Countries</span>
                    </div>
                    <div className="stat-preview">
                        <strong>{totalPeople}</strong>
                        <span>Famous People</span>
                    </div>
                    <div className="stat-preview">
                        <strong>∞</strong>
                        <span>Questions</span>
                    </div>
                </div>

                <button className="start-quiz-button" onClick={() => onSelect()}>
                    <Zap size={24} />
                    Start Quiz
                </button>

                <footer className="country-selector-footer">
                    <p className="text-secondary">
                        Features:<br />
                        • <strong>Elo Rating System</strong> - Track your expertise<br />
                        • <strong>Multiple Choice</strong> - 4 options per question<br />
                        • <strong>Instant Feedback</strong> - Learn interesting facts<br />
                        • <strong>Global Pool</strong> - Questions from all countries
                    </p>
                    <p className="text-secondary" style={{ marginTop: 'var(--spacing-md)' }}>
                        Data sourced from <a href="https://www.wikidata.org" target="_blank" rel="noopener noreferrer">Wikidata</a>
                    </p>
                </footer>
            </div>
        </div>
    );
}

export default CountrySelector;
