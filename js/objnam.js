// objnam.c: shared noun inflection for object names, wishes and monster names.
const ONE_OFF = [
    ['child', 'children'], ['cubus', 'cubi'], ['culus', 'culi'], ['Cyclops', 'Cyclopes'],
    ['djinni', 'djinn'], ['erinys', 'erinyes'], ['foot', 'feet'], ['fungus', 'fungi'],
    ['goose', 'geese'], ['knife', 'knives'], ['labrum', 'labra'], ['louse', 'lice'],
    ['mouse', 'mice'], ['mumak', 'mumakil'], ['nemesis', 'nemeses'], ['ovum', 'ova'],
    ['ox', 'oxen'], ['passerby', 'passersby'], ['rtex', 'rtices'], ['serum', 'sera'],
    ['staff', 'staves'], ['tooth', 'teeth'],
];
const AS_IS = [
    'boots', 'shoes', 'gloves', 'lenses', 'scales', 'eyes', 'gauntlets', 'iron bars',
    'bison', 'deer', 'elk', 'fish', 'fowl', 'tuna', 'yaki', '-hai', 'krill', 'manes',
    'moose', 'ninja', 'sheep', 'ronin', 'roshi', 'shito', 'tengu', 'ki-rin', 'nazgul',
    'gunyoki', 'piranha', 'samurai', 'shuriken', 'haggis', 'bordeaux',
];
const SPECIAL_SUBJECTS = ['erinys', 'manes', 'cyclops', 'hippocrates', 'pelias', 'aklys',
    'amnesia', 'detect monsters', 'paralysis', 'shape changers', 'nemesis'];
const NO_MEN = ['albu', 'antihu', 'anti', 'ata', 'auto', 'bildungsro', 'cai', 'cay',
    'ceru', 'corner', 'decu', 'des', 'dura', 'fir', 'hanu', 'het', 'infrahu', 'inhu',
    'nonhu', 'otto', 'out', 'prehu', 'protohu', 'subhu', 'superhu', 'talis', 'unhu',
    'sha', 'hu', 'un', 'le', 're', 'so', 'to', 'at', 'a'];
const NO_MAN = ['abdo', 'acu', 'agno', 'ceru', 'cogno', 'cycla', 'fleh', 'grava', 'hegu',
    'preno', 'sonar', 'speci', 'dai', 'exa', 'fla', 'sta', 'teg', 'tegu', 'vela', 'da',
    'hy', 'lu', 'no', 'nu', 'ra', 'ru', 'se', 'vi', 'ya', 'o', 'a'];
const CH_K_SOUND = ['monarch', 'poch', 'tech', 'mech', 'stomach', 'psych', 'amphibrach',
    'anarch', 'atriarch', 'azedarach', 'broch', 'gastrotrich', 'isopach', 'loch', 'oligarch',
    'peritrich', 'sandarach', 'sumach', 'symposiarch'];
const COMPOUND = / of | labeled | called | named | above| versus | from | in | on | a la | with| de | d'| du | au |-in-|-at-/i;

// hacklib.c:strcasecpy preserves each replaced character's case. Once the old
// suffix runs out, new characters inherit the preceding character's case.
function replaceSuffixCase(text, start, suffix) {
    let result = text.slice(0, start);
    for (let i = 0; i < suffix.length; i++) {
        const old = text[start + i] ?? result.at(-1) ?? '';
        const ch = suffix[i];
        result += /[a-z]/.test(old) ? ch.toLowerCase()
            : /[A-Z]/.test(old) ? ch.toUpperCase() : ch;
    }
    return result;
}

function badman(text, plural) {
    const suffix = plural ? 'man' : 'men';
    return (plural ? NO_MEN : NO_MAN).some(prefix => text === prefix + suffix || text.endsWith(' ' + prefix + suffix));
}

function singplurLookup(text, plural, extra) {
    const lower = text.toLowerCase();
    if ([...AS_IS, ...extra].some(suffix => lower.endsWith(suffix))) return text;
    if (lower.length > 5 && lower.endsWith('craft')) return text;
    if (lower === 'slice' || lower === 'mongoose')
        return plural ? replaceSuffixCase(text, text.length, 's') : text;
    if (plural && lower.length > 2 && lower.endsWith('ox') && !lower.endsWith('muskox'))
        return replaceSuffixCase(text, text.length, 'es');
    if (lower.endsWith(plural ? 'man' : 'men') && badman(lower, plural))
        return plural ? replaceSuffixCase(text, text.length, 's') : text;
    for (const pair of ONE_OFF) {
        const same = pair[plural ? 1 : 0], other = pair[plural ? 0 : 1];
        if (lower.endsWith(same.toLowerCase())) return text;
        if (lower.endsWith(other.toLowerCase())) return replaceSuffixCase(text, text.length - other.length, same);
    }
    return null;
}

