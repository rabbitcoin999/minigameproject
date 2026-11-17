PROJECT PLAN — ONLINE MINI GAMES PLATFORM
1. Project Overview
Build a complete online mini-games platform where users can register, log in, play games, save their scores, and compete with other players through global leaderboards.
The platform must be fully functional, responsive, secure, and easy to maintain.
Core Requirements
At least five fully playable games.
Player registration and login.
Unique Player ID and Password authentication.
Automatic game score recording.
Individual leaderboards for every game.
Player profiles and statistics.
Responsive design for desktop, tablet, and mobile.
English-only user interface.
Do not use email addresses or Google accounts for registration or login.

2. Technology Stack
Use the following technologies:
Frontend: Next.js (App Router)
Programming Language: TypeScript
Styling: Tailwind CSS
UI Components: Reusable React components
Database: PostgreSQL
Backend Services: Supabase
Authentication: Custom Player ID authentication
Deployment: Vercel
Use stable, compatible package versions.
Do not introduce unnecessary frameworks or dependencies.
Authentication Architecture
Supabase Auth normally uses email or phone authentication.
Implement Player ID authentication through a secure server-side authentication layer.
Requirements:
Player IDs must be unique.
Passwords must be hashed using Argon2id or bcrypt.
Never store plaintext passwords.
Use secure, HTTP-only session cookies.
Validate all authentication requests on the server.
Apply rate limiting to login and registration endpoints.
Never expose password hashes or session secrets to the frontend.

3. Project Structure
Organize the project using the following structure:
mini-games-platform/
│
├── public/
│   ├── images/
│   ├── icons/
│   └── sounds/
│
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── page.tsx
│   │   │   ├── games/
│   │   │   │   └── page.tsx
│   │   │   ├── leaderboard/
│   │   │   │   └── page.tsx
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   │
│   │   ├── (protected)/
│   │   │   ├── profile/
│   │   │   │   └── page.tsx
│   │   │   └── statistics/
│   │   │       └── page.tsx
│   │   │
│   │   ├── games/
│   │   │   ├── snake/
│   │   │   │   └── page.tsx
│   │   │   ├── 2048/
│   │   │   │   └── page.tsx
│   │   │   ├── memory/
│   │   │   │   └── page.tsx
│   │   │   ├── reaction/
│   │   │   │   └── page.tsx
│   │   │   └── whack-a-mole/
│   │   │       └── page.tsx
│   │   │
│   │   └── api/
│   │       ├── auth/
│   │       ├── scores/
│   │       ├── leaderboard/
│   │       └── players/
│   │
│   ├── components/
│   │   ├── layout/
│   │   ├── navigation/
│   │   ├── games/
│   │   ├── leaderboard/
│   │   ├── profile/
│   │   └── ui/
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── snake/
│   │   ├── 2048/
│   │   ├── memory/
│   │   ├── reaction/
│   │   └── whack-a-mole/
│   │
│   ├── lib/
│   │   ├── database/
│   │   ├── auth/
│   │   ├── validation/
│   │   └── utils/
│   │
│   ├── types/
│   │
│   └── config/
│
├── supabase/
│   └── migrations/
│
├── tests/
│
├── .env.example
├── README.md
├── PLAN.md
└── package.json
You may adjust the structure if necessary, but maintain clear separation between game logic, UI components, authentication, and database operations.

