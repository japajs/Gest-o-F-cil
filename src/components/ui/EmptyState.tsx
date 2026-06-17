import { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface Props {
  title?: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export function EmptyState({ title = 'Nenhum registro encontrado', description, action, icon }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 text-gray-300 dark:text-gray-600">
        {icon ?? <Inbox size={48} />}
      </div>
      <h3 className="text-base font-semibold text-gray-600 dark:text-gray-400 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">{description}</p>}
      {action}
    </div>
  );
}
