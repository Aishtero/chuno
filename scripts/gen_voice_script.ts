import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DialogueSpeaker, VOICE_REGISTRY } from '../src/data/voiceRegistry';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const speakers: { key: DialogueSpeaker; title: string; role: string }[] = [
  {
    key: 'dealer',
    title: '1. Дилер (The Dealer — Survival Mode)',
    role: 'Низкий, холодный, мрачный голос в стиле Buckshot Roulette. На Hard — жёсткий и угрожающий.',
  },
  {
    key: 'enthusiast',
    title: '2. Энтузиаст (Enthusiast — Friendly Mode)',
    role: 'Живой, доброжелательный, азартный и весёлый голос.',
  },
  {
    key: 'egoist',
    title: '3. Эгоист (The Egoist — Friendly Mode)',
    role: 'Уверенный, язвительный, самодовольный тон.',
  },
  {
    key: 'calm',
    title: '4. Спокойный философ (Calm Philosopher — Friendly Mode)',
    role: 'Размеренный, тёплый, мудрый и спокойный голос.',
  },
  {
    key: 'unknown',
    title: '5. Неизвестный (Unknown / Incognito — Friendly Mode)',
    role: 'Сдержанный, лаконичный, загадочный полушёпот.',
  },
];

const esc = (s: string) => s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const counts: Record<string, number> = {};
const lines: string[] = [];

lines.push('# ChUno — Полный скрипт озвучки персонажей (VOICE_SCRIPT)');
lines.push('');
lines.push(
  '> Этот файл автоматически синхронизирован с `src/data/voiceRegistry.ts` и содержит **абсолютно все** реплики всех 5 персонажей игры на русском (RU) и английском (EN) языках.',
);
lines.push('');
lines.push('## Как подключить свою озвучку');
lines.push('1. Запишите фразу в формате `.mp3` (также поддерживаются `.ogg` и `.wav`).');
lines.push(
  '2. Положите файл точно по пути, указанному в столбце **Папка и имя файла RU MP3** или **Папка и имя файла EN MP3** (формат: `public/audio/voices/<speaker>/<lang>/<id>.mp3`).',
);
lines.push(
  '3. Перезапустите dev/build — Vite автоматически добавит файлы в `/audio/manifest.json`. При наличии `.mp3` он проигрывается с высшим приоритетом и **полностью отключает системный TTS** для этой реплики.',
);
lines.push('');

lines.push('## Сводка по персонажам');
lines.push('');
lines.push('| Персонаж | Ключ (`speaker`) | Кол-во фраз | Папка RU | Папка EN |');
lines.push('| :--- | :--- | :---: | :--- | :--- |');

let total = 0;
for (const sp of speakers) {
  const list = VOICE_REGISTRY.filter((e) => e.speaker === sp.key);
  counts[sp.key] = list.length;
  total += list.length;
  lines.push(
    `| ${sp.title} | \`${sp.key}\` | **${list.length}** | \`public/audio/voices/${sp.key}/ru/\` | \`public/audio/voices/${sp.key}/en/\` |`,
  );
}
lines.push(
  `| **ИТОГО** | **5 персонажей** | **${total}** (${total * 2} MP3 для RU + EN) | — | — |`,
);
lines.push('');

for (const sp of speakers) {
  const list = VOICE_REGISTRY.filter((e) => e.speaker === sp.key);
  lines.push('---');
  lines.push('');
  lines.push(`## ${sp.title}`);
  lines.push('');
  lines.push(`*Характер голоса:* ${sp.role}`);
  lines.push('');
  lines.push(
    '| ID | Событие (Event) | Текст (RU) | Текст (EN) | Папка и имя файла RU MP3 | Папка и имя файла EN MP3 |',
  );
  lines.push('| :--- | :--- | :--- | :--- | :--- | :--- |');
  for (const e of list) {
    const ruPath = `public/audio/voices/${sp.key}/ru/${e.id}.mp3`;
    const enPath = `public/audio/voices/${sp.key}/en/${e.id}.mp3`;
    lines.push(
      `| \`${e.id}\` | \`${e.event}\` | ${esc(e.text.ru)} | ${esc(e.text.en)} | \`${ruPath}\` | \`${enPath}\` |`,
    );
  }
  lines.push('');
}

const outPath = path.join(projectRoot, 'VOICE_SCRIPT.md');
fs.writeFileSync(outPath, lines.join('\n'), 'utf-8');
console.log('WRITTEN:', outPath);
console.log('COUNTS:', JSON.stringify(counts));
console.log('TOTAL:', total);
