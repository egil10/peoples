import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
                loading="lazy"
                decoding="async"
                width="200"
                height="267"
            />
            <span className="letter">{String.fromCharCode(65 + index)}</span>
            {isAnswered && isCorrect && <Check size={24} className="result" />}
            {isAnswered && isSelected && !isCorrect && <X size={24} className="result" />}
        </button>
    );
});

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

    // Filter people by country
    useEffect(() => {
        if (selectedCountry === 'all') {
            setFilteredPeople(allPeople);
        } else {
            setFilteredPeople(allPeople.filter(p => p.country === selectedCountry));
        }
        setQuestionQueue([]);
    }, [selectedCountry, allPeople]);

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

    const preloadQuestionImages = useCallback(async (question) => {
        const imagesToLoad = question.options
            .map(p => p.image)
            .filter(img => img && !preloadedImages.has(img));

        if (imagesToLoad.length === 0) return;

        const promises = imagesToLoad.map(src => preloadImage(src));
        await Promise.all(promises);

        setPreloadedImages(prev => {
            const next = new Set(prev);
            imagesToLoad.forEach(img => next.add(img));
            return next;
        });
    }, [preloadedImages]);

    // Fill question queue
    useEffect(() => {
        if (filteredPeople.length < 4) return;

        const fillQueue = async () => {
            const newQueue = [];
            // Reduce queue size from 5 to 3 for better performance
            for (let i = 0; i < 3; i++) {
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
    }, [filteredPeople, questionQueue.length, generateQuestion, preloadQuestionImages]);

    useEffect(() => {
        if (!currentQuestion && questionQueue.length > 0) {
            setCurrentQuestion(questionQueue[0]);
        }
    }, [questionQueue, currentQuestion]);

    const handleNext = useCallback(async () => {
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
    }, [questionQueue, generateQuestion, preloadQuestionImages]);

    const handleAnswerSelect = useCallback((person) => {
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

        // Use requestAnimationFrame for smooth auto-advance
        const timeoutId = setTimeout(() => {
            requestAnimationFrame(() => {
                handleNext();
            });
        }, autoAdvanceDelay * 1000);

        return () => clearTimeout(timeoutId);
    }, [isAnswered, currentQuestion, elo, autoAdvanceDelay, handleNext]);

    const toggleGameMode = useCallback(() => {
        setGameMode(prev => prev === 'image-to-name' ? 'name-to-image' : 'image-to-name');
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
                            <img
                                src={currentQuestion.correct.image}
                                alt=""
                                loading="eager"
                                decoding="async"
                                width="400"
                                height="533"
                            />
                        </div>
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
                                    {currentQuestion.correct.occupation && <p><strong>{currentQuestion.correct.occupation}</strong></p>}
                                    {currentQuestion.correct.description && <p className="desc">{currentQuestion.correct.description}</p>}
                                    {(currentQuestion.correct.birthYear || currentQuestion.correct.deathYear) && (
                                        <p>{currentQuestion.correct.birthYear || '?'} – {currentQuestion.correct.deathYear || ''}</p>
                                    )}
                                    <div className="country-flag">
                                        {countryData?.flag && (
                                            <img
                                                src={countryData.flag}
                                                alt=""
                                                className="flag"
                                                loading="lazy"
                                                decoding="async"
                                                width="24"
                                                height="16"
                                            />
                                        )}
                                        <span>{currentQuestion.correct.country}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="name-top">
                        <h2>{currentQuestion.correct.name}</h2>
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
                                    {currentQuestion.correct.occupation && <p><strong>{currentQuestion.correct.occupation}</strong></p>}
                                    {currentQuestion.correct.description && <p className="desc">{currentQuestion.correct.description}</p>}
                                    {(currentQuestion.correct.birthYear || currentQuestion.correct.deathYear) && (
                                        <p>{currentQuestion.correct.birthYear || '?'} – {currentQuestion.correct.deathYear || ''}</p>
                                    )}
                                    <div className="country-flag">
                                        {countryData?.flag && (
                                            <img
                                                src={countryData.flag}
                                                alt=""
                                                className="flag"
                                                loading="lazy"
                                                decoding="async"
                                                width="24"
                                                height="16"
                                            />
                                        )}
                                        <span>{currentQuestion.correct.country}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

export default React.memo(EndlessQuiz);
