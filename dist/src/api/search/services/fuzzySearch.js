"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findSimilarPlaces = exports.fuzzySearch = void 0;
// Levenshtein distance algorithm for fuzzy matching
function levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    if (m === 0)
        return n;
    if (n === 0)
        return m;
    const dp = Array(m + 1)
        .fill(null)
        .map(() => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) {
        dp[i][0] = i;
    }
    for (let j = 0; j <= n; j++) {
        dp[0][j] = j;
    }
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            }
            else {
                dp[i][j] = Math.min(dp[i - 1][j] + 1, // deletion
                dp[i][j - 1] + 1, // insertion
                dp[i - 1][j - 1] + 1 // substitution
                );
            }
        }
    }
    return dp[m][n];
}
// Calculate similarity score (0 to 1)
function calculateSimilarity(str1, str2) {
    const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0)
        return 1;
    return 1 - distance / maxLength;
}
// Check if strings are phonetically similar (simple soundex-like approach)
function arePhoneticallySimilar(str1, str2) {
    const soundexCode = (str) => {
        const cleaned = str.toUpperCase().replace(/[^A-Z]/g, '');
        if (!cleaned)
            return '';
        const soundexMap = {
            B: '1', F: '1', P: '1', V: '1',
            C: '2', G: '2', J: '2', K: '2', Q: '2', S: '2', X: '2', Z: '2',
            D: '3', T: '3',
            L: '4',
            M: '5', N: '5',
            R: '6'
        };
        let code = cleaned[0];
        let prevCode = soundexMap[cleaned[0]] || '0';
        for (let i = 1; i < cleaned.length && code.length < 4; i++) {
            const currentCode = soundexMap[cleaned[i]] || '0';
            if (currentCode !== '0' && currentCode !== prevCode) {
                code += currentCode;
                prevCode = currentCode;
            }
        }
        return code.padEnd(4, '0');
    };
    return soundexCode(str1) === soundexCode(str2);
}
// Fuzzy search function
function fuzzySearch(items, query, options = {}) {
    const { threshold = 0.4, // Default threshold for fuzzy matching
    keys = ['title'] } = options;
    if (!query || query.trim() === '') {
        return items.map(item => ({ ...item, score: 1 }));
    }
    const queryLower = query.toLowerCase().trim();
    const queryWords = queryLower.split(/\s+/);
    const scoredItems = items.map(item => {
        let maxScore = 0;
        for (const key of keys) {
            const value = item[key];
            if (typeof value !== 'string')
                continue;
            const valueLower = value.toLowerCase();
            // Exact match
            if (valueLower === queryLower) {
                maxScore = Math.max(maxScore, 1);
                continue;
            }
            // Contains exact query
            if (valueLower.includes(queryLower)) {
                maxScore = Math.max(maxScore, 0.9);
                continue;
            }
            // Starts with query
            if (valueLower.startsWith(queryLower)) {
                maxScore = Math.max(maxScore, 0.85);
                continue;
            }
            // All query words are present
            const allWordsPresent = queryWords.every(word => valueLower.includes(word));
            if (allWordsPresent) {
                maxScore = Math.max(maxScore, 0.8);
                continue;
            }
            // Some query words are present
            const presentWords = queryWords.filter(word => valueLower.includes(word));
            if (presentWords.length > 0) {
                const wordScore = 0.7 * (presentWords.length / queryWords.length);
                maxScore = Math.max(maxScore, wordScore);
            }
            // Fuzzy matching using Levenshtein distance
            const similarity = calculateSimilarity(valueLower, queryLower);
            if (similarity >= threshold) {
                maxScore = Math.max(maxScore, similarity * 0.6);
            }
            // Check for phonetic similarity
            if (arePhoneticallySimilar(value, query)) {
                maxScore = Math.max(maxScore, 0.5);
            }
            // Check individual words for fuzzy matches
            const valueWords = valueLower.split(/\s+/);
            for (const queryWord of queryWords) {
                for (const valueWord of valueWords) {
                    const wordSimilarity = calculateSimilarity(valueWord, queryWord);
                    if (wordSimilarity >= 0.8) {
                        maxScore = Math.max(maxScore, wordSimilarity * 0.4);
                    }
                }
            }
        }
        return {
            ...item,
            score: maxScore
        };
    });
    // Filter and sort by score
    return scoredItems
        .filter(item => item.score >= threshold)
        .sort((a, b) => b.score - a.score);
}
exports.fuzzySearch = fuzzySearch;
// Find similar places for duplicate detection
function findSimilarPlaces(existingPlaces, newPlaceName, options = {}) {
    const { threshold = 0.6, // Higher threshold for duplicate detection
    maxResults = 10, keys = ['title'] } = options;
    const results = fuzzySearch(existingPlaces, newPlaceName, {
        threshold,
        keys
    });
    // Add reason for similarity
    const enhancedResults = results.map(item => {
        let reason = 'Similar name';
        for (const key of keys) {
            const value = item[key];
            if (typeof value !== 'string')
                continue;
            const valueLower = value.toLowerCase();
            const queryLower = newPlaceName.toLowerCase();
            if (valueLower === queryLower) {
                reason = 'Exact match';
                break;
            }
            else if (valueLower.includes(queryLower)) {
                reason = 'Name contains your input';
                break;
            }
            else if (queryLower.includes(valueLower)) {
                reason = 'Your input contains this place name';
                break;
            }
            else if (arePhoneticallySimilar(value, newPlaceName)) {
                reason = 'Sounds similar';
            }
            else if (item.score >= 0.8) {
                reason = 'Very similar spelling';
            }
            else if (item.score >= 0.7) {
                reason = 'Similar spelling';
            }
        }
        return {
            ...item,
            reason
        };
    });
    return enhancedResults.slice(0, maxResults);
}
exports.findSimilarPlaces = findSimilarPlaces;
