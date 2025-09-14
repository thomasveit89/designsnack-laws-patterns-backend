# DESIGNSNACK Laws & Patterns - AI-Powered Content Management System

Complete backend infrastructure for the DESIGNSNACK Laws & Patterns mobile app, featuring AI-powered content creation, quality auditing, and dynamic content management.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Test the system
npm run test-api
```

## 📋 Available Commands

### 🎨 **Content Creation**

#### `npm run add-principle`
**AI-Powered Principle Creation**
- Interactive tool to create new UX principles with AI assistance
- Generates comprehensive content including title, definition, examples, do/don't lists
- Automatically validates against database schema
- Option to generate quiz questions for new principles

```bash
npm run add-principle
# Follow prompts to enter principle name (e.g., "Progressive Disclosure")
# AI generates complete principle data
# Review and confirm before saving to database
```

#### `npm run expand-questions`
**AI Question Bank Expansion**
- Generate additional quiz questions for existing principles
- Interactive principle selection (by number, name search, or "all")
- Configurable difficulty levels (easy, medium, hard)
- Batch question generation with progress tracking

```bash
npm run expand-questions
# Select principles to expand questions for
# Choose difficulty and quantity
# AI generates high-quality quiz questions
```

### 🔍 **Content Quality & Auditing**

#### `npm run audit-content`
**AI-Powered Content Quality Audit**
- Comprehensive quality assessment of existing principles
- **4 Selection Methods**:
  1. All principles
  2. Low quality only (score < 7/10)
  3. Select specific principles (`"1,3,5"` or `"1-5"`)
  4. Search by name/category (`"fitts"`, `"cognitive_bias"`)
- **Two Audit Types**:
  - Quick audit (quality scores only)
  - Detailed audit (with AI improvement suggestions + option to save)
- **Quality Checks**:
  - Content clarity and educational value
  - Structural completeness (missing fields, formatting)
  - Category consistency and validation

```bash
npm run audit-content
# Choose audit type and scope
# Review quality reports
# Optionally save AI-generated improvements
```

#### `npm run auto-fix-data`
**Automatic Data Structure Fixes**
- Automatically fixes common structural issues
- **Fixes Applied**:
  - Category formatting (e.g., "Cognitive Biases" → "decisions")
  - Missing `appliesWhen` contexts
  - Missing `tags`
  - Category mapping to standard values (`usability`, `decisions`, `attention`, `memory`)

```bash
npm run auto-fix-data
# Automatically scans and fixes structural issues
# No user input required
```

#### `npm run fix-data`
**Interactive Data Structure Diagnostics**
- Comprehensive structural quality analysis
- Shows detailed issues and suggested fixes
- Interactive confirmation for applying fixes
- Identifies manual improvements needed

### 🧪 **Development & Testing**

#### `npm run test-api`
**System Health Check**
- Tests database connection
- Validates environment variables
- Shows database statistics
- Verifies API functionality

#### `npm run test-principle`
**Test Principle Creation**
- Creates a test principle to verify database functionality
- Shows complete creation workflow

#### `npm run test-update`
**Test Principle Updates**
- Tests the principle update functionality
- Verifies database update operations

#### `npm run demo-audit`
**Audit System Demo**
- Shows available audit selection features
- Displays principle categories and counts
- Demonstrates search capabilities

### 🚀 **Deployment**

#### `npm run dev`
**Local Development Server**
- Starts Vercel development server
- Enables local API testing
- Hot reload for development

#### `npm run deploy`
**Production Deployment**
- Deploys to Vercel production environment
- Runs build process and optimizations

### 🛠️ **Legacy Commands**

#### `npm run seed`
**Database Seeding**
- Seeds database with initial question data
- Sets up basic content structure

#### `npm run generate`
**Legacy Question Generation**
- Original question generation script
- Use `expand-questions` for better functionality

## 🎯 **Common Workflows**

### **Adding New UX Principles**
```bash
# 1. Create new principle with AI
npm run add-principle

# 2. Fix any structural issues
npm run auto-fix-data

# 3. Audit and improve quality
npm run audit-content

# 4. Generate quiz questions
npm run expand-questions
```

### **Improving Content Quality**
```bash
# 1. Find low-quality principles
npm run audit-content
# Choose: Detailed audit → Low quality only

# 2. Fix structural issues first
npm run auto-fix-data

# 3. Review and apply AI improvements
npm run audit-content
# Choose: Detailed audit → Specific principles
```

### **Bulk Content Management**
```bash
# 1. Audit all cognitive biases
npm run audit-content
# Choose: Detailed → Search → "cognitive_bias"

# 2. Generate questions for multiple principles
npm run expand-questions
# Choose: Multiple selection → "1,5,10-15"