export function makePlural(value) {
    const original = String(value ?? '').replace(/^ +/, '');
    if (!original) return 's';
    const lower = original.toLowerCase();
    // C checks subject pronouns before objects, so "her" becomes "them".
    const pronoun = ({ he: 'they', him: 'them', his: 'their', she: 'they', her: 'them', it: 'they', its: 'their' })[lower];
    if (pronoun) return /[A-Z]/.test(original[0]) ? pronoun[0].toUpperCase() + pronoun.slice(1) : pronoun;
    if (lower.startsWith('pair of ')) return original;
    const compound = original.search(COMPOUND);
    const excess = compound < 0 ? '' : original.slice(compound);
    const base = (compound < 0 ? original : original.slice(0, compound)).replace(/ +$/, '');
    const word = base.toLowerCase(), len = base.length;
    if (len === 1 || !/[a-zA-Z@]/.test(base.at(-1) || '')) return base + "'s" + excess;
    const found = singplurLookup(base, true, ['ae', 'eaux', 'matzot']);
    if (found != null) return found + excess;
    if (word === 'ya' || word.endsWith(' ya')) return base + excess;
    let start = len, suffix = 's';
    if (word.endsWith('man') && !badman(word, true)) { start = len - 2; suffix = 'en'; }
    else if (/[aeioulr]f$/.test(word) && !word.endsWith('erf')) { start = len - 1; suffix = 'ves'; }
    else if (word.endsWith('ium')) { start = len - 3; suffix = 'ia'; }
    else if (['alga', 'hypha', 'larva', 'amoeba', 'vertebra'].some(ending => word.endsWith(ending))) suffix = 'e';
    else if (len > 3 && word.endsWith('us') && !word.endsWith('lotus') && !word.endsWith('wumpus')) { start = len - 2; suffix = 'i'; }
    else if (word.endsWith('sis')) { start = len - 2; suffix = 'es'; }
    else if (word.endsWith('eau') && !word.endsWith('bureau')) suffix = 'x';
    else if (/matz[oa]h$/.test(word)) { start = len - 2; suffix = 'ot'; }
    else if (/matz[oa]$/.test(word)) { start = len - 1; suffix = 'ot'; }
    else if (len >= 5 && /(?:dex|dix|tex)$/.test(word) && !word.endsWith('index')) { start = len - 2; suffix = 'ices'; }
    else if (/[zxs]$/.test(word) || word.endsWith('sh')
        || word.endsWith('ch') && !CH_K_SOUND.some(ending => word.endsWith(ending))
        || len >= 4 && word.endsWith('ato') || word.endsWith('dingo')) suffix = 'es';
    else if (/[^aeiou]y$/.test(word)) { start = len - 1; suffix = 'ies'; }
    return replaceSuffixCase(base, start, suffix) + excess;
}

export function makeSingular(value) {
    const original = String(value ?? '').replace(/^ +/, '');
    if (!original) return '';
    const lower = original.toLowerCase();
    const pronoun = ({ they: 'it', them: 'it', their: 'its' })[lower];
    if (pronoun) return /[A-Z]/.test(original[0]) ? pronoun[0].toUpperCase() + pronoun.slice(1) : pronoun;
    const compound = original.search(COMPOUND);
    const excess = compound < 0 ? '' : original.slice(compound);
    const base = compound < 0 ? original : original.slice(0, compound);
    const word = base.toLowerCase(), len = base.length;
    const found = singplurLookup(base, false, SPECIAL_SUBJECTS);
    if (found != null) return found + excess;
    let start = len, suffix = '';
    if (word.endsWith('s')) {
        start = len - 1;
        if (word.endsWith('es')) {
            if (word.endsWith('ies')) {
                if (!/(?:cookies|mbies|yries)$/.test(word) && !/(?:^| )(?:pies|genies)$/.test(word)) { start = len - 3; suffix = 'y'; }
            } else if (/[aeioulr]ves$/.test(word)) {
                if (!/(?:cloves|nerves)$/.test(word)) { start = len - 3; suffix = 'f'; }
            } else if (/(?:eses|oxes|nxes|ches|uses|shes|sses|atoes|dingoes|aleaxes)$/.test(word)) start = len - 2;
        } else if (word.endsWith('us') && !/(?:tengus|hezrous)$/.test(word)
            || word.endsWith('ss') || word === 'lens' || word.endsWith(' lens')) start = len;
    } else if (word.endsWith('men') && !badman(word, false)) { start = len - 2; suffix = 'an'; }
    else if (/(?:matzot|ae|eaux)$/.test(word)) start = len - 1;
    else if (/e[lr]ia$/.test(word)) { start = len - 1; suffix = 'um'; }
    return replaceSuffixCase(base, start, suffix) + excess;
}
