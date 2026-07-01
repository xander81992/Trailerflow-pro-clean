function DashboardDesignStyles() {
  return <style>{`
    .tf2-dashboard {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .tf2-modern-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 6px;
    }

    .tf2-modern-top h2 {
      margin: 0;
      font-size: 28px;
      color: #0f172a;
      letter-spacing: -0.04em;
    }

    .tf2-modern-top p {
      margin: 4px 0 0;
      color: #64748b;
      font-size: 14px;
    }

    .tf2-filter-row {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    .tf2-filter-pill {
      border: 1px solid #e2e8f0;
      background: white;
      border-radius: 14px;
      padding: 12px 16px;
      font-weight: 800;
      color: #334155;
      box-shadow: 0 8px 20px rgba(15,23,42,.05);
    }

    .tf2-kpi-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 14px;
    }

    .tf2-kpi-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 22px;
      padding: 20px;
      box-shadow: 0 14px 34px rgba(15,23,42,.07);
      display: flex;
      align-items: center;
      gap: 16px;
      min-height: 118px;
    }

    .tf2-kpi-icon {
      width: 58px;
      height: 58px;
      border-radius: 22px;
      display: grid;
      place-items: center;
      font-size: 26px;
      background: var(--soft);
    }

    .tf2-kpi-card h3 {
      margin: 0;
      font-size: 14px;
      color: #0f172a;
    }

    .tf2-kpi-card strong {
      display: block;
      font-size: 30px;
      color: #0f172a;
      margin-top: 6px;
      letter-spacing: -0.04em;
    }

    .tf2-kpi-card span {
      display: block;
      margin-top: 6px;
      color: var(--accent);
      font-size: 13px;
      font-weight: 800;
    }

    .tf2-modern-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 24px;
      box-shadow: 0 14px 34px rgba(15,23,42,.07);
      overflow: hidden;
    }

    .tf2-modern-card-head {
      padding: 18px 20px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 14px;
    }

    .tf2-modern-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .tf2-modern-title-icon {
      width: 38px;
      height: 38px;
      border-radius: 14px;
      background: #eff6ff;
      color: #2563eb;
      display: grid;
      place-items: center;
      font-size: 20px;
    }

    .tf2-modern-title h3 {
      margin: 0;
      color: #0f172a;
      font-size: 18px;
    }

    .tf2-modern-title p {
      margin: 4px 0 0;
      color: #64748b;
      font-size: 13px;
    }

    .tf2-blue-btn {
      border: 0;
      background: #2563eb;
      color: white;
      padding: 12px 18px;
      border-radius: 14px;
      font-weight: 900;
      cursor: pointer;
      box-shadow: 0 12px 24px rgba(37,99,235,.25);
    }

    .tf2-blue-btn:hover {
      background: #1d4ed8;
    }

    .tf2-door-summary-grid {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
    }

    .tf2-whse-summary {
      padding: 18px;
      border-right: 1px solid #e2e8f0;
    }

    .tf2-whse-summary:last-child {
      border-right: 0;
    }

    .tf2-whse-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .tf2-whse-letter {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      font-weight: 900;
      background: #eff6ff;
      color: #2563eb;
    }

    .tf2-whse-summary h4 {
      margin: 0;
      color: #0f172a;
      font-size: 14px;
    }

    .tf2-whse-summary small {
      color: #64748b;
      font-weight: 700;
    }

    .tf2-whse-counts {
      display: flex;
      justify-content: space-between;
      gap: 12px;
    }

    .tf2-count-green {
      font-size: 26px;
      font-weight: 900;
      color: #16a34a;
    }

    .tf2-count-orange {
      font-size: 26px;
      font-weight: 900;
      color: #f97316;
    }

    .tf2-count-label {
      display: block;
      font-size: 12px;
      color: #475569;
      margin-top: 2px;
    }

    .tf2-util-bar {
      height: 7px;
      background: #e2e8f0;
      border-radius: 999px;
      margin-top: 16px;
      overflow: hidden;
    }

    .tf2-util-bar i {
      display: block;
      height: 100%;
      background: linear-gradient(90deg, #16a34a, #f97316);
      border-radius: 999px;
    }

    .tf2-door-details-wrap {
      padding: 18px;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
    }

    .tf2-door-details-grid {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 12px;
    }

    .tf2-door-mini {
      border-radius: 18px;
      border: 1px solid #bfdbfe;
      background: linear-gradient(180deg, #eff6ff, #ffffff);
      padding: 14px;
      min-height: 128px;
    }

    .tf2-door-mini.occupied {
      border-color: #86efac;
      background: linear-gradient(180deg, #ecfdf5, #ffffff);
    }

    .tf2-door-mini.maintenance {
      border-color: #fecaca;
      background: linear-gradient(180deg, #fef2f2, #ffffff);
    }

    .tf2-door-mini-top {
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }

    .tf2-door-mini strong {
      color: #0f172a;
      font-size: 14px;
    }

    .tf2-door-mini h4 {
      margin: 16px 0 4px;
      color: #0f172a;
      font-size: 18px;
    }

    .tf2-door-mini p {
      margin: 0;
      color: #64748b;
      font-size: 12px;
      line-height: 1.4;
    }

    .tf2-door-pill {
      display: inline-flex;
      margin-top: 12px;
      border-radius: 999px;
      padding: 7px 10px;
      font-size: 10px;
      font-weight: 900;
      background: #dbeafe;
      color: #1d4ed8;
    }

    .tf2-door-mini.occupied .tf2-door-pill {
      background: #dcfce7;
      color: #166534;
    }

    .tf2-door-mini.maintenance .tf2-door-pill {
      background: #fee2e2;
      color: #991b1b;
    }

    .tf2-main-grid {
      display: grid;
      grid-template-columns: .9fr 1.35fr;
      gap: 18px;
    }

    .tf2-card-body {
      padding: 18px 20px;
    }

    .tf2-activity-list {
      display: grid;
      gap: 10px;
    }

    .tf2-activity-row {
      display: grid;
      grid-template-columns: 42px 1fr auto;
      gap: 12px;
      align-items: center;
      padding: 12px;
      border-radius: 16px;
      border-bottom: 1px solid #f1f5f9;
    }

    .tf2-activity-icon {
      width: 42px;
      height: 42px;
      border-radius: 14px;
      display: grid;
      place-items: center;
      background: #dcfce7;
    }

    .tf2-activity-row strong {
      display: block;
      color: #0f172a;
      font-size: 13px;
    }

    .tf2-activity-row span {
      color: #64748b;
      font-size: 12px;
    }

    .tf2-activity-status {
      border-radius: 999px;
      padding: 7px 10px;
      font-size: 11px;
      font-weight: 900;
      background: #dcfce7;
      color: #166534;
      white-space: nowrap;
    }

    .tf2-map {
      background: #dff3d7;
      border-radius: 20px;
      padding: 18px;
      min-height: 280px;
      position: relative;
      overflow: hidden;
      border: 1px solid #c7e9bd;
    }

    .tf2-road {
      height: 58px;
      border-radius: 999px;
      background: #cbd5e1;
      margin: 26px 30px;
      position: relative;
    }

    .tf2-road:after {
      content: '';
      position: absolute;
      left: 30px;
      right: 30px;
      top: 28px;
      border-top: 2px dashed rgba(255,255,255,.8);
    }

    .tf2-map-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 18px;
    }

    .tf2-map-whse {
      background: rgba(255,255,255,.9);
      border: 1px solid #dbeafe;
      border-radius: 16px;
      padding: 12px;
      box-shadow: 0 10px 22px rgba(15,23,42,.08);
    }

    .tf2-map-label {
      display: inline-flex;
      background: #2563eb;
      color: white;
      border-radius: 8px;
      padding: 5px 10px;
      font-size: 11px;
      font-weight: 900;
      margin-bottom: 10px;
    }

    .tf2-map-doors {
      display: flex;
      gap: 7px;
      flex-wrap: wrap;
    }

    .tf2-map-door {
      width: 16px;
      height: 36px;
      border-radius: 4px;
      background: #e2e8f0;
      border: 1px solid #cbd5e1;
    }

    .tf2-map-door.loaded {
      background: #22c55e;
      border-color: #16a34a;
    }

    .tf2-map-door.empty-trailer {
      background: #0891b2;
      border-color: #0e7490;
    }

    .tf2-map-door.transit {
      background: #f97316;
      border-color: #ea580c;
    }

    .tf2-map-door.maintenance {
      background: #ef4444;
      border-color: #dc2626;
    }

    .tf2-bottom-grid {
      display: grid;
      grid-template-columns: 1fr 220px 220px;
      gap: 18px;
      align-items: stretch;
    }

    .tf2-legend {
      display: flex;
      gap: 28px;
      align-items: center;
      flex-wrap: wrap;
      padding: 18px 22px;
    }

    .tf2-legend-item {
      display: flex;
      align-items: center;
      gap: 9px;
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
    }

    .tf2-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }

    .tf2-mini-stat {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 18px;
      box-shadow: 0 14px 34px rgba(15,23,42,.07);
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .tf2-mini-stat-icon {
      width: 42px;
      height: 42px;
      border-radius: 14px;
      background: #eff6ff;
      display: grid;
      place-items: center;
      font-size: 20px;
    }

    .tf2-mini-stat span {
      color: #64748b;
      font-size: 13px;
      font-weight: 800;
    }

    .tf2-mini-stat strong {
      display: block;
      color: #2563eb;
      font-size: 24px;
      margin-top: 2px;
    }

    @media (max-width: 1200px) {
      .tf2-kpi-grid,
      .tf2-door-summary-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .tf2-main-grid,
      .tf2-bottom-grid {
        grid-template-columns: 1fr;
      }

      .tf2-door-details-grid,
      .tf2-map-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 720px) {
      .tf2-kpi-grid,
      .tf2-door-summary-grid,
      .tf2-door-details-grid,
      .tf2-map-grid {
        grid-template-columns: 1fr;
      }

      .tf2-modern-top {
        flex-direction: column;
        align-items: flex-start;
      }

      .tf2-filter-row {
        width: 100%;
        flex-wrap: wrap;
      }
    }
  `}</style>;
}

