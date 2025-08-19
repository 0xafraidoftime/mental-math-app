interface QuestionConfig {
  operation: 'addition' | 'subtraction' | 'multiplication' | 'division';
  difficulty: number;
  previousPerformance?: {
    accuracy: number;
    averageTime: number;
    recentCorrect: number;
    recentTotal: number;
  };
}

interface GeneratedQuestion {
  question: string;
  answer: number;
  operands: number[];
  operation: string;
  difficulty: number;
  hints?: string[];
  explanation?: string;
}

interface DifficultyRange {
  min: number;
  max: number;
  decimalPlaces?: number;
  allowNegatives?: boolean;
}

export class QuestionGenerator {
  private readonly difficultyRanges: Map<string, DifficultyRange[]>;
  
  constructor() {
    this.difficultyRanges = new Map();
    this.initializeDifficultyRanges();
  }

  private initializeDifficultyRanges(): void {
    // Addition difficulty ranges
    this.difficultyRanges.set('addition', [
      { min: 1, max: 9 },           // Level 1: Single digits
      { min: 1, max: 19 },          // Level 2: Up to 19
      { min: 1, max: 50 },          // Level 3: Up to 50
      { min: 1, max: 99 },          // Level 4: Two digits
      { min: 10, max: 199 },        // Level 5: Larger two digits
      { min: 50, max: 499 },        // Level 6: Up to 499
      { min: 100, max: 999 },       // Level 7: Three digits
      { min: 500, max: 1999 },      // Level 8: Larger numbers
      { min: 1000, max: 4999 },     // Level 9: Thousands
      { min: 2000, max: 9999 }      // Level 10: Large numbers
    ]);

    // Subtraction difficulty ranges
    this.difficultyRanges.set('subtraction', [
      { min: 1, max: 9 },           // Level 1: Single digits (no negatives)
      { min: 1, max: 19 },          // Level 2: Up to 19
      { min: 1, max: 50 },          // Level 3: Up to 50
      { min: 1, max: 99 },          // Level 4: Two digits
      { min: 10, max: 199 },        // Level 5: Larger two digits
      { min: 50, max: 499, allowNegatives: true },  // Level 6: Allow negatives
      { min: 100, max: 999, allowNegatives: true }, // Level 7: Three digits
      { min: 500, max: 1999, allowNegatives: true }, // Level 8: Larger numbers
      { min: 1000, max: 4999, allowNegatives: true }, // Level 9: Thousands
      { min: 2000, max: 9999, allowNegatives: true }  // Level 10: Large numbers
    ]);

    // Multiplication difficulty ranges
    this.difficultyRanges.set('multiplication', [
      { min: 1, max: 5 },           // Level 1: Very small numbers
      { min: 1, max: 9 },           // Level 2: Single digits
      { min: 1, max: 12 },          // Level 3: Times tables
      { min: 1, max: 15 },          // Level 4: Extended tables
      { min: 1, max: 25 },          // Level 5: Larger single digits
      { min: 10, max: 99 },         // Level 6: Two digits
      { min: 10, max: 199 },        // Level 7: Larger two digits
      { min: 50, max: 499 },        // Level 8: Hundreds
      { min: 100, max: 999 },       // Level 9: Three digits
      { min: 500, max: 1999 }       // Level 10: Large numbers
    ]);

    // Division difficulty ranges
    this.difficultyRanges.set('division', [
      { min: 1, max: 25 },          // Level 1: Simple division
      { min: 1, max: 81 },          // Level 2: Single digit results
      { min: 1, max: 144 },         // Level 3: Up to 12x12
      { min: 1, max: 225 },         // Level 4: Up to 15x15
      { min: 1, max: 400 },         // Level 5: Up to 20x20
      { min: 25, max: 2500 },       // Level 6: Larger numbers
      { min: 100, max: 10000 },     // Level 7: Hundreds
      { min: 500, max: 50000 },     // Level 8: Thousands
      { min: 1000, max: 100000 },   // Level 9: Ten thousands
      { min: 5000, max: 500000, decimalPlaces: 2 }  // Level 10: With decimals
    ]);
  }

