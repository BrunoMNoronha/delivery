const DEFAULT_WHATSAPP_NUMBER = '5561985007483';
const MIN_WHATSAPP_NUMBER_LENGTH = 8;

export interface MessagingEnv {
  readonly VITE_WHATSAPP_NUMBER?: string | undefined;
}

export interface MessagingConfig {
  readonly whatsappNumber: string;
}

const sanitizeWhatsappNumber = (value: string | undefined | null): string | null => {
  if (!value) {
    return null;
  }

  const digitsOnly = value.replace(/\D/gu, '');
  if (digitsOnly.length < MIN_WHATSAPP_NUMBER_LENGTH) {
    return null;
  }

  return digitsOnly;
};

export const resolveWhatsappNumber = (
  env: MessagingEnv = import.meta.env as MessagingEnv,
): string => {
  const sanitized = sanitizeWhatsappNumber(env.VITE_WHATSAPP_NUMBER ?? null);
  if (sanitized) {
    return sanitized;
  }

  return DEFAULT_WHATSAPP_NUMBER;
};

const messagingConfig: MessagingConfig = Object.freeze({
  whatsappNumber: resolveWhatsappNumber(),
});

export const getMessagingConfig = (): MessagingConfig => messagingConfig;
