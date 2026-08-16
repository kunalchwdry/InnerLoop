<div align="center">

<img src="./assets/banner.png" alt="InnerLoop Banner" width="100%">

<br>

# 🔄 InnerLoop

### AI-Powered Student Productivity & Personal Growth Platform

<p>
  <b>Plan.</b> &nbsp;→&nbsp;
  <b>Execute.</b> &nbsp;→&nbsp;
  <b>Track.</b> &nbsp;→&nbsp;
  <b>Improve.</b>
</p>

<p>
  <a href="#-about">About</a> •
  <a href="#-features">Features</a> •
  <a href="#-ai-assistant">AI Assistant</a> •
  <a href="#-voice-assistant">Voice</a> •
  <a href="#-technology-stack">Tech Stack</a> •
  <a href="#-roadmap">Roadmap</a>
</p>

</div>

---

## 🧠 About

**InnerLoop** is an AI-powered productivity and personal growth platform designed specifically for students.

It brings everyday student activities into one connected ecosystem:

```text
📋 Tasks
   +
📅 Timetable
   +
🔁 Habits
   +
🏋️ Exercise
   +
😴 Sleep
   +
📊 Analytics
   +
🤖 AI Assistant
   +
🎙️ Voice
   ↓
🔄 INNERLOOP
```

Instead of switching between multiple productivity applications, InnerLoop gives students a single place to **plan their day, execute their work, track their progress, and continuously improve**.

---

## 🎯 The Idea

Students often manage different parts of their lives using different applications.

One app for tasks.

Another for schedules.

Another for habits.

Another for fitness.

Another for notes.

And sometimes another AI chatbot for planning.

**InnerLoop connects these pieces together.**

The goal is to create an intelligent personal productivity system that understands the user's routine and helps them make better decisions.

---

# ✨ Features

<table>
<tr>
<td width="50%">

### 📋 Task Management

* Create tasks
* Edit tasks
* Complete tasks
* Delete tasks
* Search tasks
* Track deadlines
* Manage academic work

</td>

<td width="50%">

### 🔁 Habit Tracking

* Create habits
* Track habits
* Log habits
* Edit habits
* Delete habits
* Monitor consistency
* View progress

</td>
</tr>

<tr>
<td>

### 📅 Smart Timetable

* Create study sessions
* Edit sessions
* Delete sessions
* View daily schedules
* Move sessions
* Copy schedules

</td>

<td>

### 🏋️ Exercise

* Log workouts
* Track activity
* View history
* Monitor exercise patterns

</td>
</tr>

<tr>
<td>

### 😴 Sleep Tracking

* Record sleep
* View sleep history
* Analyze patterns
* Connect sleep with productivity

</td>

<td>

### 📊 Analytics

* Daily productivity
* Weekly productivity
* Habit analytics
* Sleep insights
* Exercise insights
* Daily summaries

</td>
</tr>
</table>

---

# 🤖 AI Assistant

The heart of InnerLoop is its **AI Assistant**.

Instead of manually navigating through every page, users can simply tell InnerLoop what they want.

### 💬 Natural Language

```text
"Add drinking water as a daily habit."

"Create a task to finish my chemistry assignment tomorrow."

"Add DSA tomorrow from 7 PM to 8 PM."

"Move my DSA session to 8 PM."

"What should I work on today?"

"Show my tasks for today."

"How productive was I this week?"
```

The AI can interact with the user's InnerLoop data through dedicated tools.

```text
                     USER
                       │
                 Text / Voice
                       │
                       ▼
              ┌─────────────────┐
              │  INNERLOOP AI   │
              │    ASSISTANT    │
              └────────┬────────┘
                       │
                 Tool Calling
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
      TASKS          HABITS       TIMETABLE
        │              │              │
        ├──────────────┼──────────────┤
        ▼              ▼              ▼
    EXERCISE         SLEEP        ANALYTICS
                       │
                       ▼
                  SUPABASE DB
```

---

# 🎙️ Voice Assistant

InnerLoop is designed to support **hands-free productivity**.

Users can talk to InnerLoop instead of typing.

### Voice Flow

```text
🎙️ Speak
   ↓
🗣️ Speech Recognition
   ↓
🧠 AI Processing
   ↓
⚙️ Tool Execution
   ↓
💬 AI Response
   ↓
🔊 Text-to-Speech
```

Example:

> **User:** "Add reading for 30 minutes as a daily habit."

> **InnerLoop:** Creates the habit and confirms the action.

The voice system uses browser-native speech technologies, keeping the basic voice interaction lightweight and accessible.

---

# 🧩 AI Capabilities

The InnerLoop AI is designed to interact with multiple parts of the platform.

| Domain           | AI Capability                            |
| ---------------- | ---------------------------------------- |
| 📋 Tasks         | Create, update, delete, complete, search |
| 🔁 Habits        | Create, update, delete, log, track       |
| 📅 Timetable     | Create, update, delete, copy             |
| 🏋️ Exercise     | Create, update, log, list                |
| 😴 Sleep         | Create, update, list                     |
| 📊 Analytics     | Productivity & progress insights         |
| 🔔 Notifications | Create reminders                         |

---

# 🛠️ Technology Stack

