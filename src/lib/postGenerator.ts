import html2canvas from 'html2canvas';

const GENERATE_POST_URL =
  'https://adorzqjhazsfvbttlfht.supabase.co/functions/v1/generate-post';
const ANON_KEY = 'sb_publishable_b098wEy_wai6_RWuR5pV7g_IAw-x86p';

export interface EventPostData {
  title: string;
  date?: string;
  city?: string;
  state?: string;
  location?: string;
  distance?: string;
  category?: string;
  price?: number | string;
  slug?: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data URL prefix (e.g. "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function htmlToPng(html: string): Promise<string> {
  const container = document.createElement('div');
  container.style.cssText =
    'position:fixed;left:-9999px;top:-9999px;width:1080px;height:1080px;overflow:hidden;z-index:-1;';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      width: 1080,
      height: 1080,
      scale: 1,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#000000',
      logging: false,
    });
    return canvas.toDataURL('image/png');
  } finally {
    document.body.removeChild(container);
  }
}

export async function generateEventPost(
  eventData: EventPostData,
  postType: 'divulgacao' | 'resultado',
  imageFile?: File | null,
): Promise<string> {
  const imageBase64 = imageFile ? await fileToBase64(imageFile) : null;

  const formattedDate = eventData.date
    ? new Date(eventData.date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '';

  const payload = {
    eventData: {
      title: eventData.title,
      date: formattedDate,
      city: eventData.city ?? '',
      state: eventData.state ?? '',
      location: [eventData.city, eventData.state].filter(Boolean).join(' - '),
      distance: eventData.distance ?? eventData.category ?? '',
      price: eventData.price ?? '',
    },
    imageBase64,
    postType,
  };

  const res = await fetch(GENERATE_POST_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const data = (await res.json()) as { html?: string; error?: string };
  if (data.error) throw new Error(data.error);
  if (!data.html) throw new Error('HTML não retornado pela API');

  return htmlToPng(data.html);
}
