import React, { useState, useEffect } from 'react';
import { Image, User, TrendingUp, Award, Check, X, Filter } from 'lucide-react';
import './EndlessQuiz.css';

function calculateElo(currentElo, isCorrect, questionDifficulty = 1500) {
    const K = 32;
    const expectedScore = 1 / (1 + Math.pow(10, (questionDifficulty - currentElo) / 400));
    const actualScore = isCorrect ? 1 : 0;
    const newElo = Math.round(currentElo + K * (actualScore - expectedScore));
    return newElo;
}

function getEloRank(elo) {
    if (elo >= 2400) return { title: 'Legendary', color: '#FFD700' };
    if (elo >= 2200) return { title: 'Master', color: '#C0C0C0' };
    if (elo >= 2000) return { title: 'Expert', color: '#CD7F32' };
    if (elo >= 1800) return { title: 'Advanced', color: '#4A90E2' };
    if (elo >= 1600) return { title: 'Intermediate', color: '#50C878' };
    if (elo >= 1400) return { title: 'Beginner', color: '#9B9B9B' };
    return { title: 'Novice', color: '#6C757D' };
}

function preloadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
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
        const promises = imagesToLoad.map(src => preloadImage(src).catch(() => null));
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

        // Auto-advance after 2.5 seconds
        setTimeout(() => {
            handleNext();
        }, 2500);
    };

    const toggleGameMode = () => {
        setGameMode(prev => prev === 'image-to-name' ? 'name-to-image' : 'image-to-name');
        setCurrentQuestion(null);
        setQuestionQueue([]);
        setSelectedAnswer(null);
        setIsAnswered(false);
    };

    if (!currentQuestion) {
        return (
            <div className="app-container">
                <div className="loading">
                    <div className="spinner"></div>
                    <p className="text-secondary">Loading...</p>
                </div>
            </div>
        );
    }

    const rank = getEloRank(elo);
    const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
    const countries = [...new Set(allPeople.map(p => p.country))];

    return (
        <div className="quiz-container">
            <div className="quiz-header-minimal">
                <div className="stats-minimal"  >
                    <div className="stat-item">
                        <TrendingUp size={14} />
                        <span style={{ color: rank.color }}>{elo}</span>
                    </div>
                    <div className="stat-item">
                        <Award size={14} />
                        <span>{streak}</span>
                    </div>
                    <div className="stat-item">
                        <span>{accuracy}%</span>
                    </div>
                    <div className="stat-item question-num">
                        #{totalAnswered + 1}
                    </div>
                </div>
                <div className="controls-minimal">
                    <button className={`mode-btn ${gameMode === 'image-to-name' ? 'active' : ''}`} onClick={toggleGameMode}>
                        <Image size={16} />
                    </button>
                    <button className={`mode-btn ${gameMode === 'name-to-image' ? 'active' : ''}`} onClick={toggleGameMode}>
                        <User size={16} />
                    </button>
                    <div className="filter-wrapper">
                        <button className="filter-btn" onClick={() => setShowCountryFilter(!showCountryFilter)}>
                            <Filter size={16} />
                        </button>
                        {showCountryFilter && (
                            <div className="dropdown">
                                <button className={selectedCountry === 'all' ? 'active' : ''} onClick={() => { setSelectedCountry('all'); setShowCountryFilter(false); }}>All</button>
                                {countries.sort().map(country => (
                                    <button key={country} className={selectedCountry === country ? 'active' : ''} onClick={() => { setSelectedCountry(country); setShowCountryFilter(false); }}>{country}</button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="quiz-main">
                {gameMode === 'image-to-name' ? (
                    <div className="layout-horizontal">
                        <div className="image-large">
                            <img src={currentQuestion.correct.image} alt="Who is this?" />
                        </div>
                        <div className="options-vertical">
                            {currentQuestion.options.map((person, index) => {
                                const isSelected = selectedAnswer?.wikidataUrl === person.wikidataUrl;
                                const isCorrect = person.wikidataUrl === currentQuestion.correct.wikidataUrl;
                                let className = 'option-card';
                                if (isAnswered) {
                                    if (isCorrect) className += ' correct';
                                    else if (isSelected) className += ' incorrect';
                                    else className += ' dimmed';
                                }
                                return (
                                    <button key={person.wikidataUrl} className={className} onClick={() => handleAnswerSelect(person)} disabled={isAnswered}>
                                        <span className="letter">{String.fromCharCode(65 + index)}</span>
                                        <span className="name">{person.name}</span>
                                        {isAnswered && isCorrect && <Check size={18} />}
                                        {isAnswered && isSelected && !isCorrect && <X size={18} />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="layout-vertical">
                        <h2 className="name-prompt">{currentQuestion.correct.name}</h2>
                        <div className="images-horizontal">
                            {currentQuestion.options.map((person, index) => {
                                const isSelected = selectedAnswer?.wikidataUrl === person.wikidataUrl;
                                const isCorrect = person.wikidataUrl === currentQuestion.correct.wikidataUrl;
                                let className = 'image-card';
                                if (isAnswered) {
                                    if (isCorrect) className += ' correct';
                                    else if (isSelected) className += ' incorrect';
                                    else className += ' dimmed';
                                }
                                return (
                                    <button key={person.wikidataUrl} className={className} onClick={() => handleAnswerSelect(person)} disabled={isAnswered}>
                                        <img src={person.image} alt={`Option ${index + 1}`} />
                                        <span className="letter-overlay">{String.fromCharCode(65 + index)}</span>
                                        {isAnswered && isCorrect && <Check size={28} className="result-icon" />}
                                        {isAnswered && isSelected && !isCorrect && <X size={28} className="result-icon" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {isAnswered && (
                    <div className="info-bar">
                        {selectedAnswer.wikidataUrl === currentQuestion.correct.wikidataUrl ? (
                            <div className="info-correct">
                                <Check size={16} />
                                <span>+{calculateElo(elo, true, currentQuestion.correct.difficulty) - elo}</span>
                            </div>
                        ) : (
                            <div className="info-incorrect">
                                <X size={16} />
                                <span>{currentQuestion.correct.name}</span>
                            </div>
                        )}
                        {currentQuestion.correct.occupation && <span className="info-detail">{currentQuestion.correct.occupation}</span>}
                        {(currentQuestion.correct.birthYear || currentQuestion.correct.deathYear) && (
                            <span className="info-detail">{currentQuestion.correct.birthYear || '?'}–{currentQuestion.correct.deathYear || ''}</span>
                        )}
                        <span className="info-detail country-badge">{currentQuestion.correct.country}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default EndlessQuiz;
