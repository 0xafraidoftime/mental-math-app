# Mental Math Practice Application

A comprehensive web application for practicing mental arithmetic with adaptive difficulty levels and performance tracking, similar to MathTrainer.ai.

## Features

- **Multiple Operations**: Addition, Subtraction, Multiplication, Division
- **Adaptive Difficulty**: Questions automatically adjust based on performance
- **Performance Tracking**: Detailed analytics and progress monitoring
- **User Profiles**: Individual progress tracking and statistics
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Real-time Feedback**: Instant scoring and performance metrics

## Tech Stack

### Frontend
- React.js with TypeScript
- Tailwind CSS for styling
- Chart.js for performance visualizations
- React Router for navigation

### Backend
- Node.js with Express
- TypeScript
- MongoDB with Mongoose
- JWT for authentication
- bcryptjs for password hashing

### Development Tools
- ESLint and Prettier
- Jest for testing
- Docker for containerization
- GitHub Actions for CI/CD

## Project Structure

```
mental-math-app/
├── client/                 # React frontend
│   ├── public/
│   │   ├── index.html
│   │   ├── manifest.json
│   │   └── favicon.ico
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── common/
│   │   │   ├── auth/
│   │   │   ├── practice/
│   │   │   └── dashboard/
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API services
│   │   ├── utils/          # Utility functions
│   │   ├── types/          # TypeScript type definitions
│   │   ├── styles/         # Global styles
│   │   ├── App.tsx
│   │   └── index.tsx
│   ├── package.json
│   └── tsconfig.json
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── controllers/    # Route controllers
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Custom middleware
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Utility functions
│   │   ├── config/         # Configuration files
│   │   └── app.ts
│   ├── package.json
│   └── tsconfig.json
├── shared/                 # Shared types and utilities
│   ├── types/
│   └── utils/
├── docs/                   # Documentation
├── tests/                  # Test files
├── docker-compose.yml
├── .gitignore
├── .env.example
├── README.md
└── package.json            # Root package.json for scripts
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/0xafraidoftime/mental-math-app.git
cd mental-math-app
```

2. **Install dependencies**
```bash
# Install root dependencies
npm install

# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

3. **Environment Setup**
```bash
# Copy environment variables
cp .env.example .env

# Edit .env file with your configuration
# - MongoDB connection string
# - JWT secret
# - Port configurations
```

4. **Start the development servers**
```bash
# From the root directory
npm run dev
```

This will start both the client (React) and server (Node.js) in development mode.

### Using Docker

1. **Build and run with Docker Compose**
```bash
docker-compose up --build
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Practice Sessions
- `GET /api/practice/question` - Get next question
- `POST /api/practice/answer` - Submit answer
- `GET /api/practice/session/:id` - Get session details
- `POST /api/practice/session` - Start new session

### Analytics
- `GET /api/analytics/stats` - Get user statistics
- `GET /api/analytics/progress` - Get progress data
- `GET /api/analytics/leaderboard` - Get leaderboard

## Core Features Implementation

### Adaptive Difficulty Algorithm

The application uses a sophisticated algorithm to adjust question difficulty:

1. **Performance Metrics**: Tracks accuracy, response time, and streak
2. **Difficulty Levels**: 10 levels from beginner to expert
3. **Dynamic Adjustment**: Questions adapt in real-time based on performance
4. **Operation-Specific**: Each arithmetic operation has independent difficulty tracking

### Question Generation

- **Random Generation**: Ensures variety in practice
- **Difficulty-Based Parameters**: Number ranges adjust with difficulty
- **Operation-Specific Logic**: Custom logic for each arithmetic operation
- **Answer Validation**: Robust checking for correct answers

### Performance Tracking

- **Real-time Analytics**: Live performance metrics during practice
- **Historical Data**: Long-term progress tracking
- **Visual Dashboards**: Charts and graphs for progress visualization
- **Achievement System**: Badges and milestones for motivation

## Database Schema

### User Model
```javascript
{
  _id: ObjectId,
  username: String,
  email: String,
  passwordHash: String,
  createdAt: Date,
  profile: {
    firstName: String,
    lastName: String,
    avatar: String,
    preferences: {
      operations: [String],
      sessionLength: Number,
      difficulty: Number
    }
  },
  stats: {
    totalSessions: Number,
    totalQuestions: Number,
    correctAnswers: Number,
    averageAccuracy: Number,
    currentStreak: Number,
    longestStreak: Number
  }
}
```

### Practice Session Model
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  operation: String,
  startTime: Date,
  endTime: Date,
  questions: [{
    question: String,
    correctAnswer: Number,
    userAnswer: Number,
    isCorrect: Boolean,
    responseTime: Number,
    difficulty: Number
  }],
  performance: {
    totalQuestions: Number,
    correctAnswers: Number,
    accuracy: Number,
    averageResponseTime: Number,
    difficultyProgression: [Number]
  }
}
```

## Testing

### Running Tests
```bash
# Run all tests
npm test

# Run client tests
cd client && npm test

# Run server tests
cd server && npm test

# Run tests with coverage
npm run test:coverage
```

### Test Coverage
- Unit tests for utility functions
- Integration tests for API endpoints
- Component tests for React components
- End-to-end tests for user workflows

## Deployment

### Production Build
```bash
# Build the client
cd client && npm run build

# Build the server
cd server && npm run build
```

### Environment Variables

Required environment variables:
- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: JWT signing secret
- `CLIENT_URL`: Frontend URL for CORS

### Deployment Options

1. **Heroku**: Easy deployment with Git integration
2. **AWS**: Scalable cloud deployment
3. **DigitalOcean**: Simple VPS deployment
4. **Vercel/Netlify**: For client-side deployment

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write tests for new features
- Use conventional commit messages
- Update documentation for API changes
- Follow the established code style (ESLint/Prettier)

## Performance Optimizations

- **Code Splitting**: Dynamic imports for better load times
- **Caching**: Redis for session and question caching
- **Database Indexing**: Optimized queries for performance
- **CDN Integration**: Static asset delivery optimization
- **Progressive Web App**: Offline functionality and caching

## Security Features

- **Authentication**: JWT-based secure authentication
- **Password Security**: bcrypt hashing with salt
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS Configuration**: Secure cross-origin requests

## Roadmap

### Phase 1 (Current)
- [x] Basic arithmetic operations
- [x] User authentication
- [x] Performance tracking
- [x] Adaptive difficulty

### Phase 2 (Coming Soon)
- [ ] Advanced operations (fractions, decimals)
- [ ] Multiplayer competitions
- [ ] Teacher dashboard
- [ ] Mobile app (React Native)

### Phase 3 (Future)
- [ ] AI-powered personalized learning
- [ ] Voice input/output
- [ ] Advanced analytics with ML
- [ ] Gamification features

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.md) file for details.

## Acknowledgments

- Inspired by MathTrainer.ai
- Built with modern web technologies
- Community-driven development

## Support

For support and questions:
- Create an issue on GitHub
- Email: support@mentalmath-app.com
- Documentation: [docs/](docs/)

---
