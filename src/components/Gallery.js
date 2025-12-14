import React, { useState, useEffect, useMemo } from 'react';
import { PanelLeft, Filter } from 'lucide-react';
import './Gallery.css';

function Gallery({ allPeopleData, onNavigateToQuiz }) {
    const [allPeople, setAllPeople] = useState([]);
    const [displayedPeople, setDisplayedPeople] = useState([]);
    const [selectedCountry, setSelectedCountry] = useState('all');
    const [showCountryFilter, setShowCountryFilter] = useState(false);
    const [loadedCount, setLoadedCount] = useState(30); // 3 rows × 10 people
    const [shuffledPeople, setShuffledPeople] = useState([]);

    // Flatten people data once on mount
    useEffect(() => {
        const flattened = [];
        allPeopleData.forEach(countryData => {
            countryData.people.forEach(person => {
                flattened.push({
                    ...person,
                    country: countryData.country,
                });
            });
        });
        setAllPeople(flattened);
    }, [allPeopleData]);

    // Filter and shuffle people based on selected country
    useEffect(() => {
        let filtered = selectedCountry === 'all' 
            ? [...allPeople] 
            : allPeople.filter(p => p.country === selectedCountry);
        
        // Shuffle array
        filtered = filtered.sort(() => Math.random() - 0.5);
        setShuffledPeople(filtered);
        
        // Reset loaded count when filter changes
        setLoadedCount(30);
        
        // Take first 30 (3 rows × 10 people)
        setDisplayedPeople(filtered.slice(0, 30));
    }, [selectedCountry, allPeople]);

    // Load more people when scrolling
    useEffect(() => {
        let isLoading = false;
        
        const handleScroll = () => {
            if (isLoading || shuffledPeople.length === 0) return;
            
            if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 500) {
                isLoading = true;
                
                const newCount = loadedCount + 30;
                setLoadedCount(newCount);
                setDisplayedPeople(shuffledPeople.slice(0, newCount));
                
                setTimeout(() => {
                    isLoading = false;
                }, 500);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [loadedCount, shuffledPeople]);

    const countries = useMemo(() =>
        [...new Set(allPeople.map(p => p.country))].sort(),
        [allPeople]
    );

    const getShortBio = (person) => {
        const parts = [];
        if (person.occupation) parts.push(person.occupation);
        if (person.birthYear || person.deathYear) {
            const years = `${person.birthYear || '?'} – ${person.deathYear || ''}`.trim();
            if (years !== '? –') parts.push(years);
        }
        return parts.join(' • ') || person.description || 'Notable person';
    };

    return (
        <div className="gallery-container">
            <header className={`gallery-header ${showCountryFilter ? 'sidebar-open' : ''}`}>
                <button className="logo-button" onClick={onNavigateToQuiz}>
                    <h1>Famous Nationals</h1>
                </button>
                <div className="gallery-controls">
                    <button 
                        onClick={() => setShowCountryFilter(!showCountryFilter)} 
                        className="filter-button"
                    >
                        <Filter size={16} />
                        <span>Filter</span>
                    </button>
                </div>
            </header>

            {/* Sidebar */}
            <aside className={`sidebar ${showCountryFilter ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <h3>Filter by Country</h3>
                    <button onClick={() => setShowCountryFilter(false)} className="sidebar-close">×</button>
                </div>
                <div className="sidebar-content">
                    <button 
                        className={`sidebar-item ${selectedCountry === 'all' ? 'active' : ''}`} 
                        onClick={() => { setSelectedCountry('all'); setShowCountryFilter(false); }}
                    >
                        All ({allPeople.length})
                    </button>
                    {countries.map(c => (
                        <button 
                            key={c} 
                            className={`sidebar-item ${selectedCountry === c ? 'active' : ''}`} 
                            onClick={() => { setSelectedCountry(c); setShowCountryFilter(false); }}
                        >
                            {c}
                        </button>
                    ))}
                </div>
            </aside>

            <main className={`gallery-content ${showCountryFilter ? 'sidebar-open' : ''}`}>
                {selectedCountry !== 'all' && (
                    <div className="gallery-filter-badge">
                        Showing people from: <strong>{selectedCountry}</strong>
                    </div>
                )}
                <div className="gallery-grid">
                    {displayedPeople.map((person) => (
                        <div key={person.wikidataUrl} className="gallery-item">
                            <div className="gallery-image">
                                <img
                                    src={person.image}
                                    alt={person.name}
                                    loading="lazy"
                                    decoding="async"
                                />
                            </div>
                            <div className="gallery-info">
                                <h3 className="gallery-name">{person.name}</h3>
                                <p className="gallery-bio">{getShortBio(person)}</p>
                                <span className="gallery-country">{person.country}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}

export default Gallery;

