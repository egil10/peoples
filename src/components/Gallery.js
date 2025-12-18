import React, { useState, useEffect, useMemo } from 'react';
import { PanelLeft } from 'lucide-react';
import './Gallery.css';

function Gallery({ allPeopleData, onNavigateToQuiz }) {
    const [allPeople, setAllPeople] = useState([]);
    const [displayedPeople, setDisplayedPeople] = useState([]);
    const [selectedCountry, setSelectedCountry] = useState('all');
    const [showCountryFilter, setShowCountryFilter] = useState(false);
    const [loadedCount, setLoadedCount] = useState(24); // Start with 24 people (3 rows of 8)
    const [shuffledPeople, setShuffledPeople] = useState([]);

    // Proper Fisher-Yates shuffle algorithm
    const shuffleArray = (array) => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };

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
        if (allPeople.length === 0) return;

        let filtered;
        if (selectedCountry === 'all') {
            filtered = [...allPeople];
        } else {
            // Strict filter - must match country exactly
            filtered = allPeople.filter(p => {
                return p.country && p.country.trim() === selectedCountry.trim();
            });
        }

        // Properly shuffle array using Fisher-Yates
        const shuffled = shuffleArray(filtered);
        setShuffledPeople(shuffled);

        // Always start with 24 people (3 rows of 8) regardless of filter
        setLoadedCount(24);
        setDisplayedPeople(shuffled.slice(0, Math.min(24, shuffled.length)));
    }, [selectedCountry, allPeople]);

    // Load more people
    const handleLoadMore = () => {
        if (shuffledPeople.length === 0) return;

        const newCount = loadedCount + 24;
        setLoadedCount(newCount);
        setDisplayedPeople(shuffledPeople.slice(0, newCount));
    };

    const hasMore = shuffledPeople.length > loadedCount;

    const countries = useMemo(() =>
        [...new Set(allPeople.map(p => p.country))].sort(),
        [allPeople]
    );

    const countryData = useMemo(() =>
        selectedCountry !== 'all' ? allPeopleData.find(c => c.country === selectedCountry) : null,
        [selectedCountry, allPeopleData]
    );

    // Close sidebar on Escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && showCountryFilter) {
                setShowCountryFilter(false);
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [showCountryFilter]);

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
            <header className={`header ${showCountryFilter ? 'sidebar-open' : ''}`}>
                <div className="gallery-header-left">
                    <button className="logo-button" onClick={onNavigateToQuiz}>
                        <h1>Famous Nationals</h1>
                    </button>
                    {selectedCountry !== 'all' && (
                        <div className="stats-capsule">
                            <span className="capsule-divider"></span>
                            {countryData?.flag && (
                                <img src={countryData.flag} alt="" className="country-flag-mini" />
                            )}
                            <span className="country-badge">{selectedCountry}</span>
                        </div>
                    )}
                </div>
                <div className="action-capsule">
                    <div className="control-group">
                        <button
                            onClick={() => setShowCountryFilter(!showCountryFilter)}
                            className="action-button"
                            title="Filter by Country"
                        >
                            <PanelLeft size={16} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Backdrop overlay */}
            <div
                className={`sidebar-backdrop ${showCountryFilter ? 'open' : ''}`}
                onClick={() => setShowCountryFilter(false)}
                aria-hidden="true"
            />

            {/* Sidebar */}
            <aside className={`sidebar ${showCountryFilter ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <h3>Filter by Country</h3>
                    <button onClick={() => setShowCountryFilter(false)} className="sidebar-close" aria-label="Close sidebar">×</button>
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
                <div className="gallery-grid">
                    {displayedPeople.map((person) => {
                        const ItemWrapper = person.wikipediaUrl ? 'a' : 'div';
                        const wrapperProps = person.wikipediaUrl ? {
                            href: person.wikipediaUrl,
                            target: '_blank',
                            rel: 'noopener noreferrer',
                            className: 'gallery-item-link'
                        } : {};

                        return (
                            <ItemWrapper key={person.wikidataUrl} {...wrapperProps}>
                                <div className="gallery-item">
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
                            </ItemWrapper>
                        );
                    })}
                </div>

                {hasMore && (
                    <div className="gallery-load-more">
                        <button className="load-more-button" onClick={handleLoadMore}>
                            Load More
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}

export default Gallery;

