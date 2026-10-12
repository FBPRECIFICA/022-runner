// Rodar: node src/lib/emailValidation.check.ts
import { validateEmail } from './emailValidation.ts';

const blocked: [string, string | undefined][] = [
  ['prcorado@hotmail.c', 'prcorado@hotmail.com'],
  ['claudiopeixoto146@gmail.comc', 'claudiopeixoto146@gmail.com'],
  ['x@hotmail.con', 'x@hotmail.com'],
  ['x@gmai.com', 'x@gmail.com'],
  ['x@hotmailcom', 'x@hotmail.com'],
  ['a@b', undefined],
  ['a@@b.com', undefined],
  ['@x.com', undefined],
  ['x@gmail.com.', undefined],
  ['x@gmail..com', undefined],
  ['x @gmail.com', undefined],
  ['x@', undefined],
];
const allowed = ['x@gmail.com', 'x@empresa.com.br', 'x@ymail.com', '  X@Gmail.COM ', 'x@me.com', 'x@mail.com', 'x@uol.com.br', 'x@bol.com.br'];

let failures = 0;
for (const [email, suggestion] of blocked) {
  const r = validateEmail(email);
  const pass = !r.ok && r.suggestion === suggestion;
  if (!pass) failures++;
  console.log(`${pass ? 'OK  ' : 'FAIL'} bloqueia ${JSON.stringify(email)} → ${r.error}${r.suggestion ? ` [sugestão ${r.suggestion}]` : ''}`);
}
for (const email of allowed) {
  const r = validateEmail(email);
  if (!r.ok) failures++;
  console.log(`${r.ok ? 'OK  ' : 'FAIL'} aceita   ${JSON.stringify(email)} → ${r.normalized}${r.error ? ` (${r.error})` : ''}`);
}
console.assert(validateEmail('  X@Gmail.COM ').normalized === 'x@gmail.com');
if (failures) { console.error(`${failures} falha(s)`); process.exit(1); }
console.log('Todos os casos passaram.');
