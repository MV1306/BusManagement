namespace BusManagement.API.Services;

/// <summary>
/// In-house English → Tamil transliteration engine.
/// Uses a greedy longest-match phoneme table covering standard Tamil phonology.
/// Input is expected to be uppercase English (as stored in StopName / StageName).
/// </summary>
public class TamilTransliterationService
{
    // Ordered longest-first so greedy match picks the most specific pattern.
    private static readonly (string Roman, string Tamil)[] Map =
    [
        // ── Grantha / borrowed consonants ──────────────────────────────
        ("SRI",  "ஸ்ரீ"),
        // ── Two-char vowels (long) ──────────────────────────────────────
        ("AA",  "ஆ"), ("EE",  "ஈ"), ("II",  "ஈ"), ("OO",  "ஊ"),
        ("UU",  "ஊ"), ("AE",  "ஏ"), ("AI",  "ஐ"), ("AU",  "ஔ"),
        ("OW",  "ஔ"),
        // ── Digraph consonants (must come before single-char) ───────────
        ("KH",  "க்"), ("GH",  "க்"),
        ("CH",  "ச்"), ("SH",  "ஷ்"), ("ZH",  "ழ்"),
        ("TH",  "த்"), ("DH",  "த்"),
        ("PH",  "ப்"), ("BH",  "ப்"),
        ("NG",  "ங்"), ("NY",  "ஞ்"),
        ("ND",  "ந்"), ("NT",  "ண்"),
        // ── Consonant clusters with inherent 'a' vowel ──────────────────
        // handled below via consonant + vowel logic
        // ── Single vowels ───────────────────────────────────────────────
        ("A",   "அ"), ("E",   "எ"), ("I",   "இ"),
        ("O",   "ஒ"), ("U",   "உ"),
        // ── Single consonants ────────────────────────────────────────────
        ("B",   "ப்"), ("C",   "க்"), ("D",   "ட்"),
        ("F",   "ப்"), ("G",   "க்"), ("H",   "ஹ்"),
        ("J",   "ஜ்"), ("K",   "க்"), ("L",   "ல்"),
        ("M",   "ம்"), ("N",   "ன்"), ("P",   "ப்"),
        ("Q",   "க்"), ("R",   "ர்"), ("S",   "ஸ்"),
        ("T",   "ட்"), ("V",   "வ்"), ("W",   "வ்"),
        ("X",   "க்ஸ்"), ("Y",  "ய்"), ("Z",   "ஸ்"),
    ];

    // Vowel standalone forms (used when vowel follows a consonant — matra)
    private static readonly Dictionary<string, string> VowelMatra = new()
    {
        { "AA", "ா" }, { "EE", "ீ" }, { "II", "ீ" }, { "OO", "ூ" },
        { "UU", "ூ" }, { "AE", "ே" }, { "AI", "ை" }, { "AU", "ௌ" },
        { "OW", "ௌ" }, { "A",  "ா" }, { "E",  "ெ" }, { "I",  "ி" },
        { "O",  "ொ" }, { "U",  "ு" },
    };

    private static readonly HashSet<string> Vowels =
        new() { "A", "AA", "E", "EE", "AE", "I", "II", "EE", "O", "OO", "U", "UU", "AI", "AU", "OW" };

    private static readonly HashSet<string> Consonants =
        new() { "B","C","D","F","G","H","J","K","L","M","N","P","Q","R","S","T","V","W","X","Y","Z",
                "KH","GH","CH","SH","ZH","TH","DH","PH","BH","NG","NY","ND","NT","SRI" };

    public string Transliterate(string input)
    {
        if (string.IsNullOrWhiteSpace(input)) return input;

        var text = input.Trim().ToUpperInvariant();
        var result = new System.Text.StringBuilder();
        int i = 0;

        while (i < text.Length)
        {
            // Skip non-alpha characters (spaces, hyphens, digits)
            if (!char.IsLetter(text[i]))
            {
                result.Append(text[i] == ' ' ? ' ' : text[i]);
                i++;
                continue;
            }

            // Try longest match first (up to 3 chars)
            string? matched = null;
            string? matchedTamil = null;
            bool isConsonant = false;

            foreach (var (roman, tamil) in Map)
            {
                if (i + roman.Length <= text.Length &&
                    text.AsSpan(i, roman.Length).SequenceEqual(roman))
                {
                    matched = roman;
                    matchedTamil = tamil;
                    isConsonant = Consonants.Contains(roman);
                    break;
                }
            }

            if (matched == null)
            {
                // Unmapped character — pass through
                result.Append(text[i]);
                i++;
                continue;
            }

            i += matched.Length;

            if (isConsonant)
            {
                // Look ahead for a vowel to form a syllable
                string? nextVowel = null;
                string? matra = null;
                foreach (var v in VowelMatra.Keys.OrderByDescending(k => k.Length))
                {
                    if (i + v.Length <= text.Length &&
                        text.AsSpan(i, v.Length).SequenceEqual(v))
                    {
                        nextVowel = v;
                        matra = VowelMatra[v];
                        break;
                    }
                }

                if (nextVowel != null)
                {
                    // Consonant + vowel → remove the virama (்) and attach matra
                    var baseConsonant = matchedTamil!.Replace("்", "");
                    // Special case: 'A' after consonant = inherent vowel, no matra needed
                    if (nextVowel == "A")
                        result.Append(baseConsonant);
                    else
                        result.Append(baseConsonant + matra);
                    i += nextVowel.Length;
                }
                else
                {
                    // Consonant at end or before another consonant — keep virama
                    result.Append(matchedTamil);
                }
            }
            else
            {
                // Pure vowel at word start or after space
                result.Append(matchedTamil);
            }
        }

        return result.ToString();
    }

    /// <summary>Transliterate each word in a multi-word name independently.</summary>
    public string TransliteratePhrase(string phrase)
    {
        if (string.IsNullOrWhiteSpace(phrase)) return phrase;
        var words = phrase.Trim().ToUpperInvariant().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return string.Join(" ", words.Select(TransliterateWord));
    }

    private string TransliterateWord(string word) => Transliterate(word);
}
