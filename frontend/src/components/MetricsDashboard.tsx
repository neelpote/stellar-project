import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { getAllStartups, getAllVCs } from '../stellar';

const fetchMetrics = async () => {
  const today = new Date().toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

  const [
    { count: dau },
    { count: totalUsers },
    { count: totalMessages },
    { data: eventCounts },
    { data: dailyActive },
  ] = await Promise.all([
    supabase.from('wallet_sessions').select('*', { count: 'exact', head: true }).eq('date', today),
    supabase.from('wallet_sessions').select('wallet_address', { count: 'exact', head: true }),
    supabase.from('messages').select('*', { count: 'exact', head: true }),
    supabase.from('page_events').select('event').gte('date', sevenDaysAgo),
    supabase.from('wallet_sessions').select('date, wallet_address').gte('date', sevenDaysAgo).order('date'),
  ]);

  // Count events by type
  const eventMap: Record<string, number> = {};
  (eventCounts || []).forEach(e => { eventMap[e.event] = (eventMap[e.event] || 0) + 1; });

  // DAU per day for last 7 days
  const dauByDay: Record<string, Set<string>> = {};
  (dailyActive || []).forEach(row => {
    if (!dauByDay[row.date]) dauByDay[row.date] = new Set();
    dauByDay[row.date].add(row.wallet_address);
  });
  const dauChart = Object.entries(dauByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, wallets]) => ({ date: date.slice(5), count: wallets.size }));

  return { dau: dau || 0, totalUsers: totalUsers || 0, totalMessages: totalMessages || 0, eventMap, dauChart };
};

export const MetricsDashboard = () => {
  const { data: onChain } = useQuery({ queryKey: ['allStartups'], queryFn: getAllStartups });
  const { data: onChainVCs } = useQuery({ queryKey: ['allVCs'], queryFn: getAllVCs });
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['metrics'],
    queryFn: fetchMetrics,
    refetchInterval: 30000,
  });

  const stats = [
    { label: 'DAU Today', value: metrics?.dau ?? '—' },
    { label: 'Total Wallets', value: metrics?.totalUsers ?? '—' },
    { label: 'Startups On-Chain', value: onChain?.length ?? '—' },
    { label: 'Verified VCs', value: onChainVCs?.length ?? '—' },
    { label: 'Messages Sent', value: metrics?.totalMessages ?? '—' },
    { label: 'Applications', value: metrics?.eventMap['apply'] ?? 0 },
    { label: 'Investments', value: metrics?.eventMap['invest'] ?? 0 },
    { label: 'VC Stakes', value: metrics?.eventMap['stake_vc'] ?? 0 },
  ];

  const maxDau = Math.max(...(metrics?.dauChart.map(d => d.count) ?? [1]), 1);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-2">Platform Analytics</div>
        <h2 className="text-4xl font-bold tracking-tighter mb-2">Metrics</h2>
        <p className="text-zinc-500">Live usage data tracked via Supabase. Updates every 30 seconds.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-3 bg-zinc-100 w-2/3 mb-2" />
              <div className="h-8 bg-zinc-100 w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className="card">
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">{s.label}</div>
              <div className="text-3xl font-bold tracking-tighter">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* DAU chart — last 7 days */}
      {metrics?.dauChart && metrics.dauChart.length > 0 && (
        <div className="card">
          <div className="text-[11px] font-bold uppercase tracking-widest mb-6">Daily Active Wallets — Last 7 Days</div>
          <div className="flex items-end gap-2 h-32">
            {metrics.dauChart.map(d => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-[10px] font-bold text-zinc-400">{d.count}</div>
                <div
                  className="w-full bg-black transition-all"
                  style={{ height: `${Math.max((d.count / maxDau) * 96, 4)}px` }}
                />
                <div className="text-[9px] text-zinc-400 font-bold">{d.date}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Event breakdown */}
      {metrics?.eventMap && Object.keys(metrics.eventMap).length > 0 && (
        <div className="card">
          <div className="text-[11px] font-bold uppercase tracking-widest mb-4">Feature Usage — Last 7 Days</div>
          <div className="space-y-3">
            {Object.entries(metrics.eventMap)
              .sort(([, a], [, b]) => b - a)
              .map(([event, count]) => {
                const maxCount = Math.max(...Object.values(metrics.eventMap));
                return (
                  <div key={event}>
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                      <span>{event.replace(/_/g, ' ')}</span>
                      <span>{count}</span>
                    </div>
                    <div className="h-1 w-full bg-zinc-100">
                      <div className="h-1 bg-black transition-all" style={{ width: `${(count / maxCount) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};
