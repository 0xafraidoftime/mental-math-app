import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

// Interface for User document
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  username: string;
  email: string;
  password: string;
  profile: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
    dateOfBirth?: Date;
    preferences: {
      operations: string[];
      sessionLength: number;
      difficulty: number;
      soundEnabled: boolean;
      theme: 'light' | 'dark' | 'auto';
    };
  };
  stats: {
    totalSessions: number;
    totalQuestions: number;
    correctAnswers: number;
    averageAccuracy: number;
    currentStreak: number;
    longestStreak: number;
    totalPracticeTime: number; // in seconds
    level: number;
    experience: number;
    lastActive: Date;
  };
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    unlockedAt: Date;
    category: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  updateStats(sessionData: any): Promise<void>;
  calculateLevel(): number;
}

// User schema definition
const UserSchema: Schema<IUser> = new Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [20, 'Username cannot exceed 20 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false // Don't include password in queries by default
  },
  
  profile: {
    firstName: {
      type: String,
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    avatar: {
      type: String,
      default: ''
    },
    dateOfBirth: {
      type: Date
    },
    preferences: {
      operations: {
        type: [String],
        enum: ['addition', 'subtraction', 'multiplication', 'division'],
        default: ['addition', 'subtraction', 'multiplication', 'division']
      },
      sessionLength: {
        type: Number,
        default: 10,
        min: [5, 'Session length must be at least 5 questions'],
        max: [50, 'Session length cannot exceed 50 questions']
      },
      difficulty: {
        type: Number,
        default: 1,
        min: [1, 'Difficulty must be between 1 and 10'],
        max: [10, 'Difficulty must be between 1 and 10']
      },
      soundEnabled: {
        type: Boolean,
        default: true
      },
      theme: {
        type: String,
        enum: ['light', 'dark', 'auto'],
        default: 'auto'
      }
    }
  },
  
  stats: {
    totalSessions: {
      type: Number,
      default: 0,
      min: [0, 'Total sessions cannot be negative']
    },
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
    averageAccuracy: {
      type: Number,
      default: 0,
      min: [0, 'Accuracy cannot be negative'],
      max: [100, 'Accuracy cannot exceed 100%']
    },
    currentStreak: {
      type: Number,
      default: 0,
      min: [0, 'Streak cannot be negative']
    },
    longestStreak: {
      type: Number,
      default: 0,
      min: [0, 'Longest streak cannot be negative']
    },
    totalPracticeTime: {
      type: Number,
      default: 0,
      min: [0, 'Practice time cannot be negative']
    },
    level: {
      type: Number,
      default: 1,
      min: [1, 'Level must be at least 1']
    },
    experience: {
      type: Number,
      default: 0,
      min: [0, 'Experience cannot be negative']
    },
    lastActive: {
      type: Date,
      default: Date.now
    }
  },
  
  achievements: [{
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    unlockedAt: {
      type: Date,
      default: Date.now
    },
    category: {
      type: String,
      required: true,
      enum: ['streak', 'accuracy', 'speed', 'practice', 'milestone']
    }
  }]
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      return ret;
    }
  }
});

// Indexes for better query performance
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ 'stats.level': -1 });
UserSchema.index({ 'stats.experience': -1 });
UserSchema.index({ createdAt: -1 });

// Pre-save middleware to hash password
UserSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Instance method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Instance method to update user stats after a practice session
UserSchema.methods.updateStats = async function(sessionData: {
  questionsAnswered: number;
  correctAnswers: number;
  sessionTime: number;
  accuracy: number;
  isStreakContinued: boolean;
}): Promise<void> {
  const { questionsAnswered, correctAnswers, sessionTime, accuracy, isStreakContinued } = sessionData;
  
  // Update basic stats
  this.stats.totalSessions += 1;
  this.stats.totalQuestions += questionsAnswered;
  this.stats.correctAnswers += correctAnswers;
  this.stats.totalPracticeTime += sessionTime;
  this.stats.lastActive = new Date();
  
  // Update accuracy (weighted average)
  const totalQuestions = this.stats.totalQuestions;
  const previousAccuracy = this.stats.averageAccuracy;
  const newTotalCorrect = this.stats.correctAnswers;
  this.stats.averageAccuracy = (newTotalCorrect / totalQuestions) * 100;
  
  // Update streak
  if (isStreakContinued && accuracy >= 70) { // Minimum 70% accuracy to continue streak
    this.stats.currentStreak += 1;
    if (this.stats.currentStreak > this.stats.longestStreak) {
      this.stats.longestStreak = this.stats.currentStreak;
    }
  } else if (accuracy < 70) {
    this.stats.currentStreak = 0;
  }
  
  // Award experience points
  const baseExp = questionsAnswered * 10;
  const accuracyBonus = Math.floor(accuracy * questionsAnswered * 0.1);
  const speedBonus = sessionTime > 0 ? Math.floor((questionsAnswered / sessionTime) * 100) : 0;
  const streakBonus = this.stats.currentStreak > 5 ? this.stats.currentStreak * 5 : 0;
  
  const totalExp = baseExp + accuracyBonus + speedBonus + streakBonus;
  this.stats.experience += totalExp;
  
  // Update level
  this.stats.level = this.calculateLevel();
  
  await this.save();
};

// Instance method to calculate level based on experience
UserSchema.methods.calculateLevel = function(): number {
  const experience = this.stats.experience;
  // Level formula: level = floor(sqrt(experience / 100)) + 1
  return Math.floor(Math.sqrt(experience / 100)) + 1;
};

// Static method to get leaderboard
UserSchema.statics.getLeaderboard = async function(limit = 10, sortBy = 'experience') {
  const sortOptions: any = {};
  
  switch (sortBy) {
    case 'experience':
      sortOptions['stats.experience'] = -1;
      break;
    case 'accuracy':
      sortOptions['stats.averageAccuracy'] = -1;
      break;
    case 'streak':
      sortOptions['stats.longestStreak'] = -1;
      break;
    default:
      sortOptions['stats.experience'] = -1;
  }
  
  return this.find({})
    .select('username profile.firstName profile.lastName profile.avatar stats')
    .sort(sortOptions)
    .limit(limit);
};

// Create and export the User model
export default mongoose.model<IUser>('User', UserSchema);
