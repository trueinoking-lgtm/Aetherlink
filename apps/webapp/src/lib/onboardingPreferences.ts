export type OnboardingPreferences = {
  location: string;
  preferredJobTypes: string[];
  salaryFloor: number;
  autoApplyEnabled: boolean;
  autoApplyThreshold: number;
  blacklistedCompanies: string[];
};

export const DEFAULT_ONBOARDING_PREFERENCES: OnboardingPreferences = {
  location: '',
  preferredJobTypes: [],
  salaryFloor: 0,
  autoApplyEnabled: true,
  autoApplyThreshold: 80,
  blacklistedCompanies: [],
};

const STORAGE_KEY = 'aetherlink:onboarding-preferences';

function sanitizeArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

export function readOnboardingPreferences(): OnboardingPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_ONBOARDING_PREFERENCES;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_ONBOARDING_PREFERENCES;
    }

    const parsed = JSON.parse(raw) as Partial<OnboardingPreferences>;
    return {
      location:
        typeof parsed.location === 'string'
          ? parsed.location
          : DEFAULT_ONBOARDING_PREFERENCES.location,
      preferredJobTypes: sanitizeArray(parsed.preferredJobTypes),
      salaryFloor:
        typeof parsed.salaryFloor === 'number' && Number.isFinite(parsed.salaryFloor)
          ? parsed.salaryFloor
          : DEFAULT_ONBOARDING_PREFERENCES.salaryFloor,
      autoApplyEnabled:
        typeof parsed.autoApplyEnabled === 'boolean'
          ? parsed.autoApplyEnabled
          : DEFAULT_ONBOARDING_PREFERENCES.autoApplyEnabled,
      autoApplyThreshold:
        typeof parsed.autoApplyThreshold === 'number' && Number.isFinite(parsed.autoApplyThreshold)
          ? parsed.autoApplyThreshold
          : DEFAULT_ONBOARDING_PREFERENCES.autoApplyThreshold,
      blacklistedCompanies: sanitizeArray(parsed.blacklistedCompanies),
    };
  } catch {
    return DEFAULT_ONBOARDING_PREFERENCES;
  }
}

export function writeOnboardingPreferences(prefs: OnboardingPreferences) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}
