/**
 * Utilitários para cálculo de similaridade entre strings
 */
export class StringSimilarityUtil {
  /**
   * Calcula a similaridade entre duas strings usando algoritmo Jaro-Winkler simplificado
   */
  static calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;

    // Converte para minúsculo para comparação case-insensitive
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    // Calcula a distância de Levenshtein
    const levenshteinDistance = this.levenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);

    // Converte distância em similaridade (0-1)
    const similarity = 1 - levenshteinDistance / maxLength;

    // Bônus para strings que começam com as mesmas palavras
    const words1 = s1.split(' ');
    const words2 = s2.split(' ');
    let wordMatchBonus = 0;

    // Verifica se há palavras em comum
    for (const word1 of words1) {
      // Ignora palavras muito curtas
      if (word1.length >= 3) {
        for (const word2 of words2) {
          if (word1 === word2) {
            wordMatchBonus += 0.1; // Bônus de 10% por palavra igual
            break;
          } else if (word1.includes(word2) || word2.includes(word1)) {
            wordMatchBonus += 0.05; // Bônus menor para palavras contidas
            break;
          }
        }
      }
    }

    return Math.min(1, similarity + wordMatchBonus);
  }

  /**
   * Calcula a distância de Levenshtein entre duas strings
   */
  static levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    // Incremento da linha 0 à length1
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    // Incremento da coluna 0 à length2
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    // Preenche o resto da matriz
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substituição
            matrix[i][j - 1] + 1, // inserção
            matrix[i - 1][j] + 1, // remoção
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Normaliza uma string removendo acentos, convertendo para minúsculo e normalizando espaços
   */
  static normalizeString(str: string): string {
    if (str === undefined || str === null) {
      return '';
    }
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .replace(/\s+/g, ' '); // Normalizar espaços múltiplos
  }
}
