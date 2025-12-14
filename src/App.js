import React, { useState, useEffect } from 'react';
import EndlessQuiz from './components/EndlessQuiz';

function App() {
    const [allCountryData, setAllCountryData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Load ALL country data on mount - go straight to quiz
    useEffect(() => {
        const loadAllData = async () => {
            try {
                const indexResponse = await fetch(`${process.env.PUBLIC_URL}/data/index.json`);
                const indexData = await indexResponse.json();

                // Fetch ALL country data in parallel
                const dataPromises = indexData.countries.map(country =>
                    fetch(`${process.env.PUBLIC_URL}/data/${country.file}`)
                        .then(res => res.json())
                        .catch(err => {
                            console.error(`Failed to load ${country.name}:`, err);
                            return null;
                        })
                );

                const allData = await Promise.all(dataPromises);
                const validData = allData.filter(data => data !== null);

                setAllCountryData(validData);
                setLoading(false);
            } catch (err) {
                console.error('Failed to load quiz data:', err);
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

    // Go straight to quiz - no start screen
    return (
        <EndlessQuiz allPeopleData={allCountryData} />
    );
}

export default App;
