import React, { useState, useEffect, useMemo } from 'react';
import { Award, TrendingUp, Target, Clock } from 'lucide-react';
import './Statistics.css';

function Statistics({ onNavigateToQuiz }) {
    const [stats, setStats] = useState({
        totalAnswered: 0,
        correctCount: 0,
        streak: 0,
        bestStreak: 0,
        elo: 1500,
        bestElo: 1500,
        countryStats: {}
    });

    useEffect(() => {
        // Load stats from localStorage
        const savedStats = localStorage.getItem('quizStats');
        if (savedStats) {
            try {
                const parsed = JSON.parse(savedStats);
                setStats(parsed);
            } catch (e) {
                console.error('Failed to parse stats:', e);
            }
        }
    }, []);

    const accuracy = useMemo(() => {
        return stats.totalAnswered > 0 
            ? Math.round((stats.correctCount / stats.totalAnswered) * 100) 
            : 0;
    }, [stats.totalAnswered, stats.correctCount]);

    const getEloRank = (elo) => {
        if (elo >= 2400) return 'Legendary';
        if (elo >= 2200) return 'Master';
        if (elo >= 2000) return 'Expert';
        if (elo >= 1800) return 'Advanced';
        if (elo >= 1600) return 'Intermediate';
        if (elo >= 1400) return 'Beginner';
        return 'Novice';
    };

    return (
        <div className="statistics-container">
            <header className="statistics-header">
                <button className="logo-button" onClick={onNavigateToQuiz}>
                    <h1>Famous Nationals</h1>
                </button>
            </header>

            <main className="statistics-content">
                <div className="statistics-title">
                    <h2>Your Statistics</h2>
                    <p className="text-secondary">Track your progress and achievements</p>
                </div>

                <div className="statistics-grid">
                    <div className="stat-card">
                        <div className="stat-icon">
                            <Target size={24} />
                        </div>
                        <div className="stat-value">{stats.totalAnswered}</div>
                        <div className="stat-label">Questions Answered</div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon">
                            <Award size={24} />
                        </div>
                        <div className="stat-value">{stats.correctCount}</div>
                        <div className="stat-label">Correct Answers</div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon">
                            <TrendingUp size={24} />
                        </div>
                        <div className="stat-value">{accuracy}%</div>
                        <div className="stat-label">Accuracy</div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon">
                            <Clock size={24} />
                        </div>
                        <div className="stat-value">{stats.streak}</div>
                        <div className="stat-label">Current Streak</div>
                        {stats.bestStreak > 0 && (
                            <div className="stat-sublabel">Best: {stats.bestStreak}</div>
                        )}
                    </div>

                    <div className="stat-card stat-card-large">
                        <div className="stat-icon">
                            <Award size={24} />
                        </div>
                        <div className="stat-value">{stats.elo}</div>
                        <div className="stat-label">Current Elo Rating</div>
                        <div className="stat-rank">{getEloRank(stats.elo)}</div>
                        {stats.bestElo > stats.elo && (
                            <div className="stat-sublabel">Best: {stats.bestElo}</div>
                        )}
                    </div>
                </div>

                {stats.totalAnswered === 0 && (
                    <div className="statistics-empty">
                        <p>No statistics yet. Start playing the quiz to track your progress!</p>
                    </div>
                )}
            </main>
        </div>
    );
}

export default Statistics;

