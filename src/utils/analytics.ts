export function trackPageView(page: string) {
  console.log('[Analytics] pageView:', page);
}

export function trackEventView(eventName: string) {
  console.log('[Analytics] eventView:', eventName);
}

export function trackRegistrationStart(eventName: string) {
  console.log('[Analytics] registrationStart:', eventName);
}

export function trackRegistrationComplete(eventName: string, value: number) {
  console.log('[Analytics] registrationComplete:', eventName, value);
}

export function trackShare(eventName: string, method: string) {
  console.log('[Analytics] share:', eventName, method);
}
