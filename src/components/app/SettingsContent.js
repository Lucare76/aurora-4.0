import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiUser, FiMail, FiBell, FiCheck } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import PageHeader from './PageHeader';
import {
  buildDashboardPreview,
  DASHBOARD_SECTIONS,
  getSectionLabel,
  normalizeDashboardOrder
} from '../../utils/dashboardLayout';

function SettingsContent() {
  const { user, userSettings, setUserSettings, isAdmin, userApprovalStatus } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [exporting, setExporting] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const hasLoadedOnceRef = useRef(false);
  const autoSaveTimerRef = useRef(null);

  const [settings, setSettings] = useState({
    reminderEmail: '',
    reminderDaysBefore: 2,
    weatherCity: 'Roma',
    currency: userSettings?.currency || 'EUR',
    savingsTargetType: userSettings?.savingsTargetType || 'percent',
    savingsTargetPercent: userSettings?.savingsTargetPercent ?? 20,
    savingsTargetAmount: userSettings?.savingsTargetAmount ?? 0,
    dashboardMobileMode: userSettings?.dashboardMobileMode || 'normal',
    dashboardOrder: normalizeDashboardOrder(userSettings?.dashboardOrder),
    dashboardShowSubscriptionsDue: userSettings?.dashboardShowSubscriptionsDue ?? false,
    dashboardShowSmartInsights: userSettings?.dashboardShowSmartInsights ?? false,
    dashboardShowForecast: userSettings?.dashboardShowForecast ?? false,
    dashboardShowInsightsBase: userSettings?.dashboardShowInsightsBase ?? false,
    dashboardShowTop5: userSettings?.dashboardShowTop5 ?? false,
    dashboardShowBudgetAlerts: userSettings?.dashboardShowBudgetAlerts ?? false,
    dashboardShowActions: userSettings?.dashboardShowActions ?? false,
    dashboardShowBirthdays: userSettings?.dashboardShowBirthdays ?? false,
    subscriptionsNotificationsEnabled: userSettings?.subscriptionsNotificationsEnabled ?? false,
    subscriptionsNotificationsDays: userSettings?.subscriptionsNotificationsDays ?? 7,
    subscriptionsNotificationsPriceAlert: userSettings?.subscriptionsNotificationsPriceAlert ?? true,
    subscriptionsRecurringEnabled: userSettings?.subscriptionsRecurringEnabled ?? true,
    subscriptionsFixedEnabled: userSettings?.subscriptionsFixedEnabled ?? true,
    familyModeEnabled: userSettings?.familyModeEnabled ?? false,
    familyBudgetsEnabled: userSettings?.familyBudgetsEnabled ?? false,
    familyCommentsEnabled: userSettings?.familyCommentsEnabled ?? false,
    familyApprovalsEnabled: userSettings?.familyApprovalsEnabled ?? false
  });

  const dashboardSettingsPayload = useMemo(
    () => ({
      dashboardMobileMode: settings.dashboardMobileMode || 'normal',
      dashboardOrder: normalizeDashboardOrder(settings.dashboardOrder),
      dashboardShowSubscriptionsDue: settings.dashboardShowSubscriptionsDue === true,
      dashboardShowSmartInsights: settings.dashboardShowSmartInsights === true,
      dashboardShowForecast: settings.dashboardShowForecast === true,
      dashboardShowInsightsBase: settings.dashboardShowInsightsBase === true,
      dashboardShowTop5: settings.dashboardShowTop5 === true,
      dashboardShowBudgetAlerts: settings.dashboardShowBudgetAlerts === true,
      dashboardShowActions: settings.dashboardShowActions === true,
      dashboardShowBirthdays: settings.dashboardShowBirthdays === true
    }),
    [
      settings.dashboardMobileMode,
      settings.dashboardOrder,
      settings.dashboardShowActions,
      settings.dashboardShowBirthdays,
      settings.dashboardShowBudgetAlerts,
      settings.dashboardShowForecast,
      settings.dashboardShowInsightsBase,
      settings.dashboardShowSubscriptionsDue,
      settings.dashboardShowSmartInsights,
      settings.dashboardShowTop5
    ]
  );

  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.uid) return;

      setLoading(true);
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../../services/firebase');

        const userDoc = await getDoc(doc(db, 'users', user.uid));

        if (userDoc.exists()) {
          const data = userDoc.data();
          setSettings({
            reminderEmail: data.reminderEmail || user.email,
            reminderDaysBefore: data.reminderDaysBefore || 2,
            weatherCity: data.weatherCity || 'Roma',
            currency: data.currency || 'EUR',
            savingsTargetType: data.savingsTargetType || 'percent',
            savingsTargetPercent: data.savingsTargetPercent ?? 20,
            savingsTargetAmount: data.savingsTargetAmount ?? 0,
            dashboardMobileMode: data.dashboardMobileMode || 'normal',
            dashboardOrder: normalizeDashboardOrder(data.dashboardOrder),
            dashboardShowSubscriptionsDue: data.dashboardShowSubscriptionsDue ?? false,
            dashboardShowSmartInsights: data.dashboardShowSmartInsights ?? false,
            dashboardShowForecast: data.dashboardShowForecast ?? false,
            dashboardShowInsightsBase: data.dashboardShowInsightsBase ?? false,
            dashboardShowTop5: data.dashboardShowTop5 ?? false,
            dashboardShowBudgetAlerts: data.dashboardShowBudgetAlerts ?? false,
            dashboardShowActions: data.dashboardShowActions ?? false,
            dashboardShowBirthdays: data.dashboardShowBirthdays ?? false,
            subscriptionsNotificationsEnabled: data.subscriptionsNotificationsEnabled ?? false,
            subscriptionsNotificationsDays: data.subscriptionsNotificationsDays ?? 7,
            subscriptionsNotificationsPriceAlert: data.subscriptionsNotificationsPriceAlert ?? true,
            subscriptionsRecurringEnabled: data.subscriptionsRecurringEnabled ?? true,
            subscriptionsFixedEnabled: data.subscriptionsFixedEnabled ?? true,
            familyModeEnabled: data.familyModeEnabled ?? false,
            familyBudgetsEnabled: data.familyBudgetsEnabled ?? false,
            familyCommentsEnabled: data.familyCommentsEnabled ?? false,
            familyApprovalsEnabled: data.familyApprovalsEnabled ?? false
          });
        } else {
          setSettings({
            reminderEmail: user.email,
            reminderDaysBefore: 2,
            weatherCity: 'Roma',
            currency: 'EUR',
            savingsTargetType: 'percent',
            savingsTargetPercent: 20,
            savingsTargetAmount: 0,
            dashboardMobileMode: 'normal',
            dashboardOrder: normalizeDashboardOrder(null),
            dashboardShowSubscriptionsDue: false,
            dashboardShowSmartInsights: false,
            dashboardShowForecast: false,
            dashboardShowInsightsBase: false,
            dashboardShowTop5: false,
            dashboardShowBudgetAlerts: false,
            dashboardShowActions: false,
            dashboardShowBirthdays: false,
            subscriptionsNotificationsEnabled: false,
            subscriptionsNotificationsDays: 7,
            subscriptionsNotificationsPriceAlert: true,
            subscriptionsRecurringEnabled: true,
            subscriptionsFixedEnabled: true,
            familyModeEnabled: false,
            familyBudgetsEnabled: false,
            familyCommentsEnabled: false,
            familyApprovalsEnabled: false
          });
        }
      } catch (error) {
        console.error('Errore caricamento impostazioni:', error);
        setMessage({ text: 'Errore caricamento impostazioni', type: 'error' });
      } finally {
        setLoading(false);
        hasLoadedOnceRef.current = true;
      }
    };

    loadSettings();
  }, [user]);

  useEffect(() => {
    if (!user?.uid || !hasLoadedOnceRef.current) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        const { doc, updateDoc } = await import('firebase/firestore');
        const { db } = await import('../../services/firebase');

        await updateDoc(doc(db, 'users', user.uid), dashboardSettingsPayload);
        if (setUserSettings) {
          setUserSettings((prev) => ({
            ...prev,
            ...dashboardSettingsPayload
          }));
        }
        setMessage((prev) =>
          prev.type === 'error'
            ? prev
            : { text: 'Layout dashboard salvato automaticamente', type: 'success' }
        );
      } catch (error) {
        console.error('Errore autosave dashboard:', error);
        setMessage({ text: 'Errore salvataggio automatico dashboard', type: 'error' });
      }
    }, 700);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [dashboardSettingsPayload, setUserSettings, user?.uid]);

  const handleSave = async () => {
    if (!user?.uid) return;

    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      const { updateReminderSettings, updateWeatherCity } = await import('../../services/userApprovalService');

      const { doc: fbDoc, updateDoc: fbUpdate } = await import('firebase/firestore');
      const { db: fbDb } = await import('../../services/firebase');

      const [result, weatherResult] = await Promise.all([
        updateReminderSettings(user.uid, settings.reminderEmail, settings.reminderDaysBefore),
        updateWeatherCity(user.uid, settings.weatherCity),
        fbUpdate(fbDoc(fbDb, 'users', user.uid), {
          currency: settings.currency,
          savingsTargetType: settings.savingsTargetType,
          savingsTargetPercent: Number(settings.savingsTargetPercent) || 0,
          savingsTargetAmount: Number(settings.savingsTargetAmount) || 0,
          ...dashboardSettingsPayload,
          subscriptionsNotificationsEnabled: !!settings.subscriptionsNotificationsEnabled,
          subscriptionsNotificationsDays: Number(settings.subscriptionsNotificationsDays) || 7,
          subscriptionsNotificationsPriceAlert: !!settings.subscriptionsNotificationsPriceAlert,
          subscriptionsRecurringEnabled: settings.subscriptionsRecurringEnabled !== false,
          subscriptionsFixedEnabled: settings.subscriptionsFixedEnabled !== false,
          familyModeEnabled: !!settings.familyModeEnabled,
          familyBudgetsEnabled: !!settings.familyBudgetsEnabled,
          familyCommentsEnabled: !!settings.familyCommentsEnabled,
          familyApprovalsEnabled: !!settings.familyApprovalsEnabled
        })
      ]);

      if (setUserSettings) {
        setUserSettings((prev) => ({
          ...prev,
          currency: settings.currency,
          savingsTargetType: settings.savingsTargetType,
          savingsTargetPercent: Number(settings.savingsTargetPercent) || 0,
          savingsTargetAmount: Number(settings.savingsTargetAmount) || 0,
          ...dashboardSettingsPayload,
          subscriptionsNotificationsEnabled: !!settings.subscriptionsNotificationsEnabled,
          subscriptionsNotificationsDays: Number(settings.subscriptionsNotificationsDays) || 7,
          subscriptionsNotificationsPriceAlert: !!settings.subscriptionsNotificationsPriceAlert,
          subscriptionsRecurringEnabled: settings.subscriptionsRecurringEnabled !== false,
          subscriptionsFixedEnabled: settings.subscriptionsFixedEnabled !== false,
          familyModeEnabled: !!settings.familyModeEnabled,
          familyBudgetsEnabled: !!settings.familyBudgetsEnabled,
          familyCommentsEnabled: !!settings.familyCommentsEnabled,
          familyApprovalsEnabled: !!settings.familyApprovalsEnabled
        }));
      }

      if (result.success && weatherResult.success) {
        setMessage({ text: 'Impostazioni salvate con successo!', type: 'success' });
      } else {
        setMessage({ text: 'Errore salvataggio impostazioni', type: 'error' });
      }
    } catch (error) {
      console.error('Errore salvataggio:', error);
      setMessage({ text: 'Errore: ' + error.message, type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    }
  };

  const handleChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const orderedDashboardSections = useMemo(() => {
    const map = new Map(DASHBOARD_SECTIONS.map((s) => [s.id, s]));
    return normalizeDashboardOrder(settings.dashboardOrder).map((id) => map.get(id)).filter(Boolean);
  }, [settings.dashboardOrder]);

  const previewOrder = useMemo(() => buildDashboardPreview(settings), [settings]);

  const handleResetDashboardDefaults = () => {
    setSettings((prev) => ({
      ...prev,
      dashboardOrder: normalizeDashboardOrder(null),
      dashboardShowSubscriptionsDue: false,
      dashboardShowSmartInsights: false,
      dashboardShowForecast: false,
      dashboardShowInsightsBase: false,
      dashboardShowTop5: false,
      dashboardShowBudgetAlerts: false,
      dashboardShowActions: false,
      dashboardShowBirthdays: false
    }));
    setMessage({ text: 'Layout dashboard ripristinato ai default', type: 'success' });
  };

  const handleDragStart = (index, event) => {
    const section = orderedDashboardSections[index];
    if (!section || section.required) return;
    setDragIndex(index);
    if (event?.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(index));
    }
  };

  const handleDrop = (index) => {
    const source = orderedDashboardSections[dragIndex];
    const target = orderedDashboardSections[index];
    if (!source || !target || source.required || target.required) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    if (dragIndex == null || dragIndex === index) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const next = [...normalizeDashboardOrder(settings.dashboardOrder)];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(index, 0, moved);
    setDragIndex(null);
    setDragOverIndex(null);
    handleChange('dashboardOrder', next);
  };

  const serializeValue = (value) => {
    if (value && typeof value.toDate === 'function') {
      return value.toDate().toISOString();
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (Array.isArray(value)) {
      return value.map(serializeValue);
    }
    if (value && typeof value === 'object') {
      const out = {};
      Object.entries(value).forEach(([k, v]) => {
        out[k] = serializeValue(v);
      });
      return out;
    }
    return value;
  };

  const handleExportBackup = async () => {
    if (!user?.uid || exporting) return;
    setExporting(true);
    try {
      const { db } = await import('../../services/firebase');
      const { collection, getDocs, query, where, doc, getDoc } = await import('firebase/firestore');

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? serializeValue(userDoc.data()) : {};

      const collections = [
        'transactions',
        'accounts',
        'categories',
        'budgets',
        'savingsGoals',
        'recurringTransactions',
        'subscriptions',
        'birthdays'
      ];

      const payload = {
        exportedAt: new Date().toISOString(),
        userId: user.uid,
        user: userData,
        data: {}
      };

      for (const colName of collections) {
        const q = query(collection(db, colName), where('userId', '==', user.uid));
        const snap = await getDocs(q);
        payload.data[colName] = snap.docs.map((d) => ({
          id: d.id,
          ...serializeValue(d.data())
        }));
      }

      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `aurora-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Errore export backup:', error);
      alert("Errore durante l'esportazione del backup.");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="content-page">
        <div className="aurora-background">
          <div className="aurora-layer-1"></div>
          <div className="aurora-layer-2"></div>
          <div className="aurora-layer-3"></div>
        </div>
        <div className="dashboard-content">
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <div className="spinner"></div>
            <p>Caricamento impostazioni...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content-page">
      <div className="aurora-background">
        <div className="aurora-layer-1"></div>
        <div className="aurora-layer-2"></div>
        <div className="aurora-layer-3"></div>
      </div>

      <div className="dashboard-content">
        <PageHeader
          className="page-header"
          title="Impostazioni"
          subtitle="Personalizza Aurora 4.0 secondo le tue preferenze"
        />

        {message.text && (
          <div
            style={{
              padding: '1rem',
              borderRadius: '12px',
              marginBottom: '1.5rem',
              background: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border:
                message.type === 'success'
                  ? '1px solid rgba(34, 197, 94, 0.3)'
                  : '1px solid rgba(239, 68, 68, 0.3)',
              color: 'white',
              textAlign: 'center'
            }}
          >
            {message.text}
          </div>
        )}

        <div className="settings-grid">
          <div className="setting-section">
            <h3>Profilo Utente</h3>
            <div className="user-profile-info">
              <div className="profile-avatar">
                {user?.photoURL ? <img src={user.photoURL} alt="Avatar" className="avatar-img" /> : <FiUser size={40} />}
              </div>
              <div className="profile-details">
                <h4>{user?.displayName || 'Utente'}</h4>
                <p>{user?.email}</p>
                <span className="profile-badge">{isAdmin ? 'Admin' : 'Account Attivo'}</span>
                {userApprovalStatus?.status && (
                  <div style={{ marginTop: 6, opacity: 0.8, fontSize: 12 }}>
                    Stato: {userApprovalStatus.status}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="setting-section">
            <h3>Notifiche Compleanni</h3>
            <p className="section-description">
              Ricevi promemoria via email per non dimenticare mai un compleanno importante
            </p>

            <div className="setting-form">
              <div className="form-group">
                <label htmlFor="reminderEmail">
                  <FiMail style={{ marginRight: '8px' }} />
                  Email per Notifiche
                </label>
                <input
                  id="reminderEmail"
                  type="email"
                  value={settings.reminderEmail}
                  onChange={(e) => handleChange('reminderEmail', e.target.value)}
                  placeholder="tuaemail@esempio.com"
                  className="settings-input"
                />
                <small>L'email dove riceverai i promemoria dei compleanni</small>
              </div>

              <div className="form-group">
                <label htmlFor="reminderDaysBefore">
                  <FiBell style={{ marginRight: '8px' }} />
                  Anticipo Notifica
                </label>
                <select
                  id="reminderDaysBefore"
                  value={settings.reminderDaysBefore}
                  onChange={(e) => handleChange('reminderDaysBefore', parseInt(e.target.value))}
                  className="settings-select"
                >
                  <option value={1}>1 giorno prima</option>
                  <option value={2}>2 giorni prima</option>
                  <option value={3}>3 giorni prima</option>
                  <option value={5}>5 giorni prima</option>
                  <option value={7}>1 settimana prima</option>
                </select>
                <small>Quando vuoi ricevere il promemoria prima del compleanno</small>
              </div>

              <div className="reminder-preview">
                <div className="preview-icon">i</div>
                <div className="preview-text">
                  <strong>Anteprima:</strong> Riceverai un'email a <strong>{settings.reminderEmail}</strong>{' '}
                  <strong>
                    {settings.reminderDaysBefore} {settings.reminderDaysBefore === 1 ? 'giorno' : 'giorni'}
                  </strong>{' '}
                  prima di ogni compleanno alle ore 9:00.
                </div>
              </div>
            </div>
          </div>

          <div className="setting-section">
            <h3>Notifiche Abbonamenti</h3>
            <p className="section-description">
              Attiva o disattiva le notifiche push per rinnovi imminenti e aumenti di prezzo.
            </p>

            <div className="setting-form">
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.subscriptionsNotificationsEnabled}
                  onChange={(e) => handleChange('subscriptionsNotificationsEnabled', e.target.checked)}
                />
                <span>Notifiche push abbonamenti</span>
              </label>
              <div className="form-group">
                <label htmlFor="subscriptionsNotificationsDays">Anticipo rinnovi</label>
                <select
                  id="subscriptionsNotificationsDays"
                  value={settings.subscriptionsNotificationsDays}
                  onChange={(e) => handleChange('subscriptionsNotificationsDays', parseInt(e.target.value, 10))}
                  className="settings-select"
                >
                  <option value={3}>3 giorni prima</option>
                  <option value={7}>7 giorni prima</option>
                  <option value={14}>14 giorni prima</option>
                </select>
                <small>Quando vuoi ricevere la notifica dei rinnovi</small>
              </div>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.subscriptionsNotificationsPriceAlert}
                  onChange={(e) => handleChange('subscriptionsNotificationsPriceAlert', e.target.checked)}
                />
                <span>Avvisa per aumento prezzo</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={settings.subscriptionsRecurringEnabled !== false}
                  onChange={(e) => handleChange('subscriptionsRecurringEnabled', e.target.checked)}
                />
                <span>Mostra ricorrenti mensili</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={settings.subscriptionsFixedEnabled !== false}
                  onChange={(e) => handleChange('subscriptionsFixedEnabled', e.target.checked)}
                />
                <span>Mostra rinnovi a scadenza fissa</span>
              </label>
              <small>Le notifiche vengono mostrate nel browser quando apri l'app.</small>
            </div>
          </div>

          <div className="setting-section">
            <h3>Modalità Famiglia/Team</h3>
            <p className="section-description">
              Attiva le funzionalità multi‑utente. Le opzioni extra sono opzionali per utenti single.
            </p>
            <div className="setting-form">
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.familyModeEnabled}
                  onChange={(e) => handleChange('familyModeEnabled', e.target.checked)}
                />
                <span>Abilita modalità famiglia/team</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.familyBudgetsEnabled}
                  onChange={(e) => handleChange('familyBudgetsEnabled', e.target.checked)}
                />
                <span>Budget condivisi</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.familyCommentsEnabled}
                  onChange={(e) => handleChange('familyCommentsEnabled', e.target.checked)}
                />
                <span>Commenti sulle transazioni</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.familyApprovalsEnabled}
                  onChange={(e) => handleChange('familyApprovalsEnabled', e.target.checked)}
                />
                <span>Approvazioni interne al team</span>
              </label>
              <small>Puoi attivare queste opzioni solo se ti servono.</small>
            </div>
          </div>

          <div className="setting-section">
            <h3>Widget Meteo</h3>
            <p className="section-description">Scegli la Citta per il widget meteo nella sidebar</p>
            <div className="setting-form">
              <div className="form-group">
                <label htmlFor="weatherCity">Citta per il Meteo</label>
                <input
                  id="weatherCity"
                  type="text"
                  value={settings.weatherCity}
                  onChange={(e) => handleChange('weatherCity', e.target.value)}
                  placeholder="Es. Roma, Milano, Napoli..."
                  className="settings-input"
                />
                <small>Il nome della citta di cui visualizzare il meteo nella sidebar</small>
              </div>
            </div>
          </div>

          <div className="setting-section">
            <h3>Valuta</h3>
            <p className="section-description">Scegli la valuta da visualizzare in tutta l'app</p>
            <div className="setting-form">
              <div className="form-group">
                <label htmlFor="currency">Valuta Predefinita</label>
                <select
                  id="currency"
                  value={settings.currency}
                  onChange={(e) => handleChange('currency', e.target.value)}
                  className="settings-select"
                >
                  <option value="EUR">EUR (EUR)</option>
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (GBP)</option>
                  <option value="CHF">CHF (CHF)</option>
                  <option value="JPY">JPY (JPY)</option>
                  <option value="CAD">CAD (C$)</option>
                  <option value="AUD">AUD (A$)</option>
                  <option value="SEK">SEK (kr)</option>
                  <option value="NOK">NOK (kr)</option>
                  <option value="PLN">PLN (PLN)</option>
                  <option value="BRL">BRL (R$)</option>
                  <option value="INR">INR (INR)</option>
                </select>
                <small>Il simbolo verra usato in tutta l'app</small>
              </div>
            </div>
          </div>

          <div className="setting-section">
            <h3>Obiettivo Risparmio</h3>
            <p className="section-description">Imposta un obiettivo che viene mostrato nella Story del mese.</p>
            <div className="setting-form">
              <div className="form-group">
                <label htmlFor="savingsTargetType">Tipo obiettivo</label>
                <select
                  id="savingsTargetType"
                  value={settings.savingsTargetType}
                  onChange={(e) => handleChange('savingsTargetType', e.target.value)}
                  className="settings-select"
                >
                  <option value="percent">Percentuale delle entrate</option>
                  <option value="amount">Importo fisso mensile</option>
                </select>
                <small>Usato per il progresso risparmio nella dashboard</small>
              </div>

              {settings.savingsTargetType === 'percent' ? (
                <div className="form-group">
                  <label htmlFor="savingsTargetPercent">Percentuale risparmio</label>
                  <input
                    id="savingsTargetPercent"
                    type="number"
                    min="1"
                    max="90"
                    step="1"
                    value={settings.savingsTargetPercent}
                    onChange={(e) => handleChange('savingsTargetPercent', e.target.value)}
                    className="settings-input"
                  />
                  <small>Consigliato 10% - 30%</small>
                </div>
              ) : (
                <div className="form-group">
                  <label htmlFor="savingsTargetAmount">Importo obiettivo</label>
                  <input
                    id="savingsTargetAmount"
                    type="number"
                    min="0"
                    step="1"
                    value={settings.savingsTargetAmount}
                    onChange={(e) => handleChange('savingsTargetAmount', e.target.value)}
                    className="settings-input"
                  />
                  <small>Importo mensile da raggiungere</small>
                </div>
              )}
            </div>
          </div>

          <div className="setting-section">
            <h3>Dashboard Mobile</h3>
            <p className="section-description">Scegli la Modalita della dashboard su schermi piccoli.</p>
            <div className="setting-form">
              <div className="form-group">
                <label htmlFor="dashboardMobileMode">Modalita mobile</label>
                <select
                  id="dashboardMobileMode"
                  value={settings.dashboardMobileMode}
                  onChange={(e) => handleChange('dashboardMobileMode', e.target.value)}
                  className="settings-select"
                >
                  <option value="normal">Completa</option>
                  <option value="compact">Semplificata (solo numeri)</option>
                </select>
                <small>La modalita semplificata riduce sezioni e spazio.</small>
              </div>
            </div>
          </div>

          <div className="setting-section">
            <h3>Dashboard Personalizzata</h3>
            <p className="section-description">
              Scegli quali sezioni opzionali mostrare nella dashboard. Le sezioni base restano sempre visibili
              (Buongiorno, Saldo/Cash Flow, Story del mese).
            </p>
            <div className="setting-form">
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-save-settings"
                  onClick={handleResetDashboardDefaults}
                  style={{ padding: '8px 14px', fontSize: 13 }}
                >
                  Ripristina default dashboard
                </button>
              </div>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowSubscriptionsDue}
                  onChange={(e) => handleChange('dashboardShowSubscriptionsDue', e.target.checked)}
                />
                <span>Abbonamenti in scadenza</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowSmartInsights}
                  onChange={(e) => handleChange('dashboardShowSmartInsights', e.target.checked)}
                />
                <span>Insights intelligenti</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowForecast}
                  onChange={(e) => handleChange('dashboardShowForecast', e.target.checked)}
                />
                <span>Forecast 30/60/90 giorni</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowInsightsBase}
                  onChange={(e) => handleChange('dashboardShowInsightsBase', e.target.checked)}
                />
                <span>Insights (card standard)</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowTop5}
                  onChange={(e) => handleChange('dashboardShowTop5', e.target.checked)}
                />
                <span>Top 5 spese & entrate</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowBudgetAlerts}
                  onChange={(e) => handleChange('dashboardShowBudgetAlerts', e.target.checked)}
                />
                <span>Alert Budget</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowActions}
                  onChange={(e) => handleChange('dashboardShowActions', e.target.checked)}
                />
                <span>Azioni consigliate oggi</span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={!!settings.dashboardShowBirthdays}
                  onChange={(e) => handleChange('dashboardShowBirthdays', e.target.checked)}
                />
                <span>Prossimi compleanni</span>
              </label>
              <div className="dashboard-order">
                <div className="dashboard-order-title">Ordine sezioni</div>
                <div className="dashboard-order-list">
                  {orderedDashboardSections.map((section, index) => (
                    <div
                      key={section.id}
                      className={`dashboard-order-item ${section.required ? 'locked' : ''} ${dragIndex === index ? 'dragging' : ''}`}
                      draggable={!section.required}
                      onDragStart={(e) => handleDragStart(index, e)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverIndex(index);
                      }}
                      onDragLeave={() => setDragOverIndex(null)}
                      onDrop={() => handleDrop(index)}
                      onDragEnd={() => {
                        setDragIndex(null);
                        setDragOverIndex(null);
                      }}
                      data-drag-over={dragOverIndex === index ? 'true' : 'false'}
                    >
                      <span className="drag-handle">↕</span>
                      <span className="order-label">{section.label}</span>
                      {section.required && <span className="order-badge">Sempre visibile</span>}
                    </div>
                  ))}
                </div>
                <small>Trascina le sezioni per cambiare l’ordine nella dashboard.</small>
              </div>
              <div className="dashboard-order">
                <div className="dashboard-order-title">Anteprima live ordine</div>
                <div className="dashboard-order-list">
                  <div className="dashboard-order-item locked">
                    <span className="drag-handle">D</span>
                    <span className="order-label">
                      Desktop: {previewOrder.desktop.map((id) => getSectionLabel(id)).join(' > ')}
                    </span>
                  </div>
                  <div className="dashboard-order-item locked">
                    <span className="drag-handle">M</span>
                    <span className="order-label">
                      Mobile: {previewOrder.mobile.map((id) => getSectionLabel(id)).join(' > ')}
                    </span>
                  </div>
                </div>
              </div>
              <small>Puoi modificare queste opzioni in qualsiasi momento.</small>
            </div>
          </div>

          <div className="setting-section">
            <h3>Informazioni Sistema</h3>
            <div className="system-info">
              <div className="info-row">
                <span className="info-label">Versione App:</span>
                <span className="info-value">Aurora 4.0</span>
              </div>
              <div className="info-row">
                <span className="info-label">Ultimo Aggiornamento:</span>
                <span className="info-value">Febbraio 2026</span>
              </div>
              <div className="info-row">
                <span className="info-label">ID Utente:</span>
                <span className="info-value" style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                  {user?.uid?.substring(0, 20)}...
                </span>
              </div>
            </div>
          </div>

          <div className="setting-section">
            <h3>Backup Dati</h3>
            <p className="section-description">Esporta tutti i tuoi dati in un file JSON.</p>
            <div className="setting-form">
              <button
                onClick={handleExportBackup}
                disabled={exporting}
                className="btn-save-settings"
                type="button"
              >
                {exporting ? 'Esportazione...' : 'Esporta Backup'}
              </button>
            </div>
          </div>
        </div>

        <div className="settings-actions">
          <button onClick={handleSave} disabled={saving} className="btn-save-settings" type="button">
            {saving ? (
              <>
                <div className="loading-spinner"></div>
                Salvataggio...
              </>
            ) : (
              <>
                <FiCheck style={{ marginRight: '8px' }} />
                Salva Impostazioni
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsContent;
