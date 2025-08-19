import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calculator, 
  Timer, 
  Target, 
  Zap, 
  CheckCircle, 
  XCircle, 
  Lightbulb,
  Pause,
  Play,
  Square,
  RotateCcw
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../../contexts/AuthContext';
import { practiceService } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ProgressBar from '../../components/common/ProgressBar';
import StatCard from '../../components/common/StatCard';

interface Question {
  id: number;
  question: string;
  operation: string;
  difficulty: number;
  hints?: string[];
}

interface SessionData {
  sessionId: string;
  question: Question;
  settings: {
    initialDifficulty: number;
    adaptiveDifficulty: boolean;
    timeLimit?: number;
    sessionLimit?: number;
    hintsEnabled: boolean;
    soundEnabled: boolean;
  };
  sessionInfo: {
    type: string;
    operations: string[];
    progress: {
      current: number;
      total: number;
    };
  };
}

interface SessionResult {
  isCorrect: boolean;
  correctAnswer: number;
  explanation?: string;
  responseTime: number;
}

interface SessionSummary {
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  averageResponseTime: number;
  experienceEarned: number;
  bestStreak: number;
  operationBreakdown: Record<string, { attempted: number; correct: number; }>;
  timeSpent: number;
}

const PracticePage: React.FC = () => {
  const { operation } = useParams<{ operation?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Session state
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Practice state
  const [answer, setAnswer] = useState<string>('');
  const [lastResult, setLastResult] = useState<SessionResult | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);

  // Progress tracking
  const [progress, setProgress] = useState({ current: 0, total: 10 });
  const [streak, setStreak] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<Date | null>(null);

  // Refs
  const answerInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize practice session
  const initializeSession = useCallback(async () => {
    try {
      setLoading(true);
      
      const operations = operation ? [operation] : ['addition', 'subtraction', 'multiplication', 'division'];
      
      const sessionData = await practiceService.startSession({
        operations,
        sessionType: 'question_based',
        difficulty: user?.stats?.level || 1,
        sessionLimit: 10,
        adaptiveDifficulty: true,
        hintsEnabled: true,
        soundEnabled: true
      });

      setSessionData(sessionData);
      setCurrentQuestion(sessionData.question);
      setProgress(sessionData.sessionInfo.progress);
      setStartTime(new Date());
      setQuestionStartTime(new Date());
      
      // Focus on input
      setTimeout(() => {
        answerInputRef.current?.focus();
      }, 100);

    } catch (error) {
      console.error('Failed to start practice session:', error);
      toast.error('Failed to start practice session');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [operation, user, navigate]);

  // Submit answer
  const submitAnswer = useCallback(async () => {
    if (!sessionData || !currentQuestion || submitting || !answer.trim()) return;

    try {
      setSubmitting(true);
      const responseTime = questionStartTime ? Date.now() - questionStartTime.getTime() : 0;
      const numericAnswer = parseFloat(answer.trim());

      const result = await practiceService.submitAnswer(sessionData.sessionId, {
        answer: numericAnswer,
        responseTime,
        questionData: {
          question: currentQuestion.question,
          answer: numericAnswer, // This will be validated on server
          operation: currentQuestion.operation,
          difficulty: currentQuestion.difficulty,
          operands: [] // Server will handle this
        },
        hintUsed
      });

      setLastResult(result.result);
      
      if (result.sessionCompleted) {
        setSessionCompleted(true);
        setSessionSummary(result.sessionSummary);
        toast.success('Session completed!');
      } else {
        setCurrentQuestion(result.nextQuestion);
        setProgress(result.progress);
        setAccuracy(result.progress.accuracy);
        setStreak(result.progress.streak);
        setQuestionStartTime(new Date());
        setAnswer('');
        setShowHints(false);
        setHintUsed(false);
        
        // Focus on input for next question
        setTimeout(() => {
          answerInputRef.current?.focus();
        }, 100);
      }

      // Show result feedback
      if (result.result.isCorrect) {
        toast.success('Correct!');
      } else {
        toast.error(`Incorrect. The answer was ${result.result.correctAnswer}`);
      }

    } catch (error) {
      console.error('Failed to submit answer:', error);
      toast.error('Failed to submit answer');
    } finally {
      setSubmitting(false);
    }
  }, [sessionData, currentQuestion, answer, hintUsed, questionStartTime, submitting]);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow numbers, decimal point, and negative sign
    if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
      setAnswer(value);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !submitting && answer.trim()) {
      submitAnswer();
    }
  };

  // Pause/Resume session
  const togglePause = () => {
    setIsPaused(!isPaused);
    if (!isPaused) {
      toast('Session paused');
    } else {
      toast('Session resumed');
      answerInputRef.current?.focus();
    }
  };

  // End session early
  const endSession = async () => {
    if (!sessionData) return;

    try {
      const result = await practiceService.endSession(sessionData.sessionId);
      setSessionCompleted(true);
      setSessionSummary(result.sessionSummary);
      toast.success('Session ended');
    } catch (error) {
      console.error('Failed to end session:', error);
      toast.error('Failed to end session');
    }
  };

  // Start new session
  const startNewSession = () => {
    setSessionData(null);
    setCurrentQuestion(null);
    setAnswer('');
    setLastResult(null);
    setShowHints(false);
    setHintUsed(false);
    setIsPaused(false);
    setSessionCompleted(false);
    setSessionSummary(null);
    setProgress({ current: 0, total: 10 });
    setStreak(0);
    setAccuracy(0);
    initializeSession();
  };

  // Initialize session on mount
  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">Starting practice session...</p>
        </div>
      </div>
    );
  }

  // Session completed state
  if (sessionCompleted && sessionSummary) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="container mx-auto px-4 py-8"
      >
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
              </motion.div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Great Job!
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                You've completed your practice session
              </p>
            </div>

            {/* Session Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard
                icon={Target}
                label="Questions"
                value={sessionSummary.totalQuestions.toString()}
                color="blue"
              />
              <StatCard
                icon={CheckCircle}
                label="Correct"
                value={sessionSummary.correctAnswers.toString()}
                color="green"
              />
              <StatCard
                icon={Zap}
                label="Accuracy"
                value={`${Math.round(sessionSummary.accuracy)}%`}
                color="purple"
              />
              <StatCard
                icon={Timer}
                label="Avg Time"
                value={`${(sessionSummary.averageResponseTime / 1000).toFixed(1)}s`}
                color="orange"
              />
            </div>

            {/* Detailed Stats */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Session Details
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Best Streak</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {sessionSummary.bestStreak}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Experience Earned</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        +{sessionSummary.experienceEarned} XP
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Time Spent</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {Math.floor(sessionSummary.timeSpent / 60)}m {sessionSummary.timeSpent % 60}s
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                    Operation Breakdown
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(sessionSummary.operationBreakdown).map(([op, stats]) => (
                      stats.attempted > 0 && (
                        <div key={op} className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-300 capitalize">
                            {op}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {stats.correct}/{stats.attempted}
                          </span>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={startNewSession}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                Practice Again
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-8 py-3 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 font-semibold rounded-xl transition-colors duration-200"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Main practice interface
  if (!currentQuestion || !sessionData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading question...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Math Practice
          </h1>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-600 dark:text-gray-300">
            <span className="flex items-center gap-1">
              <Calculator className="w-4 h-4" />
              {sessionData.sessionInfo.operations.join(', ')}
            </span>
            <span>•</span>
            <span>Difficulty: {currentQuestion.difficulty}</span>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Question {progress.current + 1} of {progress.total}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {Math.round(accuracy)}% accuracy
            </span>
          </div>
          <ProgressBar 
            current={progress.current} 
            total={progress.total}
            className="h-2"
          />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard
            icon={Zap}
            label="Streak"
            value={streak.toString()}
            color="orange"
          />
          <StatCard
            icon={Target}
            label="Accuracy"
            value={`${Math.round(accuracy)}%`}
            color="green"
          />
          <StatCard
            icon={Timer}
            label="Level"
            value={currentQuestion.difficulty.toString()}
            color="blue"
          />
        </div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-8"
          >
            {/* Pause Overlay */}
            {isPaused && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-2xl flex items-center justify-center z-10">
                <div className="text-center text-white">
                  <Pause className="w-16 h-16 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Session Paused</h3>
                  <p className="text-gray-300">Click resume to continue</p>
                </div>
              </div>
            )}

            <div className="text-center">
              <div className="mb-6">
                <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm font-medium rounded-full mb-4">
                  {currentQuestion.operation.charAt(0).toUpperCase() + currentQuestion.operation.slice(1)}
                </span>
                
                <div className="text-6xl font-bold text-gray-900 dark:text-white mb-6 font-mono">
                  {currentQuestion.question}
                </div>
              </div>

              {/* Answer Input */}
              <div className="mb-6">
                <div className="relative max-w-xs mx-auto">
                  <input
                    ref={answerInputRef}
                    type="text"
                    value={answer}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    placeholder="Your answer"
                    disabled={isPaused || submitting}
                    className="w-full px-4 py-3 text-2xl font-semibold text-center border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:ring-0 transition-colors duration-200"
                  />
                  {submitting && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <LoadingSpinner size="small" />
                    </div>
                  )}
                </div>
              </div>

              {/* Hints */}
              {sessionData.settings.hintsEnabled && currentQuestion.hints && currentQuestion.hints.length > 0 && (
                <div className="mb-6">
                  {!showHints ? (
                    <button
                      onClick={() => {
                        setShowHints(true);
                        setHintUsed(true);
                      }}
                      className="flex items-center gap-2 mx-auto px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg transition-colors duration-200"
                    >
                      <Lightbulb className="w-4 h-4" />
                      Show Hint
                    </button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 max-w-md mx-auto"
                    >
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-yellow-800 dark:text-yellow-200">
                          <p className="font-medium mb-1">Hint:</p>
                          <p>{currentQuestion.hints[0]}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={submitAnswer}
                disabled={!answer.trim() || submitting || isPaused}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors duration-200 flex items-center justify-center gap-2 mx-auto"
              >
                {submitting ? (
                  <>
                    <LoadingSpinner size="small" />
                    Checking...
                  </>
                ) : (
                  'Submit Answer'
                )}
              </button>
            </div>

            {/* Last Result */}
            {lastResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-6 p-4 rounded-lg border ${
                  lastResult.isCorrect 
                    ? 'bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-700' 
                    : 'bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  {lastResult.isCorrect ? (
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  )}
                  <span className={`font-medium ${
                    lastResult.isCorrect 
                      ? 'text-green-800 dark:text-green-200' 
                      : 'text-red-800 dark:text-red-200'
                  }`}>
                    {lastResult.isCorrect ? 'Correct!' : `Incorrect - Answer: ${lastResult.correctAnswer}`}
                  </span>
                </div>
                {lastResult.explanation && (
                  <p className={`text-sm mt-2 text-center ${
                    lastResult.isCorrect 
                      ? 'text-green-700 dark:text-green-300' 
                      : 'text-red-700 dark:text-red-300'
                  }`}>
                    {lastResult.explanation}
                  </p>
                )}
                <p className="text-xs text-center mt-1 text-gray-600 dark:text-gray-400">
                  Response time: {(lastResult.responseTime / 1000).toFixed(2)}s
                </p>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Control Buttons */}
        <div className="flex justify-center gap-4">
          <button
            onClick={togglePause}
            className={`px-6 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 ${
              isPaused
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-yellow-600 hover:bg-yellow-700 text-white'
            }`}
          >
            {isPaused ? (
              <>
                <Play className="w-4 h-4" />
                Resume
              </>
            ) : (
              <>
                <Pause className="w-4 h-4" />
                Pause
              </>
            )}
          </button>
          
          <button
            onClick={endSession}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
          >
            <Square className="w-4 h-4" />
            End Session
          </button>
        </div>

        {/* Progress Information */}
        <div className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>Press Enter to submit your answer quickly</p>
          {hintUsed && (
            <p className="text-yellow-600 dark:text-yellow-400 mt-1">
              Hint used for this question
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PracticePage;
