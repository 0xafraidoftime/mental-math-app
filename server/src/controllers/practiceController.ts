import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import PracticeSession, { IPracticeSession } from '../models/PracticeSession';
import User from '../models/User';
import QuestionGenerator from '../services/QuestionGenerator';

// Extend Request interface to include user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
  };
}

export class PracticeController {
  // Start a new practice session
  public async startSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(500).json({
        success: false,
        message: 'Failed to get quick question',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }

  // Pause/Resume session
  public async pauseSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const userId = req.user!.id;

      const session = await PracticeSession.findOne({
        _id: sessionId,
        userId,
        isCompleted: false
      });

      if (!session) {
        res.status(404).json({
          success: false,
          message: 'Active practice session not found'
        });
        return;
      }

      // Note: Pausing logic would be implemented here
      // For now, we'll just return session state
      res.json({
        success: true,
        message: 'Session paused successfully',
        data: {
          sessionId: session._id,
          isPaused: true,
          progress: {
            current: session.questions.length,
            total: session.settings.sessionLimit || session.questions.length
          }
        }
      });

    } catch (error) {
      console.error('Error pausing session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to pause session',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }

  // End session early
  public async endSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const userId = req.user!.id;

      const session = await PracticeSession.findOne({
        _id: sessionId,
        userId,
        isCompleted: false
      });

      if (!session) {
        res.status(404).json({
          success: false,
          message: 'Active practice session not found'
        });
        return;
      }

      // Complete the session
      await session.completeSession();

      // Update user stats
      const user = await User.findById(userId);
      if (user && session.questions.length > 0) {
        await user.updateStats({
          questionsAnswered: session.performance.totalQuestions,
          correctAnswers: session.performance.correctAnswers,
          sessionTime: session.duration,
          accuracy: session.performance.accuracy,
          isStreakContinued: session.performance.accuracy >= 70
        });
      }

      res.json({
        success: true,
        message: 'Session ended successfully',
        data: {
          sessionSummary: {
            totalQuestions: session.performance.totalQuestions,
            correctAnswers: session.performance.correctAnswers,
            accuracy: session.performance.accuracy,
            averageResponseTime: session.performance.averageResponseTime,
            experienceEarned: session.performance.experienceEarned,
            bestStreak: session.performance.streakAchieved,
            operationBreakdown: session.performance.operationBreakdown,
            timeSpent: session.duration
          }
        }
      });

    } catch (error) {
      console.error('Error ending session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to end session',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }

  // Private helper methods
  private shouldContinueSession(session: IPracticeSession): boolean {
    const { sessionType, settings } = session;
    const currentQuestions = session.questions.length;

    switch (sessionType) {
      case 'question_based':
        return currentQuestions < (settings.sessionLimit || 10);
      
      case 'timed':
        const elapsedTime = (new Date().getTime() - session.startTime.getTime()) / 1000;
        return elapsedTime < (settings.sessionLimit || 300); // 5 minutes default
      
      case 'endless':
        return true; // Endless mode continues until manually stopped
      
      default:
        return currentQuestions < 10;
    }
  }

  // Get session statistics
  public async getSessionStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { days = 30 } = req.query;

      const stats = await PracticeSession.getUserStats(userId, Number(days));

      res.json({
        success: true,
        data: {
          statistics: stats,
          period: `Last ${days} days`
        }
      });

    } catch (error) {
      console.error('Error getting session stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get session statistics',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }

  // Validate answer for quick practice (without session)
  public async validateQuickAnswer(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { questionData, answer, responseTime } = req.body;

      const isCorrect = QuestionGenerator.validateAnswer(questionData, answer);

      // Generate next question with adjusted difficulty
      let nextDifficulty = questionData.difficulty;
      if (isCorrect && responseTime < 3000) {
        nextDifficulty = Math.min(10, questionData.difficulty + 0.2);
      } else if (!isCorrect) {
        nextDifficulty = Math.max(1, questionData.difficulty - 0.3);
      }

      const nextQuestion = QuestionGenerator.generateQuestion({
        operation: questionData.operation,
        difficulty: nextDifficulty
      });

      res.json({
        success: true,
        data: {
          result: {
            isCorrect,
            correctAnswer: questionData.answer,
            explanation: questionData.explanation,
            responseTime
          },
          nextQuestion: {
            question: nextQuestion.question,
            operation: nextQuestion.operation,
            difficulty: nextQuestion.difficulty,
            hints: nextQuestion.hints
          }
        }
      });

    } catch (error) {
      console.error('Error validating quick answer:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate answer',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
}

export default new PracticeController();status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const {
        operations,
        sessionType = 'question_based',
        difficulty = 1,
        sessionLimit = 10,
        timeLimit,
        adaptiveDifficulty = true,
        hintsEnabled = true,
        soundEnabled = true
      } = req.body;

      const userId = req.user!.id;

      // Get user's recent performance for this operation
      const recentSessions = await PracticeSession.find({
        userId,
        targetOperations: { $in: operations },
        isCompleted: true
      })
        .sort({ createdAt: -1 })
        .limit(5);

      let previousPerformance;
      if (recentSessions.length > 0) {
        const totalQuestions = recentSessions.reduce((sum, session) => 
          sum + session.performance.totalQuestions, 0);
        const totalCorrect = recentSessions.reduce((sum, session) => 
          sum + session.performance.correctAnswers, 0);
        const totalTime = recentSessions.reduce((sum, session) => {
          const avgTime = session.performance.averageResponseTime;
          const questions = session.performance.totalQuestions;
          return sum + (avgTime * questions);
        }, 0);

        previousPerformance = {
          accuracy: totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0,
          averageTime: totalQuestions > 0 ? totalTime / totalQuestions : 0,
          recentCorrect: totalCorrect,
          recentTotal: totalQuestions
        };
      }

      // Create new practice session
      const session = new PracticeSession({
        userId,
        sessionType,
        targetOperations: operations,
        settings: {
          initialDifficulty: difficulty,
          adaptiveDifficulty,
          timeLimit,
          sessionLimit,
          hintsEnabled,
          soundEnabled
        }
      });

      await session.save();

      // Generate first question
      const firstQuestion = QuestionGenerator.generateQuestion({
        operation: operations[Math.floor(Math.random() * operations.length)],
        difficulty,
        previousPerformance
      });

      res.status(201).json({
        success: true,
        message: 'Practice session started successfully',
        data: {
          sessionId: session._id,
          question: {
            id: 0,
            question: firstQuestion.question,
            operation: firstQuestion.operation,
            difficulty: firstQuestion.difficulty,
            hints: session.settings.hintsEnabled ? firstQuestion.hints : undefined
          },
          settings: session.settings,
          sessionInfo: {
            type: session.sessionType,
            operations: session.targetOperations,
            progress: {
              current: 0,
              total: sessionLimit
            }
          }
        }
      });

    } catch (error) {
      console.error('Error starting practice session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start practice session',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }

  // Submit an answer and get the next question
  public async submitAnswer(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const { sessionId } = req.params;
      const { answer, responseTime, questionData, hintUsed = false } = req.body;
      const userId = req.user!.id;

      // Find the session
      const session = await PracticeSession.findOne({
        _id: sessionId,
        userId,
        isCompleted: false
      });

      if (!session) {
        res.status(404).json({
          success: false,
          message: 'Active practice session not found'
        });
        return;
      }

      // Validate and record the answer
      const isCorrect = QuestionGenerator.validateAnswer(questionData, answer);
      
      // Add question to session
      session.addQuestion({
        question: questionData.question,
        correctAnswer: questionData.answer,
        userAnswer: answer,
        isCorrect,
        responseTime,
        difficulty: questionData.difficulty,
        operation: questionData.operation,
        operands: questionData.operands,
        hintUsed,
        timestamp: new Date()
      });

      // Check if session should continue
      const shouldContinue = this.shouldContinueSession(session);
      let nextQuestion = null;
      
      if (shouldContinue) {
        // Calculate next difficulty based on recent performance
        const recentQuestions = session.questions.slice(-5);
        const recentAccuracy = recentQuestions.length > 0 
          ? (recentQuestions.filter(q => q.isCorrect).length / recentQuestions.length) * 100 
          : 0;
        const recentAvgTime = recentQuestions.length > 0
          ? recentQuestions.reduce((sum, q) => sum + q.responseTime, 0) / recentQuestions.length
          : 0;

        let nextDifficulty = session.settings.initialDifficulty;
        if (session.settings.adaptiveDifficulty && recentQuestions.length >= 3) {
          nextDifficulty = QuestionGenerator.getNextDifficulty(
            questionData.difficulty,
            {
              accuracy: recentAccuracy,
              averageTime: recentAvgTime,
              sessionCount: recentQuestions.length
            }
          );
        }

        // Generate next question
        const nextQuestionData = QuestionGenerator.generateQuestion({
          operation: session.targetOperations[
            Math.floor(Math.random() * session.targetOperations.length)
          ] as any,
          difficulty: nextDifficulty,
          previousPerformance: {
            accuracy: recentAccuracy,
            averageTime: recentAvgTime,
            recentCorrect: recentQuestions.filter(q => q.isCorrect).length,
            recentTotal: recentQuestions.length
          }
        });

        nextQuestion = {
          id: session.questions.length,
          question: nextQuestionData.question,
          operation: nextQuestionData.operation,
          difficulty: nextQuestionData.difficulty,
          hints: session.settings.hintsEnabled ? nextQuestionData.hints : undefined
        };
      } else {
        // Complete the session
        await session.completeSession();
        
        // Update user stats
        const user = await User.findById(userId);
        if (user) {
          await user.updateStats({
            questionsAnswered: session.performance.totalQuestions,
            correctAnswers: session.performance.correctAnswers,
            sessionTime: session.duration,
            accuracy: session.performance.accuracy,
            isStreakContinued: session.performance.accuracy >= 70
          });
        }
      }

      await session.save();

      const response: any = {
        success: true,
        data: {
          result: {
            isCorrect,
            correctAnswer: questionData.answer,
            explanation: questionData.explanation,
            responseTime
          },
          progress: {
            current: session.questions.length,
            total: session.settings.sessionLimit || session.questions.length,
            accuracy: session.performance.accuracy,
            streak: session.performance.streakAchieved
          },
          sessionCompleted: !shouldContinue
        }
      };

      if (nextQuestion) {
        response.data.nextQuestion = nextQuestion;
      }

      if (!shouldContinue) {
        response.data.sessionSummary = {
          totalQuestions: session.performance.totalQuestions,
          correctAnswers: session.performance.correctAnswers,
          accuracy: session.performance.accuracy,
          averageResponseTime: session.performance.averageResponseTime,
          experienceEarned: session.performance.experienceEarned,
          bestStreak: session.performance.streakAchieved,
          operationBreakdown: session.performance.operationBreakdown,
          timeSpent: session.duration
        };
      }

      res.json(response);

    } catch (error) {
      console.error('Error submitting answer:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit answer',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }

  // Get session details
  public async getSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const userId = req.user!.id;

      const session = await PracticeSession.findOne({
        _id: sessionId,
        userId
      });

      if (!session) {
        res.status(404).json({
          success: false,
          message: 'Practice session not found'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          session: {
            id: session._id,
            type: session.sessionType,
            operations: session.targetOperations,
            startTime: session.startTime,
            endTime: session.endTime,
            duration: session.duration,
            isCompleted: session.isCompleted,
            settings: session.settings,
            performance: session.performance,
            questionCount: session.questions.length,
            questions: session.questions.map((q, index) => ({
              id: index,
              question: q.question,
              correctAnswer: q.correctAnswer,
              userAnswer: q.userAnswer,
              isCorrect: q.isCorrect,
              responseTime: q.responseTime,
              difficulty: q.difficulty,
              operation: q.operation,
              hintUsed: q.hintUsed,
              timestamp: q.timestamp
            }))
          }
        }
      });

    } catch (error) {
      console.error('Error getting session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get session details',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }

  // Get user's session history
  public async getSessionHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { page = 1, limit = 10, operation, completed } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build filter
      const filter: any = { userId };
      if (operation) {
        filter.targetOperations = { $in: [operation] };
      }
      if (completed !== undefined) {
        filter.isCompleted = completed === 'true';
      }

      // Get sessions with pagination
      const sessions = await PracticeSession.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .select('-questions'); // Exclude detailed questions for performance

      const totalSessions = await PracticeSession.countDocuments(filter);

      res.json({
        success: true,
        data: {
          sessions: sessions.map(session => ({
            id: session._id,
            type: session.sessionType,
            operations: session.targetOperations,
            startTime: session.startTime,
            endTime: session.endTime,
            duration: session.duration,
            isCompleted: session.isCompleted,
            performance: session.performance,
            questionCount: session.questions.length
          })),
          pagination: {
            current: pageNum,
            pages: Math.ceil(totalSessions / limitNum),
            total: totalSessions,
            hasNext: skip + limitNum < totalSessions,
            hasPrev: pageNum > 1
          }
        }
      });

    } catch (error) {
      console.error('Error getting session history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get session history',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }

  // Get a practice question without starting a session (for quick practice)
  public async getQuickQuestion(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { operation = 'addition', difficulty = 1 } = req.query;
      const userId = req.user!.id;

      // Get user's recent performance for adaptive difficulty
      const recentSessions = await PracticeSession.find({
        userId,
        targetOperations: { $in: [operation] },
        isCompleted: true
      })
        .sort({ createdAt: -1 })
        .limit(3);

      let previousPerformance;
      if (recentSessions.length > 0) {
        const totalQuestions = recentSessions.reduce((sum, session) => 
          sum + session.performance.totalQuestions, 0);
        const totalCorrect = recentSessions.reduce((sum, session) => 
          sum + session.performance.correctAnswers, 0);

        previousPerformance = {
          accuracy: totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0,
          averageTime: 0,
          recentCorrect: totalCorrect,
          recentTotal: totalQuestions
        };
      }

      const question = QuestionGenerator.generateQuestion({
        operation: operation as any,
        difficulty: Number(difficulty),
        previousPerformance
      });

      res.json({
        success: true,
        data: {
          question: {
            question: question.question,
            operation: question.operation,
            difficulty: question.difficulty,
            hints: question.hints
          }
        }
      });

    } catch (error) {
      console.error('Error getting quick question:', error);
      res.
