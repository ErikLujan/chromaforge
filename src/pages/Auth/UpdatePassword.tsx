import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import clsx from 'clsx';
import ChromaForgeIcon from '@/components/brand/ChromaForgeIcon';
import AsyncButton from '@/components/ui/AsyncButton';
import { supabase } from '@/services/supabase.client';
import { AUTH_GENERIC_ERROR, getAuthErrorMessage } from '@/utils/auth.utils';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useEntrance } from '@/hooks/useEntrance';
import { useSpotlight } from '@/hooks/useSpotlight';
import styles from './UpdatePassword.module.scss';

/**
 * UpdatePassword — new password (`/update-password`).
 *
 * Twin of ForgotPassword with two hairline password fields and visibility
 * toggles instead of one email field. Submit calls
 * `supabase.auth.updateUser`, then clears the recovery session and routes to
 * `/auth` so the visitor signs in fresh with the new key.
 *
 * @returns {JSX.Element} The password update page.
 */

interface PasswordErrors {
  password?: string;
  confirm?: string;
}

export default function UpdatePassword() {
  useDocumentTitle('Nueva contraseña');

  const navigate = useNavigate();
  const entered = useEntrance();
  const handleSpotlight = useSpotlight<HTMLButtonElement>();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<PasswordErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const nextErrors: PasswordErrors = {};
    if (password.length < 6) {
      nextErrors.password = 'La contraseña debe tener al menos 6 caracteres.';
    }
    if (confirm !== password) {
      nextErrors.confirm = 'Las contraseñas no coinciden.';
    }
    setErrors(nextErrors);
    if (nextErrors.password ?? nextErrors.confirm) return;

    const run = async () => {
      setIsSubmitting(true);
      try {
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) {
          toast.error(getAuthErrorMessage(updateError));
          return;
        }
        await supabase.auth.signOut();
        toast.success('Contraseña actualizada. Inicia sesión con tu nueva clave.');
        navigate('/auth', { replace: true });
      } catch {
        toast.error(AUTH_GENERIC_ERROR);
      } finally {
        setIsSubmitting(false);
      }
    };
    void run();
  };

  return (
    <section className={styles.page} aria-labelledby="update-password-title">
      <div className={clsx(styles.panel, entered && styles.entered)}>
        <Link to="/" className={styles.brand} aria-label="ChromaForge, ir al inicio">
          <ChromaForgeIcon size={36} className={styles.brandMark} />
          <span className={styles.brandName}>ChromaForge</span>
        </Link>

        <p className={styles.eyebrow}>Nueva contraseña</p>
        <h1 id="update-password-title" className={styles.title}>
          Elige una contraseña
        </h1>
        <p className={styles.subtitle}>
          Usa al menos 6 caracteres. Al guardarla cerraremos tu sesión para
          que inicies sesión con tu nueva clave.
        </p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="new-password">
              Nueva contraseña
            </label>
            <div className={clsx(styles.inputWrap, errors.password && styles.inputWrapInvalid)}>
              <span className={styles.inputIcon} aria-hidden="true">
                <Lock size={18} />
              </span>
              <input
                id="new-password"
                name="new-password"
                className={styles.input}
                type={showPassword ? 'text' : 'password'}
                value={password}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                autoCapitalize="none"
                spellCheck={false}
                disabled={isSubmitting}
                aria-invalid={errors.password ? true : undefined}
                aria-describedby={errors.password ? 'new-password-error' : undefined}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (errors.password ?? errors.confirm) setErrors({});
                }}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showPassword}
                disabled={isSubmitting}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p id="new-password-error" className={styles.fieldError} role="alert">
                {errors.password}
              </p>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="confirm-password">
              Confirmar contraseña
            </label>
            <div className={clsx(styles.inputWrap, errors.confirm && styles.inputWrapInvalid)}>
              <span className={styles.inputIcon} aria-hidden="true">
                <Lock size={18} />
              </span>
              <input
                id="confirm-password"
                name="confirm-password"
                className={styles.input}
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                placeholder="Repite tu contraseña"
                autoComplete="new-password"
                autoCapitalize="none"
                spellCheck={false}
                disabled={isSubmitting}
                aria-invalid={errors.confirm ? true : undefined}
                aria-describedby={errors.confirm ? 'confirm-password-error' : undefined}
                onChange={(event) => {
                  setConfirm(event.target.value);
                  if (errors.password ?? errors.confirm) setErrors({});
                }}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowConfirm((visible) => !visible)}
                aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showConfirm}
                disabled={isSubmitting}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirm && (
              <p id="confirm-password-error" className={styles.fieldError} role="alert">
                {errors.confirm}
              </p>
            )}
          </div>

          <AsyncButton
            type="submit"
            className={styles.submit}
            label="Actualizar contraseña"
            busyLabel="Actualizando…"
            loading={isSubmitting}
            icon={<ShieldCheck size={16} />}
            loaderVariant="accent"
            disabled={isSubmitting}
            aria-live="polite"
            onPointerMove={handleSpotlight}
          />
        </form>

        <div className={styles.backRow}>
          <Link to="/auth" className={styles.backLink}>
            <ArrowLeft size={14} aria-hidden="true" />
            Volver a iniciar sesión
          </Link>
        </div>
      </div>
    </section>
  );
}
