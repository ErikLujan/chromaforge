import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Camera,
  Check,
  Eye,
  EyeOff,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserRound,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import clsx from 'clsx';
import { toast } from 'sonner';
import Modal from '@/components/ui/Modal';
import AsyncButton from '@/components/ui/AsyncButton';
import { supabase } from '@/services/supabase.client';
import { useAuthStore } from '@/store/useAuthStore';
import { AUTH_GENERIC_ERROR, getAuthErrorMessage } from '@/utils/auth.utils';
import {
  cropImage,
  isSupportedAvatar,
  setAvatarMetadata,
  syncAvatarUrl,
  uploadAvatar,
} from '@/services/avatar.service';
import type { CroppedAvatar } from '@/services/avatar.service';
import { sanitizeText } from '@/utils/sanitization.utils';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useEntrance } from '@/hooks/useEntrance';
import { useSpotlight } from '@/hooks/useSpotlight';
import styles from './Profile.module.scss';

/**
 * Profile — account configuration surface (`/profile`).
 *
 * Internal sidebar layout: a vertical navigation column on desktop collapsing
 * into a horizontal tab strip on mobile, beside a content column rendering
 * the active section in glassmorphic cards. Three sections: Perfil (avatar
 * management plus account form, with the email strictly read-only as the
 * immutable account identifier), Seguridad (password change verified against
 * the current password first), and Zona de Peligro (deletion delegated to
 * the `delete-account` Edge Function holding the service role — the UI
 * reports the real result and never fakes success).
 */

type ProfileTabId = 'perfil' | 'seguridad' | 'peligro';

interface ProfileTab {
  readonly id: ProfileTabId;
  readonly label: string;
  readonly description: string;
  readonly icon: LucideIcon;
}

const PROFILE_TABS: readonly ProfileTab[] = [
  {
    id: 'perfil',
    label: 'Perfil',
    description: 'Tus datos personales',
    icon: UserRound,
  },
  {
    id: 'seguridad',
    label: 'Seguridad',
    description: 'Contraseña y acceso',
    icon: ShieldCheck,
  },
  {
    id: 'peligro',
    label: 'Zona de Peligro',
    description: 'Acciones irreversibles',
    icon: AlertTriangle,
  },
] as const;

const EMAIL_LOCK_HINT = 'El correo electrónico no puede ser modificado por motivos de seguridad.';
const MAX_AVATAR_BYTES = 8 * 1024 * 1024;

/**
 * Derives the avatar fallback initials from a display name (first letters of
 * the first two words) or, failing that, from the email's local part.
 *
 * @param {string} name The user's display name.
 * @param {string} email The user's email address.
 * @returns {string} At most two uppercase letters.
 */
function getInitials(name: string, email: string): string {
  const trimmed = name.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean).slice(0, 2);
    const initials = parts
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase();
    if (initials) return initials;
  }
  const local = email.split('@')[0] ?? '';
  return (local.slice(0, 2) || '?').toUpperCase();
}

/**
 * Labelled field with icon, error, and optional trailing action.
 */
interface ProfileFieldProps {
  readonly id: string;
  readonly label: string;
  readonly type?: 'text' | 'email' | 'password';
  readonly value: string;
  readonly onChange?: (value: string) => void;
  readonly autoComplete?: string;
  readonly placeholder?: string;
  readonly icon: ReactNode;
  readonly error?: string;
  /** Extra control rendered inside the input (visibility toggles, badges). */
  readonly trailing?: ReactNode;
  /** Muted helper copy rendered under the field (used by the locked email). */
  readonly hint?: string;
  /** Native tooltip — the locked email explains its own protection. */
  readonly title?: string;
  readonly disabled?: boolean;
}

/**
 * Renders a labelled field with icon, validation error, and optional trailing
 * control.
 *
 * @param {ProfileFieldProps} props Field configuration.
 * @returns {JSX.Element} The rendered field.
 */
