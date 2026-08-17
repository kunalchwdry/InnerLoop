/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Analytics from '@/pages/Analytics';
import Assistant from '@/pages/Assistant.tsx';
import Notifications from '@/pages/Notifications';
import Calendar from '@/pages/Calendar';
import Community from '@/pages/Community';
import Connect from '@/pages/Connect.tsx';
import Dashboard from '@/pages/Dashboard';
import Exercise from '@/pages/Exercise';
import Habits from '@/pages/Habits';
import HyperFocus from '@/pages/HyperFocus';
import Learning from '@/pages/Learning';
import Login from '@/pages/Login';
import Settings from '@/pages/Settings';
import Sleep from '@/pages/Sleep';
import Tasks from '@/pages/Tasks';
import Timetable from '@/pages/Timetable';
import TimetableDay from '@/pages/TimetableDay';
import __Layout from '@/Layout.jsx';

export const PAGES = {
    "Analytics": Analytics,
    "Assistant": Assistant,
    "Notifications": Notifications,
    "Calendar": Calendar,
    "Community": Community,
    "Connect": Connect,
    "Dashboard": Dashboard,
    "Exercise": Exercise,
    "Habits": Habits,
    "HyperFocus": HyperFocus,
    "Learning": Learning,
    "Login": Login,
    "Settings": Settings,
    "Sleep": Sleep,
    "Tasks": Tasks,
    "Timetable": Timetable,
    "TimetableDay": TimetableDay,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};