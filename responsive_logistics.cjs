const fs = require('fs');

function makeLogisticsResponsive() {
  const file = 'C:/Users/comer/Downloads/metroflow-erp/src/components/LogisticsModule.tsx';
  let content = fs.readFileSync(file, 'utf8');

  // 1. Make the Tab Header and Switcher more responsive
  // Change: <div className="flex flex-wrap lg:flex-nowrap bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl gap-1">
  // To: <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl gap-1 overflow-x-auto custom-scrollbar no-scrollbar-on-mobile whitespace-nowrap">
  content = content.replace(
    /className="flex flex-wrap lg:flex-nowrap bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl gap-1"/,
    'className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl gap-1 overflow-x-auto custom-scrollbar no-scrollbar-on-mobile whitespace-nowrap w-full md:w-auto"'
  );

  // 2. Ensure buttons in tabs don't shrink
  content = content.replace(
    /className={`flex items-center px-4 py-2\.5 rounded-xl font-black text-xs transition-all duration-300 \${/,
    'className={`flex-shrink-0 flex items-center px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 ${'
  );

  // 3. Make the Title section more vertical on mobile
  content = content.replace(
    /className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase"/,
    'className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-tight"'
  );

  // 4. Update the OS Tab Search/View header
  content = content.replace(
    /className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10"/,
    'className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 mb-12"'
  );

  // 5. Enhance Search input responsiveness
  content = content.replace(
    /className="w-full pl-12 pr-5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium outline-none md:w-80 shadow-sm focus:ring-2 focus:ring-indigo-500\/20 transition-all"/,
    'className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-[1.5rem] text-sm font-bold outline-none xl:w-96 shadow-sm focus:ring-4 focus:ring-indigo-500/10 transition-all"'
  );

  // 6. Fix Modal padding and scaling for mobile
  content = content.replace(
    /className="bg-white dark:bg-slate-900 rounded-\[2\.5rem\] md:rounded-\[3rem\] shadow-2xl p-6 md:p-10 w-full max-w-lg border border-slate-100 dark:border-slate-800 relative flex flex-col max-h-\[92vh\]"/,
    'className="bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[3rem] shadow-2xl p-6 md:p-12 w-full max-w-[95%] md:max-w-xl border border-slate-100 dark:border-slate-800 relative flex flex-col max-h-[95vh] overflow-hidden"'
  );
  
  // 7. Update Standard Custody Modal to be more responsive
  content = content.replace(
    /className="bg-white dark:bg-slate-900 rounded-\[2\.5rem\] md:rounded-\[3\.5rem\] shadow-2xl p-6 md:p-10 w-full max-w-xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-\[92vh\]"/,
    'className="bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[3.5rem] shadow-2xl p-6 md:p-12 w-full max-w-[95%] md:max-w-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[95vh] overflow-hidden"'
  );

  // 8. Card Layout: update grid to be even more fluid
  content = content.replace(
    /className="rectilinear-grid"/g,
    'className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-8"'
  );

  fs.writeFileSync(file, content, 'utf8');
}

makeLogisticsResponsive();
