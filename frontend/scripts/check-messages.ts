import fr from "../messages/fr.json";
import en from "../messages/en.json";

function keys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    keys(child, prefix ? `${prefix}.${key}` : key),
  );
}

const french = new Set(keys(fr));
const english = new Set(keys(en));
const missingEn = [...french].filter((key) => !english.has(key));
const missingFr = [...english].filter((key) => !french.has(key));
if (missingEn.length || missingFr.length) {
  console.error({ missingEn, missingFr });
  process.exitCode = 1;
} else {
  console.log(`French and English message keys match (${french.size} keys).`);
}