4. Game Development
Implement the following five games.
All games must be fully functional and have their own independent game logic.
GAME 1: Snake
Gameplay:
Control a snake using keyboard arrow keys or WASD.
Collect food to increase the score.
The snake grows after eating food.
Game ends when the snake hits a wall or itself.
Include Start, Pause, Resume, and Restart controls.
Scoring:
Increase score for every food collected.
Save the highest score.
Leaderboard:
Sort players by highest score.
GAME 2: 2048
Gameplay:
Use arrow keys or swipe gestures to move tiles.
Merge tiles with identical values.
Generate new tiles after valid moves.
Game ends when no valid moves remain.
Include Restart and Undo functionality.
Scoring:
Calculate score based on merged tile values.
Save the highest score.
Leaderboard:
Sort players by highest score.
GAME 3: Memory Game
Gameplay:
Display a grid of face-down cards.
Players flip two cards at a time.
Matching cards remain visible.
Non-matching cards flip back.
Game ends when all pairs are matched.
Difficulty:
Easy: 4 pairs.
Medium: 8 pairs.
Hard: 12 pairs.
Scoring:
Record completion time and number of moves.
Primary ranking: fastest completion time.
Use move count as a secondary ranking criterion.
Keep difficulty levels separate in leaderboards.
GAME 4: Reaction Game
Gameplay:
Display a waiting screen.
Wait for a randomized delay.
Change the screen color.
Player clicks or taps as quickly as possible.
Calculate reaction time in milliseconds.
Requirements:
Detect premature clicks.
Display false-start messages.
Include multiple rounds.
Calculate average reaction time.
Prevent impossible reaction times.
Scoring:
Primary ranking: lowest average reaction time.
Store individual round results.
GAME 5: Whack-a-Mole
Gameplay:
Display a grid of mole holes.
Moles appear at random positions.
Players click or tap moles to earn points.
Each game lasts 30 seconds.
Increase difficulty as time passes.
Include a countdown and final results screen.
Scoring:
Normal mole: +1 point.
Optional bonus mole: +3 points.
Missed clicks do not award points.
Leaderboard:
Sort players by highest score.

5. Authentication System
Create a complete registration and login system.
Registration
Required fields:
Player ID
Password
Confirm Password
Rules:
Player ID must contain 3–20 characters.
Allow letters, numbers, and underscores.
Player IDs must be unique.
Password must contain at least 8 characters.
Confirm Password must match.
Display useful validation messages.
Login
Required fields:
Player ID
Password
Features:
Remember login session securely.
Logout functionality.
Protected pages.
Session expiration.
Prevent unauthorized access.
Do not require email verification.

6. Database Design
Use PostgreSQL.
Create the following tables.
Table: players
Column
Type
id
UUID PRIMARY KEY
player_id
VARCHAR UNIQUE
password_hash
TEXT
created_at
TIMESTAMP
updated_at
TIMESTAMP

Table: games
Column
Type
id
UUID PRIMARY KEY
game_key
VARCHAR UNIQUE
name
VARCHAR
description
TEXT
is_active
BOOLEAN

Prepopulate the five games.
Table: game_scores
Column
Type
id
UUID PRIMARY KEY
player_id
UUID FOREIGN KEY
game_id
UUID FOREIGN KEY
score
INTEGER
completion_time
INTEGER NULL
difficulty
VARCHAR NULL
created_at
TIMESTAMP

Store every completed game attempt.
Table: player_stats
Column
Type
id
UUID PRIMARY KEY
player_id
UUID FOREIGN KEY
total_games_played
INTEGER
total_play_time
BIGINT
updated_at
TIMESTAMP

Requirements:
Use database migrations.
Add appropriate indexes.
Enforce foreign key constraints.
Prevent unauthorized database access.
Never expose sensitive account information.

7. Score Management System
After every completed game:
Validate the player’s session.
Validate the submitted score.
Verify that the game exists.
Validate game-specific score rules.
Save the game attempt.
Update player statistics.
Recalculate personal best if necessary.
Update leaderboard results.
Important:
Never trust scores submitted directly from the browser.
Implement server-side validation and reasonable anti-cheat checks.
For games where score verification requires additional protection, use server-generated game sessions, timestamps, and validated gameplay events.

8. Leaderboard System
Create a separate leaderboard for each game.
General Features
Global Top 100.
Display player ranking.
Display Player ID.
Display best score or time.
Highlight Top 3 players.
Show the current player’s ranking.
Pagination.
Automatically update after valid submissions.
Ranking Rules
Game
Ranking Method
Snake
Highest score
2048
Highest score
Memory
Fastest completion
Reaction
Lowest average reaction time
Whack-a-Mole
Highest score

