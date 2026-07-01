export default function TrailerFlowApp() {
  const store = useTrailerData();
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('dashboard');
  const [search, setSearch] = useState('');
  const [authReady, setAuthReady] = useState(false);
  const [loginRole, setLoginRole] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  const companyToId = (company) => {
    const value = String(company || '').toLowerCase();
    if (value.includes('rnf')) return 'rnf';
    return 'hopewell';
  };

  const getPortalUser = async (firebaseUser) => {
    if (!db) throw new Error('Firebase database is not configured. Check Vercel environment variables.');
    const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (!snap.exists()) throw new Error('No portal role was found for this account. Check Firestore users/{UID}.');

    const profile = snap.data();
    if (profile.active === false) throw new Error('This account is disabled. Contact the admin.');

    return {
      id: firebaseUser.uid,
      name: profile.name || firebaseUser.email || 'Portal User',
      email: profile.email || firebaseUser.email || '',
      role: profile.role || 'rnf',
      companyId: profile.companyId || companyToId(profile.company),
      active: profile.active !== false
    };
  };

  useEffect(() => {
    const forceLoginScreen = async () => {
      try {
        if (auth?.currentUser) {
          await signOut(auth);
        }
      } catch (error) {
        console.warn('Firebase sign out warning:', error);
      } finally {
        setUser(null);
        setLoginRole(null);
        setAuthReady(true);
      }
    };

    forceLoginScreen();
  }, []);

  const openLogin = (role) => {
    setLoginRole(role);
    setEmail(role === 'admin' ? 'admin@test.com' : role === 'rnf' ? 'rnf@test.com' : 'shunter@test.com');
    setPassword('');
    setAuthError('');
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setAuthError('');

    if (!isFirebaseConfigured || !auth || !db) {
      setAuthError('Firebase is not connected yet. Check Vercel environment variables and redeploy.');
      return;
    }

    if (!email.trim() || !password.trim()) {
      setAuthError('Enter both email and password.');
      return;
    }

    try {
      setAuthBusy(true);
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const portalUser = await getPortalUser(credential.user);

      if (loginRole && portalUser.role !== loginRole) {
        await signOut(auth);
        setUser(null);
        setAuthError(`This login is for ${roleLabel(portalUser.role)}, not ${roleLabel(loginRole)}.`);
        return;
      }

      setUser(portalUser);
      setPage('dashboard');
      setLoginRole(null);
      setPassword('');
    } catch (error) {
      console.error(error);
      setAuthError(cleanAuthError(error));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    if (auth?.currentUser) await signOut(auth);
    setUser(null);
    setPage('dashboard');
  };

  if (!authReady || !store.dataReady) {
    return (
      <div className="landing">
        <div className="login-panel">
          <h2 className="panel-title">Loading HPW-RNF Portal...</h2>
          <p className="panel-copy">Checking secure login and Firestore data.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Landing data={store.data} openLogin={openLogin} />
        {loginRole ? (
          <LoginModal
            role={loginRole}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            error={authError}
            busy={authBusy}
            onClose={() => setLoginRole(null)}
            onSubmit={handleLogin}
          />
        ) : null}
      </>
    );
  }

  const nav = getNav(user.role);
  const currentPage = nav.some((n) => n.id === page) ? page : 'dashboard';

  return (
    <div className="portal">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">🚛</div>
          <div>
            <div className="brand-title">TrailerFlow</div>
            <div className="brand-subtitle">Pro Control Portal</div>
          </div>
        </div>

        <div className="user-chip">
          <strong>{user.name}</strong>
          <span>
            {roleLabel(user.role)} • {store.data.companies.find((c) => c.id === user.companyId)?.name}
          </span>
        </div>

        <div className="side-label">Navigation</div>

        <div className="side-nav">
          {nav.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => setPage(item.id)}
            >
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <button className="btn btn-danger" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <h1>{nav.find((n) => n.id === currentPage)?.label || 'Dashboard'}</h1>
            <p>{topbarCopy(user.role, currentPage)}</p>
          </div>

          <div className="topbar-tools">
            <input
              className="search"
              placeholder="Search trailers, PO, warehouse..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="badge green">Online</span>
          </div>
        </div>

        <PageRouter user={user} page={currentPage} search={search} store={store} />
      </main>

      {store.toast ? <div className="toast">{store.toast}</div> : null}
    </div>
  );
}
