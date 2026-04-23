# SkillMatch Database & Setup Guide

## ✅ What's Configured

### Backend (MongoDB)
- **Framework**: Express.js + Mongoose
- **Database**: MongoDB with 12 models defined:
  - User, Job, Application, JobSeekerProfile, EmployerProfile
  - CVAnalysis, InterviewQuestion, InterviewTip
  - Notification, Course, SavedJob, BookmarkedCourse
- **Port**: 3001
- **Routes**: 17 major API endpoints configured

### Frontend (React + Vite)
- **Port**: 3000
- **API Integration**: Connected to backend via `VITE_API_SERVER_URL`
- **UI Framework**: Shadcn + Tailwind CSS

## ⚠️ Before Running the Project

### 1. **Configure Backend Database**

Edit `backend/.env`:
```bash
# Option A: Local MongoDB (install locally first)
MONGODB_URI=mongodb://localhost:27017/skillmatch
NODE_ENV=development

# Option B: MongoDB Atlas (cloud)
MONGODB_URI=mongodb+srv://your-username:your-password@cluster.mongodb.net/skillmatch?retryWrites=true&w=majority
```

### 2. **Set Security Keys**

Update these values in `backend/.env`:
```bash
JWT_SECRET=generate-a-strong-random-string-min-32-chars
OPENAI_API_KEY=sk-your-actual-openai-api-key
CORS_ORIGIN=http://127.0.0.1:3000  # for development
```

### 3. **Verify Frontend Configuration**

`frontend/.env` is already set to:
```bash
VITE_API_SERVER_URL=http://127.0.0.1:3001
```

## 🚀 Running the Project

### Development Mode (Both Frontend & Backend)
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Lint Code
```bash
npm run lint
```

## 📋 Database Models

| Model | Purpose |
|-------|---------|
| User | Authentication & roles (job_seeker, employer, admin) |
| Job | Job listings |
| Application | Job applications |
| JobSeekerProfile | Extended job seeker info |
| EmployerProfile | Extended employer info |
| CVAnalysis | CV analysis results |
| InterviewQuestion | Interview prep questions |
| InterviewTip | Interview tips |
| Notification | Notifications |
| Course | Course recommendations |
| SavedJob | Bookmarked jobs |
| BookmarkedCourse | Bookmarked courses |

## ✅ Verification Checklist

- [ ] MongoDB is running (local or Atlas connection works)
- [ ] `MONGODB_URI` is correctly set in `backend/.env`
- [ ] `JWT_SECRET` is set to a strong value
- [ ] `OPENAI_API_KEY` is configured
- [ ] `VITE_API_SERVER_URL` in frontend matches backend port
- [ ] All dependencies installed (`npm install` in both frontend & backend)
- [ ] Backend starts: `npm run dev --prefix backend`
- [ ] Frontend starts: `npm run dev --prefix frontend`
- [ ] Health check works: `curl http://127.0.0.1:3001/health`

## 🔒 Security Notes

⚠️ **Current Issues to Fix:**
- [ ] Move API keys to environment variables only (not in .env)
- [ ] Set `NODE_ENV=development` for local, `production` for deployment
- [ ] Restrict `CORS_ORIGIN` in production (not `*`)
- [ ] Use `.env.local` and add `.env` to `.gitignore`

## 📝 Next Steps

1. Configure MongoDB connection
2. Set strong JWT_SECRET
3. Install dependencies: `npm install`
4. Run: `npm run dev`
5. Access frontend at `http://127.0.0.1:3000`
6. API backend at `http://127.0.0.1:3001`
