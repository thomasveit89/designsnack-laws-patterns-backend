# DESIGNSNACK Laws & Patterns - Backend API

Production-ready backend service for the DESIGNSNACK Laws & Patterns mobile app. Provides secure AI-powered quiz generation, question management, and offline-first functionality.

## 🏗️ Architecture

- **Vercel Serverless Functions** - API endpoints
- **Supabase PostgreSQL** - Database and real-time features
- **OpenAI GPT-4** - AI-powered question generation
- **TypeScript** - Type safety throughout

## 📁 Project Structure

```
├── api/
│   ├── quiz/
│   │   ├── questions.ts      # Fetch quiz questions
│   │   ├── generate.ts       # Generate new questions via AI
│   │   └── sync.ts          # Sync questions to mobile app
│   └── health.ts            # Health check endpoint
├── lib/
│   ├── types.ts             # Shared TypeScript interfaces
│   ├── supabase.ts          # Database integration
│   └── openai.ts            # AI question generation
├── scripts/
│   ├── seed-questions.ts    # Seed database with principles
│   └── generate-questions.ts # Bulk question generation
├── supabase/
│   └── migrations/          # Database schema and functions
└── package.json
```

## 🚀 Quick Start

### 1. Prerequisites

- Node.js 18+
- Vercel account
- Supabase account
- OpenAI API key

### 2. Environment Setup

Create accounts and get your credentials:

```bash
# Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login
```

### 3. Database Setup

1. Create a new Supabase project
2. Run the migrations:
   ```sql
   -- Copy and run the contents of supabase/migrations/001_initial_schema.sql
   -- Copy and run the contents of supabase/migrations/002_utility_functions.sql
   ```

### 4. Environment Variables

Set these in your Vercel project:

```bash
# Required
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Optional
NODE_ENV=production
```

### 5. Deploy

```bash
# Clone and install
git clone https://github.com/thomasveit89/designsnack-laws-patterns-backend.git
cd designsnack-laws-patterns-backend
npm install

# Deploy to Vercel
vercel --prod
```

## 📊 API Endpoints

### Health Check
```
GET /api/health
```

Returns service status and database statistics.

### Get Quiz Questions
```
GET /api/quiz/questions?principleIds=id1,id2&limit=10&difficulty=medium
POST /api/quiz/questions
```

**Parameters:**
- `principleIds` (required): Comma-separated principle IDs
- `limit` (optional): Number of questions (1-50, default: 10)
- `difficulty` (optional): easy, medium, or hard
- `excludeIds` (optional): Question IDs to exclude

**Response:**
```json
{
  "questions": [
    {
      "id": "uuid",
      "principleId": "uuid",
      "question": "What is Fitts' Law?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Fitts' Law states...",
      "difficulty": "medium",
      "qualityScore": 8
    }
  ],
  "totalAvailable": 50,
  "success": true
}
```

### Generate New Questions
```
POST /api/quiz/generate
```

**Body:**
```json
{
  "principleIds": ["uuid1", "uuid2"],
  "questionsPerPrinciple": 5,
  "difficulty": "medium"
}
```

Generates new questions using AI and saves them to the database.

### Sync Questions
```
GET /api/quiz/sync?lastSync=2024-01-01T00:00:00Z&limit=100
```

Returns questions for offline sync to mobile apps.

## 🛠️ Development

### Local Development

```bash
# Install dependencies
npm install

# Start local dev server
npm run dev

# The API will be available at http://localhost:3000/api/
```

### Database Operations

```bash
# Seed database with principles from mobile app
npm run seed

# Generate questions using AI
npm run generate

# Generate with custom settings
npm run generate -- --questions 10 --difficulty medium --dry-run
```

### Testing

```bash
# Run tests
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

## 🔧 Configuration

### Question Generation Settings

The generation script supports various options:

```bash
# Generate 5 questions per principle
npm run generate -- --questions 5

# Generate only medium difficulty
npm run generate -- --difficulty medium

# Use smaller batches (better for rate limits)
npm run generate -- --batch-size 2

# Preview without generating
npm run generate -- --dry-run
```

### Database Optimization

The system includes several performance optimizations:

- **Random question selection** using database functions
- **Quality scoring** to prioritize better questions
- **Efficient indexing** for fast queries
- **Cleanup functions** to remove low-quality content

## 💰 Cost Management

### OpenAI Usage

- **Estimated cost per principle**: ~$0.02-0.05
- **Total for 20 principles**: ~$1-2 for full question bank
- **One-time generation** eliminates per-user costs

### Optimization Strategies

1. **Pre-generate questions** in bulk during off-peak hours
2. **Cache aggressively** to avoid API calls during app usage
3. **Use fallback questions** when API limits are reached
4. **Quality filtering** to ensure value for money

## 🔒 Security

- **API keys secured** on Vercel (not in mobile app)
- **Row Level Security** enabled on Supabase
- **CORS configuration** for mobile app access
- **Rate limiting** built into OpenAI service
- **Input validation** on all endpoints

## 📱 Mobile App Integration

### Update Your Mobile App

1. **Remove direct OpenAI integration**:
   ```bash
   rm src/lib/openai.ts
   ```

2. **Add API client**:
   ```typescript
   // src/lib/api.ts
   const API_BASE_URL = 'https://your-backend.vercel.app';
   
   export async function fetchQuizQuestions(principleIds: string[]) {
     const response = await fetch(`${API_BASE_URL}/api/quiz/questions`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ principleIds, limit: 10 })
     });
     return response.json();
   }
   ```

3. **Update quiz store** to use the new API
4. **Add offline caching** for better UX

## 📈 Monitoring

### Health Monitoring

Check your API health:
```bash
curl https://your-backend.vercel.app/api/health
```

### Database Analytics

Access the `question_analytics` view in Supabase for insights:
```sql
SELECT * FROM question_analytics ORDER BY question_count DESC;
```

### Vercel Analytics

Monitor performance and usage in the Vercel dashboard.

## 🚨 Troubleshooting

### Common Issues

**Database Connection Failed**
- Verify Supabase environment variables
- Check database URL and keys
- Ensure Row Level Security policies are correct

**OpenAI API Errors**
- Verify API key is valid and has credits
- Check rate limits (especially for free tier)
- Review request formatting in logs

**Questions Not Generating**
- Run `npm run generate -- --dry-run` to test
- Check OpenAI API key permissions
- Verify database can accept new records

### Debug Mode

Enable verbose logging by setting:
```bash
DEBUG=1 npm run generate
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 Related Projects

- [Mobile App](https://github.com/thomasveit89/designsnack-laws-patterns) - React Native app
- [Supabase](https://supabase.com/) - Database and authentication
- [Vercel](https://vercel.com/) - Serverless deployment