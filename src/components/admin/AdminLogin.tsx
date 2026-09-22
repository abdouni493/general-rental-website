import React, { useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mail, Lock, Eye, EyeOff, LogIn, UserPlus, ArrowLeft, Loader2,
  ShieldCheck, Check, AlertCircle, User, Car,
} from 'lucide-react';

import { useAdminAuth } from './AdminAuthContext';
import { AuthService, authErrorLabel } from '../../services/AuthService';
import { PageLoader } from '../ui/Primitives';

// ============================================================================
// Page de connexion de l'espace d'administration.
// ----------------------------------------------------------------------------
// Deux modes sur un seul écran :
//   • « connexion »  — toujours disponible ;
//   • « création »   — visible UNIQUEMENT tant qu'aucun administrateur
//     n'existe. Dès que le premier compte est créé, le bouton disparaît
//     (adminExists passe à vrai) et la RPC côté serveur refuserait de toute
//     façon un second appel : la garde est à la fois visuelle et serveur.
// ============================================================================

type Mode = 'signin' | 'signup';

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading, adminExists, refreshAdminExists, signIn } = useAdminAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-ink)' }}>
        <PageLoader label="Vérification de la session…" />
      </div>
    );
  }

  if (user) return <Navigate to="/admin" replace />;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      await signIn(email, password);
      navigate('/admin', { replace: true });
    } catch (err: any) {
      setError(authErrorLabel(err?.message || ''));
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setBusy(true); setError(null); setNotice(null);
    try {
      const created = await AuthService.createFirstAdmin(email, password, username);
      if (!created.success) {
        setError(authErrorLabel(created.error || ''));
        // Un autre onglet a peut-être créé le compte entre-temps.
        await refreshAdminExists();
        return;
      }
      await refreshAdminExists();
      setNotice('Compte administrateur créé. Connectez-vous avec ces identifiants.');
      setMode('signin');
      setConfirm('');
      setPassword('');
    } catch (err: any) {
      setError(authErrorLabel(err?.message || ''));
    } finally {
      setBusy(false);
    }
  };

  const switchTo = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
    setConfirm('');
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--color-ink)' }}
    >
      {/* Décor */}
      <div className="absolute inset-0 bg-grid opacity-[0.3] pointer-events-none" />
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.62, 0.4] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-32 -left-24 w-[32rem] h-[32rem] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, var(--color-iris-glow), transparent 68%)', filter: 'blur(40px)' }}
      />
      <motion.div
        animate={{ scale: [1.1, 1, 1.1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -bottom-32 -right-24 w-[30rem] h-[30rem] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, var(--color-aqua-glow), transparent 68%)', filter: 'blur(44px)' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md"
      >
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold mb-5 transition-colors"
          style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-display)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-iris)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-muted)'; }}
        >
          <ArrowLeft size={14} /> Retour au site
        </Link>

        <div className="glass-strong rounded-3xl p-7 sm:p-9">
          {/* Marque */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 16, delay: 0.1 }}
              className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, var(--color-iris-dark), var(--color-iris) 50%, var(--color-aqua))',
                boxShadow: '0 12px 34px var(--color-iris-glow)',
              }}
            >
              <ShieldCheck size={28} className="text-white" />
            </motion.div>

            <h1
              className="font-black text-2xl mb-1.5"
              style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}
            >
              {mode === 'signin' ? 'Espace administration' : 'Créer le compte administrateur'}
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
              {mode === 'signin'
                ? 'Gérez les agences connectées et suivez les réservations du portail.'
                : "Ce compte sera le seul à pouvoir administrer le portail."}
            </p>
          </div>

          {/* Messages */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="overflow-hidden"
              >
                <div
                  className="flex items-start gap-2.5 rounded-xl px-4 py-3"
                  style={{ background: 'rgba(251,113,133,0.1)', border: '1px solid rgba(251,113,133,0.3)' }}
                  role="alert"
                >
                  <AlertCircle size={16} style={{ color: 'var(--color-coral)' }} className="shrink-0 mt-0.5" />
                  <p className="text-xs" style={{ color: 'var(--color-title)' }}>{error}</p>
                </div>
              </motion.div>
            )}

            {notice && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="overflow-hidden"
              >
                <div
                  className="flex items-start gap-2.5 rounded-xl px-4 py-3"
                  style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)' }}
                >
                  <Check size={16} style={{ color: 'var(--color-mint)' }} className="shrink-0 mt-0.5" />
                  <p className="text-xs" style={{ color: 'var(--color-title)' }}>{notice}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Formulaire */}
          <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="label" htmlFor="admin-username">
                  <User size={12} style={{ color: 'var(--color-iris)' }} /> Nom affiché
                </label>
                <input
                  id="admin-username"
                  className="field"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Administrateur"
                  autoComplete="name"
                />
              </div>
            )}

            <div>
              <label className="label" htmlFor="admin-email">
                <Mail size={12} style={{ color: 'var(--color-iris)' }} /> Adresse e-mail
              </label>
              <input
                id="admin-email"
                type="email"
                className="field"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@exemple.com"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="admin-password">
                <Lock size={12} style={{ color: 'var(--color-iris)' }} /> Mot de passe
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  className="field pr-11"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--color-muted)' }}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {mode === 'signup' && (
                <p className="text-[11px] mt-1.5" style={{ color: 'var(--color-faint)' }}>
                  6 caractères minimum.
                </p>
              )}
            </div>

            {mode === 'signup' && (
              <div>
                <label className="label" htmlFor="admin-confirm">
                  <Lock size={12} style={{ color: 'var(--color-iris)' }} /> Confirmer le mot de passe
                </label>
                <input
                  id="admin-confirm"
                  type={showPassword ? 'text' : 'password'}
                  className="field"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />
              </div>
            )}

            <motion.button
              type="submit"
              whileHover={busy ? {} : { scale: 1.02 }}
              whileTap={busy ? {} : { scale: 0.98 }}
              disabled={busy}
              className="btn-aurora w-full h-13 py-4 text-sm mt-2"
            >
              {busy ? (
                <><Loader2 size={17} className="animate-spin" /> Patientez…</>
              ) : mode === 'signin' ? (
                <><LogIn size={17} /> Se connecter</>
              ) : (
                <><UserPlus size={17} /> Créer le compte</>
              )}
            </motion.button>
          </form>

          {/* Base pas encore initialisée : on dit quoi faire, plutôt que de
              laisser croire qu'un compte existe déjà. */}
          {adminExists === 'setup' && (
            <div
              className="mt-6 pt-5 rounded-xl px-4 py-3.5 flex items-start gap-2.5"
              style={{ background: 'rgba(251,191,36,0.09)', border: '1px solid rgba(251,191,36,0.3)' }}
            >
              <AlertCircle size={16} style={{ color: 'var(--color-amber)' }} className="shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-bold mb-1" style={{ color: 'var(--color-title)' }}>
                  Base du portail non initialisée
                </p>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                  Exécutez <code className="px-1 py-0.5 rounded font-mono" style={{ background: 'var(--color-panel-2)' }}>sql/01_portail.sql</code>{' '}
                  dans le SQL Editor du projet Supabase du portail, puis rechargez cette page.
                  La création du compte administrateur apparaîtra alors ici.
                </p>
              </div>
            </div>
          )}

          {/* Bascule — masquée dès qu'un admin existe */}
          {adminExists === 'no' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 pt-5 text-center"
              style={{ borderTop: '1px solid var(--color-line-soft)' }}
            >
              {mode === 'signin' ? (
                <>
                  <p className="text-xs mb-3" style={{ color: 'var(--color-muted)' }}>
                    Aucun administrateur n'est encore enregistré sur ce portail.
                  </p>
                  <button type="button" onClick={() => switchTo('signup')} className="btn-ghost w-full h-12 text-xs">
                    <UserPlus size={15} /> Créer un compte administrateur
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => switchTo('signin')} className="btn-ghost w-full h-12 text-xs">
                  <LogIn size={15} /> J'ai déjà un compte
                </button>
              )}
            </motion.div>
          )}

          {adminExists === 'yes' && mode === 'signin' && (
            <p
              className="text-[11px] text-center mt-6 pt-5"
              style={{ color: 'var(--color-faint)', borderTop: '1px solid var(--color-line-soft)' }}
            >
              Le compte administrateur de ce portail est déjà créé. Les comptes supplémentaires
              s'ajoutent depuis le tableau de bord, une fois connecté.
            </p>
          )}
        </div>

        <p className="text-center text-[11px] mt-6 flex items-center justify-center gap-1.5" style={{ color: 'var(--color-faint)' }}>
          <Car size={12} /> DriveHub — portail multi-agences
        </p>
      </motion.div>
    </div>
  );
};
