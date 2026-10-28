import { migrateLegacyLocalStorage } from './legacy';

// Importado primeiro no main.tsx: as stores persistidas leem o localStorage ao serem criadas.
migrateLegacyLocalStorage();
