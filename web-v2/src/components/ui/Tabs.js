'use client';

export default function Tabs({ tabs = [], activeTab, onChange }) {
  return (
    <div
      className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit"
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={[
              'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 focus:outline-none',
              isActive
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/60',
            ].join(' ')}
          >
            {tab.label}
            {tab.count != null && (
              <span
                className={[
                  'inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-xs font-semibold',
                  isActive
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-200 text-gray-500',
                ].join(' ')}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