function AdminDashboard({ store }) {
  const { data } = store;
  const stats = getModernDashboardStats(data);

  return (
    <div className="tf2-dashboard">
      <DashboardDesignStyles />

      <ModernDashboardHeader userName="Alexander" />

      <DashboardKpiCards stats={stats} />

      <DoorSummary data={data} />

      <div className="tf2-main-grid">
        <RecentActivityPanel data={data} />
        <LiveTrailerMap data={data} />
      </div>

      <div className="tf2-bottom-grid">
        <LegendBar stats={stats} />
        <TodayMiniStat icon="📅" label="Tasks Due Today" value={stats.activeTasks} />
        <TodayMiniStat icon="👥" label="Active Shunters" value={stats.activeShunters} />
      </div>
    </div>
  );
}

function RNFDashboard({ user, store }) {
  const { data } = store;
  const stats = getModernDashboardStats(data, user.companyId);

  return (
    <div className="tf2-dashboard">
      <DashboardDesignStyles />

      <ModernDashboardHeader userName="RNF User" />

      <DashboardKpiCards stats={stats} />

      <DoorSummary data={data} />

      <div className="tf2-main-grid">
        <RecentActivityPanel data={data} companyId={user.companyId} />
        <LiveTrailerMap data={data} />
      </div>

      <div className="tf2-bottom-grid">
        <LegendBar stats={stats} />
        <TodayMiniStat icon="📅" label="Open RNF Requests" value={stats.openRequests} />
        <TodayMiniStat icon="🚛" label="RNF Trailers" value={stats.totalTrailers} />
      </div>
    </div>
  );
}

