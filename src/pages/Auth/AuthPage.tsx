import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent, ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  ImagePlus,
  Lock,
  LogIn,
  Mail,
  RefreshCw,
  Trash2,
  User,
  UserPlus,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import clsx from 'clsx';
import { toast } from 'sonner';
import ChromaForgeIcon from '@/components/brand/ChromaForgeIcon';
import { supabase } from '@/services/supabase.client';
import { useAuthStore } from '@/store/useAuthStore';
import { AUTH_GENERIC_ERROR, getAuthErrorMessage } from '@/utils/auth.utils';
import { sanitizeText } from '@/utils/sanitization.utils';
import {
  cropImage,
  isSupportedAvatar,
  savePendingAvatar,
  setAvatarMetadata,
  uploadAvatar,
} from '@/services/avatar.service';
import type { CroppedAvatar } from '@/services/avatar.service';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useEntrance } from '@/hooks/useEntrance';
import { useSpotlight } from '@/hooks/useSpotlight';
import AsyncButton from '@/components/ui/AsyncButton';
import styles from './AuthPage.module.scss';

/**
 * Auth Page — sign in and three-step registration on a stark split screen.
 *
 * An unboxed obsidian form column on the left carries the login form and the
 * registration wizard (account identity, password security, optional profile
 * photo with a client-side cropper); a tinted brand panel fills the right on
 * wide screens. On success the visitor is sent to the blocked destination or
 * `/dashboard`. Accounts pending email confirmation stay on the page while
 * their cropped avatar is parked locally and linked on first sign-in.
 */

type AuthMode = 'login' | 'register';
type RegisterStep = 1 | 2 | 3;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_AVATAR_BYTES = 8 * 1024 * 1024;

const initialForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
};

type AuthFormState = typeof initialForm;
type FieldErrors = Partial<Record<keyof AuthFormState, string>>;

const STEP_LABELS = ['Cuenta', 'Seguridad', 'Foto'] as const;

const ROLE_SWATCHES = [
  { name: 'Primario', modifier: 'rolePrimary' },
  { name: 'Secundario', modifier: 'roleSecondary' },
  { name: 'Acento', modifier: 'roleAccent' },
  { name: 'Neutro', modifier: 'roleNeutral' },
  { name: 'Fondo', modifier: 'roleBackground' },
] as const;

interface AuthFieldProps {
  readonly id: string;
  readonly label: string;
  readonly type?: 'text' | 'email' | 'password';
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly autoComplete: string;
  readonly placeholder?: string;
  readonly icon: ReactNode;
  readonly error?: string;
  readonly trailing?: ReactNode;
  readonly disabled?: boolean;
}

/**
 * Reusable labelled field with icon, accessible error, and optional trailing
 * action.
 *
 * @param {AuthFieldProps} props Field configuration.
 * @returns {JSX.Element} The rendered field.
 */
