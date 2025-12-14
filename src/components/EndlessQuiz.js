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
    const [autoAdvanceDelay, setAutoAdvanceDelay] = useState(2);

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

        // ALWAYS auto-advance
        setTimeout(() => {
            handleNext();
        }, autoAdvanceDelay * 1000);
    };

    const toggleGameMode = () => {
        setGameMode(prev => prev === 'image-to-name' ? 'name-to-image' : 'image-to-name');
        setCurrentQuestion(null);
        setQuestionQueue([]);
        setSelectedAnswer(null);
        setIsAnswered(false);
    };

    const cycleDelay = () => {
        setAutoAdvanceDelay(prev => prev === 5 ? 1 : prev + 1); // 1-5 seconds only
    };

    if (!currentQuestion) {
        return (
            <div className="quiz-container">
                <div className="loading">
                    <div className="spinner"></div>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    const rank = getEloRank(elo);
    const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
    const countries = [...new Set(allPeople.map(p => p.country))].sort();

    return (
        <div className="quiz-container">
            <header className="header">
                <div className="stats">
                    <span>{elo}</span>
                    <span className="dim">{rank}</span>
                    <span className="dim">|</span>
                    <Award size={14} />
                    <span>{streak}</span>
                    <span className="dim">|</span>
                    <span>{accuracy}%</span>
                    <span className="dim">|</span>
                    <span className="dim">#{totalAnswered + 1}</span>
                </div>

                <div className="controls">
                    <button onClick={toggleGameMode} title="Image → Names">
                        <Image size={14} />
                    </button>
                    <button onClick={toggleGameMode} title="Name → Images">
                        <User size={14} />
                    </button>
                    <button onClick={cycleDelay} title={`Delay: ${autoAdvanceDelay}s`}>
                        <Timer size={14} />
                        <span>{autoAdvanceDelay}s</span>
                    </button>
                    <div className="filter-wrap">
                        <button onClick={() => setShowCountryFilter(!showCountryFilter)}>
                            <Filter size={14} />
                        </button>
                        {showCountryFilter && (
                            <div className="menu">
                                <button className={selectedCountry === 'all' ? 'active' : ''} onClick={() => { setSelectedCountry('all'); setShowCountryFilter(false); }}>
                                    All ({allPeople.length})
                                </button>
                                {countries.map(c => (
                                    <button key={c} className={selectedCountry === c ? 'active' : ''} onClick={() => { setSelectedCountry(c); setShowCountryFilter(false); }}>
                                        {c}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="content">
                {gameMode === 'image-to-name' ? (
                    <div className="split">
                        <div className="img-box">
                            <img src={currentQuestion.correct.image} alt="" />
                        </div>
                        <div className="opts">
                            {currentQuestion.options.map((person, i) => {
                                const isSelected = selectedAnswer?.wikidataUrl === person.wikidataUrl;
                                const isCorrect = person.wikidataUrl === currentQuestion.correct.wikidataUrl;
                                let cls = 'opt';
                                if (isAnswered) {
                                    if (isCorrect) cls += ' correct';
                                    else if (isSelected) cls += ' wrong';
                                    else cls += ' dim';
                                }
                                return (
                                    <button key={person.wikidataUrl} className={cls} onClick={() => handleAnswerSelect(person)} disabled={isAnswered}>
                                        <span className="letter">{String.fromCharCode(65 + i)}</span>
                                        <span>{person.name}</span>
                                        {isAnswered && isCorrect && <Check size={16} />}
                                        {isAnswered && isSelected && !isCorrect && <X size={16} />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="name-top">
                        <h2>{currentQuestion.correct.name}</h2>
                        <div className="imgs">
                            {currentQuestion.options.map((person, i) => {
                                const isSelected = selectedAnswer?.wikidataUrl === person.wikidataUrl;
                                const isCorrect = person.wikidataUrl === currentQuestion.correct.wikidataUrl;
                                let cls = 'img-opt';
                                if (isAnswered) {
                                    if (isCorrect) cls += ' correct';
                                    else if (isSelected) cls += ' wrong';
                                    else cls += ' dim';
                                }
                                return (
                                    <button key={person.wikidataUrl} className={cls} onClick={() => handleAnswerSelect(person)} disabled={isAnswered}>
                                        <img src={person.image} alt="" />
                                        <span className="letter">{String.fromCharCode(65 + i)}</span>
                                        {isAnswered && isCorrect && <Check size={24} className="result" />}
                                        {isAnswered && isSelected && !isCorrect && <X size={24} className="result" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {isAnswered && (
                    <div className="info">
                        <div className={selectedAnswer.wikidataUrl === currentQuestion.correct.wikidataUrl ? 'correct' : 'wrong'}>
                            {selectedAnswer.wikidataUrl === currentQuestion.correct.wikidataUrl ? (
                                <><Check size={16} /> Correct (+{calculateElo(elo, true, currentQuestion.correct.difficulty) - elo})</>
                            ) : (
                                <><X size={16} /> {currentQuestion.correct.name}</>
                            )}
                        </div>
                        <div className="details">
                            {currentQuestion.correct.occupation && <p>{currentQuestion.correct.occupation}</p>}
                            {currentQuestion.correct.description && <p className="desc">{currentQuestion.correct.description}</p>}
                            {(currentQuestion.correct.birthYear || currentQuestion.correct.deathYear) && (
                                <p>{currentQuestion.correct.birthYear || '?'} – {currentQuestion.correct.deathYear || ''}</p>
                            )}
                            <div className="country-flag">
                                {allPeopleData.find(c => c.country === currentQuestion.correct.country)?.flag && (
                                    <img
                                        src={allPeopleData.find(c => c.country === currentQuestion.correct.country).flag}
                                        alt=""
                                        className="flag"
                                    />
                                )}
                                <span>{currentQuestion.correct.country}</span>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

export default EndlessQuiz;
