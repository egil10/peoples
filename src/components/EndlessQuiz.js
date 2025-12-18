import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Image, User, Award, Check, X, PanelLeft, Timer, BarChart, Grid3x3, ExternalLink } from 'lucide-react';
import './EndlessQuiz.css';
import './EndlessQuiz-mobile.css';

// Simplified ELO calculation - fixed difficulty at 1500, simpler scoring
function calculateElo(currentElo, isCorrect) {
    const K = 32; // Fixed K-factor for simplicity
    const baseElo = 1500; // Base difficulty
    const expectedScore = 1 / (1 + Math.pow(10, (baseElo - currentElo) / 400));
    const actualScore = isCorrect ? 1 : 0;
    const change = Math.round(K * (actualScore - expectedScore));
    return currentElo + change;
}

function getEloRank(elo) {
    if (elo >= 2400) return 'Legendary';
    if (elo >= 2200) return 'Master';
    if (elo >= 2000) return 'Expert';
    if (elo >= 1800) return 'Advanced';
    if (elo >= 1600) return 'Intermediate';
    return 'Beginner';
}

function preloadImage(src) {
    return new Promise((resolve) => {
        const img = new window.Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

// Memoize person item to prevent re-renders
const PersonOption = React.memo(({ person, index, isSelected, isCorrect, isAnswered, onSelect }) => {
    const cls = useMemo(() => {
        let c = 'opt';
        if (isAnswered) {
            if (isCorrect) c += ' correct';
            else if (isSelected) c += ' wrong';
            else c += ' dim';
        }
        return c;
    }, [isAnswered, isCorrect, isSelected]);

    return (
        <button className={cls} onClick={onSelect} disabled={isAnswered}>
            <span className="letter">{String.fromCharCode(65 + index)}</span>
            <span>{person.name}</span>
            {isAnswered && isCorrect && <Check size={16} />}
            {isAnswered && isSelected && !isCorrect && <X size={16} />}
        </button>
    );
}, (prevProps, nextProps) => {
    return prevProps.person.wikidataUrl === nextProps.person.wikidataUrl &&
        prevProps.isSelected === nextProps.isSelected &&
        prevProps.isCorrect === nextProps.isCorrect &&
        prevProps.isAnswered === nextProps.isAnswered;
});

const ImageOption = React.memo(({ person, index, isSelected, isCorrect, isAnswered, onSelect }) => {
    const cls = useMemo(() => {
        let c = 'img-opt';
        if (isAnswered) {
            if (isCorrect) c += ' correct';
            else if (isSelected) c += ' wrong';
            else c += ' dim';
        }
        return c;
    }, [isAnswered, isCorrect, isSelected]);

    return (
        <button className={cls} onClick={onSelect} disabled={isAnswered}>
            <img
                src={person.image}
                alt=""
                loading={index < 2 ? "eager" : "lazy"}
                decoding="async"
                width="150"
                height="200"
                fetchpriority={index < 2 ? "high" : "low"}
            />
            <span className="letter">{String.fromCharCode(65 + index)}</span>
            {isAnswered && isCorrect && <Check size={24} className="result" />}
            {isAnswered && isSelected && !isCorrect && <X size={24} className="result" />}
        </button>
    );
}, (prevProps, nextProps) => {
    return prevProps.person.wikidataUrl === nextProps.person.wikidataUrl &&
        prevProps.isSelected === nextProps.isSelected &&
        prevProps.isCorrect === nextProps.isCorrect &&
        prevProps.isAnswered === nextProps.isAnswered;
});

function EndlessQuiz({ allPeopleData, onNavigateToStatistics, onNavigateToGallery }) {
    const [allPeople, setAllPeople] = useState([]);
    const [filteredPeople, setFilteredPeople] = useState([]);
    const [selectedCountry, setSelectedCountry] = useState('all');
    const [gameMode, setGameMode] = useState('image-to-name');
    const [questionQueue, setQuestionQueue] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [elo, setElo] = useState(1500);
    const [streak, setStreak] = useState(0);
    const [totalAnswered, setTotalAnswered] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [showCountryFilter, setShowCountryFilter] = useState(false);
    const [preloadedImages, setPreloadedImages] = useState(new Set());
    const [autoAdvanceDelay, setAutoAdvanceDelay] = useState(2);
    const [showHint, setShowHint] = useState(false);

    // Flatten people data once on mount
    useEffect(() => {
        const flattened = [];
        allPeopleData.forEach(countryData => {
            countryData.people.forEach(person => {
                flattened.push({
                    ...person,
                    country: countryData.country,
                    difficulty: person.sitelinks
                });
            });
        });
        setAllPeople(flattened);
        setFilteredPeople(flattened);
    }, [allPeopleData]);

    // Filter people by country and reset quiz state
    useEffect(() => {
        if (selectedCountry === 'all') {
            setFilteredPeople(allPeople);
        } else {
            setFilteredPeople(allPeople.filter(p => p.country === selectedCountry));
        }
        // Reset quiz state when country changes
        setQuestionQueue([]);
        setCurrentQuestion(null);
        setSelectedAnswer(null);
        setIsAnswered(false);
        setElo(1500);
        setStreak(0);
        setTotalAnswered(0);
        setCorrectCount(0);
        setShowHint(false);
    }, [selectedCountry, allPeople]);

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

    // Memoize question generation to reduce re-computation
    const generateQuestion = useCallback(() => {
        if (filteredPeople.length < 4) return null;
        const correctPerson = filteredPeople[Math.floor(Math.random() * filteredPeople.length)];
        const wrongPeople = [];
        while (wrongPeople.length < 3) {
            const randomPerson = filteredPeople[Math.floor(Math.random() * filteredPeople.length)];
            if (randomPerson.wikidataUrl !== correctPerson.wikidataUrl &&
                !wrongPeople.find(p => p.wikidataUrl === randomPerson.wikidataUrl)) {
                wrongPeople.push(randomPerson);
            }
        }
        const allOptions = [correctPerson, ...wrongPeople];
        const shuffled = allOptions.sort(() => Math.random() - 0.5);
        return { correct: correctPerson, options: shuffled };
    }, [filteredPeople]);

    const preloadQuestionImages = useCallback(async (question, priority = false) => {
        if (!question) return;

        // Only preload if priority (current question) or if we have bandwidth
        const imagesToLoad = question.options
            .map(p => p.image)
            .filter(img => img && !preloadedImages.has(img));

        if (imagesToLoad.length === 0) return;

        // For name-to-image mode, only preload current question (priority)
        // This reduces initial load time since we're loading 4 images per question
        if (gameMode === 'name-to-image' && !priority) {
            return; // Skip preloading for queued questions in name-to-image mode
        }

        // Load images - don't await, let them load in background
        const promises = imagesToLoad.map(src => preloadImage(src));

        Promise.all(promises).then(() => {
            setPreloadedImages(prev => {
                const next = new Set(prev);
                imagesToLoad.forEach(img => next.add(img));
                return next;
            });
        });
    }, [preloadedImages, gameMode]);

    // Fill question queue
    useEffect(() => {
        if (filteredPeople.length < 4) return;

        const fillQueue = async () => {
            const newQueue = [];
            // Reduce queue size from 5 to 2 for name-to-image mode (less images to preload)
            const queueSize = gameMode === 'name-to-image' ? 2 : 3;
            for (let i = 0; i < queueSize; i++) {
                const q = generateQuestion();
                if (q) {
                    // Only preload if not name-to-image mode (those load on-demand)
                    if (gameMode !== 'name-to-image') {
                        await preloadQuestionImages(q, false);
                    }
                    newQueue.push(q);
                }
            }
            setQuestionQueue(newQueue);
        };

        if (questionQueue.length === 0) {
            fillQueue();
        }
    }, [filteredPeople, questionQueue.length, generateQuestion, preloadQuestionImages, gameMode]);

    useEffect(() => {
        if (!currentQuestion && questionQueue.length > 0) {
            setCurrentQuestion(questionQueue[0]);
        }
    }, [questionQueue, currentQuestion]);

    // Preload current question images when it changes (especially for name-to-image mode)
    useEffect(() => {
        if (currentQuestion && gameMode === 'name-to-image') {
            preloadQuestionImages(currentQuestion, true); // Priority preload
        }
    }, [currentQuestion, gameMode, preloadQuestionImages]);

    const handleNext = useCallback(async () => {
        // Use requestAnimationFrame for smooth transitions
        requestAnimationFrame(async () => {
            const remainingQueue = questionQueue.slice(1);
            const newQuestion = generateQuestion();
            if (newQuestion) {
                // Only preload if not name-to-image mode
                if (gameMode !== 'name-to-image') {
                    await preloadQuestionImages(newQuestion, false);
                }
                setQuestionQueue([...remainingQueue, newQuestion]);
            } else {
                setQuestionQueue(remainingQueue);
            }
            if (remainingQueue.length > 0) {
                setCurrentQuestion(remainingQueue[0]);
            }
            setSelectedAnswer(null);
            setIsAnswered(false);
            setShowHint(false);
        });
    }, [questionQueue, generateQuestion, preloadQuestionImages, gameMode]);

    const handleAnswerSelect = useCallback((person) => {
        if (isAnswered) return;

        // Use requestAnimationFrame for smooth state updates
        requestAnimationFrame(() => {
            setSelectedAnswer(person);
            setIsAnswered(true);
            setTotalAnswered(prev => prev + 1);

            const isCorrect = person.wikidataUrl === currentQuestion.correct.wikidataUrl;
            if (isCorrect) {
                setCorrectCount(prev => prev + 1);
                setStreak(prev => prev + 1);
            } else {
                setStreak(0);
            }

            const newElo = calculateElo(elo, isCorrect);
            setElo(newElo);
        });
    }, [isAnswered, currentQuestion, elo]);

    // Handle auto-advance with proper cleanup
    useEffect(() => {
        if (!isAnswered || !selectedAnswer) return;

        const timeoutId = setTimeout(() => {
            requestAnimationFrame(() => {
                handleNext();
            });
        }, autoAdvanceDelay * 1000);

        return () => clearTimeout(timeoutId);
    }, [isAnswered, selectedAnswer, autoAdvanceDelay, handleNext]);

    // Save stats to localStorage whenever they change
    useEffect(() => {
        const saved = localStorage.getItem('quizStats');
        let bestStreak = 0;
        let bestElo = 1500;

        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                bestStreak = parsed.bestStreak || 0;
                bestElo = parsed.bestElo || 1500;
            } catch (e) {
                // Ignore parse errors
            }
        }

        const stats = {
            totalAnswered,
            correctCount,
            streak,
            bestStreak: Math.max(streak, bestStreak),
            elo,
            bestElo: Math.max(elo, bestElo),
        };
        localStorage.setItem('quizStats', JSON.stringify(stats));
    }, [totalAnswered, correctCount, streak, elo]);

    const toggleGameMode = useCallback((e) => {
        const newMode = e.target.value;
        setGameMode(newMode);
        setCurrentQuestion(null);
        setQuestionQueue([]);
        setSelectedAnswer(null);
        setIsAnswered(false);
    }, []);

    const cycleDelay = useCallback(() => {
        setAutoAdvanceDelay(prev => prev === 5 ? 1 : prev + 1);
    }, []);

    // Memoize expensive computations
    const rank = useMemo(() => getEloRank(elo), [elo]);
    const accuracy = useMemo(() =>
        totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0,
        [correctCount, totalAnswered]
    );
    const countries = useMemo(() =>
        [...new Set(allPeople.map(p => p.country))].sort(),
        [allPeople]
    );

    // Find country data for flag (memoized)
    const countryData = useMemo(() =>
        currentQuestion ? allPeopleData.find(c => c.country === currentQuestion.correct.country) : null,
        [currentQuestion, allPeopleData]
    );

    const selectedCountryData = useMemo(() =>
        selectedCountry !== 'all' ? allPeopleData.find(c => c.country === selectedCountry) : null,
        [selectedCountry, allPeopleData]
    );

    return (
        <div className="quiz-container">
            <header className={`header ${showCountryFilter ? 'sidebar-open' : ''}`}>
                <button className="logo-button" onClick={() => window.location.reload()}>
                    <h1>Famous Nationals</h1>
                </button>
                <div className="stats-capsule">
                    {selectedCountry !== 'all' && (
                        <>
                            {selectedCountryData?.flag && (
                                <img src={selectedCountryData.flag} alt="" className="country-flag-mini" />
                            )}
                            <span className="country-badge">{selectedCountry}</span>
                            <span className="capsule-divider"></span>
                        </>
                    )}
                    <span className="stat-item">{elo}</span>
                    <span className="stat-item rank">{rank}</span>
                    <span className="capsule-divider"></span>
                    <Award size={16} className="stat-icon" />
                    <span className="stat-item">{streak}</span>
                    <span className="capsule-divider"></span>
                    <span className="stat-item">{accuracy}%</span>
                    <span className="capsule-divider"></span>
                    <span className="stat-item count">#{totalAnswered + 1}</span>
                </div>

                <div className="action-capsule">
                    <div className="control-group">
                        {onNavigateToGallery && (
                            <button
                                onClick={onNavigateToGallery}
                                className="action-button"
                                title="View Gallery"
                            >
                                <Grid3x3 size={16} />
                            </button>
                        )}
                        {onNavigateToStatistics && (
                            <button
                                onClick={onNavigateToStatistics}
                                className="action-button"
                                title="View Statistics"
                            >
                                <BarChart size={16} />
                            </button>
                        )}
                    </div>

                    <div className="mode-capsule">
                        <button
                            className={`mode-btn ${gameMode === 'image-to-name' ? 'active' : ''}`}
                            onClick={() => gameMode !== 'image-to-name' && toggleGameMode()}
                            title="Image to Name"
                        >
                            <Image size={16} />
                        </button>
                        <button
                            className={`mode-btn ${gameMode === 'name-to-image' ? 'active' : ''}`}
                            onClick={() => gameMode !== 'name-to-image' && toggleGameMode()}
                            title="Name to Image"
                        >
                            <User size={16} />
                        </button>
                        <div className="mode-glaze"></div>
                    </div>

                    <div className="control-group">
                        <button onClick={cycleDelay} className="action-button delay-btn" title={`Delay: ${autoAdvanceDelay}s`}>
                            <Timer size={16} />
                            <span className="btn-label">{autoAdvanceDelay}s</span>
                        </button>
                        <button onClick={() => setShowCountryFilter(!showCountryFilter)} className="action-button filter-btn">
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
                    <h3>Select Country</h3>
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

            <main className={`content ${showCountryFilter ? 'sidebar-open' : ''}`}>
                {!currentQuestion ? (
                    <div className="loading">
                        <div className="spinner"></div>
                        <p>Loading...</p>
                    </div>
                ) : (
                    gameMode === 'image-to-name' ? (
                        <div className="split">
                            <div className="img-box">
                                <img
                                    src={currentQuestion.correct.image}
                                    alt=""
                                    loading="eager"
                                    decoding="async"
                                    width="400"
                                    height="533"
                                    fetchpriority="high"
                                />
                            </div>
                            <div className="opts-column">
                                <div className="opts">
                                    {currentQuestion.options.map((person, i) => (
                                        <PersonOption
                                            key={person.wikidataUrl}
                                            person={person}
                                            index={i}
                                            isSelected={selectedAnswer?.wikidataUrl === person.wikidataUrl}
                                            isCorrect={person.wikidataUrl === currentQuestion.correct.wikidataUrl}
                                            isAnswered={isAnswered}
                                            onSelect={() => handleAnswerSelect(person)}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="quiz-side-panel">
                                <div className="hint-container-always">
                                    {!isAnswered && (
                                        <button
                                            className={`hint-toggle-btn ${showHint ? 'active' : ''}`}
                                            onClick={() => setShowHint(!showHint)}
                                        >
                                            <Grid3x3 size={14} />
                                            <span>{showHint ? 'Hide Hint' : 'Show Hint'}</span>
                                        </button>
                                    )}
                                </div>
                                {(isAnswered || showHint) ? (
                                    <div className="feedback-popup sticky">
                                        <div className="feedback-content">
                                            {isAnswered ? (
                                                selectedAnswer.wikidataUrl === currentQuestion.correct.wikidataUrl ? (
                                                    <div className="feedback-correct">
                                                        <Check size={32} />
                                                        <h3>Correct!</h3>
                                                        {currentQuestion.correct.wikipediaUrl ? (
                                                            <a href={currentQuestion.correct.wikipediaUrl} target="_blank" rel="noopener noreferrer" className="feedback-name-link">
                                                                <div className="feedback-name">{currentQuestion.correct.name}</div>
                                                            </a>
                                                        ) : (
                                                            <div className="feedback-name">{currentQuestion.correct.name}</div>
                                                        )}
                                                        <div className="feedback-elo">+{calculateElo(elo, true) - elo} ELO</div>
                                                    </div>
                                                ) : (
                                                    <div className="feedback-wrong">
                                                        <X size={32} />
                                                        <h3>Incorrect</h3>
                                                        <div className="feedback-wrong-answer">
                                                            <span className="label">You selected:</span>
                                                            <div className="feedback-name wrong-name">{selectedAnswer.name}</div>
                                                        </div>
                                                        <div className="feedback-correct-answer">
                                                            <span className="label">Correct answer:</span>
                                                            {currentQuestion.correct.wikipediaUrl ? (
                                                                <a href={currentQuestion.correct.wikipediaUrl} target="_blank" rel="noopener noreferrer" className="feedback-name-link">
                                                                    <div className="feedback-name correct-name">{currentQuestion.correct.name}</div>
                                                                </a>
                                                            ) : (
                                                                <div className="feedback-name correct-name">{currentQuestion.correct.name}</div>
                                                            )}
                                                        </div>
                                                        <div className="feedback-elo">-{Math.abs(calculateElo(elo, false) - elo)} ELO</div>
                                                    </div>
                                                )
                                            ) : (
                                                <div className="feedback-hint">
                                                    <h3>Hint</h3>
                                                    <div className="feedback-name">???</div>
                                                </div>
                                            )}

                                            <div className="feedback-details">
                                                {currentQuestion.correct.occupation && (
                                                    <div className="detail-item">
                                                        <strong>{currentQuestion.correct.occupation}</strong>
                                                    </div>
                                                )}
                                                {currentQuestion.correct.description && (
                                                    <div className="detail-item desc">{currentQuestion.correct.description}</div>
                                                )}
                                                {(currentQuestion.correct.birthYear || currentQuestion.correct.deathYear) && (
                                                    <div className="detail-item">
                                                        {currentQuestion.correct.birthYear || '?'} – {currentQuestion.correct.deathYear || ''}
                                                    </div>
                                                )}
                                                <div className="country-flag-large">
                                                    {countryData?.flag && (
                                                        <img
                                                            src={countryData.flag}
                                                            alt=""
                                                            className="flag-large"
                                                            loading="lazy"
                                                            decoding="async"
                                                        />
                                                    )}
                                                    <span className="country-name-large">{currentQuestion.correct.country}</span>
                                                </div>
                                                {isAnswered && currentQuestion.correct.wikipediaUrl && (
                                                    <a
                                                        href={currentQuestion.correct.wikipediaUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="wikipedia-link"
                                                    >
                                                        <ExternalLink size={16} />
                                                        <span>Read on Wikipedia</span>
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="feedback-placeholder">
                                        <div className="placeholder-text">Feedback and hints will appear here</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="name-top">
                            <h2>{currentQuestion.correct.name}</h2>
                            <div className="imgs-wrapper">
                                <div className="imgs">
                                    {currentQuestion.options.map((person, i) => (
                                        <ImageOption
                                            key={person.wikidataUrl}
                                            person={person}
                                            index={i}
                                            isSelected={selectedAnswer?.wikidataUrl === person.wikidataUrl}
                                            isCorrect={person.wikidataUrl === currentQuestion.correct.wikidataUrl}
                                            isAnswered={isAnswered}
                                            onSelect={() => handleAnswerSelect(person)}
                                        />
                                    ))}
                                </div>

                                <div className="quiz-side-panel">
                                    <div className="hint-container-always">
                                        {!isAnswered && (
                                            <button
                                                className={`hint-toggle-btn ${showHint ? 'active' : ''}`}
                                                onClick={() => setShowHint(!showHint)}
                                            >
                                                <Grid3x3 size={14} />
                                                <span>{showHint ? 'Hide Hint' : 'Show Hint'}</span>
                                            </button>
                                        )}
                                    </div>
                                    {(isAnswered || showHint) ? (
                                        <div className="feedback-popup sticky">
                                            <div className="feedback-content">
                                                {isAnswered ? (
                                                    selectedAnswer.wikidataUrl === currentQuestion.correct.wikidataUrl ? (
                                                        <div className="feedback-correct">
                                                            <Check size={32} />
                                                            <h3>Correct!</h3>
                                                            {currentQuestion.correct.wikipediaUrl ? (
                                                                <a href={currentQuestion.correct.wikipediaUrl} target="_blank" rel="noopener noreferrer" className="feedback-name-link">
                                                                    <div className="feedback-name">{currentQuestion.correct.name}</div>
                                                                </a>
                                                            ) : (
                                                                <div className="feedback-name">{currentQuestion.correct.name}</div>
                                                            )}
                                                            <div className="feedback-elo">+{calculateElo(elo, true) - elo} ELO</div>
                                                        </div>
                                                    ) : (
                                                        <div className="feedback-wrong">
                                                            <X size={32} />
                                                            <h3>Incorrect</h3>
                                                            <div className="feedback-wrong-answer">
                                                                <span className="label">You selected:</span>
                                                                <div className="feedback-name wrong-name">{selectedAnswer.name}</div>
                                                            </div>
                                                            <div className="feedback-correct-answer">
                                                                <span className="label">Correct answer:</span>
                                                                {currentQuestion.correct.wikipediaUrl ? (
                                                                    <a href={currentQuestion.correct.wikipediaUrl} target="_blank" rel="noopener noreferrer" className="feedback-name-link">
                                                                        <div className="feedback-name correct-name">{currentQuestion.correct.name}</div>
                                                                    </a>
                                                                ) : (
                                                                    <div className="feedback-name correct-name">{currentQuestion.correct.name}</div>
                                                                )}
                                                            </div>
                                                            <div className="feedback-elo">-{Math.abs(calculateElo(elo, false) - elo)} ELO</div>
                                                        </div>
                                                    )
                                                ) : (
                                                    <div className="feedback-hint">
                                                        <h3>Hint</h3>
                                                        <div className="feedback-name">???</div>
                                                    </div>
                                                )}

                                                <div className="feedback-details">
                                                    {currentQuestion.correct.occupation && (
                                                        <div className="detail-item">
                                                            <strong>{currentQuestion.correct.occupation}</strong>
                                                        </div>
                                                    )}
                                                    {currentQuestion.correct.description && (
                                                        <div className="detail-item desc">{currentQuestion.correct.description}</div>
                                                    )}
                                                    {(currentQuestion.correct.birthYear || currentQuestion.correct.deathYear) && (
                                                        <div className="detail-item">
                                                            {currentQuestion.correct.birthYear || '?'} – {currentQuestion.correct.deathYear || ''}
                                                        </div>
                                                    )}
                                                    <div className="country-flag-large">
                                                        {countryData?.flag && (
                                                            <img
                                                                src={countryData.flag}
                                                                alt=""
                                                                className="flag-large"
                                                                loading="lazy"
                                                                decoding="async"
                                                            />
                                                        )}
                                                        <span className="country-name-large">{currentQuestion.correct.country}</span>
                                                    </div>
                                                    {isAnswered && currentQuestion.correct.wikipediaUrl && (
                                                        <a
                                                            href={currentQuestion.correct.wikipediaUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="wikipedia-link"
                                                        >
                                                            <ExternalLink size={16} />
                                                            <span>Read on Wikipedia</span>
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="feedback-placeholder">
                                            <div className="placeholder-text">Feedback and hints will appear here</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                )}
            </main>
        </div>
    );
}

export default React.memo(EndlessQuiz);
