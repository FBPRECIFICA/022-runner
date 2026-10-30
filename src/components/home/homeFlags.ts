// Chaves da landing animada (branch landing-animada). Constantes no código, não
// variáveis de ambiente: trocar aqui + deploy é o liga/desliga.

// false = home volta a ser exatamente a de antes (HomePageClassic em HomePage.tsx).
export const NEW_FRONT_ENABLED = true;

// Força do hero na rolagem: 0 = parado, 1 = padrão, 2 = o dobro. Ajusta zoom,
// deslocamento, rastro e linhas de velocidade juntos.
export const HERO_INTENSITY = 1;

// Total de cadastros na plataforma. Visitante deslogado não tem leitura em
// `users` (RLS), e expor isso exigiria função nova no banco — fora do escopo
// desta branch. Enquanto for null o contador de cadastros não aparece.
export const REGISTERED_USERS_COUNT: number | null = null;