Memory leaderboards must be separated by difficulty.
Use deterministic tie-breaking rules.
Do not display passwords, password hashes, or private session information.

9. Website Design
Create a modern gaming website.
Design Direction
Modern and clean interface.
Dark gaming theme.
Consistent typography.
Smooth animations.
Responsive layouts.
Clear navigation.
Accessible buttons and controls.
Navigation
Main navigation:
Home
Games
Leaderboards
Profile
Authentication navigation:
Login
Register
After login, display the player’s Player ID.
Home Page
Include:
Welcome section.
Featured games.
All five game cards.
Top players.
Recently played games (for logged-in players).
Games Page
Display all five games.
Each game card should include:
Game name.
Game image or icon.
Short description.
Play button.
Personal best, if available.
Profile Page
Display:
Player ID.
Registration date.
Total games played.
Best records.
Recent game history.
Statistics Page
Display:
Games played per game.
Personal bests.
Recent scores.
Performance history.

10. API Architecture
Implement server-side API endpoints.
Authentication
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me
Scores
POST /api/scores
GET /api/scores/history
GET /api/scores/personal-best
Leaderboards
GET /api/leaderboard/[game]
GET /api/leaderboard/[game]/me
Players
GET /api/players/me
PATCH /api/players/me
GET /api/players/me/statistics
All endpoints must validate input and authentication.
Use appropriate HTTP status codes and consistent error responses.

11. Security Requirements
Security is mandatory.
Implement:
Secure password hashing.
HTTP-only session cookies.
CSRF protection where applicable.
Rate limiting.
Input validation.
SQL injection prevention.
Server-side authorization.
Secure environment variables.
Database access restrictions.
Score validation.
Protection against duplicate score submissions.
Never place secret keys in client-side code.
Never commit .env files.

12. Development Phases
Follow these phases in order.
Phase 1 — Project Setup
Initialize Next.js.
Configure TypeScript.
Install dependencies.
Configure Tailwind CSS.
Set up Supabase.
Create the project structure.
Create README.md and PLAN.md.
Phase 2 — Database and Authentication
Create database migrations.
Implement Player ID registration.
Implement login and logout.
Implement secure sessions.
Protect private pages.
Test authentication.
Phase 3 — Website UI
Build navigation.
Build homepage.
Build games page.
Build profile page.
Build leaderboard layout.
Implement responsive design.
Phase 4 — Game Development
Develop games individually in this order:
Snake
2048
Memory Game
Reaction Game
Whack-a-Mole
Test each game before proceeding to the next.
Phase 5 — Score System
Implement score submission.
Implement score validation.
Store game history.
Calculate personal bests.
Update player statistics.
Phase 6 — Leaderboards
Implement all five leaderboards.
Implement ranking algorithms.
Add pagination.
Add player ranking lookup.
Test tie-breaking.
Phase 7 — Final Testing
Test:
Registration.
Login and logout.
Session persistence.
Game functionality.
Score submission.
Personal best updates.
Leaderboard accuracy.
Unauthorized access.
Mobile responsiveness.
Database security.
Phase 8 — Deployment
Prepare production environment.
Configure environment variables.
Apply database migrations.
Deploy to Vercel.
Verify production functionality.

13. Acceptance Criteria
The project is considered complete only when all requirements below are satisfied.
[ ] Players can register using Player ID and Password.
[ ] Players can log in and log out.
[ ] No email address is required.
[ ] All five games are fully playable.
[ ] Games work on desktop and mobile.
[ ] Completed game scores are saved.
[ ] Players can view their personal records.
[ ] Each game has its own global leaderboard.
[ ] Leaderboards display accurate rankings.
[ ] Player statistics update correctly.
[ ] Authentication and database security are implemented.
[ ] No major errors remain.
[ ] All user-facing text is in English.
[ ] README.md documents setup and deployment.

