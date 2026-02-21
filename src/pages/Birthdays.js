// src/pages/Birthdays.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  addBirthday,
  getBirthdays,
  updateBirthday,
  deleteBirthday,
  checkUpcomingBirthdays,
  getDaysUntilBirthday,
  calculateAge
} from '../services/birthdaysService';
import { sendBirthdayReminder, isEmailJSConfigured } from '../services/emailService';
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiMail,
  FiCalendar,
  FiGift,
  FiAlertCircle,
  FiCheckCircle
} from 'react-icons/fi';
import './Birthdays.css';

function formatBirthdayDateInput(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function isValidBirthdayDate(dateValue) {
  if (!/^\d{2}\/\d{2}$/.test(dateValue || '')) return false;
  const [dayStr, monthStr] = dateValue.split('/');
  const day = Number(dayStr);
  const month = Number(monthStr);
  if (!Number.isInteger(day) || !Number.isInteger(month)) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1) return false;

  const maxByMonth = {
    1: 31,
    2: 29,
    3: 31,
    4: 30,
    5: 31,
    6: 30,
    7: 31,
    8: 31,
    9: 30,
    10: 31,
    11: 30,
    12: 31
  };

  return day <= (maxByMonth[month] || 31);
}

function Birthdays() {
  const { user } = useAuth();

  const [birthdays, setBirthdays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBirthday, setEditingBirthday] = useState(null);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState([]);
  const [emailConfigured, setEmailConfigured] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    date: '', // DD/MM
    birthYear: '', // opzionale
    email: '',
    notes: ''
  });

  // Carica compleanni (PRO: useCallback + deps)
  const loadBirthdays = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);

      const data = await getBirthdays(user.uid);
      setBirthdays(data);

      // Identifica compleanni imminenti
      const upcoming = checkUpcomingBirthdays(data);
      setUpcomingBirthdays(upcoming);
    } catch (error) {
      console.error('Errore caricamento compleanni:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  // Controlla compleanni imminenti e invia notifiche (PRO: useCallback + deps)
  const checkAndNotify = useCallback(async () => {
    if (!emailConfigured) return;
    if (!user?.email) return;
    if (!birthdays || birthdays.length === 0) return;

    const toNotify = checkUpcomingBirthdays(birthdays);

    for (const birthday of toNotify) {
      // Invia email
      const result = await sendBirthdayReminder(
        {
          email: user.email,
          displayName: user.displayName
        },
        birthday
      );

      if (result.success) {
        // Aggiorna flag per evitare invii multipli
        await updateBirthday(birthday.id, {
          lastNotificationYear: new Date().getFullYear(),
          notificationSent: true
        });

        console.log(`✅ Notifica inviata per: ${birthday.name}`);
      }
    }
  }, [birthdays, emailConfigured, user?.email, user?.displayName]);

  // All'avvio o cambio utente: carica compleanni e controlla EmailJS
  useEffect(() => {
    if (!user?.uid) return;

    setEmailConfigured(isEmailJSConfigured());
    loadBirthdays();
  }, [user?.uid, loadBirthdays]);

  // Quando cambiano compleanni o config email: controlla e notifica
  useEffect(() => {
    if (birthdays.length > 0 && emailConfigured) {
      checkAndNotify();
    }
  }, [birthdays.length, emailConfigured, checkAndNotify]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.uid) return;

    if (!isValidBirthdayDate(formData.date)) {
      alert('Data non valida. Usa il formato GG/MM, ad esempio 15/03.');
      return;
    }

    try {
      if (editingBirthday) {
        // Modifica
        await updateBirthday(editingBirthday.id, formData);
      } else {
        // Aggiungi nuovo
        await addBirthday(user.uid, formData);
      }

      // Reset e ricarica
      resetForm();
      await loadBirthdays();
    } catch (error) {
      console.error('Errore salvataggio:', error);
      alert('Errore durante il salvataggio');
    }
  };

  const handleEdit = (birthday) => {
    setEditingBirthday(birthday);
    setFormData({
      name: birthday.name,
      date: birthday.date,
      birthYear: birthday.birthYear || '',
      email: birthday.email || '',
      notes: birthday.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (birthdayId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo compleanno?')) return;

    try {
      await deleteBirthday(birthdayId);
      await loadBirthdays();
    } catch (error) {
      console.error('Errore eliminazione:', error);
      alert("Errore durante l'eliminazione");
    }
  };

  const handleDateInputChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      date: formatBirthdayDateInput(value)
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      date: '',
      birthYear: '',
      email: '',
      notes: ''
    });
    setEditingBirthday(null);
    setShowForm(false);
  };


  const getBirthdayStatus = (birthday) => {
    const days = getDaysUntilBirthday(birthday.date);

    if (days === 0) return { text: 'Oggi! 🎉', class: 'today' };
    if (days === 1) return { text: 'Domani', class: 'tomorrow' };
    if (days === 2) return { text: 'Tra 2 giorni', class: 'upcoming' };
    if (days <= 7) return { text: `Tra ${days} giorni`, class: 'soon' };
    if (days <= 30) return { text: `Tra ${days} giorni`, class: 'this-month' };
    return { text: `Tra ${days} giorni`, class: 'future' };
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
          <div className="loading-state">Caricamento compleanni...</div>
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

      <div className="dashboard-content birthdays-page">
        <div className="page-header">
          <div>
            <h1>Compleanni e Promemoria 🎁</h1>
            <p>Non dimenticare mai più un compleanno importante</p>
          </div>
          <div className="header-actions">
            {!emailConfigured && (
              <div className="warning-badge">
                <FiAlertCircle /> EmailJS non configurato
              </div>
            )}
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              <FiPlus /> Aggiungi Compleanno
            </button>
          </div>
        </div>

        {/* Alert compleanni imminenti */}
        {upcomingBirthdays.length > 0 && (
          <div className="upcoming-alerts">
            <h3>
              <FiAlertCircle /> Compleanni Imminenti
            </h3>
            <div className="alerts-grid">
              {upcomingBirthdays.map((birthday) => (
                <div key={birthday.id} className="alert-card urgent">
                  <div className="alert-icon">🎂</div>
                  <div className="alert-content">
                    <strong>{birthday.name}</strong>
                    <span>Compleanno tra 2 giorni ({birthday.date})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form aggiungi/modifica */}
        {showForm && (
          <div className="modal-overlay" onClick={resetForm}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingBirthday ? 'Modifica Compleanno' : 'Nuovo Compleanno'}</h2>
                <button className="close-btn" onClick={resetForm}>
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="birthday-form">
                <div className="form-group">
                  <label>
                    <FiGift /> Nome Persona *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="es. Maria Rossi"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>
                      <FiCalendar /> Data Compleanno *
                    </label>
                    <input
                      type="text"
                      value={formData.date}
                      onChange={(e) => handleDateInputChange(e.target.value)}
                      placeholder="DD/MM (es. 15/03)"
                      pattern="\d{2}/\d{2}"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={5}
                      required
                    />
                    <small>Formato: GG/MM (es. 15/03)</small>
                  </div>

                  <div className="form-group">
                    <label>Anno di Nascita (opzionale)</label>
                    <input
                      type="number"
                      value={formData.birthYear}
                      onChange={(e) => setFormData({ ...formData, birthYear: e.target.value })}
                      placeholder="es. 1990"
                      min="1900"
                      max={new Date().getFullYear()}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>
                    <FiMail /> Email (opzionale)
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Per inviare auguri diretti"
                  />
                </div>

                <div className="form-group">
                  <label>Note</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Idee regalo, preferenze, ecc..."
                    rows="3"
                  />
                </div>

                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={resetForm}>
                    Annulla
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingBirthday ? 'Salva Modifiche' : 'Aggiungi Compleanno'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Lista compleanni */}
        {birthdays.length === 0 ? (
          <div className="empty-state">
            <FiGift size={64} />
            <h3>Nessun compleanno salvato</h3>
            <p>Aggiungi il primo compleanno per iniziare a ricevere promemoria!</p>
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              <FiPlus /> Aggiungi il Primo Compleanno
            </button>
          </div>
        ) : (
          <div className="birthdays-grid">
            {[...birthdays]
              .sort((a, b) => getDaysUntilBirthday(a.date) - getDaysUntilBirthday(b.date))
              .map((birthday) => {
              const status = getBirthdayStatus(birthday);
              const age = birthday.birthYear ? calculateAge(birthday.date, birthday.birthYear) : null;

              return (
                <div key={birthday.id} className={`birthday-card ${status.class}`}>
                  <div className="card-header">
                    <div className="birthday-icon">🎂</div>
                    <div className="birthday-info">
                      <h3>{birthday.name}</h3>
                      <div className="birthday-date">
                        <FiCalendar /> {birthday.date}
                        {age && <span className="age"> • {age} anni</span>}
                      </div>
                    </div>
                    <div className="card-actions">
                      <button className="icon-btn" onClick={() => handleEdit(birthday)} title="Modifica">
                        <FiEdit2 />
                      </button>
                      <button
                        className="icon-btn danger"
                        onClick={() => handleDelete(birthday.id)}
                        title="Elimina"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>

                  <div className="card-body">
                    <div className={`status-badge ${status.class}`}>{status.text}</div>

                    {birthday.email && (
                      <div className="info-row">
                        <FiMail /> {birthday.email}
                      </div>
                    )}

                    {birthday.notes && (
                      <div className="notes">
                        <strong>Note:</strong> {birthday.notes}
                      </div>
                    )}

                    {birthday.lastNotificationYear === new Date().getFullYear() && (
                      <div className="notification-status">
                        <FiCheckCircle /> Notifica inviata quest'anno
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Guida configurazione */}
        {!emailConfigured && (
          <div className="config-guide">
            <h3>
              <FiAlertCircle /> Configura EmailJS per Ricevere Notifiche
            </h3>
            <ol>
              <li>
                Vai su{' '}
                <a href="https://www.emailjs.com/" target="_blank" rel="noopener noreferrer">
                  EmailJS.com
                </a>{' '}
                e crea un account gratuito
              </li>
              <li>Aggiungi un servizio email (Gmail, Outlook, etc.)</li>
              <li>
                Crea un template email con queste variabili: <code>{'{{user_name}}'}</code>,{' '}
                <code>{'{{birthday_name}}'}</code>, <code>{'{{birthday_date}}'}</code>
              </li>
              <li>
                Copia Service ID, Template ID e Public Key nel file <code>src/services/emailService.js</code>
              </li>
              <li>Riavvia l'app e testa l'invio!</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

export default Birthdays;
