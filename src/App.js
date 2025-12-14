import React, { useState, useEffect } from 'react';
import EndlessQuiz from './components/EndlessQuiz';
import Gallery from './components/Gallery';
import Statistics from './components/Statistics';

function App() {
    const [allCountryData, setAllCountryData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState('quiz'); // 'quiz', 'gallery', 'statistics'

    // Load ALL country data on mount - go straight to quiz
    useEffect(() => {
        const loadAllData = async () => {
            try {
                // Handle PUBLIC_URL for both GitHub Pages (subdirectory) and Vercel (root)
                const publicUrl = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
                const indexResponse = await fetch(`${publicUrl}/data/index.json`);
                if (!indexResponse.ok) {
                    throw new Error(`Failed to load index: ${indexResponse.status}`);
                }
                const indexData = await indexResponse.json();

                if (!indexData.countries || indexData.countries.length === 0) {
                    throw new Error('No countries found in index.json');
                }

                // Fetch ALL country data in parallel
                const dataPromises = indexData.countries.map(country =>
                    fetch(`${publicUrl}/data/${country.file}`)
                        .then(res => {
                            if (!res.ok) {
                                throw new Error(`HTTP ${res.status}`);
                            }
                            return res.json();
                        })
                        .catch(err => {
                            console.error(`Failed to load ${country.name}:`, err);
                            return null;
                        })
                );

                const allData = await Promise.all(dataPromises);
                const validData = allData.filter(data => data !== null && data.people && data.people.length > 0);

                if (validData.length === 0) {
                    throw new Error('No valid country data loaded');
                }

                setAllCountryData(validData);
                setLoading(false);
            } catch (err) {
                console.error('Failed to load quiz data:', err);
                setError(err.message);
                setLoading(false);
            }
        };

        loadAllData();
    }, []);

    // Render loading state
    if (loading) {
        return (
            <div className="app-container">
                <div className="loading">
                    <div className="spinner"></div>
                    <p className="text-secondary">Loading quiz...</p>
                </div>
            </div>
        );
    }

    // Render error state
    if (error) {
        return (
            <div className="app-container">
                <div className="loading">
                    <p style={{ color: '#dc3545', fontSize: '16px', marginBottom: '8px' }}>Error loading quiz data</p>
                    <p className="text-secondary">{error}</p>
                    <button 
                        onClick={() => window.location.reload()} 
                        style={{ marginTop: '16px', padding: '8px 16px' }}
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // Render based on current page
    if (currentPage === 'gallery') {
        return <Gallery allPeopleData={allCountryData} onNavigateToQuiz={() => setCurrentPage('quiz')} />;
    }

    if (currentPage === 'statistics') {
        return <Statistics onNavigateToQuiz={() => setCurrentPage('quiz')} />;
    }

    // Default to quiz
    return (
        <EndlessQuiz 
            allPeopleData={allCountryData} 
            onNavigateToGallery={() => setCurrentPage('gallery')}
            onNavigateToStatistics={() => setCurrentPage('statistics')}
        />
    );
}

export default App;
