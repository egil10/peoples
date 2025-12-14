import React, { useState } from 'react';
import { ArrowRight, Check, X, HelpCircle, ArrowLeft } from 'lucide-react';
import './Quiz.css';

function Quiz({ data, country, onComplete, onBack }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answer, setAnswer] = useState('');
    const [feedback, setFeedback] = useState(null);
    const [score, setScore] = useState(0);
    const [showHint, setShowHint] = useState(false);

    const currentPerson = data.people[currentIndex];
    const isLastQuestion = currentIndex === data.people.length - 1;

    // Normalize answer for comparison
    const normalizeAnswer = (text) => {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    };

    // Check if answer is correct
    const checkAnswer = () => {
        if (!answer.trim()) return;

        const normalized = normalizeAnswer(answer);
        const isCorrect = normalized === currentPerson.answerKey;

        if (isCorrect) {
            setScore(score + 1);
            setFeedback({ type: 'correct', message: 'Correct!' });
        } else {
            setFeedback({
                type: 'incorrect',
                message: `Incorrect. The answer is ${currentPerson.name}`
            });
        }
    };

    // Move to next question
    const handleNext = () => {
        if (isLastQuestion) {
            onComplete(score + (feedback?.type === 'correct' ? 1 : 0));
        } else {
            setCurrentIndex(currentIndex + 1);
            setAnswer('');
            setFeedback(null);
            setShowHint(false);
        }
    };

    // Handle Enter key press
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            if (feedback) {
                handleNext();
            } else {
                checkAnswer();
            }
        }
    };

    // Generate hint text
    const getHint = () => {
        const hints = [];
        if (currentPerson.occupation) hints.push(currentPerson.occupation);
        if (currentPerson.birthYear) {
            const yearText = currentPerson.deathYear
                ? `${currentPerson.birthYear}–${currentPerson.deathYear}`
                : `Born ${currentPerson.birthYear}`;
            hints.push(yearText);
        }
        return hints.join(' • ') || 'No hint available';
    };

    return (
        <div className="app-container">
            <div className="quiz">
                {/* Header */}
                <div className="quiz-header">
                    <button className="back-button secondary" onClick={onBack}>
                        <ArrowLeft size={20} />
                        Back
                    </button>
                    <div className="quiz-progress">
                        <h2>{country}</h2>
                        <p className="text-secondary">
                            Question {currentIndex + 1} of {data.people.length}
                        </p>
                    </div>
                </div>

                {/* Image */}
                <div className="image-container">
                    <img
                        src={currentPerson.image}
                        alt="Quiz person"
                        loading="lazy"
                    />
                </div>

                {/* Question */}
                <div className="quiz-question">
                    <h3>Who is this person?</h3>

                    {/* Hint Button */}
                    {!showHint && !feedback && (
                        <button
                            className="hint-button secondary"
                            onClick={() => setShowHint(true)}
                        >
                            <HelpCircle size={18} />
                            Show Hint
                        </button>
                    )}

                    {/* Hint Display */}
                    {showHint && !feedback && (
                        <div className="hint-box">
                            <p className="text-secondary">{getHint()}</p>
                        </div>
                    )}

                    {/* Answer Input */}
                    <input
                        type="text"
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type the full name..."
                        disabled={feedback !== null}
                        autoFocus
                        className="answer-input"
                    />

                    {/* Feedback */}
                    {feedback && (
                        <div className={`feedback-message ${feedback.type}`}>
                            {feedback.type === 'correct' ? (
                                <Check size={18} />
                            ) : (
                                <X size={18} />
                            )}
                            <span>{feedback.message}</span>
                        </div>
                    )}

                    {/* Action Button */}
                    {feedback ? (
                        <button onClick={handleNext} className="next-button">
                            {isLastQuestion ? 'View Results' : 'Next Question'}
                            <ArrowRight size={20} />
                        </button>
                    ) : (
                        <button
                            onClick={checkAnswer}
                            disabled={!answer.trim()}
                            className="submit-button"
                        >
                            Submit Answer
                        </button>
                    )}
                </div>

                {/* Progress Bar */}
                <div className="progress-bar">
                    <div
                        className="progress-fill"
                        style={{ width: `${((currentIndex + 1) / data.people.length) * 100}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

export default Quiz;