<div align="center">

| Technology              | Purpose             |
| ----------------------- | ------------------- |
| ⚛️ React                | Frontend            |
| ⚡ Vite                  | Development & Build |
| 🎨 Tailwind CSS         | UI Styling          |
| 🗄️ Supabase            | Backend & Database  |
| 🔐 Supabase Auth        | Authentication      |
| 🐘 PostgreSQL           | Database            |
| 🤖 LLM API              | AI Assistant        |
| 🎙️ Web Speech API      | Speech Recognition  |
| 🔊 Speech Synthesis API | Text-to-Speech      |
| 📊 Recharts             | Analytics           |
| 🧭 React Router         | Navigation          |

</div>

---

# 🔐 Security

InnerLoop follows a secure architecture for user data and AI integrations.

### Security Principles

* 🔐 Supabase Authentication
* 🛡️ Row Level Security
* 👤 User-scoped database operations
* 🔑 API keys stored server-side
* 🚫 No secret API keys exposed in frontend
* 🔒 Authenticated AI requests

The AI assistant operates within the authenticated user's context.

---

# 🏗️ Architecture

```text
                         ┌───────────────┐
                         │     USER      │
                         └───────┬───────┘
                                 │
                         Text / Voice
                                 │
                                 ▼
                      ┌───────────────────┐
                      │  React Frontend   │
                      └─────────┬─────────┘
                                │
                                ▼
                     ┌────────────────────┐
                     │   InnerLoop AI     │
                     │     Assistant      │
                     └──────────┬─────────┘
                                │
                          Function Calls
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
              ▼                 ▼                 ▼
           Tasks             Habits          Timetable
              │                 │                 │
              ├─────────────────┼─────────────────┤
              │                 │                 │
              ▼                 ▼                 ▼
          Exercise            Sleep           Analytics
                                │
                                ▼
                         ┌──────────────┐
                         │   Supabase   │
                         │ PostgreSQL   │
                         └──────────────┘
```

---

# 📁 Project Structure

```text
InnerLoop/
│
├── 📁 public/
│
├── 📁 src/
│   ├── 📁 components/
│   ├── 📁 config/
│   ├── 📁 context/
│   ├── 📁 hooks/
│   ├── 📁 lib/
│   ├── 📁 pages/
│   ├── 📁 types/
│   ├── App.jsx
│   └── main.jsx
│
├── 📁 supabase/
│   ├── 📁 functions/
│   │   └── innerloop-ai/
│   └── 📁 migrations/
│
├── 📄 package.json
├── 📄 vite.config.js
├── 📄 tailwind.config.js
└── 📄 README.md
```

---

# 🔄 The InnerLoop Philosophy

InnerLoop is based on a simple continuous-improvement cycle:

<div align="center">

```text
        ┌───────────┐
        │   PLAN    │
        └─────┬─────┘
              ↓
        ┌───────────┐
        │  EXECUTE  │
        └─────┬─────┘
              ↓
        ┌───────────┐
        │   TRACK   │
        └─────┬─────┘
              ↓
        ┌───────────┐
        │  ANALYZE  │
        └─────┬─────┘
              ↓
        ┌───────────┐
        │  IMPROVE  │
        └─────┬─────┘
              │
              └──────────→ PLAN
```

</div>

The system continuously turns daily activity into useful information that can help the user improve their routine.

---

# 🗺️ Roadmap

## Phase 1 — Foundation

* [x] Authentication
* [x] Dashboard
* [x] Task management
* [x] Habit tracking
* [x] Timetable
* [x] Exercise tracking
* [x] Sleep tracking
* [x] Analytics

## Phase 2 — AI

* [x] AI Assistant
* [x] Natural-language commands
* [x] AI task management
* [x] AI habit management
* [x] AI timetable management
* [x] AI analytics
* [ ] Personalized recommendations

## Phase 3 — Voice

* [x] Speech recognition
* [x] Voice commands
* [x] Text-to-speech
* [ ] Improved conversational voice
* [ ] Multilingual voice support

## Phase 4 — Intelligence

* [ ] Personalized study plans
* [ ] Smart scheduling
* [ ] Productivity pattern detection
* [ ] Adaptive habit recommendations
* [ ] AI-generated daily plans
* [ ] Long-term productivity insights

---

# 📸 Screenshots

Screenshots and demonstrations will be added as development progresses.

```text
assets/
├── banner.png
├── logo.png
└── screenshots/
```

---

# 👨‍💻 Built By

<div align="center">

### Kunal Choudhary

**AI & Data Science Engineering Student**

Building AI-powered products and exploring the intersection of:

**Artificial Intelligence • Software Engineering • Productivity**

</div>

---

# 🚧 Project Status

<div align="center">

**ACTIVE DEVELOPMENT**

InnerLoop is an evolving project.

New features, AI capabilities, integrations, and improvements are being added continuously.

</div>

---

# ⭐ Support

If you like the idea behind InnerLoop, consider giving the repository a ⭐.

More development updates and features are coming soon.

---

<div align="center">

## 🔄 InnerLoop

### **Plan. Execute. Track. Improve.**

Built with ❤️ by **Kunal Choudhary**

</div>
