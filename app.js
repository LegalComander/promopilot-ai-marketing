(() => {
  const LOCAL_ACCOUNTS = 'promopilot_accounts_v2';
  const LOCAL_SESSION = 'promopilot_session_v2';
  const $ = (id) => document.getElementById(id);
  const clean = (s) => (s || '').trim().replace(/\s+/g, ' ');
  const supabaseConfigured = Boolean(window.PROMOPILOT_SUPABASE?.url && window.PROMOPILOT_SUPABASE?.anonKey && window.supabase);
  const db = supabaseConfigured ? window.supabase.createClient(window.PROMOPILOT_SUPABASE.url, window.PROMOPILOT_SUPABASE.anonKey) : null;
  let currentUser = null;
  let currentProfile = null;
  let currentCampaigns = [];

  const esc = (s) => String(s || '').replace(/[&<>\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const slug = (s) => clean(s).replace(/[^a-zA-Z0-9 ]/g, '').split(/\s+/).filter(Boolean).map((x) => x[0].toUpperCase() + x.slice(1)).join('');

  function pack({ name, type, location, offer, tone = 'Friendly', goal = 'Get enquiries' }) {
    const opening = {
      Friendly: `👋 ${location} — we’ve got something for you!`,
      Professional: `Now available in ${location}:`,
      Energetic: `🔥 ${location} — don’t miss this!`,
      Premium: `✨ A premium offer from ${name} in ${location}`
    };
    const cta = goal === 'Get bookings' ? 'Message us today to book your slot.' :
      goal === 'Promote an offer' ? 'Contact us today while the offer is available.' :
      goal === 'Get reviews' ? 'Already used us? We’d love your feedback.' :
      'Message us today to ask a question or check availability.';
    const t = type.toLowerCase();
    return {
      social: `${opening[tone]}\n\n${name} is offering ${offer}.\n\nIf you’re looking for ${t} in ${location}, we’d love to help.\n\n${cta}`,
      google: `${name} in ${location}: ${offer}. If you need ${t}, contact us for current availability and details. ${cta}`,
      sms: `Hi! ${name} currently has this available: ${offer}. If you’re in ${location} and would like more details, reply to this message.`,
      review: `Thanks for choosing ${name}. If you were happy with our ${t} service, we’d really appreciate a quick review. Your feedback helps local customers in ${location} find us. Thank you!`,
      hashtags: `#${slug(location)} #${slug(type)} #LocalBusiness #SupportLocal #${slug(name)}`
    };
  }

  function result(p, title) {
    return `<h2>${title}</h2><p class="muted">Copy, edit and post these wherever your customers are.</p>${[['social', 'Facebook / Instagram'], ['google', 'Google Business Profile'], ['sms', 'SMS / WhatsApp'], ['review', 'Review request'], ['hashtags', 'Hashtags']].map(([k, l]) => `<div class="out"><h3>${l}</h3><p id="o-${k}">${esc(p[k])}</p><button class="copy" data-copy="o-${k}">Copy</button></div>`).join('')}`;
  }

  function modal(id, on = true) { $(id).classList.toggle('hidden', !on); }
  function showError(id, message) { const el = $(id); el.textContent = message; el.classList.toggle('hidden', !message); }
  function setBackendBadge() {
    const el = $('backendStatus');
    if (!el) return;
    el.textContent = supabaseConfigured ? 'Live account database connected' : 'Demo mode — connect Supabase to collect real signups';
    el.className = supabaseConfigured ? 'backend-status live' : 'backend-status';
  }

  document.addEventListener('click', async (e) => {
    const close = e.target.closest('[data-close]');
    if (close) modal(close.dataset.close, false);
    const button = e.target.closest('[data-copy]');
    if (button) {
      try {
        await navigator.clipboard.writeText($(button.dataset.copy).textContent);
        const old = button.textContent;
        button.textContent = 'Copied ✓';
        setTimeout(() => button.textContent = old, 900);
      } catch {
        button.textContent = 'Select & copy';
      }
    }
  });

  ['signUp', 'heroSignUp'].forEach((id) => $(id).onclick = () => modal('signupModal'));
  $('signIn').onclick = () => modal('loginModal');
  $('tryPreview').onclick = () => $('previewArea').scrollIntoView({ behavior: 'smooth' });
  $('signOut').onclick = async () => {
    if (supabaseConfigured) await db.auth.signOut();
    else localSetSession('');
    currentUser = currentProfile = null;
    currentCampaigns = [];
    render();
  };

  $('previewForm').onsubmit = (e) => {
    e.preventDefault();
    const d = { name: clean($('dName').value), type: clean($('dType').value), location: clean($('dLocation').value), offer: clean($('dOffer').value) };
    $('previewEmpty').classList.add('hidden');
    $('previewResult').innerHTML = result(pack(d), 'Your free preview');
    $('rBusiness').value = d.name;
    $('rType').value = d.type;
    $('rLocation').value = d.location;
    setTimeout(() => modal('signupModal'), 500);
  };

  $('signupForm').onsubmit = async (e) => {
    e.preventDefault();
    showError('signupError', '');
    const payload = {
      name: clean($('rName').value),
      email: clean($('rEmail').value).toLowerCase(),
      password: $('rPassword').value,
      business: clean($('rBusiness').value),
      type: clean($('rType').value),
      location: clean($('rLocation').value),
      consent: $('consent').checked
    };
    if (payload.password.length < 8) return showError('signupError', 'Use at least 8 characters for your password.');

    if (supabaseConfigured) {
      const { data, error } = await db.auth.signUp({
        email: payload.email,
        password: payload.password,
        options: {
          data: {
            full_name: payload.name,
            business_name: payload.business,
            business_type: payload.type,
            location: payload.location,
            marketing_consent: payload.consent
          }
        }
      });
      if (error) return showError('signupError', error.message);
      modal('signupModal', false);
      if (!data.session) {
        alert('Account created. Check your email to confirm your account, then sign in.');
        modal('loginModal');
        return;
      }
      await loadSupabaseState();
      render();
      return;
    }

    const accounts = localRead();
    if (accounts[payload.email]) return showError('signupError', 'An account with this email already exists on this device.');
    accounts[payload.email] = {
      id: `local-${Date.now()}`,
      name: payload.name,
      email: payload.email,
      business: payload.business,
      type: payload.type,
      location: payload.location,
      consent: payload.consent,
      credits: 3,
      packs: [],
      createdAt: new Date().toISOString()
    };
    localWrite(accounts);
    localSetSession(payload.email);
    $('rPassword').value = '';
    modal('signupModal', false);
    await loadLocalState();
    render();
  };

  $('loginForm').onsubmit = async (e) => {
    e.preventDefault();
    showError('loginError', '');
    const email = clean($('lEmail').value).toLowerCase();
    const password = $('lPassword').value;
    if (supabaseConfigured) {
      const { error } = await db.auth.signInWithPassword({ email, password });
      if (error) return showError('loginError', error.message);
      $('lPassword').value = '';
      modal('loginModal', false);
      await loadSupabaseState();
      render();
      return;
    }
    if (!localRead()[email]) return showError('loginError', 'No demo account with that email is saved on this device.');
    localSetSession(email);
    modal('loginModal', false);
    await loadLocalState();
    render();
  };

  $('campaignForm').onsubmit = async (e) => {
    e.preventDefault();
    if (!currentProfile) return;
    const credits = Number(currentProfile.free_credits ?? currentProfile.credits ?? 0);
    if (credits <= 0) { $('limit').classList.remove('hidden'); return; }
    $('limit').classList.add('hidden');
    const offer = clean($('offer').value);
    const tone = $('tone').value;
    const goal = $('goal').value;
    const p = pack({ name: currentProfile.business_name || currentProfile.business, type: currentProfile.business_type || currentProfile.type, location: currentProfile.location, offer, tone, goal });

    if (supabaseConfigured) {
      const nextCredits = credits - 1;
      const [{ error: campaignError }, { error: creditError }] = await Promise.all([
        db.from('campaigns').insert({ user_id: currentUser.id, offer, tone, goal }),
        db.from('profiles').update({ free_credits: nextCredits }).eq('id', currentUser.id)
      ]);
      if (campaignError || creditError) {
        alert((campaignError || creditError).message);
        return;
      }
      await loadSupabaseState();
    } else {
      const accounts = localRead();
      const email = localSession();
      const u = accounts[email];
      u.credits--;
      u.packs.unshift({ offer, tone, goal, createdAt: new Date().toISOString() });
      u.packs = u.packs.slice(0, 8);
      accounts[email] = u;
      localWrite(accounts);
      await loadLocalState();
    }

    $('appEmpty').classList.add('hidden');
    $('appResult').innerHTML = result(p, 'Your campaign is ready');
    $('offer').value = '';
    profile();
  };

  async function loadSupabaseState() {
    const { data: { user } } = await db.auth.getUser();
    currentUser = user || null;
    if (!currentUser) { currentProfile = null; currentCampaigns = []; return; }
    const [{ data: profileData }, { data: campaignData }] = await Promise.all([
      db.from('profiles').select('*').eq('id', currentUser.id).single(),
      db.from('campaigns').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(8)
    ]);
    currentProfile = profileData || null;
    currentCampaigns = campaignData || [];
  }

  function localRead() { try { return JSON.parse(localStorage.getItem(LOCAL_ACCOUNTS) || '{}'); } catch { return {}; } }
  function localWrite(v) { localStorage.setItem(LOCAL_ACCOUNTS, JSON.stringify(v)); }
  function localSession() { return localStorage.getItem(LOCAL_SESSION) || ''; }
  function localSetSession(v) { v ? localStorage.setItem(LOCAL_SESSION, v) : localStorage.removeItem(LOCAL_SESSION); }
  async function loadLocalState() {
    const email = localSession();
    const u = localRead()[email] || null;
    currentUser = u ? { id: u.id, email: u.email } : null;
    currentProfile = u;
    currentCampaigns = u?.packs || [];
  }

  function profile() {
    if (!currentProfile) return;
    const credits = Number(currentProfile.free_credits ?? currentProfile.credits ?? 0);
    const name = currentProfile.full_name || currentProfile.name || '';
    $('pBusiness').textContent = currentProfile.business_name || currentProfile.business || '';
    $('pType').textContent = currentProfile.business_type || currentProfile.type || '';
    $('pLocation').textContent = currentProfile.location || '';
    $('pEmail').textContent = currentProfile.email || currentUser?.email || '';
    $('credits').textContent = credits;
    $('topCredits').textContent = credits;
    $('welcome').textContent = `Hi ${name}`;
    $('history').innerHTML = currentCampaigns.length ? currentCampaigns.map((p) => `<div class="history-item"><b>${esc(p.offer)}</b><span>${new Date(p.created_at || p.createdAt).toLocaleString()} • ${esc(p.tone || '')}</span></div>`).join('') : '<p class="muted">No campaigns yet.</p>';
  }

  function render() {
    const signedIn = Boolean(currentUser && currentProfile);
    $('landing').classList.toggle('hidden', signedIn);
    $('dashboard').classList.toggle('hidden', !signedIn);
    $('signIn').classList.toggle('hidden', signedIn);
    $('signUp').classList.toggle('hidden', signedIn);
    $('signOut').classList.toggle('hidden', !signedIn);
    $('usage').classList.toggle('hidden', !signedIn);
    if (signedIn) profile();
    setBackendBadge();
  }

  async function boot() {
    if (supabaseConfigured) {
      await loadSupabaseState();
      db.auth.onAuthStateChange(async () => { await loadSupabaseState(); render(); });
    } else {
      await loadLocalState();
    }
    render();
  }

  boot();
})();
