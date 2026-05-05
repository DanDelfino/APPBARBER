/**
 * Normaliza o nome para o formato Capitalizado.
 * Ex: "joão silva" -> "João Silva"
 */
export function normalizeName(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Normaliza o telefone para o formato (XX) XXXXX-XXXX ou (XX) XXXX-XXXX.
 * Remove tudo que não for dígito e aplica a máscara.
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  
  // Remove tudo que não for número
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  
  // Formato celular (11 dígitos) ou maior
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Converte o texto de um CSV para um array de objetos de cliente.
 * Tenta identificar colunas como "Nome", "Telefone", "Notas".
 */
export function parseContactsCSV(text: string): { name: string, phone: string, notes: string }[] {
  if (!text) return [];

  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return []; // Header + at least one row

  // Tenta identificar o delimitador (vírgula ou ponto-e-vírgula)
  const headerLine = lines[0];
  const delimiter = headerLine.includes(';') ? ';' : ',';
  
  const headers = headerLine.split(delimiter).map(h => h.trim().toLowerCase());
  
  // Mapeamento básico de colunas comuns
  const indexMap = {
    name: headers.findIndex(h => h.includes('nome') || h.includes('name') || h.includes('cliente')),
    phone: headers.findIndex(h => h.includes('tel') || h.includes('phone') || h.includes('cel')),
    notes: headers.findIndex(h => h.includes('not') || h.includes('obs'))
  };

  // Se não encontrar nem o nome, assume que a primeira coluna é o nome
  if (indexMap.name === -1) indexMap.name = 0;

  const result: { name: string, phone: string, notes: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map(c => c.trim());
    
    const name = indexMap.name !== -1 ? cols[indexMap.name] : '';
    const phone = indexMap.phone !== -1 ? cols[indexMap.phone] : '';
    const notes = indexMap.notes !== -1 ? cols[indexMap.notes] : '';

    if (name) {
      result.push({ name, phone, notes });
    }
  }

  return result;
}