  public generateQuestion(config: QuestionConfig): GeneratedQuestion {
    const { operation, difficulty } = config;
    
    // Adjust difficulty based on recent performance
    const adjustedDifficulty = this.adjustDifficultyBasedOnPerformance(difficulty, config.previousPerformance);
    
    switch (operation) {
      case 'addition':
        return this.generateAddition(adjustedDifficulty);
      case 'subtraction':
        return this.generateSubtraction(adjustedDifficulty);
      case 'multiplication':
        return this.generateMultiplication(adjustedDifficulty);
      case 'division':
        return this.generateDivision(adjustedDifficulty);
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }

  private adjustDifficultyBasedOnPerformance(
    baseDifficulty: number, 
    performance?: QuestionConfig['previousPerformance']
  ): number {
    if (!performance) return baseDifficulty;

    const { accuracy, averageTime, recentCorrect, recentTotal } = performance;
    let adjustment = 0;

    // Adjust based on accuracy
    if (accuracy >= 90 && recentTotal >= 5) {
      adjustment += 0.3; // Increase difficulty if doing very well
    } else if (accuracy >= 80 && recentTotal >= 5) {
      adjustment += 0.1; // Slight increase
    } else if (accuracy < 60 && recentTotal >= 3) {
      adjustment -= 0.2; // Decrease if struggling
    } else if (accuracy < 40 && recentTotal >= 3) {
      adjustment -= 0.4; // Significant decrease
    }

    // Adjust based on speed (if answering very quickly, increase difficulty)
    if (averageTime < 2000 && accuracy >= 85) { // Less than 2 seconds and high accuracy
      adjustment += 0.2;
    } else if (averageTime > 10000) { // More than 10 seconds
      adjustment -= 0.1;
    }

    // Ensure difficulty stays within bounds
    const adjustedDifficulty = Math.max(1, Math.min(10, baseDifficulty + adjustment));
    return Math.round(adjustedDifficulty * 10) / 10; // Round to 1 decimal place
  }

  private generateAddition(difficulty: number): GeneratedQuestion {
    const range = this.getDifficultyRange('addition', difficulty);
    const operandCount = difficulty >= 6 ? (Math.random() > 0.7 ? 3 : 2) : 2;
    
    const operands: number[] = [];
    for (let i = 0; i < operandCount; i++) {
      operands.push(this.getRandomInRange(range.min, range.max));
    }

    const answer = operands.reduce((sum, num) => sum + num, 0);
    const question = operands.join(' + ');

    return {
      question,
      answer,
      operands,
      operation: 'addition',
      difficulty,
      hints: this.generateAdditionHints(operands),
      explanation: this.generateAdditionExplanation(operands, answer)
    };
  }

  private generateSubtraction(difficulty: number): GeneratedQuestion {
    const range = this.getDifficultyRange('subtraction', difficulty);
    
    let num1 = this.getRandomInRange(range.min, range.max);
    let num2 = this.getRandomInRange(range.min, num1); // Ensure num2 <= num1 for positive results
    
    // For higher difficulties, allow negative results
    if (range.allowNegatives && difficulty >= 6 && Math.random() > 0.6) {
      num2 = this.getRandomInRange(range.min, range.max);
    }

    const answer = num1 - num2;
    const question = `${num1} - ${num2}`;
    const operands = [num1, num2];

    return {
      question,
      answer,
      operands,
      operation: 'subtraction',
      difficulty,
      hints: this.generateSubtractionHints(operands),
      explanation: this.generateSubtractionExplanation(operands, answer)
    };
  }

  private generateMultiplication(difficulty: number): GeneratedQuestion {
    const range = this.getDifficultyRange('multiplication', difficulty);
    
    let num1: number, num2: number;

    if (difficulty <= 4) {
      // Focus on times tables for lower difficulties
      num1 = this.getRandomInRange(1, Math.min(12, range.max));
      num2 = this.getRandomInRange(1, Math.min(12, range.max));
    } else {
      // For higher difficulties, use full range but keep one number smaller
      num1 = this.getRandomInRange(range.min, range.max);
      num2 = this.getRandomInRange(range.min, Math.min(range.max, num1 * 0.5));
    }

    const answer = num1 * num2;
    const question = `${num1} × ${num2}`;
    const operands = [num1, num2];

    return {
      question,
      answer,
      operands,
      operation: 'multiplication',
      difficulty,
      hints: this.generateMultiplicationHints(operands),
      explanation: this.generateMultiplicationExplanation(operands, answer)
    };
  }

  private generateDivision(difficulty: number): GeneratedQuestion {
    const range = this.getDifficultyRange('division', difficulty);
    
    // Generate division by creating multiplication first, then reversing it
    let divisor: number, quotient: number;
    
    if (difficulty <= 3) {
      // Simple division with small numbers
      divisor = this.getRandomInRange(2, 12);
      quotient = this.getRandomInRange(1, Math.floor(range.max / divisor));
    } else if (difficulty <= 6) {
      // Medium difficulty
      divisor = this.getRandomInRange(2, 25);
      quotient = this.getRandomInRange(1, Math.floor(range.max / divisor));
    } else {
      // Higher difficulty - may include remainders or decimals
      divisor = this.getRandomInRange(2, 50);
      quotient = this.getRandomInRange(1, Math.floor(range.max / divisor));
    }

    const dividend = divisor * quotient;
    let answer: number = quotient;

    // For highest difficulties, sometimes add remainder or require decimal
    if (difficulty >= 9 && Math.random() > 0.7) {
      const remainder = this.getRandomInRange(1, divisor - 1);
      const actualDividend = dividend + remainder;
      
      if (range.decimalPlaces) {
        answer = Math.round((actualDividend / divisor) * 100) / 100;
        const question = `${actualDividend} ÷ ${divisor}`;
        const operands = [actualDividend, divisor];
        
        return {
          question,
          answer,
          operands,
          operation: 'division',
          difficulty,
          hints: this.generateDivisionHints(operands),
          explanation: this.generateDivisionExplanation(operands, answer)
        };
      }
    }

    const question = `${dividend} ÷ ${divisor}`;
    const operands = [dividend, divisor];

    return {
      question,
      answer,
      operands,
      operation: 'division',
      difficulty,
      hints: this.generateDivisionHints(operands),
      explanation: this.generateDivisionExplanation(operands, answer)
    };
  }

  private getDifficultyRange(operation: string, difficulty: number): DifficultyRange {
    const ranges = this.difficultyRanges.get(operation);
    if (!ranges) {
      throw new Error(`No difficulty ranges defined for operation: ${operation}`);
    }

    const index = Math.max(0, Math.min(ranges.length - 1, Math.floor(difficulty) - 1));
    return ranges[index];
  }

  private getRandomInRange(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Hint generation methods
  private generateAdditionHints(operands: number[]): string[] {
    const hints: string[] = [];
    
    if (operands.length === 2) {
      const [a, b] = operands;
      hints.push(`Break down ${a} + ${b} by adding in steps`);
      
      if (a >= 10 || b >= 10) {
        hints.push(`Try adding the tens first, then the ones`);
      }
      
      if (b <= 10) {
        hints.push(`Count up from ${a}: ${a + 1}, ${a + 2}...`);
      }
    }
    
    return hints;
  }

  private generateSubtractionHints(operands: number[]): string[] {
    const hints: string[] = [];
    const [a, b] = operands;
    
    hints.push(`Think: what number plus ${b} equals ${a}?`);
    
    if (a >= 10 && b >= 10) {
      hints.push(`Try subtracting in parts: tens first, then ones`);
    }
    
    if (b <= 10) {
      hints.push(`Count down from ${a}: ${a - 1}, ${a - 2}...`);
    }
    
    return hints;
  }

  private generateMultiplicationHints(operands: number[]): string[] {
    const hints: string[] = [];
    const [a, b] = operands;
    
    // Check for common multiplication patterns
    if (b <= 12) {
      hints.push(`This is the ${b} times table: ${b} × ${a}`);
    }
    
    if (a === b) {
      hints.push(`This is ${a} squared (${a} × ${a})`);
    }
    
    // Suggest breaking down larger numbers
    if (a > 10 || b > 10) {
      hints.push(`Try breaking down into smaller parts and adding`);
    }
    
    // Special patterns
    if (a % 10 === 0 || b % 10 === 0) {
      hints.push(`Multiplying by multiples of 10 is easier`);
    }
    
    return hints;
  }

  private generateDivisionHints(operands: number[]): string[] {
    const hints: string[] = [];
    const [dividend, divisor] = operands;
    
    hints.push(`Think: ${divisor} times what number equals ${dividend}?`);
    
    if (divisor <= 12) {
      hints.push(`Use your ${divisor} times table`);
    }
    
    if (dividend % divisor === 0) {
      hints.push(`This division has no remainder`);
    }
    
    return hints;
  }

  // Explanation generation methods
  private generateAdditionExplanation(operands: number[], answer: number): string {
    if (operands.length === 2) {
      const [a, b] = operands;
      return `${a} + ${b} = ${answer}`;
    }
    return `${operands.join(' + ')} = ${answer}`;
  }

  private generateSubtractionExplanation(operands: number[], answer: number): string {
    const [a, b] = operands;
    return `${a} - ${b} = ${answer}`;
  }

  private generateMultiplicationExplanation(operands: number[], answer: number): string {
    const [a, b] = operands;
    return `${a} × ${b} = ${answer}`;
  }

  private generateDivisionExplanation(operands: number[], answer: number): string {
    const [dividend, divisor] = operands;
    if (answer % 1 === 0) {
      return `${dividend} ÷ ${divisor} = ${answer}`;
    } else {
      return `${dividend} ÷ ${divisor} = ${answer} (rounded to 2 decimal places)`;
    }
  }

  // Utility method to generate multiple questions
  public generateQuestionSet(
    operations: string[], 
    difficulty: number, 
    count: number,
    previousPerformance?: QuestionConfig['previousPerformance']
  ): GeneratedQuestion[] {
    const questions: GeneratedQuestion[] = [];
    
    for (let i = 0; i < count; i++) {
      const operation = operations[Math.floor(Math.random() * operations.length)] as any;
      const config: QuestionConfig = {
        operation,
        difficulty: difficulty + (Math.random() - 0.5) * 0.4, // Add slight variation
        previousPerformance
      };
      
      questions.push(this.generateQuestion(config));
    }
    
    return questions;
  }

  // Method to validate an answer
  public validateAnswer(question: GeneratedQuestion, userAnswer: number, tolerance: number = 0.01): boolean {
    if (question.operation === 'division' && question.answer % 1 !== 0) {
      // For decimal answers, allow small tolerance
      return Math.abs(question.answer - userAnswer) <= tolerance;
    }
    
    return Math.abs(question.answer - userAnswer) < 0.001; // Effectively exact match for integers
  }

  // Method to get difficulty recommendation based on performance
  public getNextDifficulty(
    currentDifficulty: number, 
    recentPerformance: { accuracy: number; averageTime: number; sessionCount: number }
  ): number {
    const { accuracy, averageTime, sessionCount } = recentPerformance;
    
    if (sessionCount < 3) {
      return currentDifficulty; // Need more data
    }
    
    let adjustment = 0;
    
    // Base adjustment on accuracy
    if (accuracy >= 95) {
      adjustment = 0.5;
    } else if (accuracy >= 85) {
      adjustment = 0.3;
    } else if (accuracy >= 75) {
      adjustment = 0.1;
    } else if (accuracy < 60) {
      adjustment = -0.3;
    } else if (accuracy < 70) {
      adjustment = -0.1;
    }
    
    // Consider speed
    if (averageTime < 3000 && accuracy >= 80) {
      adjustment += 0.2;
    } else if (averageTime > 15000) {
      adjustment -= 0.1;
    }
    
    const newDifficulty = Math.max(1, Math.min(10, currentDifficulty + adjustment));
    return Math.round(newDifficulty * 10) / 10;
  }
}

export default new QuestionGenerator();
