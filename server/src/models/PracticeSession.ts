import mongoose, { Document, Schema } from 'mongoose';

// Interface for individual questions within a session
export interface IQuestion {
  question: string;
  correctAnswer: number;
  userAnswer?: number;
  isCorrect?: boolean;
  responseTime: number; // in milliseconds
  difficulty: number;
  operation: 'addition' | 'subtraction' | 'multiplication' | 'division';
  operands: number[];
  hintUsed?: boolean;
  timestamp: Date;
}

// Interface for session performance metrics
export interface IPerformanceMetrics {
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  averageResponseTime: number;
  fastestResponse: number;
  slowestResponse: number;
  difficultyProgression: number[];
  operationBreakdown: {
    addition: { attempted: number; correct: number; };
    subtraction: { attempted: number; correct: number; };
    multiplication: { attempted: number; correct: number; };
    division: { attempted: number; correct: number; };
  };
  experienceEarned: number;
  streakAchieved: number;
}

// Interface for Practice Session document
export interface IPracticeSession extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  sessionType: 'timed' | 'question_based' | 'endless';
  targetOperations: string[];
  startTime: Date;
  endTime?: Date;
  duration: number; // in seconds
  isCompleted: boolean;
  questions: IQuestion[];
  performance: IPerformanceMetrics;
  settings: {
    initialDifficulty: number;
    adaptiveDifficulty: boolean;
    timeLimit?: number; // per question in seconds
    sessionLimit?: number; // total questions or total time
    hintsEnabled: boolean;
    soundEnabled: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  calculatePerformance(): IPerformanceMetrics;
  addQuestion(questionData: Partial<IQuestion>): void;
  completeSession(): Promise<void>;
}

