// src/components/customer/CountrySelect.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';

// Codes ISO 3166-1 : les noms sont traduits en français automatiquement (Intl.DisplayNames)
const COUNTRY_CODES = [
  'AF','AL','DZ','AD','AO','AG','AR','AM','AU','AT','AZ','BS','BH','BD','BB','BY','BE','BZ','BJ','BT',
  'BO','BA','BW','BR','BN','BG','BF','BI','CV','KH','CM','CA','CF','TD','CL','CN','CO','KM','CG','CD',
  'CR','CI','HR','CU','CY','CZ','DK','DJ','DM','DO','EC','EG','SV','GQ','ER','EE','SZ','ET','FJ','FI',
  'FR','GA','GM','GE','DE','GH','GR','GD','GT','GN','GW','GY','HT','HN','HU','IS','IN','ID','IR','IQ',
  'IE','IL','IT','JM','JP','JO','KZ','KE','KI','KP','KR','KW','KG','LA','LV','LB','LS','LR','LY','LI',
  'LT','LU','MG','MW','MY','MV','ML','MT','MH','MR','MU','MX','FM','MD','MC','MN','ME','MA','MZ','MM',
  'NA','NR','NP','NL','NZ','NI','NE','NG','MK','NO','OM','PK','PW','PA','PG','PY','PE','PH','PL','PT',
  'QA','RO','RU','RW','KN','LC','VC','WS','SM','ST','SA','SN','RS','SC','SL','SG','SK','SI','SB','SO',
  'ZA','SS','ES','LK','SD','SR','SE','CH','SY','TJ','TZ','TH','TL','TG','TO','TT','TN','TR','TM','TV',
  'UG','UA','AE','GB','US','UY','UZ','VU','VA','VE','VN','YE','ZM','ZW','PS','XK','TW','HK','MO','PR',
  'GP','MQ','GF','RE','NC','PF',
];

export interface Country {
  code: string;
  name: string;
}

const buildCountries = (): Country[] => {
  let display: Intl.DisplayNames | null = null;
  try {
    display = new Intl.DisplayNames(['fr'], { type: 'region' });
  } catch {
    display = null;
  }
  return COUNTRY_CODES.map((code) => {
    let name = code;
    try {
      name = display?.of(code) || code;
    } catch {
      name = code;
    }
    return { code, name };
  }).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
};

export const COUNTRIES: Country[] = buildCountries();
export const DEFAULT_COUNTRY_CODE = 'SN';

const flagEmoji = (code: string) =>
  String.fromCodePoint(...[...code.toUpperCase()].map((c) => 127397 + c.charCodeAt(0)));

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function Flag({ code }: { code: string }) {
  const [failed, setFailed] = useState(false);
  const lower = code.toLowerCase();

  if (failed) {
    return <span className="w-6 text-center text-base leading-none">{flagEmoji(code)}</span>;
  }

  return (
    <img
      src={`https://flagcdn.com/24x18/${lower}.png`}
      srcSet={`https://flagcdn.com/48x36/${lower}.png 2x`}
      width={24}
      height={18}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="w-6 h-[18px] object-cover rounded-sm border border-gray-200 flex-shrink-0"
    />
  );
}

interface CountrySelectProps {
  value: string; // code ISO (ex: "SN")
  onChange: (code: string) => void;
}

export default function CountrySelect({ value, onChange }: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = COUNTRIES.find((c) => c.code === value);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => normalize(c.name).includes(q));
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) searchRef.current?.focus();
    else setQuery('');
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
      >
        <span className="flex items-center gap-2 min-w-0">
          {selected ? (
            <>
              <Flag code={selected.code} />
              <span className="truncate">{selected.name}</span>
            </>
          ) : (
            <span className="text-gray-400">Choisir un pays *</span>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border rounded-lg shadow-lg">
          <div className="flex items-center gap-2 px-3 py-2 border-b">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
              placeholder="Rechercher un pays"
              className="w-full text-sm outline-none"
            />
          </div>
          <ul role="listbox" className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-500">Aucun pays trouvé</li>
            )}
            {filtered.map((c) => (
              <li key={c.code} role="option" aria-selected={c.code === value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(c.code);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 ${
                    c.code === value ? 'bg-blue-50 text-blue-800 font-medium' : 'text-gray-800'
                  }`}
                >
                  <Flag code={c.code} />
                  <span className="truncate">{c.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}