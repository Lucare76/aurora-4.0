import React, { useCallback, useEffect, useMemo, useState } from 'react';

function OnboardingTour({ user, userSettings, setUserSettings, activeMenu, setActiveMenu }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [disableForever, setDisableForever] = useState(false);
  const [saving, setSaving] = useState(false);
  const [targetRect, setTargetRect] = useState(null);
  const [viewport, setViewport] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 720
  });

  const steps = useMemo(
    () => [
      {
        id: 'bell',
        selector: '[data-onboarding-target="bell"]',
        title: 'Campanella notifiche',
        detail: 'Qui trovi promemoria importanti (compleanni, scadenze, alert) e azioni rapide.',
        hint: 'In alto a destra trovi la campanella.'
      },
      {
        id: 'quickadd',
        selector: '[data-onboarding-target="quickadd"]',
        title: 'Quick Add',
        detail: 'Usa il pulsante + fisso in basso per aggiungere in un attimo transazioni, budget, conti e obiettivi.',
        hint: 'Prova anche la scorciatoia Shift + A.'
      },
      {
        id: 'focus',
        selector: '[data-onboarding-target="focus"]',
        title: 'Focus Oggi',
        detail: 'In dashboard hai le 3 priorita principali del giorno, ordinate per urgenza.',
        hint: 'Se non la vedi, attivala in Impostazioni > Dashboard Personalizzata.'
      }
    ],
    []
  );

  useEffect(() => {
    if (!user?.uid) {
      setOpen(false);
      return;
    }
    const completed = userSettings?.onboardingCompleted === true;
    const disabled = userSettings?.onboardingDisabled === true;
    if (!completed && !disabled) {
      setOpen(true);
      setStep(0);
      setDisableForever(false);
    }
  }, [user?.uid, userSettings?.onboardingCompleted, userSettings?.onboardingDisabled]);

  useEffect(() => {
    if (!open) return;
    if (steps[step]?.id === 'focus' && activeMenu !== 'dashboard') {
      setActiveMenu?.('dashboard');
    }
  }, [activeMenu, open, setActiveMenu, step, steps]);

  useEffect(() => {
    if (!open) return undefined;
    const computeTarget = () => {
      const selector = steps[step]?.selector;
      if (!selector) {
        setTargetRect(null);
        return;
      }
      const el = document.querySelector(selector);
      if (!el) {
        setTargetRect(null);
        return;
      }
      const rect = el.getBoundingClientRect();
      const pad = 6;
      setTargetRect({
        top: Math.max(8, rect.top - pad),
        left: Math.max(8, rect.left - pad),
        width: rect.width + pad * 2,
        height: rect.height + pad * 2
      });
      if (steps[step]?.id === 'focus') {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    const raf = requestAnimationFrame(computeTarget);
    const onViewport = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      computeTarget();
    };
    window.addEventListener('resize', onViewport);
    window.addEventListener('scroll', computeTarget, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onViewport);
      window.removeEventListener('scroll', computeTarget, true);
    };
  }, [activeMenu, open, step, steps]);

  useEffect(() => {
    const openOnboarding = () => {
      setOpen(true);
      setStep(0);
      setDisableForever(false);
      if (activeMenu !== 'dashboard') {
        setActiveMenu?.('dashboard');
      }
    };
    window.addEventListener('aurora_onboarding_open', openOnboarding);
    return () => window.removeEventListener('aurora_onboarding_open', openOnboarding);
  }, [activeMenu, setActiveMenu]);

  const persistOnboarding = useCallback(async ({ completed, disabled }) => {
    if (!user?.uid) return;
    setSaving(true);
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../../services/firebase');
      await updateDoc(doc(db, 'users', user.uid), {
        onboardingCompleted: completed === true,
        onboardingDisabled: disabled === true
      });
      if (setUserSettings) {
        setUserSettings((prev) => ({
          ...prev,
          onboardingCompleted: completed === true,
          onboardingDisabled: disabled === true
        }));
      }
    } catch (error) {
      console.error('Errore salvataggio onboarding:', error);
    } finally {
      setSaving(false);
    }
  }, [setUserSettings, user?.uid]);

  const finish = useCallback(async () => {
    await persistOnboarding({ completed: true, disabled: disableForever });
    setOpen(false);
  }, [disableForever, persistOnboarding]);

  const skip = useCallback(async () => {
    await persistOnboarding({ completed: true, disabled: true });
    setOpen(false);
  }, [persistOnboarding]);

  useEffect(() => {
    if (!open || saving) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        skip();
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setStep((s) => Math.max(0, s - 1));
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setStep((s) => Math.min(steps.length - 1, s + 1));
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        if (step < steps.length - 1) {
          setStep((s) => Math.min(steps.length - 1, s + 1));
        } else {
          finish();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [finish, open, saving, skip, step, steps.length]);

  if (!open) return null;

  const currentStep = steps[step] || steps[0];
  const isMobile = viewport.width <= 768;
  const safeTop = isMobile ? 74 : 10;
  const safeBottom = isMobile ? 96 : 10;
  const cardWidth = isMobile
    ? Math.min(420, Math.max(280, viewport.width - 20))
    : Math.min(360, Math.max(280, viewport.width - 24));
  const estimatedCardHeight = isMobile ? 320 : 260;

  let cardStyle = {
    width: `${cardWidth}px`,
    left: `${Math.max(12, (viewport.width - cardWidth) / 2)}px`,
    top: `${Math.max(safeTop, (viewport.height - estimatedCardHeight) / 2)}px`
  };
  let arrowDirection = 'up';
  let arrowLeft = cardWidth / 2;

  if (targetRect) {
    const spacing = 12;
    const canPlaceBottom =
      targetRect.top + targetRect.height + spacing + estimatedCardHeight <= viewport.height - safeBottom;
    const canPlaceTop = targetRect.top - spacing - estimatedCardHeight >= safeTop;
    const shouldPlaceBottom = currentStep.id === 'bell' ? canPlaceBottom : currentStep.id === 'quickadd' ? false : canPlaceBottom;
    let top = shouldPlaceBottom
      ? targetRect.top + targetRect.height + spacing
      : targetRect.top - estimatedCardHeight - spacing;
    arrowDirection = shouldPlaceBottom ? 'up' : 'down';
    if (!canPlaceTop && !canPlaceBottom) {
      top = Math.max(safeTop, Math.min(targetRect.top, viewport.height - estimatedCardHeight - safeBottom));
    }
    top = Math.max(safeTop, Math.min(top, viewport.height - estimatedCardHeight - safeBottom));
    const unclampedLeft = targetRect.left;
    const left = Math.max(8, Math.min(unclampedLeft, viewport.width - cardWidth - 8));
    arrowLeft = Math.max(18, Math.min(targetRect.left + targetRect.width / 2 - left, cardWidth - 18));
    cardStyle = {
      width: `${cardWidth}px`,
      top: `${top}px`,
      left: `${left}px`
    };
  }

  return (
    <div className={`onboarding-overlay ${targetRect ? '' : 'fallback'}`} role="dialog" aria-modal="true">
      {targetRect && (
        <div
          className="onboarding-spotlight"
          style={{
            top: `${targetRect.top}px`,
            left: `${targetRect.left}px`,
            width: `${targetRect.width}px`,
            height: `${targetRect.height}px`
          }}
        />
      )}
      <div className={`onboarding-card ${isMobile ? 'mobile' : ''} ${targetRect ? 'contextual' : 'centered'}`} style={cardStyle}>
        {targetRect && (
          <span
            className={`onboarding-card-arrow ${arrowDirection}`}
            style={{ left: `${arrowLeft}px` }}
            aria-hidden="true"
          />
        )}
        <div className="onboarding-step">Guida rapida {step + 1}/{steps.length}</div>
        <h3 className="onboarding-title">{currentStep?.title}</h3>
        <p className="onboarding-detail">{currentStep?.detail}</p>
        <p className="onboarding-hint">{currentStep?.hint}</p>
        {!targetRect && <p className="onboarding-hint">Elemento non visibile in questa schermata.</p>}
        <div className="onboarding-keys">Esc chiude • ←/→ naviga • Invio avanti</div>

        <label className="onboarding-toggle">
          <input
            type="checkbox"
            checked={disableForever}
            onChange={(e) => setDisableForever(e.target.checked)}
          />
          <span>Non mostrare piu questa guida</span>
        </label>

        <div className="onboarding-actions">
          <button type="button" className="onboarding-btn ghost" onClick={skip} disabled={saving}>
            Salta
          </button>
          {step > 0 && (
            <button
              type="button"
              className="onboarding-btn ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={saving}
            >
              Indietro
            </button>
          )}
          {step < steps.length - 1 ? (
            <button
              type="button"
              className="onboarding-btn primary"
              onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
              disabled={saving}
            >
              Avanti
            </button>
          ) : (
            <button type="button" className="onboarding-btn primary" onClick={finish} disabled={saving}>
              {saving ? 'Salvataggio...' : 'Fine'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default OnboardingTour;