function ProfileField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  autoComplete,
  placeholder,
  icon,
  error,
  trailing,
  hint,
  title,
  disabled,
}: ProfileFieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <div className={clsx(styles.inputWrap, error && styles.inputWrapInvalid)}>
        <span className={styles.inputIcon} aria-hidden="true">
          {icon}
        </span>
        <input
          id={id}
          name={id}
          className={clsx(styles.input, disabled && styles.inputLocked)}
          type={type}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoCapitalize={type === 'email' || type === 'password' ? 'none' : undefined}
          spellCheck={type === 'email' || type === 'password' ? false : undefined}
          title={title}
          disabled={disabled}
          readOnly={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        />
        {trailing}
      </div>
      {error && (
        <p id={`${id}-error`} className={styles.fieldError} role="alert">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${id}-hint`} className={styles.fieldHint}>
          <Lock size={13} aria-hidden="true" />
          {hint}
        </p>
      )}
    </div>
  );
}

/**
 * Avatar manager: upload, crop, preview, save, and removal of the profile
 * photo. Saves link three ways — the durable `profiles` row, the session
 * metadata the header renders from, and the Zustand store for instant UI —
 * and clearing removes both persisted links.
 *
 * @returns {JSX.Element} The avatar management card.
 */
function AvatarManager() {
  const user = useAuthStore((state) => state.user);
  const setAvatarUrl = useAuthStore((state) => state.setAvatarUrl);

  const handleSpotlight = useSpotlight<HTMLButtonElement>();

  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [croppedAvatar, setCroppedAvatar] = useState<CroppedAvatar | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isApplyingCrop, setIsApplyingCrop] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const sourceImageRef = useRef<string | null>(null);

  const email = user?.email ?? '';
  const avatarUrl = (user?.user_metadata?.avatar_url as string | undefined) ?? null;
  const displayName =
    (user?.user_metadata?.name as string | undefined)?.trim() ||
    email.split('@')[0] ||
    '';

  useEffect(() => {
    sourceImageRef.current = sourceImage;
  }, [sourceImage]);

  useEffect(() => {
    return () => {
      if (sourceImageRef.current) {
        URL.revokeObjectURL(sourceImageRef.current);
      }
    };
  }, []);

  const openFilePicker = () => fileInputRef.current?.click();

  const resetCropper = useCallback(() => {
    setSourceImage((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setCroppedAvatar(null);
    setCroppedAreaPixels(null);
    setAvatarError(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  }, []);

  const handleFileSelected = useCallback(
    (file: File) => {
      if (!isSupportedAvatar(file)) {
        setAvatarError('Selecciona una imagen JPG, PNG o WebP.');
        return;
      }
      if (file.size > MAX_AVATAR_BYTES) {
        setAvatarError('La imagen supera los 8 MB. Elige una más ligera.');
        return;
      }

      setAvatarError(null);
      if (sourceImage) URL.revokeObjectURL(sourceImage);
      const objectUrl = URL.createObjectURL(file);
      setSourceImage(objectUrl);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setCroppedAvatar(null);
    },
    [sourceImage],
  );

  const handleCropComplete = useCallback(
    (_croppedArea: Area, croppedAreaPixelsValue: Area) => {
      setCroppedAreaPixels(croppedAreaPixelsValue);
    },
    [],
  );

  const handleApplyCrop = useCallback(async () => {
    if (!sourceImage || !croppedAreaPixels || isApplyingCrop) return;
    setIsApplyingCrop(true);
    setAvatarError(null);
    try {
      const result = await cropImage(sourceImage, croppedAreaPixels);
      setCroppedAvatar(result);
    } catch {
      setAvatarError('No pudimos procesar tu foto. Prueba con otra imagen.');
    } finally {
      setIsApplyingCrop(false);
    }
  }, [sourceImage, croppedAreaPixels, isApplyingCrop]);

  const handleSaveAvatar = useCallback(async () => {
    if (!user || !croppedAvatar || isUploading) return;
    setIsUploading(true);
    setAvatarError(null);
    try {
      const url = await uploadAvatar(user.id, croppedAvatar.blob);
      if (!url) {
        toast.error('No pudimos subir tu foto. Inténtalo de nuevo.');
        return;
      }

      const profileLinked = await syncAvatarUrl(user.id, url);
      const metadataLinked = await setAvatarMetadata(url);
      setAvatarUrl(url);

      if (profileLinked && metadataLinked) {
        toast.success('Tu foto de perfil se actualizó correctamente.');
      } else {
        toast.error('Guardamos tu foto, pero no pudimos vincularla a tu perfil.');
      }
      resetCropper();
    } catch {
      toast.error(AUTH_GENERIC_ERROR);
    } finally {
      setIsUploading(false);
    }
  }, [user, croppedAvatar, isUploading, resetCropper, setAvatarUrl]);

  const isCropping = sourceImage !== null && croppedAvatar === null;
  const previewUrl = croppedAvatar?.dataUrl ?? avatarUrl;

  return (
    <section className={styles.card} aria-labelledby="profile-avatar-heading">
      <header className={styles.cardHeader}>
        <span className={styles.cardEyebrow}>Identidad visual</span>
        <h2 id="profile-avatar-heading" className={styles.cardTitle}>
          Foto de perfil
        </h2>
        <p className={styles.cardDescription}>
          Una imagen cuadrada que te identifica en toda la aplicación. Se
          recorta, optimiza y almacena en tu espacio privado de ChromaForge.
        </p>
      </header>

      <div className={styles.avatarLayout}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className={styles.visuallyHidden}
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleFileSelected(file);
            event.target.value = '';
          }}
        />

        <div className={styles.avatarPreview}>
          {previewUrl ? (
            <img src={previewUrl} alt="" className={styles.avatarImage} />
          ) : (
            <span className={styles.avatarInitials}>
              {getInitials(displayName, email)}
            </span>
          )}
        </div>

        <div className={styles.avatarControls}>
          {!sourceImage && (
            <>
              <div className={styles.avatarActions}>
                <button
                  type="button"
                  className={styles.avatarButton}
                  onClick={openFilePicker}
                  disabled={isUploading}
                >
                  <Camera size={16} aria-hidden="true" />
                  Subir foto
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={async () => {
                      if (!user) return;
                      await syncAvatarUrl(user.id, null);
                      await setAvatarMetadata('');
                      setAvatarUrl(null);
                      resetCropper();
                    }}
                    disabled={isUploading}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                    Quitar foto
                  </button>
                )}
              </div>
              <p className={styles.avatarHint}>JPG, PNG o WebP · máx. 8 MB</p>
            </>
          )}

          {isCropping && (
            <>
              <div className={styles.cropperStage}>
                <Cropper
                  image={sourceImage}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  restrictPosition
                  zoomWithScroll={false}
                  minZoom={1}
                  maxZoom={4}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={handleCropComplete}
                  style={{ containerStyle: { background: 'rgba(0, 0, 0, 0.45)' } }}
                />
              </div>

              <div className={styles.zoomRow}>
                <ZoomIn size={15} aria-hidden="true" />
                <input
                  type="range"
                  min={1}
                  max={4}
                  step={0.01}
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  className={styles.zoomSlider}
                  aria-label="Nivel de zoom del recorte"
                />
                <ZoomOut size={15} aria-hidden="true" />
              </div>

              <div className={styles.avatarActions}>
                <AsyncButton
                  type="button"
                  className={styles.cropPrimary}
                  label="Ajustar foto"
                  busyLabel="Ajustando…"
                  loading={isApplyingCrop}
                  icon={<Check size={16} />}
                  loaderVariant="accent"
                  disabled={isApplyingCrop}
                  onClick={() => void handleApplyCrop()}
                  onPointerMove={handleSpotlight}
                />
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={openFilePicker}
                  disabled={isApplyingCrop}
                >
                  <RefreshCw size={15} aria-hidden="true" />
                  Otra imagen
                </button>
              </div>
            </>
          )}

          {croppedAvatar && (
            <>
              <div className={styles.avatarActions}>
                <AsyncButton
                  type="button"
                  className={styles.cropPrimary}
                  label="Guardar foto"
                  busyLabel="Guardando…"
                  loading={isUploading}
                  icon={<Check size={16} />}
                  loaderVariant="accent"
                  disabled={isUploading}
                  onClick={() => void handleSaveAvatar()}
                  onPointerMove={handleSpotlight}
                />
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => {
                    setCroppedAvatar(null);
                    setAvatarError(null);
                  }}
                  disabled={isUploading}
                >
                  <RefreshCw size={15} aria-hidden="true" />
                  Ajustar de nuevo
                </button>
                <button
                  type="button"
                  className={styles.removeButton}
                  onClick={resetCropper}
                  disabled={isUploading}
                >
                  <Trash2 size={15} aria-hidden="true" />
                  Descartar
                </button>
              </div>
              <p className={styles.avatarHint}>
                La foto se guarda como WebP de 160 × 160 px.
              </p>
            </>
          )}

          {avatarError && (
            <p className={styles.fieldError} role="alert">
              {avatarError}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * Perfil tab: avatar manager plus account form with a read-only email.
 *
 * @returns {JSX.Element} The rendered profile tab.
 */
function PerfilTab() {
  const user = useAuthStore((state) => state.user);

  const handleSpotlight = useSpotlight<HTMLButtonElement>();

  const [name, setName] = useState(
    () => (user?.user_metadata?.name as string | undefined)?.trim() ?? '',
  );
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  const email = user?.email ?? '';
  const savedName = (user?.user_metadata?.name as string | undefined)?.trim() ?? '';
  const isDirty = name.trim() !== savedName;

  const handleSave = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = name.trim();
      if (trimmed.length < 2) {
        setNameError('El nombre debe tener al menos 2 caracteres.');
        return;
      }

      setIsSaving(true);
      try {
        const { error } = await supabase.auth.updateUser({
          data: { name: sanitizeText(trimmed) },
        });
        if (error) {
          toast.error(getAuthErrorMessage(error));
          return;
        }
        toast.success('Tu nombre se actualizó correctamente.');
      } catch {
        toast.error(AUTH_GENERIC_ERROR);
      } finally {
        setIsSaving(false);
      }
    },
    [name],
  );

  return (
    <div className={styles.tabStack}>
      <AvatarManager />

      <section className={styles.card} aria-labelledby="profile-info-heading">
        <header className={styles.cardHeader}>
          <span className={styles.cardEyebrow}>Información personal</span>
          <h2 id="profile-info-heading" className={styles.cardTitle}>
            Datos de tu cuenta
          </h2>
          <p className={styles.cardDescription}>
            El nombre se muestra en toda la aplicación. El correo identifica tu
            cuenta y permanece bloqueado por seguridad.
          </p>
        </header>

        <form className={styles.form} onSubmit={handleSave} noValidate>
          <ProfileField
            id="profile-name"
            label="Nombre"
            value={name}
            onChange={(value) => {
              setName(value);
              setNameError(undefined);
            }}
            autoComplete="name"
            placeholder="Tu nombre"
            icon={<UserRound size={18} />}
            error={nameError}
            disabled={isSaving}
          />

          <ProfileField
            id="profile-email"
            label="Correo electrónico"
            type="email"
            value={email}
            autoComplete="email"
            icon={<Mail size={18} />}
            hint={EMAIL_LOCK_HINT}
            title={EMAIL_LOCK_HINT}
            disabled
            trailing={
              <span className={styles.lockBadge} aria-hidden="true">
                <Lock size={15} />
              </span>
            }
          />

          <div className={styles.formActions}>
            <AsyncButton
              type="submit"
              className={styles.saveButton}
              label="Guardar cambios"
              busyLabel="Guardando…"
              loading={isSaving}
              icon={<Check size={16} />}
              loaderVariant="accent"
              disabled={isSaving || !isDirty}
              aria-live="polite"
              onPointerMove={handleSpotlight}
            />
          </div>
        </form>
      </section>
    </div>
  );
}

type SecurityField = 'current' | 'next' | 'confirm';
type SecurityErrors = Partial<Record<SecurityField, string>>;

/**
 * Seguridad tab: password change verified against the current password
 * before the update is issued.
 *
 * @returns {JSX.Element} The rendered security tab.
 */
function SeguridadTab() {
  const user = useAuthStore((state) => state.user);

  const handleSpotlight = useSpotlight<HTMLButtonElement>();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<SecurityErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  const email = user?.email ?? '';

  const clearError = (field: SecurityField) =>
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const nextErrors: SecurityErrors = {};
      if (!current) nextErrors.current = 'Ingresa tu contraseña actual.';
      if (!next) {
        nextErrors.next = 'Ingresa una contraseña nueva.';
      } else if (next.length < 6) {
        nextErrors.next = 'La contraseña debe tener al menos 6 caracteres.';
      }
      if (!confirm) {
        nextErrors.confirm = 'Confirma tu contraseña nueva.';
      } else if (confirm !== next) {
        nextErrors.confirm = 'Las contraseñas no coinciden.';
      }
      setErrors(nextErrors);
      if (Object.values(nextErrors).some(Boolean)) return;

      setIsSaving(true);
      try {
        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email,
          password: current,
        });
        if (verifyError) {
          toast.error('La contraseña actual es incorrecta.');
          return;
        }

        const { error } = await supabase.auth.updateUser({ password: next });
        if (error) {
          toast.error(getAuthErrorMessage(error));
          return;
        }

        toast.success('Tu contraseña se actualizó correctamente.');
        setCurrent('');
        setNext('');
        setConfirm('');
      } catch {
        toast.error(AUTH_GENERIC_ERROR);
      } finally {
        setIsSaving(false);
      }
    },
    [email, current, next, confirm],
  );

  const passwordToggle = (field: SecurityField, visible: boolean) => (
    <button
      type="button"
      className={styles.eyeToggle}
      onClick={() =>
        field === 'current'
          ? setShowCurrent((v) => !v)
          : field === 'next'
            ? setShowNext((v) => !v)
            : setShowConfirm((v) => !v)
      }
      aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      aria-pressed={visible}
      disabled={isSaving}
    >
      {visible ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );

  return (
    <div className={styles.tabStack}>
      <section className={styles.card} aria-labelledby="profile-security-heading">
        <header className={styles.cardHeader}>
          <span className={styles.cardEyebrow}>Contraseña y acceso</span>
          <h2 id="profile-security-heading" className={styles.cardTitle}>
            Cambiar contraseña
          </h2>
          <p className={styles.cardDescription}>
            Verificamos tu contraseña actual antes de aplicar la nueva, para que
            nadie más que tú pueda modificarla.
          </p>
        </header>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <ProfileField
            id="security-current"
            label="Contraseña actual"
            type={showCurrent ? 'text' : 'password'}
            value={current}
            onChange={(value) => {
              setCurrent(value);
              clearError('current');
            }}
            autoComplete="current-password"
            placeholder="••••••••"
            icon={<Lock size={18} />}
            error={errors.current}
            disabled={isSaving}
            trailing={passwordToggle('current', showCurrent)}
          />

          <ProfileField
            id="security-next"
            label="Contraseña nueva"
            type={showNext ? 'text' : 'password'}
            value={next}
            onChange={(value) => {
              setNext(value);
              clearError('next');
            }}
            autoComplete="new-password"
            placeholder="Mínimo 6 caracteres"
            icon={<Lock size={18} />}
            error={errors.next}
            disabled={isSaving}
            trailing={passwordToggle('next', showNext)}
          />

          <ProfileField
            id="security-confirm"
            label="Confirmar contraseña nueva"
            type={showConfirm ? 'text' : 'password'}
            value={confirm}
            onChange={(value) => {
              setConfirm(value);
              clearError('confirm');
            }}
            autoComplete="new-password"
            placeholder="Repite la contraseña nueva"
            icon={<Lock size={18} />}
            error={errors.confirm}
            disabled={isSaving}
            trailing={passwordToggle('confirm', showConfirm)}
          />

          <p className={styles.securityNote}>
            <Lock size={13} aria-hidden="true" />
            Tu correo electrónico es tu identificador de acceso y no puede
            modificarse por motivos de seguridad.
          </p>

          <div className={styles.formActions}>
            <AsyncButton
              type="submit"
              className={styles.saveButton}
              label="Actualizar contraseña"
              busyLabel="Actualizando…"
              loading={isSaving}
              icon={<ShieldCheck size={16} />}
              loaderVariant="accent"
              disabled={isSaving}
              aria-live="polite"
              onPointerMove={handleSpotlight}
            />
          </div>
        </form>
      </section>
    </div>
  );
}

/**
 * Peligro tab: irreversible account deletion behind typed confirmation.
 *
 * The destructive action stays locked until the typed value matches the
 * account email (case-insensitive after trimming); a non-matching value
 * surfaces as a field error. Deletion itself requires the service role and
 * lives in the `delete-account` Edge Function — the anon client can never
 * drop rows from `auth.users` — so this surface invokes it and reports the
 * real result instead of pretending the account was removed.
 *
 * @returns {JSX.Element} The rendered danger tab.
 */
function PeligroTab() {
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [typedEmail, setTypedEmail] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const email = user?.email ?? '';
  const confirmed = typedEmail.trim().toLowerCase() === email.toLowerCase();
  const hasMismatch = typedEmail.trim().length > 0 && !confirmed;

  const handleConfirmDelete = useCallback(async () => {
    if (!confirmed || isDeleting) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('delete-account', {
        body: {},
      });
      if (error) throw error;

      toast.success('Tu cuenta se eliminó correctamente. Hasta pronto.');
      await signOut();
      navigate('/auth', { replace: true });
    } catch {
      toast.error(
        'No pudimos eliminar tu cuenta en este momento. Inténtalo de nuevo.',
      );
    } finally {
      setIsDeleting(false);
    }
  }, [confirmed, isDeleting, signOut, navigate]);

  return (
    <div className={styles.tabStack}>
      <section
        className={clsx(styles.card, styles.cardDanger)}
        aria-labelledby="profile-danger-heading"
      >
        <header className={styles.cardHeader}>
          <span className={styles.cardEyebrow}>Zona de Peligro</span>
          <h2 id="profile-danger-heading" className={styles.cardTitle}>
            Eliminar cuenta
          </h2>
          <p className={styles.cardDescription}>
            Esta acción es permanente y no se puede deshacer. Una vez eliminada
            tu cuenta, tu acceso y tus identidades guardadas desaparecerán.
          </p>
        </header>

        <div className={styles.dangerBox} role="note">
          <span className={styles.dangerBoxIcon} aria-hidden="true">
            <AlertTriangle size={18} />
          </span>
          <p className={styles.dangerBoxText}>
            Perderás el acceso a ChromaForge y todas tus identidades visuales
            guardadas. Considera exportar lo que necesites antes de continuar.
          </p>
        </div>

        <div className={styles.formActions}>
          <button
            type="button"
            className={styles.dangerButton}
            onClick={() => setIsOpen(true)}
          >
            <Trash2 size={15} aria-hidden="true" />
            Eliminar mi cuenta
          </button>
        </div>
      </section>

      <Modal
        open={isOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsOpen(false);
            setTypedEmail('');
          }
        }}
        title="Eliminar cuenta"
      >
        <div className={styles.dangerModal}>
          <span className={styles.dangerModalIcon} aria-hidden="true">
            <AlertTriangle size={20} />
          </span>

          <div className={styles.dangerCopy}>
            <p className={styles.dangerTitle}>¿Eliminar tu cuenta definitivamente?</p>
            <p className={styles.dangerDescription}>
              Esta acción no se puede deshacer. Para confirmar, escribe tu
              correo electrónico tal como aparece en tu perfil.
            </p>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="danger-email-confirm">
              Escribe tu correo para confirmar
            </label>
<div
                className={clsx(
                  styles.inputWrap,
                  hasMismatch && styles.inputWrapInvalid,
                )}
              >
                <span className={styles.inputIcon} aria-hidden="true">
                  <Mail size={18} />
                </span>
                <input
                  id="danger-email-confirm"
                  name="danger-email-confirm"
                  className={styles.input}
                  type="email"
                  value={typedEmail}
                  placeholder="Escribe tu correo para confirmar…"
                  autoComplete="off"
                  disabled={isDeleting}
                  aria-invalid={hasMismatch}
                  aria-describedby={
                    hasMismatch ? 'danger-email-error' : 'danger-email-hint'
                  }
                  onChange={(event) => setTypedEmail(event.target.value)}
                />
              </div>
              {hasMismatch ? (
                <p
                  id="danger-email-error"
                  className={styles.fieldError}
                  role="alert"
                >
                  El correo no coincide con tu cuenta.
                </p>
              ) : (
                <p id="danger-email-hint" className={styles.fieldHint}>
                  Debe coincidir exactamente con «{email}».
                </p>
              )}
          </div>

          <div className={styles.confirmActions}>
            <button
              type="button"
              className={styles.confirmCancel}
              onClick={() => setIsOpen(false)}
              disabled={isDeleting}
            >
              Cancelar
            </button>
            <AsyncButton
              type="button"
              className={styles.confirmDelete}
              label="Eliminar definitivamente"
              busyLabel="Eliminando…"
              loading={isDeleting}
              icon={<Trash2 size={15} />}
              loaderVariant="light"
              disabled={!confirmed || isDeleting}
              onClick={() => void handleConfirmDelete()}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

/**
 * ChromaForge "Mi Perfil" configuration screen.
 *
 * An Internal Sidebar Layout: on desktop (lg+) a 25% vertical tab column
 * beside a 75% content column; below lg the same tablist collapses into a
 * top horizontal scrollable strip. The tablist follows the WAI-ARIA tabs
 * pattern (roving tabindex, arrow / Home / End navigation) in both
 * orientations.
 *
 * @returns {JSX.Element} The rendered profile page.
 */
export default function Profile() {
  useDocumentTitle('Mi Perfil');

  const [activeTab, setActiveTab] = useState<ProfileTabId>('perfil');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const headerEntered = useEntrance();
  const panelEntered = useEntrance(0, activeTab);

  const selectTab = useCallback((next: ProfileTabId, focusTab = false) => {
    setActiveTab(next);
    if (focusTab) {
      const index = PROFILE_TABS.findIndex((tab) => tab.id === next);
      tabRefs.current[index]?.focus();
    }
  }, []);

  const handleTablistKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const currentIndex = PROFILE_TABS.findIndex((tab) => tab.id === activeTab);
      const isPrev = event.key === 'ArrowLeft' || event.key === 'ArrowUp';
      const isNext = event.key === 'ArrowRight' || event.key === 'ArrowDown';
      if (!isPrev && !isNext && event.key !== 'Home' && event.key !== 'End') return;

      event.preventDefault();
      let nextIndex = currentIndex;
      if (isNext) nextIndex = Math.min(PROFILE_TABS.length - 1, currentIndex + 1);
      if (isPrev) nextIndex = Math.max(0, currentIndex - 1);
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = PROFILE_TABS.length - 1;

      if (nextIndex !== currentIndex) {
        selectTab(PROFILE_TABS[nextIndex].id, true);
      } else {
        tabRefs.current[currentIndex]?.focus();
      }
    },
    [activeTab, selectTab],
  );

  return (
    <section className={styles.profile}>
      <div className={styles.background} aria-hidden="true" />

      <div className={styles.container}>
        <header className={styles.pageHeader}>
          <span
            className={clsx(styles.pageEyebrow, headerEntered && styles.entered)}
          >
            Configuración de cuenta
          </span>
          <h1 className={clsx(styles.pageTitle, headerEntered && styles.entered)}>
            Mi perfil
          </h1>
          <p
            className={clsx(
              styles.pageDescription,
              headerEntered && styles.entered,
            )}
          >
            Gestiona tu identidad visual, la seguridad de tu acceso y las
            opciones avanzadas de tu cuenta de ChromaForge.
          </p>
        </header>

        <div className={styles.layout}>
          <div
            className={styles.sidebar}
            role="tablist"
            aria-label="Secciones de tu perfil"
            onKeyDown={handleTablistKeyDown}
          >
            {PROFILE_TABS.map((tab, index) => {
              const Icon = tab.icon;
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  ref={(element) => {
                    tabRefs.current[index] = element;
                  }}
                  type="button"
                  role="tab"
                  id={`profile-tab-${tab.id}`}
                  className={clsx(styles.sidebarTab, isActive && styles.sidebarTabActive)}
                  aria-selected={isActive}
                  aria-controls={`profile-tabpanel-${tab.id}`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => selectTab(tab.id)}
                >
                  <span className={styles.sidebarTabIcon} aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <span className={styles.sidebarTabText}>
                    <span className={styles.sidebarTabLabel}>{tab.label}</span>
                    <span className={styles.sidebarTabDescription}>
                      {tab.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className={styles.content}>
            <div
              id={`profile-tabpanel-${activeTab}`}
              role="tabpanel"
              aria-labelledby={`profile-tab-${activeTab}`}
              className={clsx(styles.panel, panelEntered && styles.entered)}
            >
              {activeTab === 'perfil' && <PerfilTab />}
              {activeTab === 'seguridad' && <SeguridadTab />}
              {activeTab === 'peligro' && <PeligroTab />}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}