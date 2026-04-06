import { ColumnType, MetrologyField } from './types';

export function getDefaultMetrologyField(type: ColumnType): MetrologyField | undefined {
  switch (type) {
    case ColumnType.INCERTEZA:
      return 'U';
    case ColumnType.ERRO:
      return 'error';
    case ColumnType.MEDIA:
      return 'mean';
    case ColumnType.DESVIO_PADRAO:
      return 'stdDev';
    case ColumnType.CONFORMIDADE:
      return 'conformity';
    default:
      return undefined;
  }
}
