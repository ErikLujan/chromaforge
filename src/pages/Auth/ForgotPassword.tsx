import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, MailCheck, Send } from 'lucide-react';
import { toast } from 'sonner';
import clsx from 'clsx';
import ChromaForgeIcon from '@/components/brand/ChromaForgeIcon';
import AsyncButton from '@/components/ui/AsyncButton';
import { supabase } from '@/services/supabase.client';
import { AUTH_GENERIC_ERROR, getAuthErrorMessage } from '@/utils/auth.utils';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useEntrance } from '@/hooks/useEntrance';
import { useSpotlight } from '@/hooks/useSpotlight';
import styles from './ForgotPassword.module.scss';

/**
 * ForgotPassword — password recovery request (`/forgot-password`).
 *
 * A focused single column over a settled dot matrix: brand lockup, mono
 * eyebrow, serif title, and one hairline email field. Submit fires
 * `supabase.auth.resetPasswordForEmail` with a redirect back to
 * `/update-password`; success swaps the form for a quiet confirmation. Public
 * surface wrapped in PublicRoute like `/auth`.
 *
 * @returns {JSX.Element} The recovery request page.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPassword() {
  useDocumentTitle('Recuperar contraseña');

  const entered = useEntrance();
  const handleSpotlight = useSpotlight<HTMLButtonElement>();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || sent) return;

    const trimmed = email.trim();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }
    setError(undefined);
    setIsSubmitting(true);

    supabase.auth
      .resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/update-password`,
      })
      .then(({ error: resetError }) => {
        if (resetError) {
          toast.error(getAuthErrorMessage(resetError));
          return;
        }
        setSent(true);
        toast.success('Revisa tu correo: te enviamos el enlace de recuperación.');
      })
      .catch(() => {
        toast.error(AUTH_GENERIC_ERROR);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  return (
    <section className={styles.page} aria-labelledby="forgot-password-title">
      <div className={clsx(styles.panel, entered && styles.entered)}>
        <Link to="/" className={styles.brand} aria-label="ChromaForge, ir al inicio">
          <ChromaForgeIcon size={36} className={styles.brandMark} />
          <span className={styles.brandName}>ChromaForge</span>
        </Link>

        {sent ? (
          <>
            <span className={styles.sentIcon} aria-hidden="true">
              <MailCheck size={22} />
            </span>
            <p className={styles.eyebrow}>Enlace enviado</p>
            <h1 id="forgot-password-title" className={styles.title}>
              Revisa tu correo
            </h1>
            <p className={styles.subtitle}>
              Si existe una cuenta para <strong>{email.trim()}</strong>, recibirás un
              enlace para elegir una nueva contraseña. El enlace caduca en 1 hora.
            </p>
          </>
        ) : (
          <>
            <p className={styles.eyebrow}>Recuperación de acceso</p>
            <h1 id="forgot-password-title" className={styles.title}>
              Recupera tu contraseña
            </h1>
            <p className={styles.subtitle}>
              Ingresa el correo de tu cuenta y te enviaremos un enlace para elegir
              una nueva contraseña.
            </p>

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="recovery-email">
                  Correo electrónico
                </label>
                <div className={`${styles.inputWrap} ${error ? styles.inputWrapInvalid : ''}`}>
                  <span className={styles.inputIcon} aria-hidden="true">
                    <Mail size={18} />
                  </span>
                  <input
                    id="recovery-email"
                    name="recovery-email"
                    className={styles.input}
                    type="email"
                    value={email}
                    placeholder="tu@correo.com"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    disabled={isSubmitting}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? 'recovery-email-error' : undefined}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (error) setError(undefined);
                    }}
                  />
                </div>
                {error && (
                  <p id="recovery-email-error" className={styles.fieldError} role="alert">
                    {error}
                  </p>
                )}
              </div>

              <AsyncButton
                type="submit"
                className={styles.submit}
                label="Enviar enlace de recuperación"
                busyLabel="Enviando…"
                loading={isSubmitting}
                icon={<Send size={16} />}
                loaderVariant="accent"
                disabled={isSubmitting}
                aria-live="polite"
                onPointerMove={handleSpotlight}
              />
            </form>
          </>
        )}

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
