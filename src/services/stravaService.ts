const CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID || '';
const REDIRECT_URI = `${window.location.origin}/perfil?strava=callback`;

export function getStravaAuthUrl(): string {
  return `https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&approval_prompt=force&scope=read,activity:read`;
}

export async function getStravaActivities(accessToken: string) {
  const res = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=10', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  return res.json();
}

export async function getStravaAthlete(accessToken: string) {
  const res = await fetch('https://www.strava.com/api/v3/athlete', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  return res.json();
}