function RNFYardVisibilityPage({ user, store }) {
  const { data } = store;
  const stats = getModernDashboardStats(data, user.companyId);

  return (
    <div className="tf2-dashboard">
      <DashboardDesignStyles />

      <ModernDashboardHeader userName="RNF User" />

      <DoorSummary data={data} />

      <div className="tf2-main-grid">
        <RecentActivityPanel data={data} companyId={user.companyId} />
        <LiveTrailerMap data={data} />
      </div>

      <div className="tf2-bottom-grid">
        <LegendBar stats={stats} />
        <TodayMiniStat icon="📦" label="Loaded Trailers" value={stats.loadedTrailers} />
        <TodayMiniStat icon="✅" label="Available Doors" value={stats.availableDoors} />
      </div>
    </div>
  );
}

function ModernDashboardHeader({ userName }) {
  return (
    <div className="tf2-modern-top">
      <div>
        <h2>Dashboard</h2>
        <p>Welcome back, <strong style={{ color: '#2563eb' }}>{userName}!</strong></p>
      </div>

      <div className="tf2-filter-row">
        <div className="tf2-filter-pill">🏢 All Warehouses ▾</div>
        <div className="tf2-filter-pill">📅 Today ▾</div>
        <div className="tf2-filter-pill">🔔</div>
      </div>
    </div>
  );
}

