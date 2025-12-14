import React, { useState, useEffect } from 'react';
import { Image, User, Award, Check, X, Filter, Timer } from 'lucide-react';
import './EndlessQuiz.css';

function calculateElo(currentElo, isCorrect, questionDifficulty = 1500) {
    const K = 32;
    const expectedScore = 1 / (1 + Math.pow(10, (questionDifficulty - currentElo) / 400));
    const actualScore = isCorrect ? 1 : 0;
    return Math.round(currentElo + K * (actualScore - expectedScore));
}

function getEloRank(elo) {
    if (elo >= 2400) return { title: 'Legendary', color: '#0066FF' };
    if (elo >= 2200) return { title: 'Master', color: '#0066FF' };
    if (elo >= 2000) return { title: 'Expert', color: '#0066FF' };
    if (elo >= 1800) return { title: 'Advanced', color: '#0066FF' };
    if (elo >= 1600) return { title: 'Intermediate', color: '#666' };
    return { title: 'Beginner', color: '#999' };
}

function preloadImage(src) {
    return new Promise((resolve) => {
        const img = new window.Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

function EndlessQuiz({ allPeopleData }) {
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
    const [autoAdvanceDelay, setAutoAdvanceDelay] = useState(2); // seconds

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

    useEffect(() => {
        if (selectedCountry === 'all') {
            setFilteredPeople(allPeople);
        } else {
            setFilteredPeople(allPeople.filter(p => p.country === selectedCountry));
        }
        setQuestionQueue([]);
    }, [selectedCountry, allPeople]);

    const generateQuestion = () => {
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
    };

    const preloadQuestionImages = async (question) => {
        const imagesToLoad = question.options
            .map(p => p.image)
            .filter(img => img && !preloadedImages.has(img));
        const promises = imagesToLoad.map(src => preloadImage(src));
        await Promise.all(promises);
        setPreloadedImages(prev => {
            const next = new Set(prev);
            imagesToLoad.forEach(img => next.add(img));
            return next;
        });
    };

    useEffect(() => {
        if (filteredPeople.length < 4) return;
        const fillQueue = async () => {
            const newQueue = [];
            for (let i = 0; i < 5; i++) {
                const q = generateQuestion();
                if (q) {
                    await preloadQuestionImages(q);
                    newQueue.push(q);
                }
            }
            setQuestionQueue(newQueue);
        };
        if (questionQueue.length === 0) {
            fillQueue();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filteredPeople, questionQueue]);

    useEffect(() => {
        if (!currentQuestion && questionQueue.length > 0) {
            setCurrentQuestion(questionQueue[0]);
        }
    }, [questionQueue, currentQuestion]);

    const handleNext = async () => {
        const remainingQueue = questionQueue.slice(1);
        const newQuestion = generateQuestion();
        if (newQuestion) {
            await preloadQuestionImages(newQuestion);
            setQuestionQueue([...remainingQueue, newQuestion]);
        } else {
            setQuestionQueue(remainingQueue);
        }
        if (remainingQueue.length > 0) {
            setCurrentQuestion(remainingQueue[0]);
        }
        setSelectedAnswer(null);
        setIsAnswered(false);
    };

    const handleAnswerSelect = (person) => {
        if (isAnswered) return;
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
        const newElo = calculateElo(elo, isCorrect, currentQuestion.correct.difficulty);
        setElo(newElo);

        // Auto-advance based on delay setting
        if (autoAdvanceDelay > 0) {
            setTimeout(() => {
                handleNext();
            }, autoAdvanceDelay * 1000);
        }
    };

    const toggleGameMode = () => {
        setGameMode(prev => prev === 'image-to-name' ? 'name-to-image' : 'image-to-name');
        setCurrentQuestion(null);
        setQuestionQueue([]);
        setSelectedAnswer(null);
        setIsAnswered(false);
    };

    const cycleDelay = () => {
        setAutoAdvanceDelay(prev => (prev + 1) % 6); // 0-5 seconds
    };

    if (!currentQuestion) {
        return (
            <div className="quiz-container">
                <div className="loading-screen">
                    <div className="modern-spinner"></div>
                    <p>Loading Quiz...</p>
                </div>
            </div>
        );
    }

    const rank = getEloRank(elo);
    const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
    const countries = [...new Set(allPeople.map(p => p.country))].sort();

    return (
        <div className="quiz-container">
            <header className="quiz-header">
                <div className="header-left">
                    <div className="stat">
                        <span className="stat-value" style={{ color: rank.color }}>{elo}</span>
                        <span className="stat-label">{rank.title}</span>
                    </div>
                    <div className="stat">
                        <Award size={16} />
                        <span className="stat-value">{streak}</span>
                    </div>
                    <div className="stat">
                        <span className="stat-value">{accuracy}%</span>
                    </div>
                    <div className="stat question-number">
                        #{totalAnswered + 1}
                    </div>
                </div>

                <div className="header-right">
                    <button className={`control-btn ${gameMode === 'image-to-name' ? 'active' : ''}`} onClick={toggleGameMode} title="Image → Names">
                        <Image size={18} />
                    </button>
                    <button className={`control-btn ${gameMode === 'name-to-image' ? 'active' : ''}`} onClick={toggleGameMode} title="Name → Images">
                        <User size={18} />
                    </button>

                    <button className="control-btn" onClick={cycleDelay} title={`Auto-advance: ${autoAdvanceDelay}s`}>
                        <Timer size={18} />
                        <span className="delay-badge">{autoAdvanceDelay}s</span>
                    </button>

                    <div className="filter-container">
                        <button className="control-btn" onClick={() => setShowCountryFilter(!showCountryFilter)}>
                            <Filter size={18} />
                        </button>
                        {showCountryFilter && (
                            <div className="country-menu">
                                <button className={selectedCountry === 'all' ? 'active' : ''} onClick={() => { setSelectedCountry('all'); setShowCountryFilter(false); }}>
                                    All Countries ({allPeople.length})
                                </button>
                                {countries.map(country => (
                                    <button key={country} className={selectedCountry === country ? 'active' : ''} onClick={() => { setSelectedCountry(country); setShowCountryFilter(false); }}>
                                        {country} ({allPeople.filter(p => p.country === country).length})
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="quiz-content">
                {gameMode === 'image-to-name' ? (
                    <div className="layout-split">
                        <div className="image-section">
                            <img src={currentQuestion.correct.image} alt="Who?" />
                        </div>

                        <div className="options-section">
                            {currentQuestion.options.map((person, index) => {
                                const isSelected = selectedAnswer?.wikidataUrl === person.wikidataUrl;
                                const isCorrect = person.wikidataUrl === currentQuestion.correct.wikidataUrl;
                                let className = 'option';
                                if (isAnswered) {
                                    if (isCorrect) className += ' correct';
                                    else if (isSelected) className += ' incorrect';
                                    else className += ' dimmed';
                                }
                                return (
                                    <button key={person.wikidataUrl} className={className} onClick={() => handleAnswerSelect(person)} disabled={isAnswered}>
                                        <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                                        <span className="option-name">{person.name}</span>
                                        {isAnswered && isCorrect && <Check size={20} />}
                                        {isAnswered && isSelected && !isCorrect && <X size={20} />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="layout-name-top">
                        <h2 className="name-question">{currentQuestion.correct.name}</h2>
                        <div className="images-grid">
                            {currentQuestion.options.map((person, index) => {
                                const isSelected = selectedAnswer?.wikidataUrl === person.wikidataUrl;
                                const isCorrect = person.wikidataUrl === currentQuestion.correct.wikidataUrl;
                                let className = 'image-option';
                                if (isAnswered) {
                                    if (isCorrect) className += ' correct';
                                    else if (isSelected) className += ' incorrect';
                                    else className += ' dimmed';
                                }
                                return (
                                    <button key={person.wikidataUrl} className={className} onClick={() => handleAnswerSelect(person)} disabled={isAnswered}>
                                        <img src={person.image} alt={`Option ${index + 1}`} />
                                        <span className="img-letter">{String.fromCharCode(65 + index)}</span>
                                        {isAnswered && isCorrect && <Check size={32} className="result-check" />}
                                        {isAnswered && isSelected && !isCorrect && <X size={32} className="result-x" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {isAnswered && (
                    <div className="answer-info">
                        <div className={`info-pill ${selectedAnswer.wikidataUrl === currentQuestion.correct.wikidataUrl ? 'correct' : 'incorrect'}`}>
                            <div className="pill-header">
                                {selectedAnswer.wikidataUrl === currentQuestion.correct.wikidataUrl ? (
                                    <>
                                        <Check size={20} />
                                        <span>Correct! +{calculateElo(elo, true, currentQuestion.correct.difficulty) - elo}</span>
                                    </>
                                ) : (
                                    <>
                                        <X size={20} />
                                        <span>{currentQuestion.correct.name}</span>
                                    </>
                                )}
                            </div>

                            <div className="pill-details">
                                {currentQuestion.correct.occupation && <p><strong>Occupation:</strong> {currentQuestion.correct.occupation}</p>}
                                {currentQuestion.correct.description && <p className="description">{currentQuestion.correct.description}</p>}
                                {(currentQuestion.correct.birthYear || currentQuestion.correct.deathYear) && (
                                    <p><strong>Years:</strong> {currentQuestion.correct.birthYear || '?'} – {currentQuestion.correct.deathYear || 'present'}</p>
                                )}
                                <p><strong>Country:</strong> {currentQuestion.correct.country}</p>
                                <p className="sitelinks">{currentQuestion.correct.sitelinks} Wikipedia articles</p>
                            </div>

                            {autoAdvanceDelay === 0 && (
                                <button className="next-btn" onClick={handleNext}>Next Question →</button>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

export default EndlessQuiz;