function AuthField({
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
  disabled,
}: AuthFieldProps) {
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
          className={styles.input}
          type={type}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoCapitalize={type === 'email' || type === 'password' ? 'none' : undefined}
          spellCheck={type === 'email' || type === 'password' ? false : undefined}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
        {trailing}
      </div>
      {error && (
        <p id={`${id}-error`} className={styles.fieldError} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Registration progress indicator: minimal segmented line with marker dots.
 *
 * @param {{ readonly step: RegisterStep }} props The active registration step.
 * @returns {JSX.Element} The rendered step indicator.
 */
function StepIndicator({ step }: { readonly step: RegisterStep }) {
  return (
    <ol className={styles.steps} aria-label="Progreso del registro">
      {STEP_LABELS.map((label, index) => {
        const stepNumber = (index + 1) as RegisterStep;
        const isDone = step > stepNumber;
        const isActive = step === stepNumber;
        return (
          <li
            key={label}
            className={styles.stepItem}
            aria-current={isActive ? 'step' : undefined}
          >
            <span className={styles.stepTrack} aria-hidden="true">
              <span
                className={clsx(
                  styles.stepDot,
                  isActive && styles.stepDotActive,
                  isDone && styles.stepDotDone,
                )}
              />
              {index < STEP_LABELS.length - 1 && (
                <span
                  className={clsx(styles.stepLine, isDone && styles.stepLineDone)}
                />
              )}
            </span>
            <span
              className={clsx(
                styles.stepLabel,
                isActive && styles.stepLabelActive,
                isDone && styles.stepLabelDone,
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Registration step three: avatar upload, crop, and preview.
 *
 * @param {AvatarStepProps} props Avatar step configuration and handlers.
 * @returns {JSX.Element} The rendered avatar step.
 */
interface AvatarStepProps {
  readonly sourceImage: string | null;
  readonly crop: Point;
  readonly zoom: number;
  readonly croppedAvatar: CroppedAvatar | null;
  readonly avatarError: string | null;
  readonly isApplyingCrop: boolean;
  readonly disabled: boolean;
  readonly onCropChange: (crop: Point) => void;
  readonly onZoomChange: (zoom: number) => void;
  readonly onCropComplete: (croppedArea: Area, croppedAreaPixels: Area) => void;
  readonly onFileSelected: (file: File) => void;
  readonly onApplyCrop: () => void;
  readonly onReopenCropper: () => void;
  readonly onRemove: () => void;
}

function AvatarStep({
  sourceImage,
  crop,
  zoom,
  croppedAvatar,
  avatarError,
  isApplyingCrop,
  disabled,
  onCropChange,
  onZoomChange,
  onCropComplete,
  onFileSelected,
  onApplyCrop,
  onReopenCropper,
  onRemove,
}: AvatarStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openFilePicker = () => fileInputRef.current?.click();

  return (
    <div className={styles.avatarStep}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className={styles.visuallyHidden}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFileSelected(file);
          event.target.value = '';
        }}
      />

      {!sourceImage && (
        <>
          <button
            type="button"
            className={styles.dropzone}
            onClick={openFilePicker}
            disabled={disabled}
          >
            <span className={styles.dropzoneIcon} aria-hidden="true">
              <ImagePlus size={22} />
            </span>
            <span className={styles.dropzoneTitle}>Sube una foto de perfil</span>
            <span className={styles.dropzoneHint}>JPG, PNG o WebP · máx. 8 MB</span>
          </button>
          <p className={styles.avatarOptional}>Opcional — puedes añadirla más tarde.</p>
        </>
      )}

      {sourceImage && !croppedAvatar && (
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
              onCropChange={onCropChange}
              onZoomChange={onZoomChange}
              onCropComplete={onCropComplete}
              style={{ containerStyle: { background: 'rgba(0, 0, 0, 0.4)' } }}
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
              onChange={(event) => onZoomChange(Number(event.target.value))}
              className={styles.zoomSlider}
              aria-label="Nivel de zoom"
              disabled={disabled}
            />
            <ZoomOut size={15} aria-hidden="true" />
          </div>

          <div className={styles.cropActions}>
            <AsyncButton
              type="button"
              className={styles.cropPrimary}
              label="Ajustar foto"
              busyLabel="Ajustando…"
              loading={isApplyingCrop}
              icon={<Check size={16} />}
              loaderVariant="light"
              disabled={disabled}
              onClick={onApplyCrop}
            />
            <button
              type="button"
              className={styles.cropSecondary}
              onClick={openFilePicker}
              disabled={disabled}
            >
              <RefreshCw size={15} aria-hidden="true" />
              Otra imagen
            </button>
          </div>
        </>
      )}

      {croppedAvatar && (
        <div className={styles.preview}>
          <div className={styles.previewRing}>
            <img
              src={croppedAvatar.dataUrl}
              alt="Vista previa de tu foto de perfil"
              className={styles.previewImage}
            />
          </div>
          <p className={styles.previewNote}>Esta será tu foto de perfil.</p>
          <div className={styles.previewActions}>
            <button
              type="button"
              className={styles.cropSecondary}
              onClick={onReopenCropper}
              disabled={disabled}
            >
              <RefreshCw size={15} aria-hidden="true" />
              Ajustar de nuevo
            </button>
            <button type="button" className={styles.removeButton} onClick={onRemove} disabled={disabled}>
              <Trash2 size={15} aria-hidden="true" />
              Quitar foto
            </button>
          </div>
        </div>
      )}

      {avatarError && (
        <p className={styles.fieldError} role="alert">
          {avatarError}
        </p>
      )}
    </div>
  );
}

/**
 * Creates the public `profiles` row for a freshly registered account.
 * Best-effort by design: the account itself is already valid, so a profile
 * failure is logged and never blocks the signup success path. The free-text
 * display name is sanitized at this boundary before reaching the public row.
 *
 * @param {string} userId The newly created auth user id.
 * @param {string} username The display name entered during registration.
 * @param {string} email The registered email address.
 * @param {string} [avatarUrl] The linked avatar URL, when one was uploaded.
 * @returns {Promise<void>} Resolves once the upsert attempt settles.
 */
async function createProfile(
  userId: string,
  username: string,
  email: string,
  avatarUrl?: string,
): Promise<void> {
  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    username: sanitizeText(username),
    email,
    ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
  });

  if (error) {
    console.warn('[auth] No se pudo crear el perfil del usuario:', error.message);
  }
}

/**
 * ChromaForge authentication page (login / registration wizard).
 *
 * @returns {JSX.Element} The rendered auth card.
 */
export default function AuthPage() {
  useDocumentTitle('Autenticación');

  const entered = useEntrance();
  const panelEntered = useEntrance(200);

  const handleSpotlight = useSpotlight<HTMLButtonElement>();

  const navigate = useNavigate();
  const location = useLocation();

  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const signIn = useAuthStore((state) => state.signIn);
  const signUp = useAuthStore((state) => state.signUp);

  const [mode, setMode] = useState<AuthMode>('login');
  const [step, setStep] = useState<RegisterStep>(1);
  const [form, setForm] = useState<AuthFormState>(initialForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [croppedAvatar, setCroppedAvatar] = useState<CroppedAvatar | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isApplyingCrop, setIsApplyingCrop] = useState(false);

  const loginTabRef = useRef<HTMLButtonElement>(null);
  const registerTabRef = useRef<HTMLButtonElement>(null);
  const alreadyNavigatedRef = useRef(false);
  const sourceImageRef = useRef<string | null>(null);

  /** Wizard drift direction as state so the incoming step's class binds in the same commit as the step change. */
  const [stepDirection, setStepDirection] = useState<'next' | 'back'>('next');

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

  const destination = useMemo(() => {
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
    return from && from !== '/auth' ? from : '/dashboard';
  }, [location.state]);

  useEffect(() => {
    if (user && !isLoading && !alreadyNavigatedRef.current) {
      alreadyNavigatedRef.current = true;
      navigate('/dashboard', { replace: true });
    }
  }, [user, isLoading, navigate]);

  /**
   * Resets the avatar wizard back to its untouched state.
   *
   * @returns {void}
   */
  const resetAvatar = useCallback(() => {
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

  /**
   * Switches the auth mode, resets the registration wizard and keeps keyboard
   * focus on the active tab when the switch came from arrow navigation.
   *
   * @param {AuthMode} next The mode to activate.
   * @param {boolean} focusTab Whether to move focus to the activated tab.
   * @returns {void}
   */
  const switchMode = useCallback(
    (next: AuthMode, focusTab = false) => {
      setMode(next);
      setStep(1);
      setStepDirection('next');
      setErrors({});
      resetAvatar();
      if (focusTab) {
        (next === 'login' ? loginTabRef.current : registerTabRef.current)?.focus();
      }
    },
    [resetAvatar],
  );

  /**
   * WAI-ARIA tabs keyboard navigation: arrows cycle the two tabs, Home and End
   * jump to the first and last tab.
   *
   * @param {KeyboardEvent<HTMLDivElement>} event The keydown event on the tablist.
   * @returns {void}
   */
  const handleTablistKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const isModeKey = event.key === 'ArrowRight' || event.key === 'ArrowLeft';
      if (!isModeKey && event.key !== 'Home' && event.key !== 'End') return;

      event.preventDefault();
      const currentIndex = mode === 'login' ? 0 : 1;
      let nextIndex = currentIndex;

      if (event.key === 'ArrowRight') nextIndex = Math.min(1, currentIndex + 1);
      if (event.key === 'ArrowLeft') nextIndex = Math.max(0, currentIndex - 1);
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = 1;

      if (nextIndex !== currentIndex) {
        switchMode(nextIndex === 0 ? 'login' : 'register', true);
      } else {
        (nextIndex === 0 ? loginTabRef.current : registerTabRef.current)?.focus();
      }
    },
    [mode, switchMode],
  );

  /**
   * Clears a field's error as the visitor types.
   *
   * @param {keyof AuthFormState} field The field being edited.
   * @param {string} value The new field value.
   * @returns {void}
   */
  const updateField = useCallback((field: keyof AuthFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }, []);

  const validateEmail = (email: string): string | undefined => {
    const trimmed = email.trim();
    if (!trimmed) return 'Ingresa tu correo electrónico.';
    if (!EMAIL_PATTERN.test(trimmed)) return 'Ingresa un correo electrónico válido.';
    return undefined;
  };

  const validateLogin = useCallback((): FieldErrors => {
    const next: FieldErrors = {};
    const emailError = validateEmail(form.email);
    if (emailError) next.email = emailError;
    if (!form.password) next.password = 'Ingresa tu contraseña.';
    return next;
  }, [form]);

  const validateStepOne = useCallback((): FieldErrors => {
    const next: FieldErrors = {};
    const name = form.name.trim();
    if (!name) {
      next.name = 'Ingresa tu nombre.';
    } else if (name.length < 2) {
      next.name = 'El nombre debe tener al menos 2 caracteres.';
    }
    const emailError = validateEmail(form.email);
    if (emailError) next.email = emailError;
    return next;
  }, [form]);

  const validateStepTwo = useCallback((): FieldErrors => {
    const next: FieldErrors = {};
    if (!form.password) {
      next.password = 'Ingresa una contraseña.';
    } else if (form.password.length < 6) {
      next.password = 'La contraseña debe tener al menos 6 caracteres.';
    }
    if (!form.confirmPassword) {
      next.confirmPassword = 'Confirma tu contraseña.';
    } else if (form.confirmPassword !== form.password) {
      next.confirmPassword = 'Las contraseñas no coinciden.';
    }
    return next;
  }, [form]);

  const goNext = useCallback(() => {
    const nextErrors = step === 1 ? validateStepOne() : validateStepTwo();
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    setErrors({});
    setStepDirection('next');
    setStep((current) => (current + 1) as RegisterStep);
  }, [step, validateStepOne, validateStepTwo]);

  const goBack = useCallback(() => {
    setErrors({});
    setStepDirection('back');
    setStep((current) => (current - 1) as RegisterStep);
  }, []);

  const handleCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
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

  const handleReopenCropper = useCallback(() => {
    setCroppedAvatar(null);
    setAvatarError(null);
  }, []);

  /**
   * Submits the login form: validates, signs in through the auth store, and
   * navigates to the blocked destination on success.
   *
   * @returns {Promise<void>}
   */
  const handleLoginSubmit = useCallback(async () => {
    const nextErrors = validateLogin();
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setIsSubmitting(true);
    try {
      const { error } = await signIn(form.email.trim(), form.password);
      if (error) {
        toast.error(getAuthErrorMessage(error));
        return;
      }

      alreadyNavigatedRef.current = true;
      toast.success('¡Bienvenido de nuevo! Has iniciado sesión correctamente.');
      navigate(destination, { replace: true });
    } catch {
      toast.error(AUTH_GENERIC_ERROR);
    } finally {
      setIsSubmitting(false);
    }
  }, [form, validateLogin, signIn, navigate, destination]);

  /**
   * Submits the registration form: creates the account, persists the cropped
   * avatar through upload and metadata when a session exists (otherwise parks
   * it locally for the first sign-in), creates the public profile, and either
   * navigates on an active session or leaves the visitor on the confirmation
   * notice when email confirmation is enabled.
   *
   * @returns {Promise<void>}
   */
  const handleRegisterSubmit = useCallback(async () => {
    if (sourceImage && !croppedAvatar) {
      setAvatarError('Ajusta tu foto antes de continuar.');
      return;
    }

    setIsSubmitting(true);
    try {
      const name = form.name.trim();
      const email = form.email.trim();
      const { user: createdUser, session, error } = await signUp(email, form.password, name);
      if (error) {
        toast.error(getAuthErrorMessage(error));
        return;
      }

      let avatarUrl: string | null = null;
      if (session && croppedAvatar) {
        avatarUrl = await uploadAvatar(session.user.id, croppedAvatar.blob);
        if (avatarUrl) {
          await setAvatarMetadata(avatarUrl);
        }
      } else if (croppedAvatar) {
        savePendingAvatar(email, croppedAvatar.dataUrl);
      }

      if (createdUser && session) {
        void createProfile(createdUser.id, name, email, avatarUrl ?? undefined);
      }

      if (session) {
        alreadyNavigatedRef.current = true;
        toast.success('¡Tu cuenta se creó correctamente!');
        navigate(destination, { replace: true });
        return;
      }

      toast.success('Revisa tu correo y confirma tu cuenta para continuar.');
      setForm((prev) => ({ ...prev, password: '', confirmPassword: '' }));
      resetAvatar();
      setStep(1);
      switchMode('login');
    } catch {
      toast.error(AUTH_GENERIC_ERROR);
    } finally {
      setIsSubmitting(false);
    }
  }, [sourceImage, croppedAvatar, form, signUp, navigate, destination, resetAvatar, switchMode]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (mode === 'login') {
        void handleLoginSubmit();
        return;
      }
      if (step < 3) {
        goNext();
        return;
      }
      void handleRegisterSubmit();
    },
    [mode, step, goNext, handleLoginSubmit, handleRegisterSubmit],
  );

  const isLogin = mode === 'login';
  const activeTabId = isLogin ? 'tab-login' : 'tab-register';

  return (
    <section className={styles.auth}>
      <div className={clsx(styles.formColumn, entered && styles.entered)}>
        <div className={styles.formColumnInner}>
          <header className={styles.formHeader}>
            <Link to="/" className={styles.brand} aria-label="ChromaForge, ir al inicio">
              <ChromaForgeIcon size={48} className={styles.brandMark} />
              <span className={styles.brandName}>ChromaForge</span>
            </Link>

            <h1 className={styles.title}>
              {isLogin ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}
            </h1>
            <p className={styles.subtitle}>
              {isLogin
                ? 'Inicia sesión para continuar con tus proyectos y paletas.'
                : 'Comienza a forjar identidades visuales con ChromaForge.'}
            </p>
          </header>

          <div
            className={styles.tabs}
            role="tablist"
            aria-label="Tipo de acceso"
            onKeyDown={handleTablistKeyDown}
          >
            <button
              ref={loginTabRef}
              type="button"
              role="tab"
              id="tab-login"
              className={clsx(styles.tab, isLogin && styles.tabActive)}
              aria-selected={isLogin}
              aria-controls="auth-panel"
              tabIndex={isLogin ? 0 : -1}
              onClick={() => switchMode('login')}
            >
              Iniciar sesión
            </button>
            <button
              ref={registerTabRef}
              type="button"
              role="tab"
              id="tab-register"
              className={clsx(styles.tab, !isLogin && styles.tabActive)}
              aria-selected={!isLogin}
              aria-controls="auth-panel"
              tabIndex={isLogin ? -1 : 0}
              onClick={() => switchMode('register')}
            >
              Crear cuenta
            </button>
          </div>

          <div
            className={styles.panel}
            id="auth-panel"
            role="tabpanel"
            aria-labelledby={activeTabId}
          >
          <form
            key={mode}
            className={styles.form}
            onSubmit={handleSubmit}
            noValidate
            aria-busy={isSubmitting}
          >
            {isLogin ? (
              <>
                <AuthField
                  id="email"
                  label="Correo electrónico"
                  type="email"
                  value={form.email}
                  onChange={(value) => updateField('email', value)}
                  autoComplete="email"
                  placeholder="tu@correo.com"
                  icon={<Mail size={18} />}
                  error={errors.email}
                  disabled={isSubmitting}
                />

                <AuthField
                  id="password"
                  label="Contraseña"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(value) => updateField('password', value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  icon={<Lock size={18} />}
                  error={errors.password}
                  disabled={isSubmitting}
                  trailing={
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
                  }
                />

                <AsyncButton
                  type="submit"
                  className={styles.submit}
                  label="Iniciar sesión"
                  busyLabel="Ingresando…"
                  loading={isSubmitting}
                  icon={<LogIn size={16} />}
                  loaderVariant="accent"
                  disabled={isSubmitting}
                  aria-live="polite"
                  onPointerMove={handleSpotlight}
                />
                <div className={styles.forgotRow}>
                  <Link to="/forgot-password" className={styles.forgotLink}>
                    Olvidé mi contraseña
                  </Link>
                </div>
              </>
            ) : (
              <>
                <StepIndicator step={step} />

                <div
                  key={step}
                  className={clsx(
                    styles.stepContent,
                    stepDirection === 'back' && styles.stepBack,
                  )}
                >
                  {step === 1 && (
                    <>
                      <AuthField
                        id="name"
                        label="Nombre"
                        value={form.name}
                        onChange={(value) => updateField('name', value)}
                        autoComplete="name"
                        placeholder="Tu nombre"
                        icon={<User size={18} />}
                        error={errors.name}
                        disabled={isSubmitting}
                      />

                      <AuthField
                        id="email"
                        label="Correo electrónico"
                        type="email"
                        value={form.email}
                        onChange={(value) => updateField('email', value)}
                        autoComplete="email"
                        placeholder="tu@correo.com"
                        icon={<Mail size={18} />}
                        error={errors.email}
                        disabled={isSubmitting}
                      />
                    </>
                  )}

                  {step === 2 && (
                    <>
                      <AuthField
                        id="password"
                        label="Contraseña"
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={(value) => updateField('password', value)}
                        autoComplete="new-password"
                        placeholder="Mínimo 6 caracteres"
                        icon={<Lock size={18} />}
                        error={errors.password}
                        disabled={isSubmitting}
                        trailing={
                          <button
                            type="button"
                            className={styles.passwordToggle}
                            onClick={() => setShowPassword((visible) => !visible)}
                            aria-label={
                              showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                            }
                            aria-pressed={showPassword}
                            disabled={isSubmitting}
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        }
                      />

                      <AuthField
                        id="confirmPassword"
                        label="Confirmar contraseña"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={form.confirmPassword}
                        onChange={(value) => updateField('confirmPassword', value)}
                        autoComplete="new-password"
                        placeholder="Repite tu contraseña"
                        icon={<Lock size={18} />}
                        error={errors.confirmPassword}
                        disabled={isSubmitting}
                        trailing={
                          <button
                            type="button"
                            className={styles.passwordToggle}
                            onClick={() => setShowConfirmPassword((visible) => !visible)}
                            aria-label={
                              showConfirmPassword
                                ? 'Ocultar contraseña'
                                : 'Mostrar contraseña'
                            }
                            aria-pressed={showConfirmPassword}
                            disabled={isSubmitting}
                          >
                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        }
                      />
                    </>
                  )}

                  {step === 3 && (
                    <AvatarStep
                      sourceImage={sourceImage}
                      crop={crop}
                      zoom={zoom}
                      croppedAvatar={croppedAvatar}
                      avatarError={avatarError}
                      isApplyingCrop={isApplyingCrop}
                      disabled={isSubmitting}
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={handleCropComplete}
                      onFileSelected={handleFileSelected}
                      onApplyCrop={() => void handleApplyCrop()}
                      onReopenCropper={handleReopenCropper}
                      onRemove={resetAvatar}
                    />
                  )}
                </div>

                <div className={styles.wizardNav}>
                  {step > 1 && (
                    <button
                      type="button"
                      className={styles.backButton}
                      onClick={goBack}
                      disabled={isSubmitting}
                    >
                      <ArrowLeft size={15} aria-hidden="true" />
                      Atrás
                    </button>
                  )}
                  <AsyncButton
                    type="submit"
                    className={styles.submit}
                    label={step < 3 ? 'Siguiente' : 'Crear cuenta'}
                    busyLabel="Creando cuenta…"
                    loading={isSubmitting}
                    icon={step < 3 ? <ArrowRight size={16} /> : <UserPlus size={16} />}
                    loaderVariant="accent"
                    disabled={isSubmitting}
                    aria-live="polite"
                    onPointerMove={handleSpotlight}
                  />
                </div>
              </>
            )}
          </form>
        </div>

        <div className={styles.footer}>
          <p className={styles.footerText}>
            {isLogin ? (
              <>
                ¿No tienes una cuenta?{' '}
                <button
                  type="button"
                  className={styles.footerLink}
                  onClick={() => switchMode('register')}
                >
                  Crear cuenta
                </button>
              </>
            ) : (
              <>
                ¿Ya tienes una cuenta?{' '}
                <button
                  type="button"
                  className={styles.footerLink}
                  onClick={() => switchMode('login')}
                >
                  Iniciar sesión
                </button>
              </>
            )}
          </p>
        </div>
        </div>
      </div>

      <aside
        className={clsx(styles.visualPanel, panelEntered && styles.entered)}
        aria-hidden="true"
      >
        <div className={styles.panelContent}>
          <p className={styles.eyebrow}>
            <span aria-hidden="true">✦</span>
            SISTEMA DE IDENTIDAD ALGORÍTMICO
          </p>

          <p className={styles.quote}>
            El color no es una adivinanza.{' '}
            <span className={styles.quoteAccent}>Es un sistema matemático.</span>
          </p>

          <div className={styles.spectrum}>
            {ROLE_SWATCHES.map(({ name, modifier }) => (
              <div className={styles.role} key={name}>
                <span className={clsx(styles.roleSwatch, styles[modifier])} />
                <span className={styles.roleMeta}>{name}</span>
                <span className={styles.roleAa}>
                  <Check size={10} aria-hidden="true" />
                  AA
                </span>
              </div>
            ))}
          </div>

          <div className={styles.specStrip}>
            <span>Determinismo</span>
            <span className={styles.specDivider} aria-hidden="true">
              ·
            </span>
            <span>Cinco roles</span>
            <span className={styles.specDivider} aria-hidden="true">
              ·
            </span>
            <span>WCAG&nbsp;2.1&nbsp;AA</span>
          </div>
        </div>

        <div className={styles.metricPills} aria-hidden="true">
          <span className={clsx(styles.metricPill, styles.metricAa)}>
            <span className={styles.metricDot} />
            WCAG 2.1 AA
          </span>
          <span className={clsx(styles.metricPill, styles.metricColord)}>
            <span className={styles.metricDot} />
            Colord Check
          </span>
          <span className={clsx(styles.metricPill, styles.metricOk)}>
            <span className={styles.metricDot} />
            Colores OK
          </span>
        </div>
      </aside>
    </section>
  );
}