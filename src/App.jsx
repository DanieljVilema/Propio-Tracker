import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { db, authReadyPromise } from './firebase';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { Dashboard } from './components/Dashboard';
import { CallTracker } from './components/CallTracker';
import { GoalList } from './components/GoalList';
import { AddGoalForm } from './components/AddGoalForm';
import { Leaderboard } from './components/Leaderboard';
import { MyStats } from './components/MyStats';
import { NicknameModal } from './components/NicknameModal';
import { Timer, Trophy, User, Settings, BarChart3 } from 'lucide-react';

function getTodayISO() {
  return new Date().toISOString().split('T')[0];
}

function App() {
  // --- State ---
  const [savedEarnings, setSavedEarnings] = useState(() => {
    const saved = localStorage.getItem('propio_earnings');
    return saved ? parseFloat(saved) : 0;
  });

  const [lastResetDate, setLastResetDate] = useState(() => {
    return localStorage.getItem('propio_last_date') || new Date().toDateString();
  });

  const [ratePerMinute, setRatePerMinute] = useState(() => {
    const saved = localStorage.getItem('propio_rate');
    return saved ? parseFloat(saved) : 0.11;
  });

  const [goals, setGoals] = useState(() => {
    const saved = localStorage.getItem('propio_goals');
    return saved ? JSON.parse(saved) : [];
  });

  const [initialBalance, setInitialBalance] = useState(() => {
    const saved = localStorage.getItem('propio_initial_balance');
    return saved ? parseFloat(saved) : 0;
  });

  const [savedSeconds, setSavedSeconds] = useState(() => {
    const saved = localStorage.getItem('propio_seconds');
    return saved ? parseFloat(saved) : 0;
  });

  const [isCallActive, setIsCallActive] = useState(false);
  const [callStartTime, setCallStartTime] = useState(null);
  const [currentSessionEarnings, setCurrentSessionEarnings] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);

  // Nickname
  const [nickname, setNickname] = useState(() => {
    return localStorage.getItem('propio_nickname') || '';
  });
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null); // null | 'syncing' | 'synced' | 'error'
  const [lastSyncTime, setLastSyncTime] = useState(() => {
    return localStorage.getItem('propio_last_sync') || null;
  });

  // --- Effects ---

  // Daily Reset Logic
  useEffect(() => {
    const today = new Date().toDateString();
    if (today !== lastResetDate) {
      setSavedEarnings(0);
      setSavedSeconds(0);
      setLastResetDate(today);
      localStorage.setItem('propio_last_date', today);
    }
  }, [lastResetDate]);

  // Persistence
  useEffect(() => {
    localStorage.setItem('propio_earnings', savedEarnings);
    localStorage.setItem('propio_seconds', savedSeconds);
    localStorage.setItem('propio_rate', ratePerMinute);
    localStorage.setItem('propio_goals', JSON.stringify(goals));
    localStorage.setItem('propio_initial_balance', initialBalance);
  }, [savedEarnings, savedSeconds, ratePerMinute, goals, initialBalance]);

  // Timer Logic
  useEffect(() => {
    let interval;
    if (isCallActive && callStartTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const diffSeconds = (now - callStartTime) / 1000;
        setDurationSeconds(diffSeconds);

        const minutes = diffSeconds / 60;
        setCurrentSessionEarnings(minutes * ratePerMinute);
      }, 100);
    } else {
      setDurationSeconds(0);
      setCurrentSessionEarnings(0);
    }
    return () => clearInterval(interval);
  }, [isCallActive, callStartTime, ratePerMinute]);

  // --- Firebase Sync ---

  const syncToFirestore = useCallback(async (totalSeconds, totalEarnings) => {
    if (!nickname) return;

    // Wait for anonymous auth before writing to Firestore
    const user = await authReadyPromise;
    if (!user) return;

    const today = getTodayISO();
    const docId = `${nickname}_${today}`;
    const totalMinutes = totalSeconds / 60;

    try {
      const docRef = doc(db, 'dailyLogs', docId);
      const existing = await getDoc(docRef);
      const existingData = existing.exists() ? existing.data() : {};

      await setDoc(docRef, {
        nickname,
        date: today,
        autoMinutes: totalMinutes,
        autoEarnings: totalEarnings,
        adjustmentAmount: existingData.adjustmentAmount || 0,
        adjustmentNote: existingData.adjustmentNote || '',
        totalEarnings: totalEarnings + (existingData.adjustmentAmount || 0),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error syncing to Firestore:', err);
    }
  }, [nickname]);

  // --- Handlers ---

  const startCall = () => {
    if (isCallActive) return;
    setCallStartTime(Date.now());
    setIsCallActive(true);
  };

  const stopCall = () => {
    if (!isCallActive) return;

    const now = Date.now();
    const diffSeconds = (now - callStartTime) / 1000;
    const minutes = diffSeconds / 60;
    const finalEarnings = minutes * ratePerMinute;

    const newSavedEarnings = savedEarnings + finalEarnings;
    const newSavedSeconds = savedSeconds + diffSeconds;

    setSavedEarnings(newSavedEarnings);
    setSavedSeconds(newSavedSeconds);

    setIsCallActive(false);
    setCallStartTime(null);
    setCurrentSessionEarnings(0);
    setDurationSeconds(0);
  };

  const toggleCall = () => {
    if (isCallActive) {
      stopCall();
    } else {
      startCall();
    }
  };

  const addGoal = (goal) => {
    setGoals(prev => [...prev, { ...goal, id: crypto.randomUUID() }]);
  };

  const deleteGoal = (id) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const resetEarnings = () => {
    setIsCallActive(false);
    setCallStartTime(null);
    setCurrentSessionEarnings(0);
    setDurationSeconds(0);
    setSavedEarnings(0);
    setSavedSeconds(0);
    setInitialBalance(0);
  };

  const manualSync = async () => {
    if (!nickname) {
      setShowNicknameModal(true);
      return;
    }
    setSyncStatus('syncing');
    try {
      const totalEarnings = initialBalance + savedEarnings;
      await syncToFirestore(savedSeconds, totalEarnings);
      const now = new Date().toISOString();
      setLastSyncTime(now);
      localStorage.setItem('propio_last_sync', now);
      setSyncStatus('synced');
      setTimeout(() => setSyncStatus(null), 3000);
      return true; // success signal for leaderboard refresh
    } catch {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus(null), 3000);
      return false;
    }
  };

  // --- Nickname Handlers ---

  const handleNicknameSubmit = async (newNickname) => {
    if (newNickname === nickname) {
      setShowNicknameModal(false);
      return {};
    }

    // Ensure auth is ready before touching Firestore
    const user = await authReadyPromise;
    if (!user) return { error: 'Authentication failed. Try again.' };

    try {
      // Check if nickname exists
      const userDocRef = doc(db, 'users', newNickname);
      const existing = await getDoc(userDocRef);

      if (existing.exists() && newNickname !== nickname) {
        return { error: `"${newNickname}" is already taken. Choose another.` };
      }

      // If changing nickname, migrate data
      if (nickname && nickname !== newNickname) {
        // Move user doc
        const oldUserRef = doc(db, 'users', nickname);
        const oldUserSnap = await getDoc(oldUserRef);

        await setDoc(userDocRef, {
          nickname: newNickname,
          avatarColor: oldUserSnap.exists() ? oldUserSnap.data().avatarColor : null,
          createdAt: oldUserSnap.exists() ? oldUserSnap.data().createdAt : serverTimestamp(),
        });
        await deleteDoc(oldUserRef);

        // Migrate daily logs
        const logsQuery = query(
          collection(db, 'dailyLogs'),
          where('nickname', '==', nickname)
        );
        const logsSnap = await getDocs(logsQuery);

        for (const logDoc of logsSnap.docs) {
          const data = logDoc.data();
          const newDocId = `${newNickname}_${data.date}`;
          await setDoc(doc(db, 'dailyLogs', newDocId), {
            ...data,
            nickname: newNickname,
            updatedAt: serverTimestamp(),
          });
          await deleteDoc(logDoc.ref);
        }
      } else {
        // New user
        await setDoc(userDocRef, {
          nickname: newNickname,
          createdAt: serverTimestamp(),
        });
      }

      setNickname(newNickname);
      localStorage.setItem('propio_nickname', newNickname);
      setShowNicknameModal(false);
      return {};
    } catch (err) {
      console.error('Error setting nickname:', err);
      return { error: 'Error saving nickname. Check your connection.' };
    }
  };

  // --- Adjustment Handler ---

  const handleAdjustment = async (correctedTotal, note) => {
    if (!nickname) return;

    const today = getTodayISO();
    const docId = `${nickname}_${today}`;
    const totalEarnings = initialBalance + savedEarnings;
    const adjustmentAmount = correctedTotal - totalEarnings;

    try {
      const docRef = doc(db, 'dailyLogs', docId);
      const existing = await getDoc(docRef);
      const existingData = existing.exists() ? existing.data() : {};

      await setDoc(docRef, {
        nickname,
        date: today,
        autoMinutes: existingData.autoMinutes || (savedSeconds / 60),
        autoEarnings: existingData.autoEarnings || totalEarnings,
        adjustmentAmount,
        adjustmentNote: note || '',
        totalEarnings: correctedTotal,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error saving adjustment:', err);
    }
  };

  const totalEarnedToday = initialBalance + savedEarnings + currentSessionEarnings;
  const totalSecondsToday = savedSeconds + durationSeconds;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <header style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <h1 className="text-gradient" style={{ margin: 0, fontSize: '2.2rem' }}>Propio Tracker</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.85rem' }}>
          Stay focused. Hit your goals.
        </p>
      </header>

      {/* Navigation */}
      <nav className="nav-tabs">
        <NavLink to="/" end className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}>
          <Timer size={16} /> Tracker
        </NavLink>
        <NavLink to="/stats" className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}>
          <BarChart3 size={16} /> My Stats
        </NavLink>
        <NavLink to="/leaderboard" className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}>
          <Trophy size={16} /> Leaderboard
        </NavLink>
      </nav>

      {/* Nickname bar */}
      <div className="nickname-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <User size={14} />
          <span style={{ fontSize: '0.85rem' }}>
            {nickname ? (
              <>Playing as <strong>{nickname}</strong></>
            ) : (
              <span style={{ color: 'var(--text-secondary)' }}>No nickname set</span>
            )}
          </span>
        </div>
        <button
          onClick={() => setShowNicknameModal(true)}
          className="btn"
          style={{
            padding: '0.3rem 0.75rem',
            fontSize: '0.8rem',
            background: 'rgba(255,255,255,0.05)',
            color: 'var(--text-secondary)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <Settings size={12} /> {nickname ? 'Change' : 'Set Nickname'}
        </button>
      </div>

      {/* Routes */}
      <Routes>
        <Route path="/" element={
          <>
            <Dashboard
              totalEarnedToday={totalEarnedToday}
              totalSecondsToday={totalSecondsToday}
              ratePerMinute={ratePerMinute}
              setRatePerMinute={setRatePerMinute}
              initialBalance={initialBalance}
              setInitialBalance={setInitialBalance}
              onResetEarnings={resetEarnings}
              onSync={manualSync}
              syncStatus={syncStatus}
              lastSyncTime={lastSyncTime}
            />

            <div style={{ marginBottom: '2rem' }}>
              <CallTracker
                isCallActive={isCallActive}
                onToggle={toggleCall}
                currentEarnings={currentSessionEarnings}
                durationSeconds={durationSeconds}
                ratePerMinute={ratePerMinute}
              />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <GoalList
                goals={goals}
                totalEarnings={totalEarnedToday}
                onDeleteGoal={deleteGoal}
              />
            </div>

            <AddGoalForm onAddGoal={addGoal} />
          </>
        } />

        <Route path="/stats" element={
          nickname ? (
            <MyStats nickname={nickname} />
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Set a nickname to see your stats
              </p>
              <button
                onClick={() => setShowNicknameModal(true)}
                className="btn btn-primary"
              >
                Set Nickname
              </button>
            </div>
          )
        } />

        <Route path="/leaderboard" element={
          nickname ? (
            <Leaderboard
              nickname={nickname}
              onRequestAdjustment={handleAdjustment}
            />
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👤</div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Set a nickname to access the leaderboard
              </p>
              <button
                onClick={() => setShowNicknameModal(true)}
                className="btn btn-primary"
              >
                Set Nickname
              </button>
            </div>
          )
        } />
      </Routes>

      {/* Nickname Modal */}
      {showNicknameModal && (
        <NicknameModal
          currentNickname={nickname}
          onSubmit={handleNicknameSubmit}
        />
      )}
    </div>
  );
}

export default App;