// Question sub-schema
const QuestionSchema = new Schema<IQuestion>({
  question: {
    type: String,
    required: true
  },
  correctAnswer: {
    type: Number,
    required: true
  },
  userAnswer: {
    type: Number
  },
  isCorrect: {
    type: Boolean
  },
  responseTime: {
    type: Number,
    required: true,
    min: [0, 'Response time cannot be negative']
  },
  difficulty: {
    type: Number,
    required: true,
    min: [1, 'Difficulty must be at least 1'],
    max: [10, 'Difficulty cannot exceed 10']
  },
  operation: {
    type: String,
    required: true,
    enum: ['addition', 'subtraction', 'multiplication', 'division']
  },
  operands: {
    type: [Number],
    required: true,
    validate: {
      validator: function(v: number[]) {
        return v.length >= 2;
      },
      message: 'At least 2 operands are required'
    }
  },
  hintUsed: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

// Performance metrics sub-schema
const PerformanceSchema = new Schema<IPerformanceMetrics>({
  totalQuestions: {
    type: Number,
    default: 0,
    min: [0, 'Total questions cannot be negative']
  },
  correctAnswers: {
    type: Number,
    default: 0,
    min: [0, 'Correct answers cannot be negative']
  },
  accuracy: {
    type: Number,
    default: 0,
    min: [0, 'Accuracy cannot be negative'],
    max: [100, 'Accuracy cannot exceed 100%']
  },
  averageResponseTime: {
    type: Number,
    default: 0,
    min: [0, 'Response time cannot be negative']
  },
  fastestResponse: {
    type: Number,
    default: 0,
    min: [0, 'Response time cannot be negative']
  },
  slowestResponse: {
    type: Number,
    default: 0,
    min: [0, 'Response time cannot be negative']
  },
  difficultyProgression: {
    type: [Number],
    default: []
  },
  operationBreakdown: {
    addition: {
      attempted: { type: Number, default: 0 },
      correct: { type: Number, default: 0 }
    },
    subtraction: {
      attempted: { type: Number, default: 0 },
      correct: { type: Number, default: 0 }
    },
    multiplication: {
      attempted: { type: Number, default: 0 },
      correct: { type: Number, default: 0 }
    },
    division: {
      attempted: { type: Number, default: 0 },
      correct: { type: Number, default: 0 }
    }
  },
  experienceEarned: {
    type: Number,
    default: 0,
    min: [0, 'Experience cannot be negative']
  },
  streakAchieved: {
    type: Number,
    default: 0,
    min: [0, 'Streak cannot be negative']
  }
}, { _id: false });

// Main Practice Session schema
const PracticeSessionSchema = new Schema<IPracticeSession>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  
  sessionType: {
    type: String,
    required: true,
    enum: ['timed', 'question_based', 'endless'],
    default: 'question_based'
  },
  
  targetOperations: {
    type: [String],
    required: true,
    enum: ['addition', 'subtraction', 'multiplication', 'division'],
    validate: {
      validator: function(v: string[]) {
        return v.length > 0;
      },
      message: 'At least one operation must be selected'
    }
  },
  
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  endTime: {
    type: Date
  },
  
  duration: {
    type: Number,
    default: 0,
    min: [0, 'Duration cannot be negative']
  },
  
  isCompleted: {
    type: Boolean,
    default: false
  },
  
  questions: [QuestionSchema],
  
  performance: {
    type: PerformanceSchema,
    default: () => ({})
  },
  
  settings: {
    initialDifficulty: {
      type: Number,
      required: true,
      min: [1, 'Initial difficulty must be at least 1'],
      max: [10, 'Initial difficulty cannot exceed 10'],
      default: 1
    },
    adaptiveDifficulty: {
      type: Boolean,
      default: true
    },
    timeLimit: {
      type: Number,
      min: [1, 'Time limit must be at least 1 second']
    },
    sessionLimit: {
      type: Number,
      min: [1, 'Session limit must be at least 1']
    },
    hintsEnabled: {
      type: Boolean,
      default: true
    },
    soundEnabled: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
PracticeSessionSchema.index({ userId: 1, createdAt: -1 });
PracticeSessionSchema.index({ userId: 1, isCompleted: 1 });
PracticeSessionSchema.index({ startTime: -1 });
PracticeSessionSchema.index({ 'performance.accuracy': -1 });

// Instance method to calculate performance metrics
PracticeSessionSchema.methods.calculatePerformance = function(): IPerformanceMetrics {
  const questions = this.questions;
  const totalQuestions = questions.length;
  
  if (totalQuestions === 0) {
    return {
      totalQuestions: 0,
      correctAnswers: 0,
      accuracy: 0,
      averageResponseTime: 0,
      fastestResponse: 0,
      slowestResponse: 0,
      difficultyProgression: [],
      operationBreakdown: {
        addition: { attempted: 0, correct: 0 },
        subtraction: { attempted: 0, correct: 0 },
        multiplication: { attempted: 0, correct: 0 },
        division: { attempted: 0, correct: 0 }
      },
      experienceEarned: 0,
      streakAchieved: 0
    };
  }
  
  const correctAnswers = questions.filter(q => q.isCorrect).length;
  const accuracy = (correctAnswers / totalQuestions) * 100;
  
  const responseTimes = questions.map(q => q.responseTime);
  const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const fastestResponse = Math.min(...responseTimes);
  const slowestResponse = Math.max(...responseTimes);
  
  const difficultyProgression = questions.map(q => q.difficulty);
  
  // Calculate operation breakdown
  const operationBreakdown = {
    addition: { attempted: 0, correct: 0 },
    subtraction: { attempted: 0, correct: 0 },
    multiplication: { attempted: 0, correct: 0 },
    division: { attempted: 0, correct: 0 }
  };
  
  questions.forEach(q => {
    operationBreakdown[q.operation].attempted++;
    if (q.isCorrect) {
      operationBreakdown[q.operation].correct++;
    }
  });
  
  // Calculate experience earned
  const baseExp = totalQuestions * 10;
  const accuracyBonus = Math.floor(accuracy * totalQuestions * 0.1);
  const speedBonus = averageResponseTime > 0 ? Math.floor((totalQuestions / averageResponseTime) * 1000) : 0;
  const experienceEarned = baseExp + accuracyBonus + speedBonus;
  
  // Calculate streak achieved
  let currentStreak = 0;
  let maxStreak = 0;
  questions.forEach(q => {
    if (q.isCorrect) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  });
  
  return {
    totalQuestions,
    correctAnswers,
    accuracy,
    averageResponseTime,
    fastestResponse,
    slowestResponse,
    difficultyProgression,
    operationBreakdown,
    experienceEarned,
    streakAchieved: maxStreak
  };
};

// Instance method to add a question to the session
PracticeSessionSchema.methods.addQuestion = function(questionData: Partial<IQuestion>): void {
  this.questions.push(questionData);
  this.performance = this.calculatePerformance();
};

// Instance method to complete the session
PracticeSessionSchema.methods.completeSession = async function(): Promise<void> {
  this.endTime = new Date();
  this.duration = Math.floor((this.endTime.getTime() - this.startTime.getTime()) / 1000);
  this.isCompleted = true;
  this.performance = this.calculatePerformance();
  await this.save();
};

// Static method to get user session statistics
PracticeSessionSchema.statics.getUserStats = async function(userId: mongoose.Types.ObjectId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const sessions = await this.find({
    userId,
    isCompleted: true,
    createdAt: { $gte: startDate }
  }).sort({ createdAt: -1 });
  
  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      totalQuestions: 0,
      totalCorrect: 0,
      averageAccuracy: 0,
      totalTime: 0,
      averageSessionTime: 0,
      bestStreak: 0,
      recentSessions: []
    };
  }
  
  const totalSessions = sessions.length;
  const totalQuestions = sessions.reduce((sum, session) => sum + session.performance.totalQuestions, 0);
  const totalCorrect = sessions.reduce((sum, session) => sum + session.performance.correctAnswers, 0);
  const averageAccuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
  const totalTime = sessions.reduce((sum, session) => sum + session.duration, 0);
  const averageSessionTime = totalTime / totalSessions;
  const bestStreak = Math.max(...sessions.map(session => session.performance.streakAchieved));
  
  return {
    totalSessions,
    totalQuestions,
    totalCorrect,
    averageAccuracy,
    totalTime,
    averageSessionTime,
    bestStreak,
    recentSessions: sessions.slice(0, 10)
  };
};

// Create and export the PracticeSession model
export default mongoose.model<IPracticeSession>('PracticeSession', PracticeSessionSchema);