function getModernDashboardStats(data, companyId = null) {
  const trailers = companyId
    ? data.trailers.filter((t) => t.companyId === companyId)
    : data.trailers;

  const loadedTrailers = trailers.filter((t) => t.status === 'Loaded').length;
  const emptyTrailers = trailers.filter((t) => t.status === 'Empty').length;
  const inTransit = trailers.filter((t) => t.status === 'In Transit').length;
  const maintenance = data.doors.filter((d) => d.status === 'Maintenance').length;
  const occupiedDoors = data.doors.filter((d) => d.trailerId).length;
  const availableDoors = data.doors.length - occupiedDoors - maintenance;

  return {
    totalDoors: data.doors.length,
    availableDoors,
    occupiedDoors,
    loadedTrailers,
    emptyTrailers,
    inTransit,
    maintenance,
    totalTrailers: trailers.length,
    openRequests: data.requests.filter((r) => r.status !== 'Completed').length,
    activeTasks: data.tasks.filter((t) => t.status !== 'Completed').length,
    activeShunters: data.users.filter((u) => u.role === 'shunter' && u.active !== false).length || 0
  };
}

function DashboardKpiCards({ stats }) {
  const availablePct = stats.totalDoors
    ? Math.round((stats.availableDoors / stats.totalDoors) * 100)
    : 0;

  const occupiedPct = stats.totalDoors
    ? Math.round((stats.occupiedDoors / stats.totalDoors) * 100)
    : 0;

  const cards = [
    {
      title: 'Total Doors',
      value: stats.totalDoors,
      note: 'Across all warehouses',
      icon: '🚪',
      soft: '#dbeafe',
      accent: '#2563eb'
    },
    {
      title: 'Available Doors',
      value: stats.availableDoors,
      note: `${availablePct}% Available`,
      icon: '✅',
      soft: '#dcfce7',
      accent: '#16a34a'
    },
    {
      title: 'Occupied Doors',
      value: stats.occupiedDoors,
      note: `${occupiedPct}% Occupied`,
      icon: '🚛',
      soft: '#ffedd5',
      accent: '#ea580c'
    },
    {
      title: 'Loaded Trailers',
      value: stats.loadedTrailers,
      note: 'In Warehouse',
      icon: '📦',
      soft: '#f3e8ff',
      accent: '#7c3aed'
    },
    {
      title: 'Empty Trailers',
      value: stats.emptyTrailers,
      note: 'In Warehouse',
      icon: '🚚',
      soft: '#cffafe',
      accent: '#0891b2'
    }
  ];

  return (
    <div className="tf2-kpi-grid">
      {cards.map((card) => (
        <div
          key={card.title}
          className="tf2-kpi-card"
          style={{ '--soft': card.soft, '--accent': card.accent }}
        >
          <div className="tf2-kpi-icon">{card.icon}</div>
          <div>
            <h3>{card.title}</h3>
            <strong>{card.value}</strong>
            <span>{card.note}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function DoorSummary({ data }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="tf2-modern-card">
      <div className="tf2-modern-card-head">
        <div className="tf2-modern-title">
          <div className="tf2-modern-title-icon">📊</div>
          <div>
            <h3>Door Summary</h3>
            <p>Quick overview of door utilization across all warehouses</p>
          </div>
        </div>

        <button className="tf2-blue-btn" onClick={() => setShowDetails(!showDetails)}>
          {showDetails ? 'Hide Door Details' : 'View Door Details'} {showDetails ? '⌃' : '⌄'}
        </button>
      </div>

      <div className="tf2-door-summary-grid">
        {data.warehouses.map((warehouse, index) => {
          const doors = data.doors.filter((d) => d.warehouseId === warehouse.id);
          const occupied = doors.filter((d) => d.trailerId).length;
          const maintenance = doors.filter((d) => d.status === 'Maintenance').length;
          const available = doors.length - occupied - maintenance;
          const pct = doors.length ? Math.round((available / doors.length) * 100) : 0;
          const letter = warehouse.code || String.fromCharCode(65 + index);

          return (
            <div className="tf2-whse-summary" key={warehouse.id}>
              <div className="tf2-whse-header">
                <div className="tf2-whse-letter">{letter}</div>
                <div>
                  <h4>{warehouse.name}</h4>
                  <small>{doors.length} Doors</small>
                </div>
              </div>

              <div className="tf2-whse-counts">
                <div>
                  <div className="tf2-count-green">{available}</div>
                  <span className="tf2-count-label">Available</span>
                </div>
                <div>
                  <div className="tf2-count-orange">{occupied}</div>
                  <span className="tf2-count-label">Occupied</span>
                </div>
              </div>

              <div className="tf2-util-bar">
                <i style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {showDetails ? (
        <div className="tf2-door-details-wrap">
          <div className="tf2-door-details-grid">
            {data.doors.map((door) => {
              const trailer = data.trailers.find((t) => t.id === door.trailerId);
              const company = trailer
                ? data.companies.find((c) => c.id === trailer.companyId)?.name || ''
                : '';
              const isOccupied = Boolean(trailer);
              const isMaintenance = door.status === 'Maintenance';

              return (
                <div
                  key={door.id}
                  className={`tf2-door-mini ${isOccupied ? 'occupied' : ''} ${isMaintenance ? 'maintenance' : ''}`}
                >
                  <div className="tf2-door-mini-top">
                    <strong>{door.code}</strong>
                    <span>{isMaintenance ? '🔧' : isOccupied ? '🚛' : '✨'}</span>
                  </div>

                  <h4>{trailer?.number || 'Empty Door'}</h4>

                  <p>{company || 'Available for trailer assignment'}</p>
                  <p>{trailer?.status || door.status}</p>

                  <div className="tf2-door-pill">
                    {isMaintenance ? 'Maintenance' : isOccupied ? 'Trailer On Door' : 'Available'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RecentActivityPanel({ data, companyId = null }) {
  const movements = data.movements
    .filter((movement) => {
      if (!companyId) return true;
      if (!movement.trailerId) return true;
      const trailer = data.trailers.find((t) => t.id === movement.trailerId);
      return trailer?.companyId === companyId;
    })
    .slice(0, 5);

  return (
    <div className="tf2-modern-card">
      <div className="tf2-modern-card-head">
        <div className="tf2-modern-title">
          <div className="tf2-modern-title-icon">🕘</div>
          <div>
            <h3>Recent Activity</h3>
            <p>Latest trailer moves, requests, and task updates</p>
          </div>
        </div>
        <button className="btn btn-soft btn-small">View All</button>
      </div>

      <div className="tf2-card-body">
        <div className="tf2-activity-list">
          {movements.length ? movements.map((movement) => (
            <div className="tf2-activity-row" key={movement.id}>
              <div className="tf2-activity-icon">{activityIcon(movement.type)}</div>
              <div>
                <strong>{movement.message}</strong>
                <span>
                  by {userName(data, movement.userId)} • {timeOnly(movement.createdAt)}
                </span>
              </div>
              <div className="tf2-activity-status">
                {movement.type === 'request' ? 'New Request' : movement.type === 'movement' ? 'Completed' : 'Update'}
              </div>
            </div>
          )) : (
            <p className="card-sub">No activity yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function activityIcon(type) {
  if (type === 'request') return '📦';
  if (type === 'task') return '✅';
  if (type === 'movement') return '🚛';
  if (type === 'user') return '👥';
  return '📝';
}

function LiveTrailerMap({ data }) {
  return (
    <div className="tf2-modern-card">
      <div className="tf2-modern-card-head">
        <div className="tf2-modern-title">
          <div className="tf2-modern-title-icon">🗺️</div>
          <div>
            <h3>Live Trailer Map</h3>
            <p>Visual warehouse door map by trailer status</p>
          </div>
        </div>
        <button className="btn btn-soft btn-small">View Full Map</button>
      </div>

      <div className="tf2-card-body">
        <div className="tf2-map">
          <div className="tf2-map-grid">
            {data.warehouses.slice(0, 3).map((warehouse) => (
              <MapWarehouse key={warehouse.id} warehouse={warehouse} data={data} />
            ))}
          </div>

          <div className="tf2-road"></div>

          <div className="tf2-map-grid">
            {data.warehouses.slice(3, 6).map((warehouse) => (
              <MapWarehouse key={warehouse.id} warehouse={warehouse} data={data} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MapWarehouse({ warehouse, data }) {
  const doors = data.doors.filter((d) => d.warehouseId === warehouse.id);

  return (
    <div className="tf2-map-whse">
      <div className="tf2-map-label">{warehouse.name}</div>

      <div className="tf2-map-doors">
        {doors.map((door) => {
          const trailer = data.trailers.find((t) => t.id === door.trailerId);
          let statusClass = '';

          if (door.status === 'Maintenance') statusClass = 'maintenance';
          else if (trailer?.status === 'Loaded') statusClass = 'loaded';
          else if (trailer?.status === 'Empty') statusClass = 'empty-trailer';
          else if (trailer?.status === 'In Transit') statusClass = 'transit';

          return <div key={door.id} className={`tf2-map-door ${statusClass}`} title={`${warehouse.name} ${door.code}`} />;
        })}
      </div>
    </div>
  );
}

function LegendBar({ stats }) {
  return (
    <div className="tf2-modern-card">
      <div className="tf2-legend">
        <LegendItem color="#22c55e" label={`Loaded (${stats.loadedTrailers})`} />
        <LegendItem color="#0891b2" label={`Empty (${stats.emptyTrailers})`} />
        <LegendItem color="#f97316" label={`In Transit (${stats.inTransit})`} />
        <LegendItem color="#ef4444" label={`Maintenance (${stats.maintenance})`} />
        <LegendItem color="#cbd5e1" label={`Available (${stats.availableDoors})`} />
      </div>
    </div>
  );
}

function LegendItem({ color, label }) {
  return (
    <div className="tf2-legend-item">
      <span className="tf2-dot" style={{ background: color }} />
      {label}
    </div>
  );
}

function TodayMiniStat({ icon, label, value }) {
  return (
    <div className="tf2-mini-stat">
      <div className="tf2-mini-stat-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