14. Instructions for Claude Code
You are responsible for implementing this project, not merely describing it.
Before writing code:
Inspect the existing project directory.
Read this entire PLAN.md.
Check the existing files and dependencies.
Identify missing requirements.
Create a practical implementation checklist.

## 15. Scalability and Extensibility

The platform must be designed for future expansion.

Adding new games or features must not require rebuilding existing systems.

### 15.1 Modular Game Architecture

Each game must be developed as an independent module.

Every game should contain:
- Game logic
- Game UI
- Game configuration
- Score calculation
- Score validation
- Game-specific components
- Game-specific tests

Games must not directly depend on the internal implementation of other games.

### 15.2 Central Game Registry

Create a centralized game registry.

Each game must register its information through a consistent configuration structure.

Example:

```typescript
interface GameConfig {
  id: string;
  name: string;
  description: string;
  route: string;
  icon: string;
  isActive: boolean;
  scoringType: "highest" | "lowest";
  supportsDifficulty: boolean;
}
```

The platform should use this registry to generate:
- Game listings
- Game cards
- Navigation links
- Leaderboard navigation
- Game availability status

Avoid hardcoding game lists in multiple locations.

### 15.3 Adding New Games

Adding a new game should require only:

1. Create a new game module.
2. Implement its gameplay.
3. Define its score calculation and validation.
4. Register the game in the central game registry.
5. Add its database configuration if necessary.
6. Add game-specific tests.

Existing authentication, player profiles, score storage, and leaderboard systems must remain unchanged.

### 15.4 Shared Platform Services

Build reusable services for:

- Authentication
- Player profiles
- Score submission
- Score validation
- Leaderboards
- Game statistics
- Achievements

All games must use these shared services instead of implementing duplicate systems.

### 15.5 Dynamic Leaderboard System

The leaderboard system must support newly registered games automatically.

Requirements:
- Automatically recognize active games.
- Generate leaderboard pages dynamically.
- Support different ranking methods.
- Support game-specific difficulty levels.
- Support future ranking periods such as daily, weekly, monthly, and all-time.

Do not create a separate leaderboard implementation for every new game.

### 15.6 Future Expansion

Design the architecture to support future features:

- Unlimited additional games.
- Player achievements.
- XP and leveling systems.
- Daily challenges.
- Multiplayer games.
- Friends and social features.
- Tournaments.
- Seasonal leaderboards.
- Game categories and tags.
- Administrative game management.

These features do not need to be implemented initially, but the architecture must not prevent their addition.

### 15.7 Backward Compatibility

When adding new games or features:

- Existing game records must remain intact.
- Existing player accounts must not be affected.
- Existing leaderboard results must remain accurate.
- Database changes must use migrations.
- Avoid breaking changes to shared APIs.

### 15.8 Scalability Acceptance Criteria

The architecture is considered extensible when:

- A new game can be added without modifying authentication.
- A new game can reuse the existing score system.
- A new game can automatically appear in game listings.
- A new game can use the existing leaderboard infrastructure.
- Existing games continue functioning after new games are added.
- Shared components do not require game-specific modifications.

Development rules:
Work phase by phase.
Do not skip requirements.
Do not build all features in one enormous file.
Use reusable components.
Keep game logic separate from UI.
Maintain TypeScript type safety.
Test features before moving forward.
Fix errors before continuing.
Keep documentation updated.
Do not replace working features without a reason.
Never use fake data as a substitute for required backend functionality.
Do not leave unfinished placeholder implementations.
If a required service or environment variable is unavailable, explain what is missing and provide the necessary setup instructions.
After completing each phase:
Summarize what was implemented.
List files created or modified.
Report tests performed.
Report remaining issues.
Continue to the next phase when the current phase passes its tests.
Start with Phase 1.
Do not stop after generating a plan. Implement the actual application step by step.