# 3. Fix any remaining issues
npm run auto-fix-data
```

## 📊 **Selection Syntax**

### **Principle Selection Options**
- **Single**: `"1"` (principle #1)
- **Multiple**: `"1,3,5"` (principles #1, #3, #5)
- **Ranges**: `"1-5"` (principles 1 through 5)
- **Mixed**: `"1,3,7-10,15"` (principle #1, #3, range 7-10, and #15)
- **All**: `"all"` (all principles)

### **Search Terms**
- **By name**: `"fitts"` → finds "Fitts's Law"
- **By type**: `"cognitive_bias"` → finds all cognitive bias principles
- **By category**: `"usability"` → finds all usability category principles
- **Partial match**: `"heuristic"` → finds all heuristic-type principles

## 🏗️ **Architecture**

### **Tech Stack**
- **Backend**: Vercel Serverless Functions (Node.js/TypeScript)
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **AI**: OpenAI GPT-4 for content generation and quality assessment
- **Mobile App**: React Native with Expo Router

### **Data Flow**
1. **Content Creation**: AI generates → Review → Save to Supabase
2. **Mobile Sync**: App syncs content from API → Caches offline → Background updates
3. **Quality Management**: Audit content → Apply improvements → Update database

### **Database Schema**
- **Principles**: Core UX principles with metadata
- **Questions**: Quiz questions linked to principles
- **Categories**: Standard categories (`usability`, `decisions`, `attention`, `memory`)
- **Types**: Principle types (`ux_law`, `cognitive_bias`, `heuristic`)

## 🔧 **Configuration**

### **Environment Variables**
```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Development
NODE_ENV=development
```

### **Content Standards**
- **Categories**: `usability`, `decisions`, `attention`, `memory`
- **Types**: `ux_law`, `cognitive_bias`, `heuristic`
- **One-liner**: Max 100 characters
- **Do/Don't items**: 3-4 items each (recommended)
- **AppliesWhen**: 4 contextual scenarios
- **Tags**: 2-4 relevant UX concepts

## 📊 **API Endpoints**

### Health Check
```
GET /api/health
```

### Get Principles
```
GET /api/principles
```
Returns all principles and categories with metadata.

### Get Quiz Questions
```
POST /api/quiz/questions
```

**Body:**
```json
{
  "principleIds": ["uuid1", "uuid2"],
  "limit": 10,
  "difficulty": "medium",
  "excludeIds": ["uuid3"]
}
```

### Sync Questions
```
POST /api/quiz/sync
```
Returns questions for offline sync to mobile apps.

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

## 📱 **Mobile App Integration**

The mobile app automatically:
- ✅ Syncs new principles without app updates
- ✅ Caches content for offline use
- ✅ Updates questions dynamically
- ✅ Handles content versioning

### **Update Your Mobile App**

Replace static JSON imports with dynamic API calls:

```typescript
// Before: Static import
import principlesData from './data/principles.json';

// After: Dynamic API
import { ApiService } from './lib/api';
const principles = await ApiService.getPrinciples();
```

## 🎉 **Features**

### **AI-Powered Content Creation**
- Generate comprehensive UX principles from simple prompts
- Automatic categorization and tagging
- Real-world examples and references
- Professional definitions and guidance

### **Quality Assurance**
- Structural validation (missing fields, formatting)
- Content quality scoring (1-10)
- AI-powered improvement suggestions
- Automated fixes for common issues

### **Flexible Management**
- Surgical principle selection
- Bulk operations support
- Search and filter capabilities
- Interactive confirmation workflows

### **Production Ready**
- Offline-first mobile app support
- Scalable serverless architecture
- Comprehensive error handling
- Development and production environments

## 🔒 **Security**

- **API keys secured** on Vercel (not in mobile app)
- **Row Level Security** enabled on Supabase
- **CORS configuration** for mobile app access
- **Rate limiting** built into OpenAI service
- **Input validation** on all endpoints

## 💰 **Cost Management**

### **OpenAI Usage**
- **Estimated cost per principle**: ~$0.02-0.05
- **Total for 22 principles**: ~$1-2 for full content generation
- **One-time generation** eliminates per-user costs

## 🚨 **Troubleshooting**

### **Common Issues**

**Environment Variables Not Loading**
- Use `dotenv -e .env -- tsx script.ts` format
- Verify all required environment variables are set

**Database Connection Failed**
- Verify Supabase environment variables
- Check database URL and keys
- Ensure Row Level Security policies are correct

**OpenAI API Errors**
- Verify API key is valid and has credits
- Check rate limits (especially for free tier)
- Review request formatting in logs

### **Debug Mode**
Enable verbose logging:
```bash
DEBUG=1 npm run [command]
```

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly with `npm run test-api`
5. Submit a pull request

## 📄 **License**

MIT License - see LICENSE file for details.

---

**Built with ❤️ for UX education and powered by AI**